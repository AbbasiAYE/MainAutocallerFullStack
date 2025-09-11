import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { leadId } = req.query;

    if (!leadId) {
      return res.status(400).json({ error: 'Lead ID is required' });
    }

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get Twilio credentials from environment
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(500).json({ 
        error: 'Twilio configuration missing',
        details: 'Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables'
      });
    }

    // Create webhook URL for test conversation
    const webhookUrl = `${appUrl}/api/twilio-webhook-test`;

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(lead.phone)) {
      return res.status(400).json({ 
        error: 'Invalid phone number format',
        details: `Phone number ${lead.phone} is not in a valid format. Please use E.164 format (e.g., +1234567890)`
      });
    }

    // Make call using Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const callResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: lead.phone,
        Url: webhookUrl,
        Method: 'POST',
        StatusCallback: `${appUrl}/api/twilio-webhook-test`,
        StatusCallbackMethod: 'POST',
        StatusCallbackEvent: 'initiated,ringing,answered,completed',
      }),
    });

    if (!callResponse.ok) {
      const errorText = await callResponse.text();
      console.error('Twilio API error:', errorText);
      
      let userFriendlyMessage = `Twilio API error: ${callResponse.status} ${callResponse.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.code === 21215) {
          userFriendlyMessage = `Cannot call ${lead.phone} - International calling not enabled. Please enable geo-permissions for this country in your Twilio Console: Voice → Manage → Geo permissions`;
        } else if (errorData.code === 21614) {
          userFriendlyMessage = `Cannot call ${lead.phone} - Number not verified. For trial accounts, you can only call verified numbers.`;
        } else if (errorData.message) {
          userFriendlyMessage = `Twilio error: ${errorData.message}`;
        }
      } catch (parseError) {
        // Use original message if parsing fails
      }
      
      return res.status(500).json({ 
        error: userFriendlyMessage,
        details: `Response: ${errorText}`
      });
    }

    const callData = await callResponse.json();

    return res.status(200).json({ 
      success: true,
      message: `Test call initiated to ${lead.name} at ${lead.phone}`,
      callSid: callData.sid,
      leadName: lead.name,
      leadPhone: lead.phone,
      callType: 'test'
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
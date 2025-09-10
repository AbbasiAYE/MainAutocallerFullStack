import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          name: string;
          phone: string;
          email: string;
          status: string;
          created_at: string;
        };
      };
    };
  };
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        headers: corsHeaders,
        status: 200 
      });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405,
        }
      );
    }

    // Get lead ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const leadId = pathParts[pathParts.length - 1];

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'Lead ID is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get lead details
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    // Get Twilio credentials from environment
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    const appUrl = Deno.env.get('APP_URL') || Deno.env.get('SUPABASE_URL');

    console.log('Environment check:', {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasFromNumber: !!fromNumber,
      accountSidPrefix: accountSid ? accountSid.substring(0, 5) + '...' : 'missing',
      appUrl: appUrl
    });

    if (!accountSid || !authToken || !fromNumber) {
      return new Response(
        JSON.stringify({ 
          error: 'Twilio configuration missing',
          details: 'Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables in your Supabase project settings',
          help: 'Go to Supabase Dashboard → Settings → Edge Functions (or API) → Environment Variables'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Create webhook URL for test conversation
    const webhookUrl = `${appUrl}/functions/v1/twilio-webhook-test`;

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(lead.phone)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid phone number format',
          details: `Phone number ${lead.phone} is not in a valid format. Please use E.164 format (e.g., +1234567890)`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Make call using Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    console.log('Making Twilio test call:', {
      from: fromNumber,
      to: lead.phone,
      twilioUrl: twilioUrl,
      webhookUrl: webhookUrl
    });

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
        StatusCallback: `${appUrl}/functions/v1/twilio-webhook-test`,
        StatusCallbackMethod: 'POST',
        StatusCallbackEvent: 'initiated,ringing,answered,completed',
      }),
    });

    if (!callResponse.ok) {
      const errorText = await callResponse.text();
      console.error('Twilio API error:', {
        status: callResponse.status,
        statusText: callResponse.statusText,
        body: errorText
      });
      
      // Parse Twilio error for better user messaging
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
        // If we can't parse the error, use the original message
      }
      
      return new Response(
        JSON.stringify({ 
          error: userFriendlyMessage,
          details: `Response: ${errorText}`,
          help: errorData?.code === 21215 ? 'Go to Twilio Console → Voice → Manage → Geo permissions and enable calling to the required countries' : undefined
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const callData = await callResponse.json();

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Test call initiated to ${lead.name} at ${lead.phone}`,
        callSid: callData.sid,
        leadName: lead.name,
        leadPhone: lead.phone,
        callType: 'test'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
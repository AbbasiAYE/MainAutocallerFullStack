const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TwilioWebhookRequest {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  SpeechResult?: string;
  Confidence?: string;
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
        'Method not allowed',
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
          status: 405,
        }
      );
    }

    const appUrl = Deno.env.get('APP_URL') || Deno.env.get('SUPABASE_URL');

    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const webhookData: Partial<TwilioWebhookRequest> = {};
    
    for (const [key, value] of formData.entries()) {
      webhookData[key as keyof TwilioWebhookRequest] = value.toString();
    }

    console.log('Twilio test webhook data:', webhookData);

    const { CallSid, From, CallStatus, SpeechResult } = webhookData;

    // Handle different call states
    if (CallStatus === 'ringing' || CallStatus === 'in-progress') {
      // Initial call or continuing conversation
      if (!SpeechResult) {
        // First interaction - greet and gather speech
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Hej! Det här är ett test av Autocaller webhook. Säg något så kan jag upprepa det.</Say>
            <Gather input="speech" timeout="5" speechTimeout="2" action="${appUrl}/functions/v1/twilio-webhook-test" method="POST">
              <Say voice="alice">Säg något nu.</Say>
            </Gather>
            <Say voice="alice">Jag hörde inget svar. Tack och hej då!</Say>
            <Hangup/>
          </Response>`,
          {
            headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
            status: 200,
          }
        );
      }

      // We have speech input - echo it back
      if (SpeechResult) {
        console.log('Test webhook received speech:', SpeechResult);
        
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Hej! Jag hörde: ${SpeechResult}</Say>
            <Gather input="speech" timeout="5" speechTimeout="2" action="${appUrl}/functions/v1/twilio-webhook-test" method="POST">
              <Say voice="alice">Säg något mer om du vill.</Say>
            </Gather>
            <Say voice="alice">Tack för testet! Ha en bra dag!</Say>
            <Hangup/>
          </Response>`,
          {
            headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
            status: 200,
          }
        );
      }
    }

    // Handle call completion
    if (CallStatus === 'completed') {
      console.log(`Test call ${CallSid} completed`);
      return new Response('OK', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        status: 200,
      });
    }

    // Default response
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Hej! Webhook test fungerar. Ha en bra dag!</Say>
        <Hangup/>
      </Response>`,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Test webhook error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Ett tekniskt fel uppstod i testet. Vi ber om ursäkt.</Say>
        <Hangup/>
      </Response>`,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200,
      }
    );
  }
});
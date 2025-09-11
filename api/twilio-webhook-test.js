export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
    const { CallSid, From, CallStatus, SpeechResult } = req.body;

    console.log('Twilio test webhook data:', req.body);

    // Handle different call states
    if (CallStatus === 'ringing' || CallStatus === 'in-progress') {
      // Initial call or continuing conversation
      if (!SpeechResult) {
        // First interaction - greet and gather speech
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hej! Det här är ett test av Autocaller webhook. Säg något så kan jag upprepa det.</Say>
  <Gather input="speech" timeout="5" speechTimeout="2" action="${appUrl}/api/twilio-webhook-test" method="POST">
    <Say voice="alice">Säg något nu.</Say>
  </Gather>
  <Say voice="alice">Jag hörde inget svar. Tack och hej då!</Say>
  <Hangup/>
</Response>`;

        return res.status(200).type('text/xml').send(twiml);
      }

      // We have speech input - echo it back
      if (SpeechResult) {
        console.log('Test webhook received speech:', SpeechResult);
        
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hej! Jag hörde: ${SpeechResult}</Say>
  <Gather input="speech" timeout="5" speechTimeout="2" action="${appUrl}/api/twilio-webhook-test" method="POST">
    <Say voice="alice">Säg något mer om du vill.</Say>
  </Gather>
  <Say voice="alice">Tack för testet! Ha en bra dag!</Say>
  <Hangup/>
</Response>`;

        return res.status(200).type('text/xml').send(twiml);
      }
    }

    // Handle call completion
    if (CallStatus === 'completed') {
      console.log(`Test call ${CallSid} completed`);
      return res.status(200).send('OK');
    }

    // Default response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hej! Webhook test fungerar. Ha en bra dag!</Say>
  <Hangup/>
</Response>`;

    return res.status(200).type('text/xml').send(twiml);

  } catch (error) {
    console.error('Test webhook error:', error);
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Ett tekniskt fel uppstod i testet. Vi ber om ursäkt.</Say>
  <Hangup/>
</Response>`;

    return res.status(200).type('text/xml').send(twiml);
  }
}
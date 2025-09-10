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
  RecordingUrl?: string;
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

    // Get environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const elevenlabsApiKey = Deno.env.get('ELEVENLABS_API_KEY');
    const elevenlabsVoiceId = Deno.env.get('ELEVENLABS_VOICE_ID');
    const appUrl = Deno.env.get('APP_URL') || Deno.env.get('SUPABASE_URL');

    console.log('Environment check:', {
      hasOpenAI: !!openaiApiKey,
      hasElevenLabs: !!elevenlabsApiKey,
      hasVoiceId: !!elevenlabsVoiceId,
      appUrl: appUrl
    });

    if (!openaiApiKey || !elevenlabsApiKey || !elevenlabsVoiceId) {
      console.error('Missing required environment variables');
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Sorry, the AI system is not configured properly. Please contact support.</Say>
          <Hangup/>
        </Response>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200,
        }
      );
    }

    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const webhookData: Partial<TwilioWebhookRequest> = {};
    
    for (const [key, value] of formData.entries()) {
      webhookData[key as keyof TwilioWebhookRequest] = value.toString();
    }

    console.log('Twilio webhook data:', webhookData);

    const { CallSid, From, CallStatus, SpeechResult } = webhookData;

    // Handle different call states
    if (CallStatus === 'ringing' || CallStatus === 'in-progress') {
      // Initial call - start conversation
      if (!SpeechResult) {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Hej! Jag heter Emma och ringer från Autocaller. Hur mår du idag?</Say>
            <Gather input="speech" timeout="5" speechTimeout="2" action="${appUrl}/functions/v1/twilio-webhook" method="POST">
              <Say voice="alice">Säg något så kan vi prata.</Say>
            </Gather>
            <Say voice="alice">Jag hörde inget svar. Ha en bra dag!</Say>
            <Hangup/>
          </Response>`,
          {
            headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
            status: 200,
          }
        );
      }

      // Process speech input
      if (SpeechResult) {
        console.log('Speech result:', SpeechResult);

        try {
          // Send to GPT-4 for response
          const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4',
              messages: [
                {
                  role: 'system',
                  content: `You are Emma, a friendly Swedish sales agent working for Autocaller MVP. You speak both Swedish and English fluently. 
                  
                  Your personality:
                  - Warm, professional, and conversational
                  - You adapt to the language the customer uses (Swedish or English)
                  - You're calling to introduce Autocaller's services
                  - Keep responses concise (1-2 sentences max for phone calls)
                  - Be natural and human-like
                  
                  Your goal is to have a brief, friendly conversation and gauge interest in automated calling solutions for businesses.
                  
                  If they speak Swedish, respond in Swedish. If they speak English, respond in English.
                  If they seem uninterested, politely end the call.
                  If they're interested, briefly explain that Autocaller helps businesses automate their outbound calling.`
                },
                {
                  role: 'user',
                  content: SpeechResult
                }
              ],
              max_tokens: 150,
              temperature: 0.7,
            }),
          });

          if (!gptResponse.ok) {
            throw new Error(`OpenAI API error: ${gptResponse.status}`);
          }

          const gptData = await gptResponse.json();
          const aiReply = gptData.choices[0]?.message?.content || 'Förlåt, jag förstod inte riktigt. Kan du upprepa det?';

          console.log('GPT-4 response:', aiReply);

          // Convert to speech using ElevenLabs
          const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenlabsVoiceId}`, {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': elevenlabsApiKey,
            },
            body: JSON.stringify({
              text: aiReply,
              model_id: 'eleven_multilingual_v2',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true
              }
            }),
          });

          if (!ttsResponse.ok) {
            console.error('ElevenLabs TTS error:', await ttsResponse.text());
            // Fallback to Twilio's built-in TTS
            return new Response(
              `<?xml version="1.0" encoding="UTF-8"?>
              <Response>
                <Say voice="alice">${aiReply}</Say>
                <Gather input="speech" timeout="5" speechTimeout="2" action="${appUrl}/functions/v1/twilio-webhook" method="POST">
                  <Say voice="alice">Vad tycker du om det?</Say>
                </Gather>
                <Say voice="alice">Tack för ditt intresse. Ha en bra dag!</Say>
                <Hangup/>
              </Response>`,
              {
                headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
                status: 200,
              }
            );
          }

          // Get audio data and convert to base64
          const audioBuffer = await ttsResponse.arrayBuffer();
          const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
          const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;

          // Return TwiML with AI-generated audio
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
              <Play>${audioDataUrl}</Play>
              <Gather input="speech" timeout="5" speechTimeout="2" action="${appUrl}/functions/v1/twilio-webhook" method="POST">
                <Say voice="alice">Vad tycker du?</Say>
              </Gather>
              <Say voice="alice">Tack så mycket för ditt intresse. Vi hörs snart igen!</Say>
              <Hangup/>
            </Response>`,
            {
              headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
              status: 200,
            }
          );

        } catch (error) {
          console.error('AI processing error:', error);
          
          // Fallback response
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
              <Say voice="alice">Förlåt, jag har tekniska problem just nu. Tack för ditt intresse och ha en bra dag!</Say>
              <Hangup/>
            </Response>`,
            {
              headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
              status: 200,
            }
          );
        }
      }
    }

    // Handle call completion
    if (CallStatus === 'completed') {
      console.log(`Call ${CallSid} completed`);
      return new Response('OK', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        status: 200,
      });
    }

    // Default response
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Hej! Tack för att du svarade. Ha en bra dag!</Say>
        <Hangup/>
      </Response>`,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice">Ett tekniskt fel uppstod. Vi ber om ursäkt. Ha en bra dag!</Say>
        <Hangup/>
      </Response>`,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200,
      }
    );
  }
});
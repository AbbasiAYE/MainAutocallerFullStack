import { createClient } from 'npm:@supabase/supabase-js@2';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const appUrl = Deno.env.get('APP_URL') || supabaseUrl;

    console.log('Environment check:', {
      hasOpenAI: !!openaiApiKey,
      hasElevenLabs: !!elevenlabsApiKey,
      hasVoiceId: !!elevenlabsVoiceId,
      hasSupabase: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      appUrl: appUrl
    });

    if (!openaiApiKey || !elevenlabsApiKey || !elevenlabsVoiceId || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say voice="alice">Hej! Tyvärr är AI-systemet inte konfigurerat korrekt. Kontakta support.</Say>
          <Hangup/>
        </Response>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200,
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const webhookData: Partial<TwilioWebhookRequest> = {};
    
    for (const [key, value] of formData.entries()) {
      webhookData[key as keyof TwilioWebhookRequest] = value.toString();
    }

    console.log('Twilio ElevenLabs webhook data:', webhookData);

    const { CallSid, From, CallStatus, SpeechResult, RecordingUrl } = webhookData;

    // Handle different call states
    if (CallStatus === 'ringing' || CallStatus === 'in-progress') {
      // Initial call - start conversation
      if (!SpeechResult && !RecordingUrl) {
        return new Response(
          `<?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say voice="alice">Hej! Jag heter Emma och ringer från Autocaller. Hur mår du idag?</Say>
            <Gather input="speech" timeout="5" speechTimeout="2" action="${appUrl}/functions/v1/twilio-webhook-elevenlabs" method="POST">
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
      let transcript = SpeechResult || '';

      // If we have a recording URL, transcribe it with Whisper
      if (RecordingUrl && !transcript) {
        try {
          console.log('Transcribing audio with Whisper:', RecordingUrl);
          
          // Download the audio file
          const audioResponse = await fetch(RecordingUrl);
          if (!audioResponse.ok) {
            throw new Error(`Failed to download audio: ${audioResponse.status}`);
          }
          
          const audioBlob = await audioResponse.blob();
          
          // Create form data for Whisper API
          const whisperFormData = new FormData();
          whisperFormData.append('file', audioBlob, 'audio.wav');
          whisperFormData.append('model', 'whisper-1');
          whisperFormData.append('language', 'sv'); // Swedish
          
          const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: whisperFormData,
          });

          if (!whisperResponse.ok) {
            throw new Error(`Whisper API error: ${whisperResponse.status}`);
          }

          const whisperData = await whisperResponse.json();
          transcript = whisperData.text || '';
          console.log('Whisper transcription:', transcript);
        } catch (error) {
          console.error('Whisper transcription error:', error);
          // Fall back to speech result or default
          transcript = SpeechResult || 'Jag förstod inte vad du sa';
        }
      }

      if (transcript) {
        console.log('Processing transcript:', transcript);

        try {
          // Send to GPT-4o-mini for response
          const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `You are Emma, a friendly Swedish sales agent working for Autocaller. You speak both Swedish and English fluently. 
                  
                  Your personality:
                  - Warm, professional, and conversational
                  - You adapt to the language the customer uses (Swedish or English)
                  - Start with greeting using the lead's first name if available
                  - Ask qualifying questions about their business needs
                  - Handle objections politely and professionally
                  - Keep responses concise (1-2 sentences max for phone calls)
                  - Finish with a CTA to book a meeting
                  
                  Your goal is to qualify leads for Autocaller's automated calling solutions and book meetings.
                  
                  If they speak Swedish, respond in Swedish. If they speak English, respond in English.
                  If they seem uninterested, politely try to understand their concerns.
                  If they're interested, ask about their business and current calling processes.`
                },
                {
                  role: 'user',
                  content: transcript
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

          console.log('GPT-4o-mini response:', aiReply);

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
                <Gather input="speech" timeout="5" speechTimeout="2" action="${appUrl}/functions/v1/twilio-webhook-elevenlabs" method="POST">
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

          // Get audio data
          const audioBuffer = await ttsResponse.arrayBuffer();
          const audioUint8Array = new Uint8Array(audioBuffer);

          // Upload to Supabase Storage
          const fileName = `tts-elevenlabs-${CallSid}-${Date.now()}.mp3`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('audio')
            .upload(fileName, audioUint8Array, {
              contentType: 'audio/mpeg',
              cacheControl: '3600',
            });

          if (uploadError) {
            console.error('Supabase upload error:', uploadError);
            throw new Error('Failed to upload audio to storage');
          }

          // Create signed URL
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('audio')
            .createSignedUrl(fileName, 3600); // 1 hour expiry

          if (signedUrlError || !signedUrlData?.signedUrl) {
            console.error('Signed URL error:', signedUrlError);
            throw new Error('Failed to create signed URL');
          }

          console.log('ElevenLabs audio uploaded and signed URL created:', signedUrlData.signedUrl);

          // Return TwiML with AI-generated audio
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>
            <Response>
              <Play>${signedUrlData.signedUrl}</Play>
              <Gather input="speech" timeout="5" speechTimeout="2" action="${appUrl}/functions/v1/twilio-webhook-elevenlabs" method="POST">
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
      console.log(`ElevenLabs call ${CallSid} completed`);
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
    console.error('ElevenLabs webhook error:', error);
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
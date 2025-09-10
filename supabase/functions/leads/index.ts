import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
        Insert: {
          name: string;
          phone: string;
          email: string;
          status?: string;
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

    if (req.method === 'GET') {
      const { data, error } = await supabaseClient
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Database error: ${error.message}`);
      }

      return new Response(
        JSON.stringify(data || []),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { name, phone, email, status = 'new' } = body;

      // Validate required fields
      if (!name || !phone || !email) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required fields', 
            details: 'name, phone, and email are required' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      // Validate status
      const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid status', 
            details: `Status must be one of: ${validStatuses.join(', ')}` 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }

      const { data, error } = await supabaseClient
        .from('leads')
        .insert([{ name, phone, email, status }])
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to create lead', 
            details: error.message 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
          }
        );
      }

      return new Response(
        JSON.stringify(data),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405,
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
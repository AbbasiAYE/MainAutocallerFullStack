import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ 
          error: 'Database error', 
          details: error.message 
        });
      }

      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { name, phone, email, status = 'new' } = req.body;

      // Validate required fields
      if (!name || !phone || !email) {
        return res.status(400).json({ 
          error: 'Missing required fields', 
          details: 'name, phone, and email are required' 
        });
      }

      // Validate status
      const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: 'Invalid status', 
          details: `Status must be one of: ${validStatuses.join(', ')}` 
        });
      }

      const { data, error } = await supabase
        .from('leads')
        .insert([{ name, phone, email, status }])
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        return res.status(500).json({ 
          error: 'Failed to create lead', 
          details: error.message 
        });
      }

      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
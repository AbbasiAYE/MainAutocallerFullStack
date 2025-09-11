const { Pool } = require('pg');

// Create a connection pool
let pool;

function getPool() {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return pool;
}

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const dbPool = getPool();

    if (req.method === 'GET') {
      // Get all leads ordered by created_at DESC
      const query = 'SELECT * FROM leads ORDER BY created_at DESC';
      const result = await dbPool.query(query);

      return res.status(200).json(result.rows);
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

      // Insert new lead
      const insertQuery = `
        INSERT INTO leads (name, phone, email, status, created_at) 
        VALUES ($1, $2, $3, $4, NOW()) 
        RETURNING *
      `;
      const values = [name, phone, email, status];
      const result = await dbPool.query(insertQuery, values);

      return res.status(201).json(result.rows[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    
    // Handle specific database errors
    if (error.code === 'ENOTFOUND') {
      return res.status(500).json({ 
        error: 'Database connection failed', 
        details: 'Could not connect to the database. Please check DATABASE_URL.' 
      });
    }
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ 
        error: 'Duplicate entry', 
        details: 'A lead with this email already exists' 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
};
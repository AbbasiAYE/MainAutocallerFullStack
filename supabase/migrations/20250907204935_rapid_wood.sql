/*
  # Create leads table

  1. New Tables
    - `leads`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `phone` (text, required)
      - `email` (text, required)
      - `status` (text, default 'new')
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `leads` table
    - Add policy for authenticated users to read and insert leads
*/

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  status text DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert some sample data
INSERT INTO leads (name, phone, email, status) VALUES
  ('John Smith', '+1-555-0123', 'john.smith@email.com', 'new'),
  ('Sarah Johnson', '+1-555-0124', 'sarah.j@email.com', 'contacted'),
  ('Mike Davis', '+1-555-0125', 'mike.davis@email.com', 'qualified'),
  ('Emily Brown', '+1-555-0126', 'emily.brown@email.com', 'new'),
  ('David Wilson', '+1-555-0127', 'david.wilson@email.com', 'converted');
/*
  # Update companies table for shared access

  1. Changes
    - Remove user_id from companies table
    - Add unique CUIT constraint
    - Create user_companies junction table
    - Migrate existing relationships
  
  2. Security
    - Update RLS policies for shared access
    - Add policies for junction table
*/

-- Create a temporary table to store existing relationships
CREATE TEMP TABLE temp_company_relations AS
SELECT id as company_id, user_id
FROM companies;

-- First drop existing policies to remove dependencies
DROP POLICY IF EXISTS "Users can read their own companies" ON companies;
DROP POLICY IF EXISTS "Users can create companies" ON companies;
DROP POLICY IF EXISTS "Users can update their own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete their own companies" ON companies;

-- Now we can safely modify the companies table
ALTER TABLE companies 
  DROP CONSTRAINT IF EXISTS companies_user_id_fkey,
  DROP COLUMN IF EXISTS user_id,
  ADD CONSTRAINT companies_cuit_unique UNIQUE (cuit);

-- Create junction table for user-company relationships
CREATE TABLE IF NOT EXISTS user_companies (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

-- Enable RLS on junction table
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- Create new policies for shared company access
CREATE POLICY "Users can read companies they are associated with"
  ON companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = companies.id
      AND user_companies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update companies they are associated with"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = companies.id
      AND user_companies.user_id = auth.uid()
    )
  );

-- Policies for user_companies junction table
CREATE POLICY "Users can read their company associations"
  ON user_companies
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their company associations"
  ON user_companies
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their company associations"
  ON user_companies
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Migrate existing relationships from temporary table
INSERT INTO user_companies (user_id, company_id)
SELECT user_id, company_id
FROM temp_company_relations
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Drop temporary table
DROP TABLE temp_company_relations;
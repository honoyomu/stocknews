/*
  # Fix watchlist RLS policies

  1. Changes
    - Drop existing RLS policies
    - Add new RLS policies with correct permissions for:
      - INSERT: Allow authenticated users to add to their watchlist
      - SELECT: Allow users to view their own watchlist
      - DELETE: Allow users to remove items from their watchlist

  2. Security
    - Enable RLS on watchlist table
    - Ensure users can only access their own data
*/

-- First enable RLS if not already enabled
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can add to their watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can remove from their watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can view their own watchlist" ON watchlist;

-- Create new policies with correct permissions
CREATE POLICY "Users can add to their watchlist"
ON watchlist
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own watchlist"
ON watchlist
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can remove from their watchlist"
ON watchlist
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
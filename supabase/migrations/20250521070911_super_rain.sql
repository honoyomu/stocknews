/*
  # Fix watchlist RLS policies

  1. Changes
    - Drop existing RLS policies for watchlist table
    - Create new RLS policies with correct user authentication checks
    - Enable RLS on watchlist table

  2. Security
    - Add policies for INSERT, SELECT, and DELETE operations
    - Ensure users can only access their own watchlist items
*/

-- Enable RLS
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can add to their watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can remove from their watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can view their own watchlist" ON watchlist;

-- Create new policies
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
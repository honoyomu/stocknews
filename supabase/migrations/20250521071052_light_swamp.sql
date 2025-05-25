/*
  # Fix watchlist RLS policies

  1. Security Changes
    - Drop existing RLS policies on watchlist table
    - Create new policies for:
      - INSERT: Allow authenticated users to add stocks to their watchlist
      - SELECT: Allow users to view their own watchlist items
      - DELETE: Allow users to remove items from their watchlist
    - Ensure RLS is enabled
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can add to their watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can remove from their watchlist" ON watchlist;
DROP POLICY IF EXISTS "Users can view their own watchlist" ON watchlist;

-- Enable RLS
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

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
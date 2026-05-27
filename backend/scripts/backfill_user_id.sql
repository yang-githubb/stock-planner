-- Run in Supabase SQL Editor (or psql against your Postgres).
--
-- user_id in watchlists/portfolios must be the Supabase auth UUID (JWT "sub"),
-- NOT the login email. Use this script to attach legacy rows to your account.

-- Optional: change login email from 1@1.com to 1 (sign out/in after)
UPDATE auth.users
SET email = '1', raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"email":"1"}'::jsonb
WHERE email = '1@1.com';

UPDATE auth.identities
SET identity_data = identity_data || '{"email":"1"}'::jsonb
WHERE provider = 'email'
  AND user_id IN (SELECT id FROM auth.users WHERE email = '1');

-- Attach watchlists/portfolios created before sign-in
UPDATE watchlists
SET user_id = (SELECT id::text FROM auth.users WHERE email IN ('1', '1@1.com') LIMIT 1)
WHERE user_id IS NULL;

UPDATE portfolios
SET user_id = (SELECT id::text FROM auth.users WHERE email IN ('1', '1@1.com') LIMIT 1)
WHERE user_id IS NULL;

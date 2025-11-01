-- Set admin role for a user
-- Replace 'your-email@example.com' with your actual email address

UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'your-email@example.com';

-- To verify it worked, run:
-- SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'your-email@example.com';


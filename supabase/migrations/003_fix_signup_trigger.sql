-- Fix the create_musician_profile function to handle errors better
CREATE OR REPLACE FUNCTION create_musician_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO musicians (user_id, name, email)
  VALUES (
    NEW.id, 
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), 'User'),
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', '')
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, musicians.email)
    WHERE musicians.email = '';
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating musician profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


/*
# Fix search_path on update_updated_at trigger function

Security hardening: set search_path on the update_updated_at() function
to prevent search_path mutable warning from the database linter.
*/

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
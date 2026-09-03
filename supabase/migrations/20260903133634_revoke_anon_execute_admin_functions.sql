/*
# Revoke anon execute on admin management functions

Security hardening: the SECURITY DEFINER functions for admin management
(create_admin, update_admin_status, delete_admin, get_profiles, is_super_admin)
should only be callable by authenticated users, not the anon role.

The functions already check is_super_admin() internally, but we revoke
EXECUTE from anon as defense-in-depth so unauthenticated callers cannot
even invoke the functions.
*/

REVOKE EXECUTE ON FUNCTION is_super_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION get_profiles() FROM anon;
REVOKE EXECUTE ON FUNCTION create_admin(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION update_admin_status(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION delete_admin(uuid) FROM anon;
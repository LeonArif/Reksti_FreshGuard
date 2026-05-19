import { supabase } from "../db/supabaseClient.js";

const getBearerToken = (req) => {
  const authorization = req.headers.authorization ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
};

export const resolveAuthenticatedUser = async (req) => {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user) {
    return null;
  }

  const authUser = data.user;
  const profile = {
    id: authUser.id,
    email: authUser.email ?? "",
    name:
      authUser.user_metadata?.full_name ??
      authUser.user_metadata?.name ??
      authUser.email ??
      "Google User",
    avatar_url: authUser.user_metadata?.avatar_url ?? null,
    updated_at: new Date().toISOString()
  };

  // Do not persist a separate `users` table. Use the auth user's id (auth.users.id)
  // directly as the canonical user identifier. Return a small profile object
  // derived from the auth provider without writing to any public tables.
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    name: profile.name,
    avatar_url: profile.avatar_url ?? null
  };
};

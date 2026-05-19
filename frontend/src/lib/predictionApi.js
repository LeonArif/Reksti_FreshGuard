import { supabase } from "./supabaseClient.js";

export const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
};

export const getAccessToken = async () => {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? "";
};

export const authedJson = async (path, options = {}) => {
  const accessToken = await getAccessToken();
  const headers = new Headers(options.headers ?? {});

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers
  });

  let json = null;
  try {
    json = await response.json();
  } catch (_error) {
    json = null;
  }

  if (!response.ok) {
    throw new Error(json?.error || json?.message || "Request failed");
  }

  return json;
};

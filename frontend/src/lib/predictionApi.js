import { supabase } from "./supabaseClient.js";

const isLocalHost = typeof window !== "undefined"
  && ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const apiBase = isLocalHost
  ? "http://localhost:3001"
  : (import.meta.env.VITE_API_BASE || "https://rekstifreshguard-production-dfd5.up.railway.app");

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

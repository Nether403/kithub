import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/client";

function getMetadataAgentName(user: User | null): string | null {
  if (!user) {
    return null;
  }

  const candidate =
    user.user_metadata?.agentName ??
    user.user_metadata?.agent_name ??
    user.user_metadata?.publisherName;

  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate.trim()
    : null;
}

export async function getSupabaseUser(): Promise<User | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user ?? null;
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session?.access_token ?? null;
}

export async function signOutWithSupabase(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export function getUserDisplayName(user: User | null): string {
  return (
    getMetadataAgentName(user) ??
    user?.email?.split("@")[0] ??
    "Publisher"
  );
}

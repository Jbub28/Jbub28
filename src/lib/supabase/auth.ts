import { getSupabaseClient } from "./client";

/** Ensure a persisted Supabase auth session (anonymous sign-in if needed). */
export async function ensureAuthSession(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user?.id) {
    return sessionData.session.user.id;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn("Supabase anonymous sign-in failed:", error.message);
    return null;
  }

  const userId = data.user?.id;
  if (!userId) return null;

  await supabase.from("profiles").upsert({
    id: userId,
    display_name: "Driver",
  });

  return userId;
}

/** True when Supabase is configured and we have a persisted auth session. */
export async function useSupabaseBackend(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  const authUserId = await ensureAuthSession();
  if (authUserId) return true;
  const { data } = await supabase.auth.getUser();
  return Boolean(data.user?.id);
}

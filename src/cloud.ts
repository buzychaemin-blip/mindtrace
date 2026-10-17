import { createClient } from "@supabase/supabase-js";
import { validateData, type AppData } from "./domain";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloud =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
export async function signIn(email: string) {
  if (!cloud) throw new Error("Supabase 연결 설정이 필요해요.");
  const { error } = await cloud.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin },
  });
  if (error) throw error;
}
export async function uploadSnapshot(data: AppData) {
  if (!cloud) throw new Error("서버가 연결되지 않았어요.");
  const {
    data: { user },
    error: authError,
  } = await cloud.auth.getUser();
  if (authError || !user) throw new Error("먼저 이메일로 로그인해 주세요.");
  const { error } = await cloud
    .from("user_workspaces")
    .upsert({
      user_id: user.id,
      payload: data,
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
}
export async function downloadSnapshot() {
  if (!cloud) throw new Error("서버가 연결되지 않았어요.");
  const {
    data: { user },
  } = await cloud.auth.getUser();
  if (!user) throw new Error("먼저 이메일로 로그인해 주세요.");
  const { data, error } = await cloud
    .from("user_workspaces")
    .select("payload")
    .eq("user_id", user.id)
    .single();
  if (error) throw error;
  return validateData(data.payload);
}
export async function deleteCloudData() {
  if (!cloud) throw new Error("서버가 연결되지 않았어요.");
  const {
    data: { user },
  } = await cloud.auth.getUser();
  if (!user) throw new Error("먼저 로그인해 주세요.");
  const { error } = await cloud
    .from("user_workspaces")
    .delete()
    .eq("user_id", user.id);
  if (error) throw error;
}

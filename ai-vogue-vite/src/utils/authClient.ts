import { supabase } from "./supabaseClient";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user: { id: string; email: string } | null;
  error: string | null;
}

export async function loginWithEmail(payload: LoginPayload): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });
  
  if (error) {
    return { success: false, user: null, error: error.message };
  }
  
  return {
    success: true,
    user: data.user ? { id: data.user.id, email: data.user.email || payload.email } : null,
    error: null,
  };
}

export async function loginWithGoogle(): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
  });
  
  if (error) {
    return { success: false, user: null, error: error.message };
  }
  
  return {
    success: true,
    user: null,
    error: null,
  };
}

export async function signUp(payload: LoginPayload): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    return { success: false, user: null, error: error.message };
  }

  return {
    success: true,
    user: data.user ? { id: data.user.id, email: data.user.email || payload.email } : null,
    error: null,
  };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

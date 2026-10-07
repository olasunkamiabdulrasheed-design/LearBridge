import type { StudentProfile, User } from "../types/domain";
import { apiFetch, getRefreshToken, setAccessToken, setTokens } from "./apiClient";

export interface TokenPair {
  access: string;
  refresh: string;
}

export interface RegisterResponse extends TokenPair {
  user: User;
}

export interface MeResponse {
  user: User;
  profile: StudentProfile | null;
}

export async function register(
  username: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  const data = await apiFetch<RegisterResponse>("/auth/register/", {
    auth: false,
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
  setTokens(data.access, data.refresh);
  return data;
}

export async function login(username: string, password: string): Promise<TokenPair> {
  const data = await apiFetch<TokenPair>("/auth/login/", {
    auth: false,
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setTokens(data.access, data.refresh);
  return data;
}

export async function refreshAccess(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) throw new Error("No refresh token stored.");
  const data = await apiFetch<{ access: string }>("/auth/refresh/", {
    auth: false,
    method: "POST",
    body: JSON.stringify({ refresh }),
  });
  setAccessToken(data.access);
  return data.access;
}

export function fetchMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/me/");
}

/**
 * Client-safe platform helpers.
 * These functions do NOT use any server-only imports (next/headers, cookies, etc.)
 * and can be safely imported in 'use client' components.
 */

export type PlatformKey = 'tiktok' | 'youtube' | 'instagram' | 'twitter' | 'linkedin' | 'facebook';

export function getAccessToken(account: {
  platform: string;
  tiktok_access_token?: string | null;
  platform_access_token?: string | null;
}): string | null {
  if (account.platform === 'tiktok') return account.tiktok_access_token ?? null;
  return account.platform_access_token ?? null;
}

export function isOAuthConnected(account: {
  platform: string;
  tiktok_open_id?: string | null;
  platform_access_token?: string | null;
  platform_user_id?: string | null;
}): boolean {
  if (account.platform === 'tiktok') return !!account.tiktok_open_id;
  return !!(account.platform_access_token || account.platform_user_id);
}

export function isTokenExpiredCheck(account: {
  platform: string;
  tiktok_token_expires_at?: string | null;
  platform_token_expires_at?: string | null;
}): boolean {
  const expiresAt = account.platform === 'tiktok'
    ? account.tiktok_token_expires_at
    : account.platform_token_expires_at;
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export const IRONMALLAS_SUPABASE_URL = "https://kqdcotpfzluxkqdkgyts.supabase.co";

export function isIronmallasSupabaseUrl(url: string | undefined): boolean {
  return url === IRONMALLAS_SUPABASE_URL || url === `${IRONMALLAS_SUPABASE_URL}/`;
}

export function resolveSupabaseConfig(url: string | undefined, key: string | undefined) {
  if (!isIronmallasSupabaseUrl(url) || !key?.trim()) return null;
  return { url: IRONMALLAS_SUPABASE_URL, key };
}

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return resolveSupabaseConfig(url, key);
}

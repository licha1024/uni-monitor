import axios, { AxiosRequestConfig } from 'axios';

export async function safeGet<T = unknown>(
  url: string,
  options: AxiosRequestConfig = {},
  errors?: string[],
  label = url,
  retries = 2
): Promise<T | null> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.get<T>(url, {
        timeout: 20_000,
        headers: { 'User-Agent': 'uni-monitor/0.1', Accept: 'application/json' },
        ...options,
      });
      return data;
    } catch (err: unknown) {
      lastErr = err;
      if (attempt < retries) {
        // exponential backoff: 500ms, 1500ms
        await new Promise((r) => setTimeout(r, 500 * Math.pow(3, attempt)));
      }
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  if (errors) errors.push(`${label}: ${msg}`);
  else console.warn(`[fetch] ${label} failed:`, msg);
  return null;
}

export function pct(current: number, previous: number): number | null {
  if (!previous || !isFinite(previous)) return null;
  return ((current - previous) / previous) * 100;
}

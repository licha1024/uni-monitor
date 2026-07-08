import axios, { AxiosRequestConfig } from 'axios';

export async function safeGet<T = unknown>(
  url: string,
  options: AxiosRequestConfig = {},
  errors?: string[],
  label = url
): Promise<T | null> {
  try {
    const { data } = await axios.get<T>(url, {
      timeout: 15_000,
      headers: { 'User-Agent': 'uni-monitor/0.1' },
      ...options,
    });
    return data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (errors) errors.push(`${label}: ${msg}`);
    else console.warn(`[fetch] ${label} failed:`, msg);
    return null;
  }
}

export function pct(current: number, previous: number): number | null {
  if (!previous || !isFinite(previous)) return null;
  return ((current - previous) / previous) * 100;
}

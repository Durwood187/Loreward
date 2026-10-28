import type { SiteAdapter } from './types';
import { redditAdapter } from './reddit';

/** Every supported site. Add new adapters here (and their host to the manifest). */
export const ADAPTERS: SiteAdapter[] = [redditAdapter];

export function adapterForHost(hostname: string): SiteAdapter | undefined {
  return ADAPTERS.find((a) => a.matchesHost(hostname));
}

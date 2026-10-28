import type { SiteAdapter } from './types';
import { redditAdapter } from './reddit';
import { googleAdapter } from './google';

/** Every supported site. Add new adapters here (and their host to the manifest). */
export const ADAPTERS: SiteAdapter[] = [redditAdapter, googleAdapter];

export function adapterForHost(hostname: string): SiteAdapter | undefined {
  return ADAPTERS.find((a) => a.matchesHost(hostname));
}

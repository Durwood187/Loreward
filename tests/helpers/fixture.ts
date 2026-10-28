import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Reads a saved HTML page from tests/fixtures/. */
export function loadFixture(name: string): string {
  return readFileSync(join(__dirname, '..', 'fixtures', name), 'utf8');
}

/** Replaces the whole test document with the given HTML page. */
export function useDocument(html: string): void {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  document.replaceChild(document.importNode(parsed.documentElement, true), document.documentElement);
}

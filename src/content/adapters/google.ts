// Google Search adapter (www.google.com/search).
//
// Structure confirmed on the live site (Oct 2026). Google's class names are
// scrambled and change often, so we lean on ids, jscontroller/jsname values
// and long-lived class names instead:
//   #eKIzJc                    the AI Overview block (heading "AI Overview")
//   [jscontroller="SC7lYd"]    one regular web result (title + snippet)
//   .related-question-pair     one "People also ask" item, in two parts:
//     [role="button"][aria-expanded]   the question (normal checking)
//     [jsname="NRdf4c"]                the answer area; Google fills it with an
//                                      AI-written answer when the question is opened
//
// The question and answer are separate units on purpose: revealing a
// question must not also reveal its answer.
//
// AI answers get stricter treatment (see aiAnswerSelector in types.ts).

import type { SiteAdapter } from './types';

const AI_ANSWERS = ['#eKIzJc', '.related-question-pair [jsname="NRdf4c"]'];

export const googleAdapter: SiteAdapter = {
  id: 'google',
  name: 'Google Search',
  matchesHost: (host) => host === 'www.google.com' || host === 'google.com',
  unitSelector: [
    ...AI_ANSWERS,
    '.related-question-pair [role="button"][aria-expanded]',
    '[jscontroller="SC7lYd"]',
  ].join(', '),
  aiAnswerSelector: AI_ANSWERS.join(', '),
  /** The search box text, so we know whether this search is about a series. */
  pageContext: (loc) => new URL(loc.href).searchParams.get('q') ?? '',
};

"""Writes docs/event-review-<id>.md from data/series/<id>.json, for human review of plot events.
   python3 scripts/event-review.py mistborn
   python3 scripts/event-review.py realm-of-the-elderlings --spoiler-warning   (series the reviewer hasn't read)
"""
import json, sys
from pathlib import Path

DEATH = ["die", "dies", "died", "dying", "dead", "death", "killed", "kills", "killing", "murder*", "slain", "executed"]

def main(sid, warn):
    root = Path(__file__).resolve().parent.parent
    d = json.loads((root / 'data' / 'series' / f'{sid}.json').read_text())
    books = {b['index']: b['title'] for b in d['books']}
    name = d.get('shortName', d['name'])
    L = []
    if warn:
        L += ["> ## ⚠️ SPOILERS: don't open if you plan to read this series",
              "> This file lists the major plot events of every book. It was drafted from the fan wiki and has **not** been reviewed by a reader.", ""]
    L += [f"# {name}: event review", "",
          "Events catch spoilers written in plain words: a **subject** (usually a character) within 20 words of a **cue** word, e.g. a name near \"died\".",
          "An event is blurred for readers **on its book or any earlier book** (unlike terms, the current book counts too).", "",
          "How to review: check (1) it really happens in that book, (2) the cues are how fans would phrase it, (3) nothing big is missing.",
          "When unsure, the later book is the safe choice: it blurs for more readers.", "",
          "\"death words\" = " + ", ".join(DEATH) + ". `*` = any ending. *context* = only on pages about the series.", ""]
    cur = None
    for e in d.get('events', []):
        if e['happensIn'] != cur:
            cur = e['happensIn']
            L += ["", f"## {cur}. {books[cur]}", "", "| Event | Subjects | Cues | Confidence | Wiki |", "|---|---|---|---|---|"]
        has_death = set(DEATH) <= set(e['cues'])
        rest = [c for c in e['cues'] if not (has_death and c in DEATH)]
        cues = ("death words" + (", " if rest else "") if has_death else "") + ", ".join(rest)
        subj = ", ".join(e['subjects']) + (" *(context)*" if e.get('needsContext') else "")
        note = f"<br><sub>{e['notes']}</sub>" if e.get('notes') else ""
        L.append(f"| {e['id']}{note} | {subj} | {cues} | {e['confidence']} | {'✓' if e.get('wikiChecked') else ''} |")
    L += ["", "## Known gaps", "",
          "- Events from the last book stay blurred even after finishing it, until the popup gets a \"finished the series\" option.",
          "- The catch-all \"Main character deaths\" event is the most likely source of false blurs; tune it first.", ""]
    out = root / 'docs' / f'event-review-{sid}.md'
    out.write_text("\n".join(L))
    print(out, len(d.get('events', [])), 'events')

if __name__ == '__main__':
    main(sys.argv[1], '--spoiler-warning' in sys.argv)

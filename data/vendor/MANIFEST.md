# Vendored authoritative data — Stage 0

> Vendored 2026-05-31 with a human present, per `docs/GOAL-content-balance.md`.
> **Once committed, the content/balance loop runs fully offline against these
> copies.** Do not re-download or swap sources inside an unattended run.

The loop uses these for **content rule B**: membership (what to teach) comes from a
blessed external list; correctness (is the Japanese right) is validated against a
dictionary. Claude never invents curriculum.

## Files

| Path | Source | Version / fetched | Role |
|---|---|---|---|
| `jlpt/n5.csv` | [jamsinclair/open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) `src/n5.csv` (derived from the Tanos JLPT lists) | fetched 2026-05-31, `main` | **Blessed N5 vocab membership** (723 rows) |
| `jlpt/n4.csv` | same repo `src/n4.csv` | fetched 2026-05-31, `main` | **Blessed N4 vocab membership** (667 rows) |

> CSV format is open-anki's source shape: `expression　「reading」　…meaning` (full-width
> separators). A later iteration writes the parser that turns these into spine entries.
| `jlpt/LICENSE` | open-anki-jlpt-decks | — | License for the lists above |
| `jmdict/jmdict-eng-common.json.zip` | [scriptin/jmdict-simplified](https://github.com/scriptin/jmdict-simplified) | release `3.6.1+20250929123459` (common words, English) | **Vocab correctness gate** (readings / glosses / pos) |
| `kanjidic/kanjidic2.xml.gz` | [EDRDG KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) | fetched 2026-05-31 (13,108 kanji) | **Kanji authority** (readings, meanings, old-scale JLPT) |

## Licenses & attribution (must be preserved)

- **JMdict** and **KANJIDIC2** are property of the
  [Electronic Dictionary Research and Development Group (EDRDG)](https://www.edrdg.org/),
  used under the [EDRDG Licence](https://www.edrdg.org/edrdg/licence.html)
  (CC BY-SA 4.0). Attribution to EDRDG must appear anywhere this data is
  surfaced to users.
- **open-anki-jlpt-decks** is under its bundled `jlpt/LICENSE`; the underlying
  word lists derive from the **Tanos** JLPT reconstructions.
- **Caveat (already noted in the Goal):** the JLPT has published no official
  vocab/kanji lists since 2010. These lists are community reconstructions; this
  one is *blessed* as the single authority for membership. **Do not blend other
  sources** — blending is where fabricated entries creep in.

## How the loop consumes these (built in later iterations)

- Decompress `jmdict-eng-common.json.zip` / `kanjidic2.xml.gz` at build/dev time
  (Node `zlib`); these are **dev/build-time correctness data, not shipped to the
  client**.
- Vocab entry passes the gate iff its `jp` + `reading` + `pos` corroborate a
  JMdict-common entry; kanji entry corroborates KANJIDIC2. A mismatch fails the
  build.

## OPEN Stage-0 items (need a human-blessed source before the loop adds them)

These have **no clean machine-readable blessed source** in the above repos, so
they were intentionally **not** vendored. Per rule B, the loop must **not** add
content in these categories until a source is blessed:

1. **N5/N4 kanji *membership* list (new 5-level scale).** KANJIDIC2 only carries
   the *old* 4-level JLPT scale, which maps imperfectly to N5/N4. KANJIDIC2 is
   vendored for *correctness*, but a blessed new-scale kanji membership list is
   still needed. (Existing `kanji.md` can already be correctness-checked.)
2. **N5/N4 grammar list.** open-anki is vocab-only. A blessed grammar-point list
   (e.g. the Tanos grammar lists) must be vendored before grammar entries grow.

Until resolved, the loop's content work is scoped to **vocab** (membership +
correctness fully covered) plus correctness-checking existing kanji/grammar.

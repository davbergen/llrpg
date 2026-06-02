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
| `kanji/n5_kanji.csv` … `n1_kanji.csv` | user-provided (community list) | added 2026-05-31 | **Kanji membership** per JLPT level. Format: header line `Kanji`, then **one kanji per line**, no translations (N5 ≈ 79, N4 ≈ 166). Meanings/readings come from KANJIDIC2. (Scope: N5+N4; N1–N3 included for future use.) |
| `grammar/JLPT Grammar.xlsx - full list.csv` | user-provided (community list) | added 2026-05-31 | **Grammar membership + content** (~837 rows). No header. Columns: `Level, #, grammar(JP), romaji, meaning, …(blank cols)…, source`. e.g. `N5,1,ちゃいけない・じゃいけない,cha ikenai / ja ikenai,must not do (spoken Japanese),,,,,,source: …`. Level-tagged (`N5`, `N4`, …). |

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

## Per-category correctness rules

- **Vocab** — membership from `jlpt/*.csv`; each entry's `jp`+`reading`+`pos`
  must corroborate a `jmdict-eng-common` entry or the build fails.
- **Kanji** — membership from `kanji/n5_kanji.csv` / `n4_kanji.csv`; each kanji
  must exist in KANJIDIC2, which supplies its readings/meanings (the list itself
  has none). A kanji absent from KANJIDIC2 fails the build.
- **Grammar** — membership *and* content from the grammar CSV. **There is no
  dictionary to cross-check grammar against** (JMdict/KANJIDIC2 are words and
  kanji). So the grammar list is the *sole* authority; the only correctness guard
  is that every grammar entry must render as **deterministically-gradable MCQ**
  (e.g. pick the right particle/form), never free-text. Malformed CSV rows (bad
  quoting/columns) must fail the build rather than produce a broken entry.

## Notes for the parser (later iteration)

- Kanji CSVs have a `Kanji` header then one kanji per line; skip the header and
  any blank trailing line.
- The grammar CSV is a spreadsheet export with **no header** and several empty
  trailing columns; the meaning is column 5, the JP grammar point column 3.
  Expect occasional quoting quirks — validate per row and reject rows that don't
  parse.

## Status: all Stage-0 categories sourced

Vocab, kanji, and grammar membership are now all vendored. The previously-open
kanji-membership and grammar-list items are **closed**. The loop may grow all
three categories within the N5+N4 scope (kanji/grammar provenance is
user-provided community lists; preserve any attribution the upstream sources
require if you later identify them).

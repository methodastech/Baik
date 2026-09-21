# Card builder

Builds `CARDS` entries for `Khayr.html` from verified sources. It exists to make one rule
mechanical rather than hopeful:

> No Arabic is ever typed, pasted from a webpage, or generated. Every character arrives from
> a machine-readable source, keyed, and can be regenerated from that key.

The English and Malay prose around a dua is written by us. The dua itself never is.

## 1. Get the Qur'an text export

Nothing is downloaded automatically. Fetch one of these yourself, so its licence and edition
are known, and drop it in `tools/data/`:

| File | Source | Notes |
|---|---|---|
| `quran-uthmani.txt` | [Tanzil](https://tanzil.net/download/) → Uthmani, plain text | Terms require the text to stay verbatim, with attribution. Do not edit it. |
| `qpc-uthmani.json` | [QUL](https://qul.tarteel.ai/) → QPC Uthmani script export | Pairs with the KFGQPC fonts if that upgrade ever ships. |

The script accepts either. It refuses to run without one, and refuses an export that parses
to fewer than 6,000 ayat, because a truncated file would silently produce wrong cards.

## 2. Hadith duas (optional)

Set `SUNNAH_API_KEY` to pull hadith text and grading from [sunnah.com](https://sunnah.com/developers).
Request a key by opening an issue on their API repo. Without the key, `srcKind: "hadith"` rows
are refused rather than guessed at.

```bash
export SUNNAH_API_KEY=…
```

```powershell
$env:SUNNAH_API_KEY = "…"    # this shell only; use setx to keep it
```

The key is read at run time, so set it in the same shell that runs the script.

## 3. Write the input list

A plain JSON array. You author the prose and the keys; you never author `ar`.

```json
[
  {
    "srcKind": "quran",
    "srcKey": "25:74",
    "set": "protection",
    "cats": ["rumah", "perlindungan"],
    "kind": "dua",
    "ten": "Comfort of the Eyes",
    "pen": "Asking for peace within the household.",
    "ken": "Read when the home feels strained…",
    "aen": "…",
    "tr": "Rabbanaa hablanaa min azwaajinaa…",
    "en": "Our Lord, grant us from among our wives and offspring…",
    "art": "A young couple at home at dusk…"
  }
]
```

`tr` and `en` must come from the same sourced set as the Arabic, not from us. The script
refuses a row that supplies `ar` by hand, and refuses one missing transliteration or meaning.

Optional fields the deck reads:

| Field | What it is |
|---|---|
| `my` | The Malay meaning. Sourced like `en`, never written by us. |
| `src` | The Malay half of the citation, e.g. `QS. Al-Baqarah: 127 · Halaman 20`. `lv()` reaches for this one in BM. |
| `srcEn` | The English half, e.g. `Qur'an · Al-Baqarah 2:127`. Defaults to the bare key. |
| `srcProse` | Where the transliteration and meanings came from, when that is not the Arabic's source. Appended to the card's `verified`. |
| `count` | **Required on a zikir row**, and `null` is a valid answer. A whole number from 1 to 1000 is how many times the zikir is said, and the card shows it as the target on its counter. `null` says no count is transmitted, and the card keeps an open tally instead. Omitting the field is refused either way. |

### Zikir rows

`kind: "zikir"` is for remembrance said on a count, and the card carries a counter. The count
is not ours to assume — thirty-three after the prayer, a hundred, seven, once — so a zikir row
states it or the row is refused, the same way a surah row must state its own number and place.

Some remembrance carries no transmitted count at all. The istirja' is said when the news
reaches you; `ḥasbunā llāhu wa niʿma l-wakīl` is what they said when they were warned. Those
rows write `count: null`, and the card counts up and shows a bare tally — no target, no bar to
fill, no finish. Refusing them for lacking a number would push the set toward inventing targets
in order to get cards built, which is the failure the check exists to prevent.

What stays refused is the field being **absent**. "No count is transmitted" and "I did not
look it up" produce very different cards, and only one of them is honest, so the row has to say
which it means. The app side matches: a card with no target shows the tally alone rather than
defaulting to thirty-three.

`fromWord` trims the head of an ayah and runs to its end. It cannot cut a phrase out of the
middle, and that limit is deliberate: a phrase lifted from mid-sentence can say something the
verse does not. Several well-known remembrances occur inside a verse this way — `allāhu akbar`
at 40:10 sits inside a clause about the hatred of those who disbelieved — and they are left out
rather than sliced. Remembrances that are not Qur'anic at all, such as
`lā ḥawla wa lā quwwata illā billāh`, need the hadith path and its `SUNNAH_API_KEY`.

`tools/zikir.input.json` holds the three Qur'anic rows that are built: `ḥasbunā llāh` (3:173),
the supplication of Yunus (21:87) and the istirja' (2:156), all three on `count: null`. The
remembrances that do carry counts — tasbih thirty-three, istighfar, the salawat, `lā ḥawla` —
are hadith, so the set stays three cards long until `SUNNAH_API_KEY` exists.

`tools/kesihatan.input.json` is a finished example of the shape: seven Qur'anic rows, four of
them cut with `fromWord`. Their `tr`, `en` and `my` were pulled from api.quran.com
(`verses/by_key/<key>?words=true&translations=20,39` — per-word transliteration, Saheeh
International, Basmeih) and, on the cut rows, trimmed to the clause the cut word begins; the
`srcProse` line records that. Nothing in `tr`, `en` or `my` was written by hand.

The script emits `vkeys` for Qur'an rows from `srcKey`. That is what opens the ayah on
Quran.com from the card and what the recitation player asks the CDN for.

## 4. Run it

```bash
node tools/fetch-cards.mjs cards.input.json --check
```

```bash
node tools/fetch-cards.mjs cards.input.json > cards.out.json
```

`--check` validates and prints the report without emitting cards. Exit code is non-zero if
anything was refused, so it can gate a commit.

## What the script guarantees

- Every emitted card carries `srcKind`, `srcKey`, `srcText`, `srcFetched`, `verified` and
  `review: "pending"`; hadith cards also carry `grading`.
- Any row missing text, key, source, transliteration or meaning is refused and listed. Nothing
  is filled in with a guess.
- Re-running against the same export reproduces the same Arabic, byte for byte. That is the
  test for the whole pipeline.

## After the build

`review: "pending"` is not a formality. Cards go in front of a scholar before release, and the
field records who reviewed them and when. Nothing ships to readers on the strength of this
script alone.

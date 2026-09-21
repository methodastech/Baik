# Khayr خير

**Duas for every moment.** A dua card deck: web first, mobile app later.

Standalone product, no shared code with anything else. `Khayr.html` is a single
self-contained file: all styles, scripts, card data and the plan table live inside
it. Copy that one file anywhere and it runs.

## Files

| File | What it is |
|---|---|
| `Khayr.html` | The app. One self-contained file. |
| `Site.html` | The public marketing site: preloader, hero deck, "what are you facing" demo, sticky set stack, kinetic strip, features, sharing, Free vs Premium, FAQ, giant wordmark footer. Motion via GSAP + Lenis (CDN). Reached from the app's Web · App · Site toggle. |
| `Codex.html` | The system reference: card anatomy wireframes, deck structure, content model, design system, the full 128-row feature plan with build state, and the content integrity rules. |

## Run it

Open `Khayr.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8795
```

Then visit http://localhost:8795/Khayr.html and http://localhost:8795/Codex.html

Only external requests are Google Fonts (Saira, Space Grotesk, JetBrains Mono,
Scheherazade New for the Arabic). Everything else is inline.

## What's inside

- **30 dua cards** across four sets: Doa Gen Z, Doa Travel, Doa Rezeki, Doa Protection.
- **Card design** follows the Methodas card system: faceted tarot cut, numbered pip,
  patterned art window with a category glyph, typeline, reading panel, guilloché back.
- **English first.** The `EN | BM` toggle is stubbed; the Malay layer is the next content pass.
- **Free-tier features** from the plan: daily featured dua, "what are you facing?"
  shortcuts, the finder (search plus a Filter tags dropdown with tickable set, kind
  and category tags, active tags shown as removable chips), saves (capped at 10),
  recent, copy Arabic / transliteration / translation with the source attached,
  share, Arabic text size, and the full Free vs Premium table behind the gold button.

## Editing content

Card data is the `CARDS` array near the top of the `<script>` block. Each card:

| field | meaning |
|---|---|
| `set` | `genz` / `travel` / `rezeki` / `protection` |
| `ten` | English title |
| `pen` | English purpose line (shows as the card lead) |
| `ar` / `tr` | Arabic text and transliteration |
| `en` | English translation (the quoted flavor line) |
| `srcEn` | source, e.g. `Qur'an · Al-Furqan 25:74` |
| `ken` / `aen` | usage and revelation context (spotlight panel) |
| `cats` | category keys, first one drives the glyph |
| `t` / `p` / `my` / `keg` / `asb` | the original Malay fields, kept for the BM toggle |

## Content rules

- Never invent Arabic text, hadith or Quranic references. Transcribe from approved sources.
- Keep claims functional: no promises of guaranteed outcomes.
- Every card must carry a checkable source. Have a scholar review before release.

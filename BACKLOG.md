# Baik master plan · full detail

Loop rules: work top-down inside each priority; verify in browser (desktop 1280 + mobile 375) after every item; tick here; never hand-type Arabic; Arabic moves as one block; no worship-framing on money; house style: dark emerald field, one gold accent, mono labels.

## P0 · Broken / must fix

| # | Item | Detail | Where |
|---|---|---|---|
| 1 | ✅ Table drag on touch | pointer events untested on coarse pointers; ensure touch-action:none works, no page scroll while dragging | Khayr.html wireTableDrag |
| 2 | ✅ Table card click-vs-drag | verify flip still fires on plain tap; suppress only after real drag | same |
| 3 | ✅ Deck/table modes hide set headers | confirm empty-filter states render clean in all 3 views | render() branches |
| 4 | ✅ BM toggle coverage gaps | spotlight copy buttons copy EN when LANG=bm (should copy c.my); SITS chips, spot-bar labels, premium sheet still EN | showSpot, SITS |
| 5 | Account overlay on mobile | 560px sheet + tabs wrap; test 375px, tab icons crowd | .ac-in CSS |
| 6 | ✅ fcount badge vs new viewtog | finder row overflow at ~420px; allow wrap | .finder CSS |
| 7 | ✅ Old dead CSS | .bk-info/.bk-scroll/barhead remnants; purge | style block |
| 8 | ✅ Loader edge | Site.html loader on repeat visits: consider skip via sessionStorage | Site.html |


## P0.5 · UI/UX repair list

(Also done outside the table: My account button with explicit Sign in / Create account flows; art window now carries its category glyph.) (audit 26 Jul, work before P1 leftovers)

| # | Severity | Problem | Repair |
|---|---|---|---|
| 1 | ✅ Critical | Card actions (Save/Read large/Listen) are hover-only fabs: opacity 0 until :hover, so TOUCH USERS CAN NEVER SAVE a card | Show fabs always on (pointer:coarse); consider always-visible at reduced opacity on desktop |
| 2 | ✅ Critical | Pricing inconsistent across surfaces: premium sheet says Lifetime RM149, plan table + site say RM179.90, annual missing from sheet | One price source of truth (PRICES const); sheet shows Monthly/Annual/Lifetime consistently |
| 3 | ✅ Critical | Full 128-row Free vs Premium table (#plan overlay) is now orphaned: no button opens it since gold button → premium sheet | Add "See the full comparison" link inside premium sheet footer opening #plan |
| 4 | ✅ High | Header IA muddled: Web/App layout preview + Site page link share one segmented control; Codex is dev-facing; 6 control groups crowd mid widths | Split: layout toggle stays; Site+Codex move into an overflow "···" menu; or demote Codex to footer |
| 5 | ✅ High | Art-brief placeholder text (internal art direction) is exposed to end users on every card face | Keep pattern+glyph visual; fold brief text behind small "i" tip for dev mode only (body.dev class) |
| 6 | ✅ High | "About this dua" fold sits below the scroll fold; more-cue chevron and summary overlap; discoverability low | Move fold summary above flavdiv or pin at panel bottom; ensure more-cue never overlaps it |
| 7 | ✅ High | Account overlay tabs overflow at 375px; sheet padding heavy on phones | Compact tabs (icons+short labels), .ac-in padding 20px, test 375px |
| 8 | ✅ High | Overlays lack focus management: no focus trap, focus not restored on close (pw, ac, pay, spot, plan) | Trap Tab within open overlay; save/restore focus; aria-modal=true role=dialog |
| 9 | ✅ Medium | Card footer/mono text 7-8px: illegible, fails readable floor | Raise gfoot/bk-code to 9.5-10px min; test card layout survives |
| 10 | ✅ Medium | Filter options are buttons with tick visuals but no aria-checked; tabs without tablist roles | role=checkbox/radio + aria-checked on fopt; role=tablist/tab on ac-tabs |
| 11 | ✅ Medium | Search has no visible clear (×); relies on browser-specific search cancel | Add clear button when q non-empty; Esc clears when focused |
| 12 | ✅ Medium | Single toast overwrites rapid actions (deal+premium etc.) | Queue up to 2 toasts or extend duration on replace |
| 13 | ✅ Medium | Problem "cubes" are flat chips; promise of 3D unmet | CSS 3D cube (2 visible faces + hover rotate) sized 56px, glyph on face |
| 14 | ✅ Medium | No first-run hint that cards flip | One-time coach mark on first card ("Tap to flip"), dismissed to localStorage |
| 15 | ✅ Medium | Spotlight prev/next arrows overlap card at <400px | Move arrows into bottom bar on phones |
| 16 | ✅ Low | Flag emoji (🇬🇧🇲🇾) render as letters on Windows | Inline SVG flags fallback |
| 17 | ✅ Low | Storage keys mixed khayr./baik. prefixes | Migrate to baik.* with one-time migration shim |
| 18 | ✅ Low | Grain + backdrop blurs on low-end phones | prefers-reduced-transparency / device-memory guard |
| 19 | ✅ High | Cards do not feel like real printed cards | Stock texture + micro-noise, cut edge with thickness, contact shadow, lift+tilt on hover, sheen sweep |

## Polish pass · 26 Jul (walkthrough findings, all fixed)

| Finding | Fix |
|---|---|
| ✅ Empty "Saved" showed search advice instead of teaching how to save | Context-aware empty states: nothing-saved, no-match-for-word, tags-exclude-each-other, category-not-filled-yet, generic-filters. Each names its cause and carries the button that fixes it, in EN and BM |
| ✅ Arrow keys in deck view silently dead | The keydown handler called `.closest()` on `document`, which has no such method, so it threw whenever the event target was the document. Guarded, and now ignores arrows while typing |
| ✅ Table and transaction empties were flat statements | Rewritten with a title, a sentence and a way out |
| ✅ Sticky set stack could clip on a short window | Below 560px viewport height the stack simply stacks |
| ✅ Copy buttons did nothing at all without the clipboard API | Falls back to the selection method, and always says what happened, in EN and BM |
| ✅ Marquee visibly repeated itself on a 1920 screen | Group widened past 2100px with three more true statements, so no repeat fits on screen |
| ✅ Hero fan's third card was cut off on a phone | Below 520px the fan draws in and overlaps more, the way a real fan closes |
| ✅ Wide screens left the hero floating | Container widens to 1280px above 1500px, deck scales with it |
| ✅ No way back once table cards were dragged to the edges | Tidy button re-lays the spread, in EN and BM |
| ✅ A first visitor had no idea the deck and table views existed | One "New here" line under the finder explaining all three, dismissed by Got it or by using a view, never shown again |
| ✅ **Premium's one working feature did not work.** Unlimited saves is the single Premium line marked "live now", yet the ten-card cap was applied regardless of tier, so a paying reader was stopped at ten exactly like a free one | The cap is now a Free-tier limit. Verified: Free still stops at ten and explains why, Premium saves fourteen without complaint |
| ✅ After a subscription lapsed the chip read "18/10" | That reads as a violation of a quota. The fraction now shows only while it is one; over the cap it shows the plain count, and the account explains that the extra cards were kept from Premium, nothing was removed, every note is still there, and saving resumes under ten or with Premium |
| ✔ The downgrade path itself was already right and was left alone: no saves, notes or collections are deleted when a subscription ends, they simply become read-only |
| ✅ The Saved chip read "14/10" for Premium | The cap label belongs to the Free tier and only Free sees it now |
| ✅ The table was pointer-only, so a keyboard could not use it | A focused card now moves with the arrow keys, ten pixels a step and forty with Shift, clamped and persisted exactly as dragging is. The hint says both ways. Verified it does not collide with the deck view's arrow browsing |
| ✅ The app had no h1 at all | Heading navigation began at h2. A visually-hidden h1 now names the product, and the filter bar is a labelled nav landmark beside the existing header and main |
| ✅ No way past the masthead for a keyboard | A skip link to the deck, hidden until focused. Geometry verified: it lands on screen at the top centre |
| ✔ Contrast measured across the smallest text: 5.61 to 17.84 against its real backgrounds, all above AA. One reading of 1.14 was my measurement walking past a gradient background rather than a defect, re-measured at 9.57 |
| ✅ Every toast was silent to a screen reader | The toast is now role=status with aria-live=polite, so confirmations, gate explanations and errors are announced |
| ✅ Filtering rewrote the deck in silence | A visually-hidden live region announces the result count on every render, in EN and BM |
| ✅ The view switch never said which view was current | aria-pressed on all three, kept in step with the class |
| ✅ A flipped card did not report its state | aria-pressed on the card, updated on click and on Enter or Space, in the deck and the spotlight |
| ✅ The spotlight's scroll cue kept animating under reduced motion | Only the deck's copy was covered; both are now |
| ✅ The filter radiogroups could not be moved with the arrows | Arrow keys move within Set, Kind and Category, with wrapping plus Home and End, while Tab still leaves the group |
| ✔ Stress paths exercised, nothing broken: twelve rapid view switches, three overlays opened on top of each other, the deck view under filters that can match nothing, and dealing with no cubes set. One reading looked like a missing empty state in deck view; re-tested in isolation it was correct, and the first result was my own test polluted by the stacked overlays. Recorded rather than "fixed" |
| ✅ The site said "Bahasa Melayu follows" | It is live: the toggle switches every card and label, and the copy now says so |
| ✅ The site's authenticity answer implied review had happened | Cards carry review: pending and no scholar has seen them yet. The FAQ now states review as the last gate before public release and says plainly that the field reads pending today |
| ✅ The Free plan list understated what free gives | Added English and Bahasa Melayu, the three views, and downloading a card as an image, all genuinely free |
| ✅ The Codex described the old card and the old deck | Six stale claims corrected: the back no longer "carries the reading the front cannot fit" (that moved to the About fold), the picture window no longer "holds the art brief" for readers (dev mode only, readers see the category glyph), the hatching note, the art field description, and "Food & Drink is the one empty category" when there are now six |
| ✅ The Codex category table listed eight under old names | Rebuilt with all thirteen, current names, and card counts verified against the live data card by card |
| ✅ Recent history contradicted the app's own plan table | It capped at five for everyone while the account tried to show eight and the plan promised Premium a longer history. Free now keeps five as advertised, Premium keeps fifty, and the account says "last five on Free" when that is what you have |
| ✅ The site described the old card design | Step three still said the reading lives on the back. It moved to the front behind the About fold in this session, and the back became a plain deck back. Heading, copy and the visual brief now describe what the card actually does |
| ✔ Checked clean this cycle: recent list dedupes and puts the newest first, re-opening a card moves it to the front rather than duplicating, saved order holds, view and language and saves persist across a reload while filters reset so nobody returns to a mysteriously empty deck, every card tooltip matches its real set, position, source and categories, and the spotlight bar fits at 375px |
| ✅ The daily dua turned at UTC midnight | In Malaysia the card changed at eight in the morning. The day index is now anchored to the reader's own midnight, and is strictly monotonic so no card is skipped at a year boundary |
| ✅ The daily dua walked the deck in order | Twelve consecutive days came from one set. It now steps by a stride coprime with the deck size: every card appears once per cycle, and no two consecutive days share a set. Verified across a full 35-day cycle |
| ✅ Two buttons named "Save" side by side in the spotlight | The bookmark keeps Save; the PNG export is now Download image |
| ✔ Card front hierarchy measured and left alone: Arabic 30px white leads, title 17.5px, meaning 14.5px, purpose 12.4px, chrome 9.5px. The reading order matches the intended one, so nothing was fiddled with |
| ✅ Ask-the-table dealt the wrong cards | Picking "Love & marriage" returned travel duas, because the matcher searched the long usage prose where a travel dua mentions family. It now scores the card's own filing first (its leading category counts most), matches words only in title and purpose, and requires a real hit. Thin results say "only 2 cards fit so far", empty ones say the library is still growing, rather than padding with loose matches |
| ✅ Premium was sold on features that do not exist | Both the app sheet and the site plan card listed audio, journeys, word-by-word and offline as though paying delivered them. Each line now carries "live now" or "in build", with a sentence saying only saves and notes work today and the trial is free precisely so you can see that before anything is charged |
| ✅ The site's audio feature card read as available | Marked In build, and says recording has not started |
| ✅ The account promised reminder emails it cannot send | Any live plan now states plainly that nothing was charged, no email can be sent yet, and the reminders described are the shipping policy rather than a running service |
| ✅ "annual and lifetime are one payments" | Grammar fixed to "are paid once" |
| ✅ Dead no-op dblclick handler on the premium sheet | Removed |
| ✅ Codex build states were stale | Bookmark Collections, Personal Notes, Malay Translation and Clear Subscription Terms promoted to built; the summary now reads 20 built, 6 partial, 89 planned, 5 policy |
| ✅ App had no noscript, so JS off meant a blank page | A message explaining that the deck is drawn in the browser, pointing at the site, which reads fully without JS |
| ✅ Arabic fell back to a generic serif if the webfont failed | Real Arabic faces in the stack: Noto Naskh Arabic, Geeza Pro, Al Bayan, Arabic Typesetting, Traditional Arabic |
| ✅ The site preloader could strand the page if its script never parsed | A CSS-only failsafe lifts it at 3.5s, scoped to :not(.done) so the two paths cannot fight |
| ✅ App preview lied about overlays | The account, checkout, premium and spotlight sheets rendered at desktop width inside the 392px phone frame, so the preview could not be trusted. They now take their real phone shape inside it |
| ✔ Checked clean: storage throwing on write (private mode), localStorage absent entirely, tooltips at all four screen edges, table drag clamped far outside the felt, a 62-character email in the account, Codex at 375px, browser zoom at 150% and 200%, the daily banner path, situation chips filling search, the recent list, premium gates while signed out, the FAQ accordion, all four share links and their encoding, a house-voice pass over all three files (no dashes as pauses, no exclamation marks), the spotlight at 1920px (scales 1.6x, fits), and a table holding ten saved cards (none off-stage, none buried) |

## P1 · App features not done

| # | Item | Detail |
|---|---|---|
| 1 | ✅ 5 new categories | Marriage & Love, Anxiety & the Heart, Grief & Loss, Morning & Evening, Gratitude & Praise: CATS entries + colours + GLYPH icons; show as dim chips until cards exist |
| 2 | ✅ Cube remap | love→marriage cat, calm→anxiety cat once added; add Grief cube |
| 3 | ✅ Deck swipe | touch swipe prev/next in deck view |
| 4 | ✅ Notes on saved cards | Premium: textarea per saved card in account, stored khayr.notes |
| 5 | ✅ Collections | Premium: named folders for saves (schema + UI in account Saved tab) |
| 6 | ✅ Recent in account | show RECENT list under Saved |
| 7 | ✅ Font option | Script switch beside A-/A+: Scheherazade New (default) and Amiri Quran (OFL). KFGQPC Uthmanic Hafs v2 still TODO: needs a self-hosted binary with its licence cleared first |
| 8 | ✅ Search BM | when LANG=bm include t/p/my/keg fields in haystack |
| 9 | ✅ Share card image | canvas-render a card to PNG for social share (free tier standard design) |
| 10 | ✅ Trial flow | "7 days free" button → trial state with end date + reminder copy in Plan tab |

## P2 · Site not done

| # | Item | Detail |
|---|---|---|
| 1 | Real assets into 10 placeholder slots | og 1200×630, finder capture 1600×1000, card 1200×1800, flip loop 6s, phone render 1290×2796, table+cubes 1800×1200, account+checkout 2000×1400, email mockup 1000×1400, 3 quotes post-beta |
| 2 | ✅ Waitlist + daily-dua lead capture (local store, honest copy; backend still to come) | keep honest toast until gateway/backend chosen |
| 3 | ◐ BM version of site copy | footer language note shipped; full translation waits on review | mirror toggle or /bm page |
| 4 | ✅ Perf pass | font-display swap, defer lenis/gsap, image budget, CLS check |
| 5 | ✅ SEO | meta canonical, sitemap, JSON-LD (MobileApplication), share URLs with UTM |

## P2.5 · Lead pipeline (new)

| # | Item | Detail |
|---|---|---|
| 1 | Backend for leads | leads sit in localStorage under baik.leads; needs a real endpoint + double opt-in |
| 2 | Daily dua email | template + sender once backend exists; content comes from the verified deck only |
| 3 | Export leads | small admin view or console export until then |

## P3 · Content pipeline · spec (build this before growing the library)

Rule above all: **no Arabic is ever typed, pasted from a webpage, or generated.** Every character
arrives from a verified machine-readable source, keyed, and can be regenerated from that key.

### Card source keys (add to the card schema)

| Field | Meaning | Example |
|---|---|---|
| `srcKind` | `quran` or `hadith` | `quran` |
| `srcKey` | canonical key the text was fetched with | `25:74` or `bukhari:6389` |
| `srcText` | which text edition | `tanzil-uthmani-hafs` / `qul-qpc-uthmani` |
| `srcFetched` | ISO date the text was pulled | `2026-07-26` |
| `verified` | who or what confirmed it | `Tanzil Uthmani (Hafs)` |
| `grading` | hadith only | `sahih` |
| `review` | scholar review state and date | `pending` / `reviewed 2026-08-01 by …` |

### Fetch script · ✅ written · `tools/fetch-cards.mjs` (see `tools/README.md`)

1. Read a plain input list: one row per card, `srcKind, srcKey, set, cats, ten, pen, ken, aen`.
   English/Malay prose is authored by us; Arabic never is.
2. For `quran`: pull the ayah from a local Tanzil or QUL export by `surah:ayah`. Never from a
   scraped page. Keep the Uthmani text byte-exact, including pause marks.
3. For `hadith`: pull from the sunnah.com API by collection + number; carry the grading through.
4. Derive nothing: transliteration and translation also come from the source set, not from us.
5. Emit the `CARDS` array with all source-key fields filled and `review: pending`.
6. Refuse to emit any card missing `srcKey`, text, or source, and print what was rejected.
7. Re-running the script must reproduce the same Arabic, byte for byte. That is the test.

### Order of new content

1. Morning & Evening (highest traffic in every azkar app)
2. Grief & Loss, Anxiety & the Heart (the emotional register the deck lacks)
3. Marriage & Love, Gratitude & Praise
4. The forty Rabbanas as a set of its own, all Quranic, all verifiable

## P3 · Content pipeline (blocks library growth)

| # | Item | Detail |
|---|---|---|
| 1 | ✅ Fetch script written and tested | node/python: Tanzil or QUL export → card JSON by surah:ayah key; store source key on card |
| 2 | ◐ Hadith path | wired to sunnah.com; needs SUNNAH_API_KEY to run | sunnah.com API by collection+number, grading shown |
| 3 | ⬜ First new set | blocked on dropping a Tanzil/QUL export into tools/data | Morning & Evening (highest traffic per research), then Grief & Loss |
| 4 | BM translation pass | fill missing my/keg/asb; queue scholar review before release flag |
| 5 | 40 Rabbanas set | classic Quranic dua collection, all verifiable |

## P4 · Business/system

| # | Item | Detail |
|---|---|---|
| 1 | Gateway decision | Chip or toyyibPay (recurring + TnG/FPX) vs Stripe (cards) per research; document in Codex |
| 2 | Renewal reminder emails | copy drafted (3d monthly / 7d annual) awaiting backend |
| 3 | Refund policy page | plain language + contact email |
| 4 | ✅ Codex update | taxonomy 13, three views, account/payment state, typography verdicts, this plan |
| 5 | Commit checkpoints | user approval needed; suggest commit after each priority band clears |

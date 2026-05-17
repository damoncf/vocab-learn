# VocabLearn

A clean, offline-capable vocabulary learning web app. Review words at a time, mark unfamiliar ones, study their details, then move to the next batch — with spaced repetition (SRS) and quizzes.

## Features (v1.1)

- **Batch review** — 100 words (configurable) displayed in a word grid
- **Click-to-mark** — click any word you don't know to highlight it
- **Detail cards** — pronunciation, part of speech, definition, example sentence (with 🔊 pronunciation)
- **SRS Review System** — unfamiliar words are automatically saved for later review using spaced repetition (1d → 2d → 4d → mastered)
- **Three Quiz Modes** — test yourself with word→definition, definition→word, or spelling exercises
- **Daily records** — familiar words saved, with manual download option
- **Session persistence** — tracks used words across batches so you never repeat
- **Multiple sources** — AI-generated (DeepSeek), or your own `.txt` word files
- **Keyboard shortcuts** — Space, Enter, Escape, R keys for faster navigation
- **API caching** — AI-generated lists and word details cached for 24 hours
- **Learning History** — view past session records

## Quick Start

1. Open `index.html` in a modern browser (Chrome, Firefox, Safari, Edge)
2. Click **Settings** and enter your DeepSeek API key
3. Click **Start Learning**

No build step, no dependencies, no server required.

## Getting a DeepSeek API Key

1. Sign up at [platform.deepseek.com](https://platform.deepseek.com)
2. Go to API Keys → Create new key
3. Paste it into VocabLearn Settings

The key is stored only in your browser's `localStorage` and is only ever sent to `https://api.deepseek.com`.

## Using Your Own Word List

You can supply `.txt` files with your own vocabulary:

- One word per line **or** comma/space separated
- Click **Source → Text File** and choose your file(s)
- Words are deduplicated and cycled through in order

Example file format:

```
ephemeral
loquacious
perspicacious
```

or comma-separated:

```
ephemeral, loquacious, perspicacious, ubiquitous
```

## Record Files

After confirming each batch, a Markdown record is saved to localStorage. Click **Download Record** on the completion screen to export it.

**Format:** `.workspace/records/record-YYYYMMDD.md`

```markdown
# Vocabulary Record — 2026-02-26

## Summary
| Metric | Count |
|---|---|
| Familiar words | 87 |
| Unfamiliar words | 13 |
...

## Familiar Words (✓ Known)
- abandon
- ability
...

## Unfamiliar Words (✗ Needs Study)
- ephemeral
- perspicacious
...
```

## SRS Review System (v1.1)

Words marked as unfamiliar are automatically added to the **Review Pool**. The SRS engine uses three intervals:

1. **Day 1** — First review
2. **Day 2** — If remembered, interval doubles
3. **Day 4** — If remembered again, word is marked **Mastered**
4. **Reset** — If forgotten at any point, interval resets to 1 day

Access the review screen from the welcome page — a badge shows how many words are due for review.

## Quiz Modes (v1.1)

- **See Word, Pick Definition** — Choose the correct Chinese meaning from 4 options
- **See Definition, Pick Word** — Choose the correct English word from 4 options
- **Spelling Practice** — Type the English word shown by its definition

Each quiz is 10 questions. Missed words are automatically added to your review pool.

## Keyboard Shortcuts (v1.1)

| Key | Action |
|-----|--------|
| Space | Start learning / Next batch |
| Enter | Confirm / Next |
| Escape | Close modal / Go back |
| R | Open review (welcome page) |

## Settings

| Setting | Default | Description |
|---|---|---|
| API Key | — | DeepSeek API key |
| Words per batch | 100 | Words shown at a time (10–500) |
| Vocabulary level | Intermediate | B1–B2, A1–A2, C1–C2, Academic, Business |

## File Structure

```
vocab-learning-web2/
├── index.html     # App shell and UI structure
├── style.css      # Dark-theme styling
├── app.js         # Screen state machine, event handling
├── api.js         # DeepSeek API calls + caching
├── storage.js     # localStorage, session tracking, record downloads
├── review.js      # SRS review engine (v1.1)
├── quiz.js        # Quiz mode engine (v1.1)
├── tts.js         # Web Speech API pronunciation (v1.1)
└── README.md      # This file
```

## Browser Compatibility

Tested on Chrome 120+, Firefox 122+, Safari 17+. Requires:
- `fetch` API
- `localStorage`
- `FileReader` API (for file loading)
- `Blob` + `URL.createObjectURL` (for record downloads)
- `SpeechSynthesis` (for pronunciation)

# Upwork Proposal Generator

AI-powered tool that writes tailored, human-sounding Upwork proposals from your profile and a pasted job post, using Google Gemini.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?logo=googlegemini)
![Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-green)

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Profile management** — build a profile manually or upload a CV (PDF/TXT), auto-parsed into skills, experience, projects, achievements, and tools.
- **Tailored generation** — paste any Upwork job post and get a proposal written around your actual background.
- **Tone modes** — `Honest` (strictly factual, no embellishment) or `Confident` (persuasive, more assertive framing).
- **Short mode** — force a tight, no-filler proposal for quick applications.
- **Screening questions** — automatically detects and answers screening questions from the job post in a clearly separated section.
- **Humanized output** — avoids AI cliché phrases, repetitive rhetorical patterns ("not just X, it's Y"), em/en dashes, and stat-stuffing so proposals read like something a person actually typed.
- **No-profile mode** — generate a generic proposal without picking a saved profile.
- **Multiple profiles** — searchable profile list for freelancers who target different niches.
- **History & editing** — save, bookmark, and edit past proposals; export as Word (`.doc`) or PDF, or copy to clipboard.

## Tech Stack

| Layer      | Choice                                  |
|------------|------------------------------------------|
| Framework  | [Next.js](https://nextjs.org) 16 (App Router, Turbopack) |
| UI         | React 19                                |
| Database   | SQLite via [Prisma](https://www.prisma.io) ORM |
| AI         | [Google Gemini](https://ai.google.dev) (`@google/genai`), model `gemini-2.5-flash` |
| File parsing | `multer` (uploads) + `pdf-parse` (CV text extraction) |

## Prerequisites

- Node.js 20+
- npm
- A [Google Gemini API key](https://aistudio.google.com/apikey)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up your environment variables (see below)
cp .env.example .env   # or create .env manually

# 3. Run database migrations
npx prisma migrate dev

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable         | Required | Description                                      |
|-------------------|----------|--------------------------------------------------|
| `DATABASE_URL`    | Yes      | SQLite connection string, e.g. `file:./dev.db`    |
| `GEMINI_API_KEY`  | Yes      | Google Gemini API key. Without it, the app falls back to a mock proposal instead of calling the model. |

Never commit `.env` — it holds your API key. It's already excluded via `.gitignore`.

## Available Scripts

| Command         | Description                          |
|------------------|---------------------------------------|
| `npm run dev`    | Start the development server (Turbopack) |
| `npm run build`  | Build for production                  |
| `npm run start`  | Start the production server           |
| `npm run lint`   | Run ESLint                            |

## Project Structure

```
src/app/
├── page.js                  # Main generator UI
├── onboarding/page.jsx       # Profile creation & management
├── saved/page.jsx            # Proposal history
└── api/
    ├── generate/route.js     # Proposal generation (POST) + edit save (PUT)
    ├── profile/route.js      # Profile CRUD + CV-to-profile parsing
    └── cv-upload/route.js    # CV file upload handling

prisma/
└── schema.prisma             # Database schema (Profile, JobPost, Proposal)
```

## How It Works

1. You create a profile (manual text or CV upload) — Gemini structures it into skills, experience, projects, achievements, and tools.
2. You paste a job post (and optional screening questions).
3. The app builds a prompt combining your profile, the job post, the selected tone, and a set of humanization rules, then calls Gemini to generate the proposal.
4. The result is editable, copyable, downloadable, and can be bookmarked or saved to history.

## API Reference

| Method | Route              | Purpose                                  |
|--------|--------------------|--------------------------------------------|
| `POST` | `/api/generate`    | Generate a proposal from a job post + profile |
| `PUT`  | `/api/generate`    | Save an edited version of a proposal      |
| `GET`  | `/api/profile`     | List saved profiles                       |
| `POST` | `/api/profile`     | Create a profile from raw text            |
| `PUT`  | `/api/profile`     | Rename a profile                          |
| `DELETE` | `/api/profile`   | Delete a profile                          |
| `POST` | `/api/cv-upload`   | Upload a CV (PDF/TXT) and create a profile from it |

## Database Schema

- **Profile** — name, raw text, and structured JSON fields (skills, experience, projects, achievements, tools).
- **JobPost** — the pasted job description plus optional parsed metadata (title, budget, screening questions).
- **Proposal** — generated content, tone mode, edited version, saved/bookmarked state, linked to a `JobPost`.

## Known Limitations

- Uses SQLite, intended for local/single-user use, not multi-tenant production deployment as-is.
- Gemini doesn't perfectly follow every style rule 100% of the time (LLM instruction-following isn't guaranteed); the dash-removal rule is enforced in code, others are prompt-level.
- Word/PDF export use lightweight browser-native tricks (HTML-as-`.doc`, print-to-PDF), not a full document-generation library, so formatting is basic.

## Roadmap

- [ ] Medium-length option (between Short and full-length)
- [ ] Code-level enforcement for stat count / banned phrasing, not just prompt instructions
- [ ] Styled PDF/Word export (via a proper document library) if richer formatting is needed

## Contributing

This is currently a personal/single-maintainer project. Issues and suggestions are welcome; open a PR if you'd like to contribute.

## License

[MIT](LICENSE) — free to use, modify, and distribute.

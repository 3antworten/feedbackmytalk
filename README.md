<p align="center">
  <img src="assets/logo/combinedmark_full.png" alt="Feedback My Talk" width="360">
</p>

<h3 align="center">Feedback My Talk</h3>

<p align="center">
  Live, per-slide feedback for talks and presentations.<br>
  Upload a deck, share a join link, and let your audience comment and ask questions — slide by slide, in real time.
</p>

<p align="center">
  📺 <a href="https://youtu.be/JBT6Zbd0cUs">Watch a 2-minute demo</a> ·
  🌐 <a href="https://feedbackmytalk.com">Try the hosted version</a>
</p>

---

## What it does

Speakers upload a PDF deck, create a rehearsal or live session, and share a join link or QR
code. Participants — no account required — browse the slides on their own device and leave
comments and questions on any slide as they go. Both speakers and participants review
everything afterward through **Comments** and **Questions** tabs, a top-voted flat
list, or the same items grouped by slide with a persistent thumbnail.

### Highlights

- **Upvote/downvote everything** — every comment and question can be voted 👍/👎 by anyone in
  the session. Lists are sorted by score first, then the viewer's own feedback, then oldest first.
- **Two ways to browse feedback** — switch between the top-voted flat list and a per-slide grouped view with a
  thumbnail of the slide.
- **Shared "asked live", private notes** — any participant can mark a question as asked live;
  once marked, every participant gets to leave a note on how the answer landed
  (auto-saved as they type, only visible to the speaker).
  The speaker sees a read-only ASKED/NOT ASKED badge and the list of notes people left, only when there are any.
- **Practice Q&A** — speakers can maintain a list of anticipated questions per session.
  Participants get a dedicated tab to rehearse against them: marking which ones they'd ask, and
  privately noting how well an answer landed.
- **Automatic slide headers** — on upload, each slide's largest line of text is used as its
  header throughout the app (dropdowns, review screens, thumbnails), falling back to "Slide N"
  when a page has no extractable text.
- **A trailing "general" slide** — every deck gets one synthetic slide after the last page, for
  wrap-up comments and questions that aren't tied to any particular slide.
- **A real landing page** — logged-out visitors choose "I'm a participant" (straight to the join
  screen) or "I'm a speaker" (log in / register). Already-logged-in speakers skip straight to
  their dashboard.
- **Custom join codes** — rename a session's join code to anything human-readable
  (`TEAM-STANDUP`, letters/digits/hyphens, 3–40 characters); the server checks the format and
  rejects codes already in use.
- **Site administration** — the first account ever registered becomes the site admin, with a
  panel to toggle whether new sign-ups are allowed and to view or remove any speaker account or
  deck.
- **Self-service deletion** — speakers can delete their own decks and sessions, not just admins.
  Deck deletion cascades its sessions and removes rendered slide images from disk; session
  deletion leaves the parent deck and its other sessions untouched.
- **Footer, legal pages, and a cookie notice** — every page links to `/privacy` and `/imprint`;
  a real deployment supplies its own text locally (see [Self-hosting: legal
  pages](#self-hosting-legal-pages) below) rather than shipping with anyone else's.
- **Optional email confirmation** — if a mail server is configured, new accounts must confirm
  their email before logging in. Without one configured, accounts remain active immediately, as
  in earlier versions.

## Roles at a glance

- **Admin** *(first registered account, one per install)* — everything a speaker can do, plus a
  panel to toggle sign-ups and manage any speaker account or deck.
- **Speaker** — registers, uploads decks, manages sessions (name, join code, open/closed,
  practice questions), and reviews feedback.
- **Participant** — no account. Joins via code, link, or QR code; identity is a token stored in
  the browser, scoped to a single session.

## Tech stack

- **Backend** (`server/`) — Node.js + Express, SQLite (`better-sqlite3`), JWT in an httpOnly
  cookie for speaker auth, `mupdf` (WASM) to rasterize PDF pages into slide images, `multer` for
  uploads, `nodemailer` for optional confirmation emails.
- **Frontend** (`client/`) — React + Vite, `react-router-dom`, `qrcode.react` for join QR codes,
  `marked` to render the legal pages from markdown. Plain CSS, no component library.
- **Participant identity** — no accounts at all. On joining, the server issues an opaque token
  that the client stores in `localStorage`, keyed by session — joining a different session means
  a different identity. Sent back to the server as `X-Participant-Token`.

## Getting started

Two terminals:

```bash
cd server && npm install && npm run dev     # http://localhost:3001
cd client && npm install && npm run dev     # http://localhost:5173 (proxies /api and /uploads to :3001)
```

Open `http://localhost:5173`, register a speaker account, upload a PDF, create a session, and
open the printed join link in another (private/incognito) browser tab to try it as a
participant.

The SQLite database lives at `server/data/app.db`; rendered slide images at
`server/uploads/<deckId>/`. Both are gitignored — delete them anytime to reset to a clean state.

## Docker / Docker Compose

The repository includes production-oriented Docker setup for both services:

- `server/Dockerfile` runs the API (`npm start`) on port `3001`.
- `client/Dockerfile` builds the React app and serves it with nginx.
- `client/nginx/default.conf` proxies `/api` and `/uploads` to the API container.
- `docker-compose.yml` wires everything together and persists SQLite data/uploads in Docker
  volumes.

Quick start:

```bash
cp .env.docker.example .env
docker compose up --build -d
```

Open `http://localhost:8080`.

Useful commands:

```bash
docker compose logs -f
docker compose down
docker compose down -v   # also removes database + uploaded slide images
```

Notes:

- Set a strong `JWT_SECRET` in `.env` before exposing the app publicly.
- `APP_DOMAIN` should match your public URL in real deployments (used in confirmation emails).
- For mail/confirmation flow, set `SMTP_*` values in `.env`.

## Configuration

All configuration is via environment variables read in `server/src/config.js` — copy
`server/.env.example` to `server/.env` and fill in what you need. Every variable is optional;
with nothing set, the app behaves as a self-contained local instance.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | API port. |
| `JWT_SECRET` | a dev placeholder | Signs the speaker auth cookie — **set this before deploying anywhere real.** |
| `APP_DOMAIN` | `http://localhost:5173` | The public URL the app is reachable at (no trailing slash). Used to build absolute links in emails. Only relevant if `SMTP_HOST` is set. |
| `SMTP_HOST` | unset (mail disabled) | Setting this enables mail sending and, with it, mandatory email confirmation for new accounts. |
| `SMTP_PORT` | `587` | |
| `SMTP_SECURE` | `false` | `"true"` for implicit TLS (port 465); leave unset for STARTTLS on 587. |
| `SMTP_USER` / `SMTP_PASS` | unset | SMTP auth credentials, if your provider requires them. |
| `SMTP_FROM` | `SMTP_USER`, else `no-reply@localhost` | From-address on outgoing mail. |

With `SMTP_HOST` unset, registration works immediately: the account is created and logged in
right away. With it set, registering sends a confirmation email with a link to
`${APP_DOMAIN}/confirm-email/:token`; the account can't log in until that link is opened (the
token expires after 24h, and an unconfirmed account can request a new one from the login
screen). The **first account** on an install — which becomes the site admin — is always
activated immediately regardless of mail configuration, so a misconfigured `SMTP_HOST` can never
lock the admin out of their own instance. The admin panel shows whether mail is currently
configured and flags any still-unconfirmed accounts.

### Self-hosting: legal pages

The `/privacy` and `/imprint` pages, and the cookie banner's link text, are resolved by `client/src/legalLoader.js` at build time:

1. `client/src/legalContent.js` is a generic placeholder and contains no real operator details.
2. `client/src/legalContent.local.js` might hold the real text for
   an actual deployment — your name/company, address, and an actual privacy policy — and is
   used automatically whenever it exists on disk. If it's missing, the app falls back to the
   placeholder rather than failing to build.

To run a real instance: copy `client/src/legalContent.local.example.js` to
`client/src/legalContent.local.js` and fill in your own details. It's a structural starting
point, not legal advice — have it checked for your jurisdiction before relying on it.

## Design notes

A few implementation choices worth knowing about if you're extending or self-hosting this:

- **Shared visibility** — all participants in a session see all comments and questions on a
  slide from everyone else in that session; only the author (or the speaker, for moderation) can
  delete an item.
- **Voting** — one vote per person per item (`participant:<id>` or `speaker:<id>` as the voter
  key), stored as a single up/down row that's upserted on change and deleted when toggled off.
  Comments and questions each have their own vote table.
- **Asked-live vs. answer notes** — `asked_live` lives on the question itself (a single shared
  fact anyone can flip), while the "how did it land" note is per participant (its own table,
  one row per participant per question) — deliberately different from the shared boolean, since
  it's everyone's own opinion rather than a fact about the session.
- **PDF rendering** — done server-side via `mupdf`'s WASM build rather than a native-binding
  library, so there's no system-level dependency (Cairo, Ghostscript, poppler-utils, etc.) to
  install. Slides render at roughly 144 DPI as JPEG (80% quality) to keep storage and transfer
  size moderate.
- **QR codes** — generated client-side from the join URL; no server-side QR generation involved.
- **Join codes** — short, human-typeable 6-character codes are auto-suggested (e.g. `L6CRVN`)
  rather than raw UUIDs, and can be renamed to something custom afterward.
- **Auth** — email + password with `bcryptjs` hashing and a JWT in an httpOnly cookie. No SSO.
  The JWT secret defaults to a development placeholder — set `JWT_SECRET` before any real
  deployment.
- **Deletion is destructive by design** — deleting a speaker account or a deck (whether by the
  speaker themselves or an admin) cascades through everything underneath it (sessions,
  participants, comments, questions, uploaded slide images) with no soft-delete or undo.

## Known limitations

- No rate limiting, and no file-size/virus scanning beyond a 50MB PDF cap.
- No automated test suite yet — verified manually end-to-end (register → upload → create session
  → join → comment/question → review → close session → read-only) during development.
- SQLite plus local disk storage — intended for small-scale use (roughly a dozen participants
  per session, one server instance). Moving beyond that would mean object storage and a
  networked database.

## License

Feedback My Talk is free, open-source software, licensed under **AGPL-3.0**. You're welcome to
self-host it — see [Getting started](#getting-started) above — or just sign up for free at
[feedbackmytalk.com](https://feedbackmytalk.com).

If you deploy this for others to use, note that you become the data controller for that
instance: see [Self-hosting: legal pages](#self-hosting-legal-pages) above, and make sure your
own Imprint/Privacy Policy replace the placeholders before going live.

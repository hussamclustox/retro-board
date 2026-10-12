# Retro Board

Real-time team retrospectives: **Went Well**, **To Improve**, **Action Items**.

- Dashboard of the boards you host. Create a board by entering a name.
- Share link: participants enter their name and join. Presence shows who's online.
- Add points with **Enter**. Drafts are never visible to others while you type.
- Likes and comments on every point. Drag points within and between columns.
- **Anonymous** toggle per user: hides your name on all your points and comments from everyone, including the host.
- Host controls: **Hide/Reveal points** (each person sees only their own until reveal), **Lock** (read-only), and edit or delete any point or comment.
- **Share** (top right): copy the invite link. The host can also download a PDF of the board (a screenshot plus its JSON export), named after the board.

Stack: Next.js 15 (App Router) + Tailwind, Supabase (Postgres + Realtime) and jsPDF. Everything runs on free tiers.

## Local setup

### Option A: Supabase running locally (Docker)

Requires Docker and a user that can run it (`sudo usermod -aG docker $USER`, then log out and back in).

```bash
npm install
npm run db:start      # first run downloads the images; applies supabase/migrations automatically
npm run db:status     # shows API URL, anon key and service_role key
```

Put the values from `db:status` into `.env.local` (`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, plus the anon and service_role keys). Then run `npm run dev`. Supabase Studio is at <http://127.0.0.1:54323>. Stop everything with `npm run db:stop`.

### Option B: Supabase cloud (free)

1. **Supabase (free).** Create a project at <https://supabase.com>.
   - Apply the schema. Either:
     - with the CLI: `npx supabase login`, then `npx supabase link --project-ref <ref>`, then `npx supabase db push`; or
     - in the **SQL Editor**: run each file in [`supabase/migrations/`](supabase/migrations/) in filename order.
   - Under **Project Settings → API**, copy the project URL, the `anon` key and the `service_role` key.
2. Configure and run:

   ```bash
   cp .env.example .env.local   # fill in the keys
   npm install
   npm run dev
   ```

3. Open <http://localhost:3000>.
   - To test with colleagues on your network, set `NEXT_PUBLIC_APP_URL=http://<your-lan-ip>:3000` in `.env.local`, restart, and share links from the Share menu.

## How it works

- **Data lives in Supabase Postgres.** Tables have RLS enabled and no policies. The browser never touches them; every read and write goes through the Next.js API routes in `src/app/api`, using the service-role key.
- **Identity without login.**
  - Creating a board returns a secret **host token**. Joining returns a **participant token**.
  - Both are kept in the browser's localStorage and sent as headers.
  - Only SHA-256 hashes are stored in the database.
  - If you clear site data, you lose host access to boards created in that browser.
- **Anonymity is enforced on the server.**
  - `GET /api/boards/:id` (see `src/lib/boardData.ts`) removes names of anonymous authors for every caller, the host included. The PDF's JSON export does the same.
  - Likes are returned only as counts.
  - The text of hidden (unrevealed) points by others is never sent to participants. They get placeholders with just the position and the author, and the author is "Anonymous" when that person has anonymity on. The card routes treat hidden cards as missing (404).
- **Live sync.**
  - After every write, the API sends a data-free `changed` ping on the Supabase Realtime channel `board:<id>`, and connected clients refetch their own sanitized view.
  - Writes are applied optimistically in the UI.
  - Presence uses the same channel.
- **PDF export.** The browser renders a JPEG of the board with `html-to-image` and fetches `GET /api/boards/:id/export` (host only, because it includes still-hidden points). `src/lib/exportPdf.ts` then builds the PDF with jsPDF, entirely client-side: page 1 is the screenshot, and the following A4 pages hold the JSON. The file is named after the board.

## Free-tier notes

- Supabase pauses free projects after 7 days without activity. Resume them from the dashboard.
- The code needs no custom server, so it can be deployed to Vercel Hobby later by adding the same env vars.

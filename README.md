# AI Literacy Survey · CodeWalnut

A game-style AI literacy self-assessment that CodeWalnut runs for client teams. Topic blocks fall one at a time and each person drops them into one of four lanes (from *Never heard of it* to *Confident / Expert*). Admins get team-by-team reports they can download as PDF or present full screen to leadership.

**Live site:** `https://cw-codewalnut.github.io/ai-literacy-survey/` (after setup below)

## How it works

**Survey takers** open the link, sign in with GitHub, and their survey opens automatically. The app knows their team and category from their invitation. Afterwards they see only their own result. Retaking replaces their previous answers.

**Admins** (CodeWalnut staff) can:

| Area | What you can do |
|---|---|
| Teams | Create, rename, archive or delete teams (e.g. *APMT – Maersk – Data Engineering*) |
| Invitations | Add people to a team + survey category by work email or GitHub username, copy a ready-made invite message, see who has completed it, exclude individuals from reports |
| Waiting for approval | Anyone who signs in without a matching invitation appears here; pick their team and category and approve |
| Reports | One report per team + category: summary, strength by area, every topic by level, AI usage, tool adoption, and individuals. **Download PDF** or **Present full screen** (slides never show individuals) |
| Questions | Edit, reorder, hide or add topics and sections for each category. Changes apply to the next person who starts |
| Settings | Add or remove admins; words that exclude internal or test responses from reports |

**Survey categories:** Data Engineering, Software Engineering, Architecture, Leadership. Each has its own question bank (`supabase/question_banks.py` is the source of the defaults).

**Privacy:** individual answers are readable only by the person who gave them and by admins. This is enforced by Postgres row-level security in Supabase (`supabase/01_schema.sql`), not by the web page.

## Tech

- Static HTML/CSS/JavaScript, no build step. Hosted on GitHub Pages.
- [Supabase](https://supabase.com) for the database and GitHub sign-in.
- Deployed by `.github/workflows/deploy.yml`, which writes `assets/js/config.js` from repository secrets at deploy time. No configuration is committed.

> **About the keys:** the Supabase URL and *publishable* key are stored as repository secrets so they never appear in the code. A website must give its publishable key to every browser that opens it, so visitors can see it in the deployed site. That is by design and safe: the database rules decide what each signed-in person can read or write. **Never** use the `sb_secret_...` key here; the workflow refuses it.

## Setup (one time, about 20 minutes)

### 1. Database (Supabase)
1. In your Supabase project, open **SQL Editor** and run, in order:
   1. `supabase/01_schema.sql`: tables and access rules
   2. `supabase/02_seed_questions.sql`: the four default question banks
   3. `supabase/03_first_admin.sql`: replace `your-github-username` with your GitHub username first
2. **Authentication → Sign In / Providers**
   - **GitHub:** enable it, paste the Client ID and Secret from step 2, and turn on **Allow users without an email**.
   - **Email:** turn it off, so GitHub is the only way in.
3. **Authentication → URL Configuration:** set **Site URL** to `https://cw-codewalnut.github.io/ai-literacy-survey/` and add the same address under **Redirect URLs**.

### 2. GitHub sign-in (OAuth app)
In GitHub: **CW-Codewalnut organisation → Settings → Developer settings → OAuth Apps → New OAuth App**
- Homepage URL: `https://cw-codewalnut.github.io/ai-literacy-survey/`
- Authorization callback URL: `https://<your-project-ref>.supabase.co/auth/v1/callback` (shown in Supabase on the GitHub provider screen)

Copy the Client ID, generate a client secret, and paste both into Supabase (step 1.2).

### 3. Deploy (GitHub Pages)
1. Repo **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_URL`: `https://<your-project-ref>.supabase.co`
   - `SUPABASE_PUBLISHABLE_KEY`: the publishable key (`sb_publishable_...`) from Supabase → Project Settings → API Keys
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run the workflow from the **Actions** tab). The site is live a minute later.

### 4. Use it
Sign in on the live site → **Admin** → create a team → **Invitations** → add emails → **Copy invite message** and send it from Outlook or Teams.

## Changing the logo
Replace `assets/img/logo.svg` (and `assets/img/favicon.svg`) with the official CodeWalnut logo, keeping the file names.

## Local development
Copy `assets/js/config.example.js` to `assets/js/config.js` (git-ignored), fill in your project values, and serve the folder with any static server, e.g. `python3 -m http.server`. Add `http://localhost:8000/` to Supabase's Redirect URLs to sign in locally.

## License
Proprietary. © CodeWalnut. All rights reserved. See [LICENSE](LICENSE).

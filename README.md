# Skill Stack: AI literacy self-check

A Tetris-style self-assessment for data engineers. Players sign in with GitHub, drop 34 topic blocks into four lanes (Never heard → Expert), and their answers save automatically. Playing again overwrites their previous answers (the attempt count is kept).

- **Players** see their own result card and the team totals (after 3+ people have played).
- **The organizer** also sees every individual, a per-topic breakdown per person, an invite list with who hasn't played yet, and can print a PDF.
- **Only GitHub usernames on the invite list** can play or see anything. The database enforces this, not just the page.

Files: `index.html` (the game and report), `config.js` (your two Supabase values), `setup.sql` (database tables and access rules).

---

## One-time setup (about 20 minutes)

### 1. Create the database (Supabase, free)
1. Sign up at https://supabase.com and click **New project** (any name, e.g. `skill-stack`; pick a region near India/Europe).
2. When it's ready, open **SQL Editor → New query**, paste all of `setup.sql`.
3. In the last section, replace `YOUR_GITHUB_USERNAME` with **your** GitHub username, then click **Run**. You should see "Success".
4. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key into `config.js`.

### 2. Put the site on GitHub (CodeWalnut org)
1. Create a repo in the CodeWalnut organization, e.g. `codewalnut/skill-stack`.
2. Upload `index.html`, `config.js` and `README.md` (keep `setup.sql` too if you like; it contains no secrets).
3. Repo **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
4. Note the site address, e.g. `https://codewalnut.github.io/skill-stack/`.

> A private repo can publish Pages on GitHub's paid plans. Either way the site only shows a "Sign in with GitHub" screen to anyone not on your invite list: no answers or results are in the repo or the page.

### 3. Turn on "Sign in with GitHub"
1. In GitHub: **CodeWalnut org → Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Application name: `Skill Stack`
   - Homepage URL: your site address from step 2
   - Authorization callback URL: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback` (your Supabase Project URL + `/auth/v1/callback`)
2. Click **Register**, then **Generate a new client secret**. Copy the Client ID and the secret.
3. In Supabase: **Authentication → Sign In / Providers → GitHub** → enable, paste Client ID and secret → Save.
4. In Supabase: **Authentication → URL Configuration** → set **Site URL** to your site address, and add the same address under **Redirect URLs**.

### 4. Invite people
Open the site, sign in with GitHub, click **Organizer report**, and add the 16 GitHub usernames in **Invite list** (comma separated). The list shows ✓ next to everyone who has played, so you can chase the rest.

Then send everyone the site link. That's all they need.

---

## Notes
- **Retakes:** a player can press **Restack** any time; their row is replaced and `attempts` goes up by one.
- **Privacy:** individual answers are readable only by the player and admins (`is_admin = true` in `allowed_users`). To add a co-organizer, run in SQL Editor: `update allowed_users set is_admin = true where github_username = 'their-username';`
- **Raw data:** Supabase → Table Editor → `responses` (export to CSV), or **Copy as CSV** in the Organizer report.
- **Corporate networks:** players' browsers must reach `github.io` and `supabase.co`. If either is blocked on the Maersk network, ask their IT to allow it or have them use another network.
- **Free-tier note:** Supabase pauses free projects after a week with no activity; un-pause from the dashboard if that happens.

/* Boot, routing, navigation and the survey taker's home. */
"use strict";
(function () {
const {el, $} = App;
const GH_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

function parseHash() {
  const h = location.hash.replace(/^#\/?/, "");
  const [path, qs] = h.split("?");
  const q = Object.fromEntries(new URLSearchParams(qs || ""));
  return {parts: (path || "").split("/").filter(Boolean), q};
}

function renderNav() {
  const nav = $("appnav"); nav.textContent = "";
  if (!App.me) return;
  const {parts} = parseHash();
  nav.append(el("a", {href:"#/", class: !parts.length ? "on" : null}, "My surveys"));
  if (App.me.isAdmin) nav.append(el("a", {href:"#/admin/teams", class: parts[0] === "admin" ? "on" : null}, "Admin"));
  nav.append(el("span", {class:"who"}, App.me.avatar ? el("img", {src:App.me.avatar, alt:""}) : null, "@" + (App.me.gh || App.me.email),
    el("button", {class:"link", type:"button", onclick:App.signOut}, "Sign out")));
}

/* A still Tetris "well": letters are pieces, '.' empty, '_' the one gap that would clear the line */
const PIECE = {T:"#8a6ff0", L:"#c98316", J:"#1c9bc4", S:"#3f9f57", Z:"#e25a4a", O:"#d4559a", I:"#6fd0f5"};
const WELL = [
  "...TTT....",
  "....T.....",
  "..........",
  "..........",
  "..........",
  "..........",
  "..........",
  "I.........",
  "I......SS.",
  "I..OO.SS.L",
  "IJ.OOZZ..L",
  "JJJ.TZZ.LL",
  "SS.TTTOOIJ",
  ".SSLLLOO_J",
  "ZZOOIIIIJJ"];
function well() {
  const g = el("div", {class:"well-grid", "aria-hidden":"true"});
  WELL.forEach((row, r) => [...row.padEnd(10, ".")].forEach((ch, c) => {
    if (ch === "_") g.append(el("i", {class:"gap"}));
    else if (PIECE[ch]) g.append(el("i", {class:"b", style:`background:${PIECE[ch]}`}));
    else g.append(el("i"));
  }));
  return el("div", {class:"well"}, g,
    el("span", {class:"well-tag", style:"top:4%;right:6%"}, "▼ RAG pipelines"),
    el("span", {class:"well-tag", style:"top:52%;left:6%;color:#ffd27a"}, "LEVEL 3 CLEAR!"),
    el("div", {class:"well-hud"}, el("span", {}, "LEVEL", el("b", {}, "4 / 7")), el("span", {}, "BLOCKS", el("b", {}, "21")), el("span", {style:"text-align:right"}, "SCORE", el("b", {}, "04,150"))));
}

function renderSignIn() {
  const main = $("main"); main.textContent = "";
  const btn = el("button", {class:"btn gh big", type:"button", onclick:App.signIn}); btn.innerHTML = GH_ICON + " Sign in with GitHub";
  const laneCols = ["#4a5079", "#2f5f80", "#3592c0", "#6fd0f5"];
  main.append(el("section", {class:"arcade"}, el("div", {class:"signin"},
    el("div", {},
      el("div", {class:"eyebrow"}, "CODEWALNUT · AI LITERACY SURVEY"),
      el("h1", {class:"title-xl glow"}, "How deep is your ", el("span", {class:"hl"}, "AI stack?")),
      el("p", {class:"muted", style:"font-size:17px;max-width:46ch;margin:0"}, "A game-style self-check of your AI skills. Topics drop like Tetris blocks. You stack each one where it honestly belongs. No right or wrong answers."),
      el("ul", {class:"steps"},
        el("li", {}, el("span", {class:"n", style:"background:#1c9bc4"}, "1"), el("span", {}, "Sign in with GitHub")),
        el("li", {}, el("span", {class:"n", style:"background:#c98316"}, "2"), el("span", {}, "Your team's survey loads automatically")),
        el("li", {}, el("span", {class:"n", style:"background:#3f9f57"}, "3"), el("span", {}, "Clear every level and get your AI literacy card"))),
      el("div", {class:"row", style:"gap:16px"}, btn, el("span", {class:"coin"}, "★ 1 PLAYER · NO TIMER")),
      el("p", {class:"faint", style:"font-size:13px;margin-top:16px"}, "Your individual answers are seen only by the survey administrators."),
      el("div", {class:"lane-strip"}, ["Never heard of it", "Know a little", "Can implement it", "Confident / Expert"].map((l, i) =>
        el("div", {style:`border-top-color:${laneCols[i]}`}, el("b", {}, String(i + 1)), l)))),
    well())));
}

function playerHeader(stats) {
  const av = App.me.avatar ? el("img", {src:App.me.avatar, alt:""}) : el("div", {class:"avatar"});
  return el("div", {class:"player"}, av,
    el("div", {}, el("div", {class:"eyebrow"}, "PLAYER 1"), el("div", {class:"px", style:"font-size:22px;color:#fff"}, App.me.name || "@" + (App.me.gh || App.me.email)),
      el("div", {class:"faint", style:"font-size:13px"}, "@" + (App.me.gh || App.me.email))),
    el("span", {class:"spacer"}),
    stats ? el("div", {class:"hiscore"}, stats.map(([l, v]) => el("div", {class:"hs"}, el("div", {class:"stat-l"}, l), el("div", {class:"stat-v"}, v)))) : null);
}

function cartridge(inv, r) {
  const bank = App.bank(inv.category_id);
  const p = r ? App.profileOf(r.answers, bank) : null;
  const st = p ? App.stage(p.index)[0] : null;
  return el("article", {class:"cart"},
    el("div", {class:"cart-top"},
      el("div", {class:"cart-blocks", "aria-hidden":"true"}, bank.sections.map(s => el("i", {style:`background:${s.color || "#5a5f8c"}`}))),
      el("h3", {}, bank.cat.name), el("div", {class:"team"}, inv.teams.name),
      r ? el("span", {class:"flag done"}, "★ CLEARED") : el("span", {class:"flag new"}, "NEW")),
    el("div", {class:"cart-meta"},
      el("div", {}, "Blocks", el("b", {}, bank.items.length)),
      el("div", {}, "Levels", el("b", {}, bank.sections.length)),
      el("div", {}, "Time", el("b", {}, "~" + App.minutesFor(bank.items.length) + "m"))),
    p ? el("div", {class:"cart-score"}, el("span", {class:"stage-badge"}, "🏆 " + st), el("span", {class:"meter"}, el("i", {style:`width:${p.index}%`})), el("b", {}, p.index))
      : el("div", {class:"cart-score faint", style:"font-size:13px"}, "Not played yet. Your score appears here."),
    el("div", {class:"cart-actions"},
      el("a", {class:"start", href:`#/survey/${inv.id}`}, r ? "▶ PLAY AGAIN" : "▶ PRESS START"),
      r ? el("a", {class:"start alt", href:`#/result/${inv.id}`}, "MY CARD") : null));
}

async function renderHome() {
  const main = $("main"); main.textContent = ""; main.append(el("div", {class:"loading"}, "Loading your surveys…"));
  const [invites, resp] = await Promise.all([App.myInvites(), App.myResponses()]);
  if (invites.length === 1 && !resp[invites[0].id] && !App.me.isAdmin) { location.hash = `#/survey/${invites[0].id}`; return; }
  main.textContent = "";
  if (!invites.length) {
    if (App.me.isAdmin) {
      main.append(el("section", {class:"arcade"}, playerHeader(),
        el("div", {style:"margin-top:28px"}, el("div", {class:"eyebrow"}, "NO CARTRIDGES LOADED"),
          el("h2", {class:"px", style:"font-size:24px;margin:8px 0;color:#fff"}, "You're an admin"),
          el("p", {class:"muted", style:"max-width:60ch"}, "To take a survey yourself, invite your own GitHub username to a team and survey under Admin → Invitations. Your answers are kept out of team reports."),
          el("div", {class:"row", style:"margin-top:16px"}, el("a", {class:"start", style:"flex:0 0 auto", href:"#/admin/invite"}, "▶ INVITE MYSELF"), el("a", {class:"start alt", href:"#/admin/teams"}, "OPEN ADMIN")))));
      return;
    }
    await App.sb.from("access_requests").upsert({user_id:App.me.uid, github_username:App.me.gh || null, email:App.me.email || null, display_name:App.me.name || null, requested_at:new Date().toISOString()}, {onConflict:"user_id"});
    main.append(el("section", {class:"arcade", style:"text-align:center;padding:48px 32px"},
      el("div", {class:"eyebrow"}, "PLAYER 1 · READY"),
      el("h1", {class:"title-xl glow", style:"font-size:clamp(26px,4vw,42px)"}, "Waiting for ", el("span", {class:"hl"}, "player approval")),
      el("p", {class:"muted", style:"max-width:56ch;margin:0 auto"}, `Signed in as @${App.me.gh || App.me.email}. We couldn't match you to a survey yet, so the administrators have been notified. Once they approve you, refresh this page and your survey loads.`),
      el("p", {class:"faint", style:"font-size:13px;max-width:56ch;margin:14px auto"}, "Invited by email? That email must be the main email on your GitHub account. Otherwise, send your GitHub username to the person who invited you."),
      el("button", {class:"start", style:"flex:0 0 auto;margin-top:8px", type:"button", onclick:() => location.reload()}, "↻ REFRESH")));
    return;
  }
  const done = invites.filter(i => resp[i.id]);
  const scores = done.map(i => App.profileOf(resp[i.id].answers, App.bank(i.category_id)).index);
  const best = scores.length ? Math.max(...scores) : null;
  main.append(el("section", {class:"arcade"},
    playerHeader([["Cleared", `${done.length}/${invites.length}`], ["Best score", best == null ? "–" : String(best)], ["Stage", best == null ? "–" : App.stage(best)[0].replace("AI ", "")]]),
    el("div", {style:"margin-top:30px"}, el("div", {class:"eyebrow"}, "SELECT YOUR SURVEY"),
      el("h1", {class:"px glow", style:"font-size:clamp(24px,3.2vw,34px);color:#fff;margin:6px 0 0"}, invites.length > 1 ? "Choose a cartridge" : "Your cartridge is ready")),
    el("div", {class:"carts"}, invites.map(i => cartridge(i, resp[i.id])))));
}

async function route() {
  App.untip();
  const {parts, q} = parseHash();
  renderNav();
  if (!App.sb) return;
  if (!App.me) return renderSignIn();
  try {
    if (parts[0] === "admin") {
      if (!App.me.isAdmin) { location.hash = "#/"; return; }
      return await App.renderAdmin(parts[1] || "teams", q);
    }
    if (parts[0] === "survey" || parts[0] === "result") {
      const invites = await App.myInvites(); const inv = invites.find(i => i.id === parts[1]);
      if (!inv) { location.hash = "#/"; return; }
      const bank = App.bank(inv.category_id); const resp = (await App.myResponses())[inv.id];
      if (parts[0] === "result") return resp ? App.renderResult(inv, bank, resp) : (location.hash = `#/survey/${inv.id}`);
      return App.renderSurveyIntro(inv, bank, resp);
    }
    return await renderHome();
  } catch (e) {
    const main = $("main"); main.textContent = ""; main.append(el("div", {class:"empty", style:"color:var(--crit)"}, App.err(e)));
  }
}
App.route = route;

(async function boot() {
  $("year").textContent = new Date().getFullYear();
  const c = App.cfg;
  if (!window.supabase || !c.supabaseUrl || !c.supabaseKey) {
    $("main").textContent = "";
    $("main").append(el("div", {class:"empty"}, "This site isn't configured yet. An administrator needs to set the SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY repository secrets and redeploy (see README)."));
    return;
  }
  App.sb = window.supabase.createClient(c.supabaseUrl, c.supabaseKey);
  let session = null;
  try { ({data:{session}} = await App.sb.auth.getSession()); } catch (e) {}
  if (/access_token|error_description/.test(location.hash)) {
    const m = location.hash.match(/error_description=([^&]+)/);
    if (m) App.notice("Sign-in failed: " + decodeURIComponent(m[1].replace(/\+/g, " ")));
    history.replaceState(null, "", location.pathname);
  }
  if (session) {
    try { await App.loadMe(session); await App.loadBanks(); }
    catch (e) { App.notice("Couldn't load your account: " + App.err(e)); }
  }
  App.sb.auth.onAuthStateChange((ev, s) => setTimeout(async () => {
    const uid = s ? s.user.id : null;
    if (uid === (App.me && App.me.uid)) return;
    if (s) { await App.loadMe(s); await App.loadBanks(); } else App.me = null;
    route();
  }, 0));
  window.addEventListener("hashchange", route);
  route();
})();
})();

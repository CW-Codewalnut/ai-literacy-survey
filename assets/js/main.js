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

function renderSignIn() {
  const main = $("main"); main.textContent = "";
  const btn = el("button", {class:"btn gh big", type:"button", onclick:App.signIn}); btn.innerHTML = GH_ICON + " Sign in with GitHub";
  main.append(el("div", {class:"hero"},
    el("div", {},
      el("h1", {}, "How deep is your AI stack?"),
      el("p", {class:"muted"}, "A short, game-style self-check of AI skills, built by CodeWalnut. Topic blocks fall one at a time, and you drop each one into the lane that matches what you know today. There are no right or wrong answers."),
      el("ul", {class:"how"},
        el("li", {}, el("span", {}, "01"), el("span", {}, "Sign in with GitHub.")),
        el("li", {}, el("span", {}, "02"), el("span", {}, "Your team's survey opens automatically.")),
        el("li", {}, el("span", {}, "03"), el("span", {}, "A few minutes later, you get your AI literacy card."))),
      btn,
      el("p", {class:"faint", style:"font-size:13px;margin-top:14px"}, "Your individual answers are seen only by the survey administrators.")),
    el("div", {},
      el("div", {class:"stat-l", style:"margin-bottom:8px"}, "The four lanes"),
      el("div", {class:"lanes-legend"}, ["Never heard of it", "Know a little", "Can implement it", "Confident / Expert"].map((l, i) => el("div", {class:"lv l" + i}, el("b", {}, i + 1), el("span", {}, l)))))));
}

async function renderHome() {
  const main = $("main"); main.textContent = ""; main.append(el("div", {class:"loading"}, "Finding your surveys…"));
  const [invites, resp] = await Promise.all([App.myInvites(), App.myResponses()]);
  if (invites.length === 1 && !resp[invites[0].id] && !App.me.isAdmin) { location.hash = `#/survey/${invites[0].id}`; return; }
  main.textContent = "";
  if (!invites.length) {
    if (App.me.isAdmin) {
      main.append(el("div", {class:"pagehead"}, el("div", {}, el("h1", {}, "Welcome back"), el("p", {}, "You're an admin. You haven't been invited to take a survey yourself."))),
        el("div", {class:"row"}, el("a", {class:"btn primary", href:"#/admin/teams"}, "Open admin"), el("a", {class:"btn", href:"#/admin/reports"}, "Reports")));
      return;
    }
    await App.sb.from("access_requests").upsert({user_id:App.me.uid, github_username:App.me.gh || null, email:App.me.email || null, display_name:App.me.name || null, requested_at:new Date().toISOString()}, {onConflict:"user_id"});
    main.append(el("div", {class:"card", style:"max-width:640px;margin:20px auto;text-align:center;padding:32px"},
      el("h1", {style:"margin-bottom:10px"}, "You're on the list"),
      el("p", {class:"muted"}, `Signed in as @${App.me.gh || App.me.email}. We couldn't match you to a survey yet, so we've let the administrators know. Once they approve you, refresh this page and your survey will open.`),
      el("p", {class:"faint", style:"font-size:13px"}, "Tip: if you were invited by email, that email needs to be the main email on your GitHub account. Otherwise, send your GitHub username to the person who invited you."),
      el("button", {class:"btn", type:"button", onclick:() => location.reload()}, "Refresh")));
    return;
  }
  main.append(el("div", {class:"pagehead"}, el("div", {}, el("h1", {}, "My surveys"), el("p", {}, "Surveys you've been invited to."))),
    el("div", {class:"survey-list"}, invites.map(i => {
      const r = resp[i.id]; const cat = App.cat[i.category_id];
      return el("div", {class:"survey-item"},
        el("div", {class:"meta"}, el("b", {}, cat.name), el("div", {class:"faint", style:"font-size:13px"}, i.teams.name + (r ? ` · completed ${App.fmtDate(r.submitted_at)}` : " · not started"))),
        r ? el("a", {class:"btn", href:`#/result/${i.id}`}, "My result") : null,
        el("a", {class:"btn primary", href:`#/survey/${i.id}`}, r ? "Retake" : "Start"));
    })));
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

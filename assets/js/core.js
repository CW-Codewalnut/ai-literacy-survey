/* Core: config, Supabase client, identity, shared data, helpers, scoring. */
"use strict";
const App = window.App = {
  cfg: window.APP_CONFIG || {},
  sb: null,
  me: null,            // {uid, gh, email, name, avatar, isAdmin}
  cats: [],            // categories with sections[] and questions[]
  routes: {},
  LV_HEX: ["#d9dce8", "#9cc3dd", "#3592c0", "#1d5f8a"],
  FREQ_LANES: [
    {short:"Never", long:"Never", sub:"Never"},
    {short:"Rarely", long:"A few times a month", sub:"A few times a month"},
    {short:"Weekly", long:"Every week", sub:"Every week"},
    {short:"Daily", long:"Every day", sub:"Every day"}],
  TOOL_LANES: [
    {short:"Never used", long:"Never used", sub:"Haven't touched it"},
    {short:"Tried it", long:"Tried it", sub:"Played with it"},
    {short:"Use at work", long:"Use it at work", sub:"Part of my work"},
    {short:"Power user", long:"Power user", sub:"Could teach it"}],
  SKILL_SUBS: ["Never heard of it", "Could explain it", "Have built with it", "Could teach it"],
};

/* ---------- DOM helpers ---------- */
App.$ = id => document.getElementById(id);
App.el = (tag, attrs, ...kids) => {
  const n = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v; else if (k === "style") n.style.cssText = v;
    else if (k === "text") n.textContent = v; else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (k === "value") n.value = v; else n.setAttribute(k, v === true ? "" : v);
  }
  kids.flat(Infinity).forEach(k => k != null && k !== false && n.append(k.nodeType ? k : document.createTextNode(String(k))));
  return n;
};
App.notice = msg => { const n = App.$("notice"); n.textContent = ""; if (msg) n.append(App.el("div", {}, msg)); };
App.fmtDate = d => d ? new Date(d).toLocaleDateString(undefined, {day:"numeric", month:"short", year:"numeric"}) : "";
App.fmtDateTime = d => d ? new Date(d).toLocaleString(undefined, {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"}) : "";
App.tip = (e, text) => { const t = App.$("tip"); t.textContent = text; t.style.display = "block"; t.style.left = Math.min(innerWidth - 290, e.clientX + 12) + "px"; t.style.top = (e.clientY + 12) + "px"; };
App.untip = () => { App.$("tip").style.display = "none"; };
App.hoverTip = (node, text) => { node.addEventListener("mousemove", e => App.tip(e, text)); node.addEventListener("mouseleave", App.untip); return node; };
App.copy = async (text, btn, label) => {
  try { await navigator.clipboard.writeText(text); if (btn) { btn.textContent = "Copied ✓"; setTimeout(() => btn.textContent = label, 1800); } return true; }
  catch { if (btn) { btn.textContent = "Copy blocked: select the text instead"; setTimeout(() => btn.textContent = label, 2500); } return false; }
};
App.err = (e) => (e && (e.message || e.error_description)) || "Something went wrong. Please refresh and try again.";
App.siteUrl = () => location.origin + location.pathname;

/* ---------- lanes per section kind ---------- */
App.lanesFor = (sec, cat) => {
  if (sec.kind === "frequency") return App.FREQ_LANES;
  if (sec.kind === "tools") return App.TOOL_LANES;
  const labels = (cat && cat.skill_lanes) || ["Never heard of it", "Know a little", "Can implement it", "Confident / Expert"];
  const subs = labels[0] === "New to me" ? ["Haven't come across it", "Could explain it", "Use it in decisions", "Drive it across teams"] : App.SKILL_SUBS;
  const SHORT = {"Never heard of it":"Never heard", "Know a little":"Know a little", "Can implement it":"Can implement", "Confident / Expert":"Expert",
    "New to me":"New to me", "Understand it":"Understand it", "Apply it in decisions":"Apply it", "Lead & champion it":"Lead it"};
  return labels.map((l, i) => ({short:SHORT[l] || l, long:l, sub:subs[i]}));
};

/* ---------- question banks ---------- */
App.loadBanks = async () => {
  const [c, s, q] = await Promise.all([
    App.sb.from("categories").select("*").order("sort"),
    App.sb.from("sections").select("*").order("sort"),
    App.sb.from("questions").select("*").order("sort")]);
  const e = c.error || s.error || q.error; if (e) throw e;
  App.cats = (c.data || []).map(cat => ({...cat, sections: (s.data || []).filter(x => x.category_id === cat.id).map(sec => ({...sec, questions: (q.data || []).filter(x => x.section_id === sec.id)}))}));
  App.cat = Object.fromEntries(App.cats.map(c => [c.id, c]));
};
/* active sections/questions of a category, in order */
App.bank = (catId) => {
  const cat = App.cat[catId]; if (!cat) return null;
  const sections = cat.sections.filter(s => s.active).map(s => ({...s, questions: s.questions.filter(q => q.active)})).filter(s => s.questions.length);
  const items = []; sections.forEach((s, si) => s.questions.forEach(q => items.push({...q, sec:s, si})));
  return {cat, sections, items, skillSecs: sections.filter(s => s.kind === "skill"), skillItems: items.filter(i => i.sec.kind === "skill"), otherSecs: sections.filter(s => s.kind !== "skill")};
};

/* ---------- scoring ---------- */
App.profileOf = (answers, bank) => {
  const r = (answers && answers.ratings) || {};
  const cats = bank.skillSecs.map(s => {
    const vals = s.questions.map(q => r[q.id]).filter(v => typeof v === "number");
    return {sec:s, pct: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length / 3 * 100) : 0, n: vals.length};
  });
  const all = bank.skillItems.map(i => r[i.id]).filter(v => typeof v === "number");
  return {index: all.length ? Math.round(all.reduce((a, b) => a + b, 0) / all.length / 3 * 100) : 0, cats};
};
App.stage = (index) => {
  if (index >= 75) return ["AI Leader", "Designs and runs AI work and could lead others in it."];
  if (index >= 55) return ["AI Builder", "Ships AI work and knows most of the moving parts."];
  if (index >= 35) return ["AI Practitioner", "Uses AI well and has hands-on experience with several core areas."];
  if (index >= 15) return ["AI Explorer", "Knows the landscape and is ready to start building."];
  return ["AI Curious", "Early in the journey: focused learning will move this up quickly."];
};
App.minutesFor = n => Math.max(3, Math.round(n * 11 / 60));   // ~11 seconds per block
App.avgOf = c => { const t = c[0] + c[1] + c[2] + c[3]; return t ? (c[1] + 2 * c[2] + 3 * c[3]) / t : 0; };

/* ---------- identity ---------- */
App.loadMe = async (session) => {
  if (!session) { App.me = null; return; }
  const u = session.user, md = u.user_metadata || {};
  const me = {uid:u.id, gh:(md.user_name || md.preferred_username || "").toLowerCase(), email:(u.email || md.email || "").toLowerCase(),
    name: md.full_name || md.name || "", avatar: md.avatar_url || "", isAdmin:false};
  const ids = [me.gh, me.email].filter(Boolean);
  const {data} = ids.length ? await App.sb.from("admins").select("identity").in("identity", ids) : {data:[]};
  me.isAdmin = !!(data && data.length);
  App.me = me;
};
App.signIn = () => App.sb.auth.signInWithOAuth({provider:"github", options:{redirectTo: App.siteUrl()}});
App.signOut = async () => { await App.sb.auth.signOut(); location.hash = "#/"; location.reload(); };

/* ---------- my invitations ---------- */
App.myInvites = async () => {
  const ids = [App.me.gh, App.me.email].filter(Boolean);
  if (!ids.length) return [];
  const {data, error} = await App.sb.from("invitations")
    .select("id, identity, team_id, category_id, created_at, teams(name, client, archived)")
    .in("identity", ids).order("created_at");
  if (error) throw error;
  return (data || []).filter(i => i.teams && !i.teams.archived && App.cat[i.category_id]);
};
App.myResponses = async () => {
  const {data} = await App.sb.from("responses").select("*").eq("user_id", App.me.uid);
  return Object.fromEntries((data || []).map(r => [r.invitation_id, r]));
};

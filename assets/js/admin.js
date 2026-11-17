/* Admin console: teams, invitations, approvals, reports, questions, settings. */
"use strict";
(function () {
const {el, $} = App;
const TABS = [["teams", "Teams"], ["invite", "Invitations"], ["waiting", "Waiting for approval"], ["reports", "Reports"], ["questions", "Surveys & questions"], ["settings", "Settings"]];
const sb = () => App.sb;
const fail = (box, e) => { box.textContent = ""; box.append(el("div", {class:"empty", style:"color:var(--crit)"}, App.err(e))); };
const normIds = text => [...new Set(String(text || "").split(/[\s,;]+/).map(x => x.trim().replace(/^@/, "").replace(/[<>()"']/g, "").toLowerCase()).filter(Boolean))];
const catName = id => (App.cat[id] || {}).name || id;
const catOptions = (sel) => App.cats.map(c => el("option", {value:c.id, selected: c.id === sel}, c.name));
async function teamsList(includeArchived) {
  const {data, error} = await sb().from("teams").select("*").order("created_at");
  if (error) throw error; return (data || []).filter(t => includeArchived || !t.archived);
}
const teamOptions = (teams, sel) => teams.map(t => el("option", {value:t.id, selected: t.id === sel}, t.name));

function confirmBtn(label, armedLabel, fn) {
  const b = el("button", {class:"btn small danger", type:"button"}, label);
  b.onclick = () => { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = armedLabel; setTimeout(() => { delete b.dataset.armed; b.textContent = label; }, 4000); return; } fn(); };
  return b;
}
function newCategoryCard() {
  const name = el("input", {type:"text", id:"nc-name", placeholder:"e.g. Product Management"});
  const style = el("select", {id:"nc-style"}, el("option", {value:"skill"}, "Hands-on lanes: Never heard of it → Confident / Expert"), el("option", {value:"leader"}, "Leadership lanes: New to me → Lead & champion it"));
  const msg = el("span", {class:"faint", style:"font-size:13px"});
  const create = el("button", {class:"btn primary", type:"button"}, "Create survey category");
  create.onclick = async () => {
    const n = name.value.trim(); if (!n) { name.focus(); return; }
    const id = n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "survey";
    const lanes = style.value === "leader" ? ["New to me", "Understand it", "Apply it in decisions", "Lead & champion it"] : ["Never heard of it", "Know a little", "Can implement it", "Confident / Expert"];
    create.disabled = true;
    const {error} = await sb().from("categories").insert({id, name:n, sort:Math.max(-1, ...App.cats.map(c => c.sort)) + 1, skill_lanes:lanes});
    if (error) { create.disabled = false; msg.textContent = error.code === "23505" ? "A survey with that name already exists." : App.err(error); return; }
    const {data:sec} = await sb().from("sections").insert({category_id:id, sort:0, name:"Section 1", short:"Section 1", color:"#1c9bc4", kind:"skill"}).select().maybeSingle();
    if (sec) await sb().from("questions").insert({section_id:sec.id, sort:0, title:"New topic", description:"Describe the topic in one line."});
    await App.loadBanks(); location.hash = `#/admin/questions?cat=${id}`;
  };
  return el("div", {class:"card"}, el("h2", {}, "New survey category"), el("p", {class:"desc"}, "Creates an empty survey with one section. Add sections and topics below once it's created."),
    el("div", {class:"grid3", style:"align-items:end"}, el("label", {class:"f", for:"nc-name"}, "Name", name), el("label", {class:"f", for:"nc-style"}, "Lane style", style), el("div", {class:"row"}, create, msg)));
}

App.renderAdmin = async (tab, q) => {
  const main = $("main"); main.textContent = "";
  const {count} = await sb().from("access_requests").select("user_id", {count:"exact", head:true});
  main.append(el("div", {class:"pagehead"}, el("div", {}, el("h1", {}, "Admin"), el("p", {}, "Manage teams, invitations, questions and reports."))),
    el("nav", {class:"tabs no-print"}, TABS.map(([k, label]) => el("a", {href:`#/admin/${k}`, class: k === tab ? "on" : null}, label, k === "waiting" && count ? el("span", {class:"badge"}, count) : null))));
  const box = el("div", {class:"stack"}); main.append(box);
  box.append(el("div", {class:"loading"}, "Loading…"));
  try { await (VIEWS[tab] || VIEWS.teams)(box, q || {}); } catch (e) { fail(box, e); }
};

/* Every member of a team across all survey categories */
async function teamOverview(box, team, cats, tSel, cSel) {
  const all = await Promise.all(cats.map(async c => ({c, bank:App.bank(c.id), data:await App.loadReportData(team.id, c.id)})));
  const rows = all.flatMap(({c, bank, data}) => data.invites.map(i => ({i, c, bank, p: i.response ? App.profileOf(i.response.answers, bank) : null})));
  const counted = rows.filter(r => !r.i.excluded);
  const done = counted.filter(r => r.p);
  const avg = done.length ? Math.round(done.reduce((a, r) => a + r.p.index, 0) / done.length) : null;
  const nameOf = r => r.i.response && r.i.response.display_name ? r.i.response.display_name : (r.i.response && r.i.response.github_username ? "@" + r.i.response.github_username : r.i.identity);
  const tiles = [[String(counted.length), "Members invited", `across ${cats.length} survey${cats.length > 1 ? "s" : ""}`],
    [`${done.length} of ${counted.length}`, "Completed", counted.length > done.length ? `${counted.length - done.length} still to complete` : "Everyone has completed it"],
    [avg == null ? "–" : String(avg), "Average readiness score (0–100)", avg == null ? "No results yet" : App.stage(avg)[0] + " on average"]];
  const tb = el("tbody");
  rows.sort((a, b) => (a.c.sort - b.c.sort) || ((b.p ? b.p.index : -1) - (a.p ? a.p.index : -1))).forEach(r => {
    tb.append(el("tr", {style: r.i.excluded ? "opacity:.55" : ""},
      el("td", {}, el("b", {}, nameOf(r)), el("div", {class:"faint", style:"font-size:12px"}, r.i.identity)),
      el("td", {}, el("a", {href:`#/admin/reports?team=${team.id}&cat=${r.c.id}`}, r.c.name)),
      el("td", {}, r.i.excluded ? el("span", {class:"chip"}, "Left out of reports") : r.p ? el("span", {class:"chip good"}, "✓ Completed") : el("span", {class:"chip warn"}, "Not yet")),
      el("td", {class:"num"}, r.p ? String(r.p.index) : "–"), el("td", {}, r.p ? App.stage(r.p.index)[0] : ""),
      el("td", {}, r.i.response ? App.fmtDate(r.i.response.submitted_at) : "")));
  });
  const perCat = all.map(({c, data}) => { const cc = data.invites.filter(i => !i.excluded); return el("a", {class:"chip", href:`#/admin/reports?team=${team.id}&cat=${c.id}`}, `${c.name}: ${cc.filter(i => i.response).length}/${cc.length} done`); });
  box.append(el("div", {class:"card no-print"}, el("div", {class:"grid3", style:"align-items:end"},
      el("label", {class:"f", for:"r-team"}, "Team", tSel), el("label", {class:"f", for:"r-cat"}, "Survey", cSel),
      el("div", {class:"row"}, el("button", {class:"btn", type:"button", onclick:() => window.print()}, "Download PDF")))),
    el("div", {class:"report-brand"}, el("img", {src:"assets/img/logo.svg", alt:"CodeWalnut"}), el("span", {class:"faint"}, "AI Literacy Survey")),
    el("div", {class:"report-head"}, el("div", {}, el("h1", {}, team.name), el("p", {class:"muted", style:"margin:4px 0 0"}, `All members · ${new Date().toLocaleDateString(undefined, {day:"numeric", month:"long", year:"numeric"})}`))),
    el("div", {class:"tiles", style:"grid-template-columns:repeat(3,1fr)"}, tiles.map(([v, l, sub]) => el("div", {class:"tile"}, el("div", {class:"stat-l"}, l), el("div", {class:"stat-v"}, v), el("div", {class:"sub"}, sub)))),
    el("div", {class:"chips"}, perCat),
    el("div", {class:"card"}, el("h2", {}, `Team members (${rows.length})`), el("p", {class:"desc"}, "Everyone invited to this team, in every survey. Open a survey for its full report."),
      el("div", {class:"tbl-wrap"}, el("table", {}, el("thead", {}, el("tr", {}, el("th", {}, "Person"), el("th", {}, "Survey"), el("th", {}, "Status"), el("th", {class:"num"}, "Score"), el("th", {}, "Stage"), el("th", {}, "Submitted"))), tb))));
}

const VIEWS = {
/* ───────── Teams ───────── */
async teams(box) {
  const [teams, inv] = await Promise.all([teamsList(true), sb().from("invitations").select("team_id, category_id, responses(invitation_id)")]);
  if (inv.error) throw inv.error;
  box.textContent = "";
  const name = el("input", {type:"text", id:"t-name", placeholder:"e.g. APMT – Maersk – Data Engineering"});
  const client = el("input", {type:"text", id:"t-client", placeholder:"e.g. Maersk"});
  const msg = el("span", {class:"faint", style:"font-size:13px"});
  const create = el("button", {class:"btn primary", type:"button"}, "Create team");
  create.onclick = async () => {
    if (!name.value.trim()) { name.focus(); return; }
    create.disabled = true;
    const {error} = await sb().from("teams").insert({name:name.value.trim(), client:client.value.trim() || null});
    create.disabled = false;
    if (error) { msg.textContent = error.code === "23505" ? "A team with that name already exists." : App.err(error); return; }
    App.renderAdmin("teams");
  };
  box.append(el("div", {class:"card"}, el("h2", {}, "Create a team"), el("p", {class:"desc"}, "A team is a group of people you survey together, usually one client team. You choose the survey category when you invite people."),
    el("div", {class:"grid3", style:"align-items:end"}, el("label", {class:"f", for:"t-name"}, "Team name", name), el("label", {class:"f", for:"t-client"}, "Client (optional)", client), el("div", {class:"row"}, create, msg))));

  const stats = {};
  (inv.data || []).forEach(i => { const s = stats[i.team_id] = stats[i.team_id] || {}; const c = s[i.category_id] = s[i.category_id] || [0, 0]; c[0]++; const r = Array.isArray(i.responses) ? i.responses.length : (i.responses ? 1 : 0); if (r) c[1]++; });
  if (!teams.length) { box.append(el("div", {class:"empty"}, "No teams yet. Create your first team above.")); return; }
  const tb = el("tbody");
  teams.forEach(t => {
    const s = stats[t.id] || {};
    const surveys = Object.entries(s).map(([cid, [n, done]]) => el("a", {class:"chip", href:`#/admin/reports?team=${t.id}&cat=${cid}`, title:"Open report"}, `${catName(cid)}: ${done}/${n} done`));
    const del = el("button", {class:"btn small danger", type:"button"}, "Delete");
    del.onclick = async () => {
      if (!del.dataset.armed) { del.dataset.armed = 1; del.textContent = "Click again: deletes team, invites and answers"; setTimeout(() => { delete del.dataset.armed; del.textContent = "Delete"; }, 4000); return; }
      const {error} = await sb().from("teams").delete().eq("id", t.id); if (error) alertRow(error); else App.renderAdmin("teams");
    };
    const arch = el("button", {class:"btn small", type:"button", onclick: async () => { await sb().from("teams").update({archived:!t.archived}).eq("id", t.id); App.renderAdmin("teams"); }}, t.archived ? "Restore" : "Archive");
    const ren = el("button", {class:"btn small", type:"button", onclick: () => {
      const inp = el("input", {type:"text", value:t.name}); const save = el("button", {class:"btn small primary", type:"button"}, "Save");
      save.onclick = async () => { const {error} = await sb().from("teams").update({name:inp.value.trim()}).eq("id", t.id); if (error) alertRow(error); else App.renderAdmin("teams"); };
      nameCell.textContent = ""; nameCell.append(el("div", {class:"row"}, inp, save)); inp.focus(); }}, "Rename");
    const nameCell = el("td", {}, el("b", {}, t.name), t.archived ? el("span", {class:"chip", style:"margin-left:6px"}, "Archived") : null, t.client ? el("div", {class:"faint", style:"font-size:12px"}, t.client) : null);
    tb.append(el("tr", {}, nameCell, el("td", {}, el("div", {class:"chips"}, surveys.length ? surveys : el("span", {class:"faint", style:"font-size:13px"}, "No one invited yet"))),
      el("td", {}, App.fmtDate(t.created_at)),
      el("td", {}, el("div", {class:"row", style:"justify-content:flex-end"}, el("a", {class:"btn small", href:`#/admin/invite?team=${t.id}`}, "Invite people"), ren, arch, del))));
  });
  const errLine = el("p", {class:"faint", style:"color:var(--crit)"}); function alertRow(e) { errLine.textContent = App.err(e); }
  box.append(el("div", {class:"card"}, el("h2", {style:"margin-bottom:10px"}, "Teams"), errLine,
    el("div", {class:"tbl-wrap"}, el("table", {}, el("thead", {}, el("tr", {}, el("th", {}, "Team"), el("th", {}, "Surveys (completed / invited)"), el("th", {}, "Created"), el("th", {}))), tb))));
},

/* ───────── Invitations ───────── */
async invite(box, q) {
  const teams = await teamsList(false);
  box.textContent = "";
  if (!teams.length) { box.append(el("div", {class:"empty"}, "Create a team first, under Teams.")); return; }
  const teamId = q.team && teams.some(t => t.id === q.team) ? q.team : teams[0].id;
  const catId = q.cat && App.cat[q.cat] ? q.cat : App.cats[0].id;
  const go = (t, c) => { location.hash = `#/admin/invite?team=${t}&cat=${c}`; };
  const tSel = el("select", {id:"i-team", onchange: () => go(tSel.value, cSel.value)}, teamOptions(teams, teamId));
  const cSel = el("select", {id:"i-cat", onchange: () => go(tSel.value, cSel.value)}, catOptions(catId));
  const ids = el("textarea", {id:"i-ids", rows:"4", placeholder:"jane.doe@maersk.com, john.smith@maersk.com, github-username"});
  const msg = el("span", {class:"faint", style:"font-size:13px"});
  const add = el("button", {class:"btn primary", type:"button"}, "Add to this survey");
  add.onclick = async () => {
    const list = normIds(ids.value); if (!list.length) { ids.focus(); return; }
    add.disabled = true;
    const {error} = await sb().from("invitations").upsert(list.map(identity => ({identity, team_id:teamId, category_id:catId, created_by: App.me.gh || App.me.email})), {onConflict:"identity,team_id,category_id", ignoreDuplicates:true});
    add.disabled = false;
    if (error) { msg.textContent = App.err(error); return; }
    ids.value = ""; msg.textContent = `Added ${list.length}.`; renderList();
  };
  const team = teams.find(t => t.id === teamId);
  const inviteText = () => `Hi,\n\nYou're invited to the ${catName(catId)} AI literacy survey for ${team.name}, run by CodeWalnut. It takes about ${App.minutesFor((App.bank(catId) || {items:[]}).items.length)} minutes and there are no right or wrong answers.\n\n1. Open ${App.siteUrl()}\n2. Click "Sign in with GitHub"\n3. Your survey opens automatically. Your individual answers are seen only by the survey administrators.\n\nIf the page says you're waiting for approval, reply to this message with your GitHub username and we'll add you.\n\nThank you!`;
  const copyMsg = el("button", {class:"btn", type:"button"}, "Copy invite message"); copyMsg.onclick = () => App.copy(inviteText(), copyMsg, "Copy invite message");
  const copyLink = el("button", {class:"btn", type:"button"}, "Copy survey link"); copyLink.onclick = () => App.copy(App.siteUrl(), copyLink, "Copy survey link");
  const copyEmails = el("button", {class:"btn", type:"button"}, "Copy email addresses");

  box.append(el("div", {class:"card"}, el("h2", {}, "Invite people"),
    el("p", {class:"desc"}, "Choose the team and survey, then add work emails or GitHub usernames. People are matched when they sign in with GitHub: by GitHub username, or by the main email on their GitHub account. Anyone who doesn't match appears under Waiting for approval."),
    el("div", {class:"grid2"}, el("label", {class:"f", for:"i-team"}, "Team", tSel), el("label", {class:"f", for:"i-cat"}, "Survey category", cSel)),
    el("label", {class:"f", for:"i-ids", style:"margin-top:12px"}, "Emails or GitHub usernames (comma, space or one per line)", ids),
    el("div", {class:"row", style:"margin-top:10px"}, add, msg)),
    el("div", {class:"card"}, el("h2", {}, "Send the invitation"), el("p", {class:"desc"}, "Copy the message and send it from Outlook or Teams to the people below. Everyone uses the same link; the app works out their team and survey when they sign in."),
      el("div", {class:"row"}, copyMsg, copyLink, copyEmails), el("pre", {style:"white-space:pre-wrap;background:var(--surface-2);padding:12px;border-radius:8px;font-size:13px;margin:12px 0 0"}, inviteText())));
  const listCard = el("div", {class:"card"}); box.append(listCard);

  async function renderList() {
    const {data, error} = await sb().from("invitations").select("id, identity, exclude_from_reports, created_at, responses(submitted_at, attempts, github_username)").eq("team_id", teamId).eq("category_id", catId).order("created_at");
    listCard.textContent = "";
    if (error) return fail(listCard, error);
    const rows = data || [];
    copyEmails.onclick = () => App.copy(rows.map(r => r.identity).filter(x => x.includes("@")).join("; "), copyEmails, "Copy email addresses");
    const done = rows.filter(r => Array.isArray(r.responses) ? r.responses.length : r.responses).length;
    listCard.append(el("h2", {}, `Invited to this survey (${done} of ${rows.length} completed)`));
    if (!rows.length) { listCard.append(el("div", {class:"empty", style:"margin-top:10px"}, "No one invited yet.")); return; }
    const tb = el("tbody");
    rows.forEach(r => {
      const resp = Array.isArray(r.responses) ? r.responses[0] : r.responses;
      const ex = el("input", {type:"checkbox", checked:r.exclude_from_reports, "aria-label":"Exclude from reports"});
      ex.onchange = async () => { await sb().from("invitations").update({exclude_from_reports:ex.checked}).eq("id", r.id); };
      const rm = el("button", {class:"btn small danger", type:"button"}, "Remove");
      rm.onclick = async () => {
        if (resp && !rm.dataset.armed) { rm.dataset.armed = 1; rm.textContent = "Click again: also deletes their answers"; setTimeout(() => { delete rm.dataset.armed; rm.textContent = "Remove"; }, 4000); return; }
        await sb().from("invitations").delete().eq("id", r.id); renderList();
      };
      tb.append(el("tr", {}, el("td", {}, r.identity, resp && resp.github_username && resp.github_username !== r.identity ? el("span", {class:"faint"}, ` · @${resp.github_username}`) : null),
        el("td", {}, resp ? el("span", {class:"chip good"}, `✓ Completed ${App.fmtDate(resp.submitted_at)}` + (resp.attempts > 1 ? ` · ${resp.attempts} attempts` : "")) : el("span", {class:"chip warn"}, "Not yet")),
        el("td", {}, el("label", {class:"row", style:"gap:6px;font-size:13px"}, ex, "Exclude")), el("td", {style:"text-align:right"}, rm)));
    });
    listCard.append(el("div", {class:"tbl-wrap", style:"margin-top:10px"}, el("table", {}, el("thead", {}, el("tr", {}, el("th", {}, "Person"), el("th", {}, "Status"), el("th", {}, "Reports"), el("th", {}))), tb)));
  }
  renderList();
},

/* ───────── Waiting for approval ───────── */
async waiting(box) {
  const [teams, req] = await Promise.all([teamsList(false), sb().from("access_requests").select("*").order("requested_at", {ascending:false})]);
  if (req.error) throw req.error;
  box.textContent = "";
  const rows = req.data || [];
  box.append(el("div", {class:"card"}, el("h2", {}, "Waiting for approval"), el("p", {class:"desc"}, "People who signed in but didn't match any invitation. Choose their team and survey, then approve. They refresh the page and their survey opens."),
    !rows.length ? el("div", {class:"empty"}, "No one is waiting.") : !teams.length ? el("div", {class:"empty"}, "Create a team first, under Teams.") :
    el("div", {class:"stack", style:"gap:8px"}, rows.map(r => {
      const tSel = el("select", {"aria-label":"Team"}, teamOptions(teams)); const cSel = el("select", {"aria-label":"Survey category"}, catOptions());
      const ok = el("button", {class:"btn small primary", type:"button"}, "Approve");
      const no = el("button", {class:"btn small", type:"button"}, "Dismiss");
      const line = el("span", {class:"faint", style:"font-size:13px"});
      ok.onclick = async () => {
        ok.disabled = true;
        const identity = (r.github_username || r.email || "").toLowerCase();
        const {error} = await sb().from("invitations").upsert({identity, team_id:tSel.value, category_id:cSel.value, created_by:App.me.gh || App.me.email}, {onConflict:"identity,team_id,category_id", ignoreDuplicates:true});
        if (error) { line.textContent = App.err(error); ok.disabled = false; return; }
        await sb().from("access_requests").delete().eq("user_id", r.user_id); App.renderAdmin("waiting");
      };
      no.onclick = async () => { await sb().from("access_requests").delete().eq("user_id", r.user_id); App.renderAdmin("waiting"); };
      return el("div", {class:"survey-item", style:"flex-wrap:wrap"},
        el("div", {class:"meta"}, el("b", {}, r.display_name || "@" + r.github_username), el("div", {class:"faint", style:"font-size:13px"}, ["@" + r.github_username, r.email, "signed in " + App.fmtDateTime(r.requested_at)].filter(Boolean).join(" · "))),
        tSel, cSel, ok, no, line);
    }))));
},

/* ───────── Reports ───────── */
async reports(box, q) {
  const [teams, inv] = await Promise.all([teamsList(true), sb().from("invitations").select("team_id, category_id")]);
  box.textContent = "";
  const combos = {}; (inv.data || []).forEach(i => { (combos[i.team_id] = combos[i.team_id] || new Set()).add(i.category_id); });
  const usable = teams.filter(t => combos[t.id]);
  if (!usable.length) { box.append(el("div", {class:"empty"}, "No reports yet. Invite people to a survey first.")); return; }
  const teamId = q.team && combos[q.team] ? q.team : usable[0].id;
  const cats = App.cats.filter(c => combos[teamId].has(c.id));
  const catId = q.cat === "all" || (q.cat && combos[teamId].has(q.cat)) ? q.cat : (cats.length > 1 ? "all" : cats[0].id);
  const indiv = q.people !== "0";
  const go = (t, c, p) => { location.hash = `#/admin/reports?team=${t}&cat=${c}&people=${p ? 1 : 0}`; };
  const tSel = el("select", {id:"r-team", onchange: () => go(tSel.value, "", indiv)}, teamOptions(usable, teamId));
  const cSel = el("select", {id:"r-cat", onchange: () => go(teamId, cSel.value, indiv)}, el("option", {value:"all", selected:catId === "all"}, "All members (overview)"), cats.map(c => el("option", {value:c.id, selected:c.id === catId}, c.name)));
  const pChk = el("input", {type:"checkbox", id:"r-people", checked:indiv, onchange: () => go(teamId, catId, pChk.checked)});
  const team = teams.find(t => t.id === teamId);
  if (catId === "all") return teamOverview(box, team, cats, tSel, cSel);
  const bank = App.bank(catId);
  const data = await App.loadReportData(teamId, catId);
  const sections = App.buildReport({team, bank, data, includeIndividuals:indiv});
  const excludedN = data.invites.filter(i => i.excluded && i.response).length;
  const present = el("button", {class:"btn primary", type:"button", onclick: () => App.present(sections.filter(s => !s.individual), `${team.name} · ${bank.cat.name}`)}, "Present full screen");
  box.append(el("div", {class:"card no-print"}, el("div", {class:"grid3", style:"align-items:end"},
      el("label", {class:"f", for:"r-team"}, "Team", tSel), el("label", {class:"f", for:"r-cat"}, "Survey", cSel),
      el("div", {class:"row"}, el("label", {class:"row", style:"gap:6px;font-size:14px", for:"r-people"}, pChk, "Include individuals"))),
    el("div", {class:"row", style:"margin-top:14px"}, present, el("button", {class:"btn", type:"button", onclick:() => window.print()}, "Download PDF"),
      el("span", {class:"faint", style:"font-size:13px"}, "Full-screen mode never shows individuals. For the PDF, untick 'Include individuals' to share with leadership."),
      excludedN ? el("span", {class:"faint", style:"font-size:13px"}, `${excludedN} internal or test response${excludedN > 1 ? "s" : ""} excluded.`) : null)),
    el("div", {class:"report-brand"}, el("img", {src:"assets/img/logo.svg", alt:"CodeWalnut"}), el("span", {class:"faint"}, "AI Literacy Survey")),
    el("div", {class:"report-head"}, el("div", {}, el("h1", {}, `${team.name}`), el("p", {class:"muted", style:"margin:4px 0 0"}, `${bank.cat.name} AI literacy report · ${new Date().toLocaleDateString(undefined, {day:"numeric", month:"long", year:"numeric"})}`))),
    ...sections.map(s => s.node));
},

/* ───────── Questions ───────── */
async questions(box, q) {
  await App.loadBanks();
  box.textContent = "";
  const catId = q.cat && App.cat[q.cat] ? q.cat : (App.cats[0] || {}).id;
  const cat = App.cat[catId];
  if (!App.cats.length) { box.append(newCategoryCard()); return; }
  const cSel = el("select", {id:"q-cat", onchange: () => { location.hash = `#/admin/questions?cat=${cSel.value}`; }}, catOptions(catId));
  const status = el("span", {class:"faint", style:"font-size:13px"});
  const saved = (error) => { status.textContent = error ? App.err(error) : "Saved ✓"; status.style.color = error ? "var(--crit)" : ""; clearTimeout(saved.t); saved.t = setTimeout(() => status.textContent = "", 2000); };
  const reload = () => VIEWS.questions(box, {cat:catId});
  const addCat = el("button", {class:"btn", type:"button", onclick: () => { addCat.replaceWith(newCategoryCard()); }}, "+ New survey category");
  box.append(el("div", {class:"card"}, el("h2", {}, "Surveys & questions"),
    el("p", {class:"desc"}, "Everything here saves as you go and applies to the next person who starts the survey. Once people have answered a topic, hide it instead of deleting it so past reports stay complete."),
    el("div", {class:"row", style:"align-items:end"}, el("label", {class:"f", for:"q-cat", style:"min-width:260px"}, "Survey category", cSel), addCat, status)));

  // category settings
  const cName = el("input", {type:"text", id:"c-name", value:cat.name});
  const cDesc = el("input", {type:"text", id:"c-desc", value:cat.description || ""});
  const lanes = (cat.skill_lanes || []).concat(["", "", "", ""]).slice(0, 4).map((l, i) => el("input", {type:"text", value:l, "aria-label":`Lane ${i + 1}`}));
  const saveCat = el("button", {class:"btn primary", type:"button"}, "Save survey settings");
  saveCat.onclick = async () => {
    const labels = lanes.map(x => x.value.trim());
    if (labels.some(x => !x)) { saved({message:"All four lane labels are needed."}); return; }
    const {error} = await sb().from("categories").update({name:cName.value.trim() || cat.name, description:cDesc.value.trim() || null, skill_lanes:labels}).eq("id", catId);
    saved(error); if (!error) { await App.loadBanks(); }
  };
  const delCat = el("button", {class:"btn danger", type:"button"}, "Delete this survey category");
  delCat.onclick = async () => {
    if (!delCat.dataset.armed) { delCat.dataset.armed = 1; delCat.textContent = "Click again to delete it and all its questions"; setTimeout(() => { delete delCat.dataset.armed; delCat.textContent = "Delete this survey category"; }, 4000); return; }
    const {error} = await sb().from("categories").delete().eq("id", catId);
    if (error) { saved({message: error.code === "23503" ? "People are invited to this survey. Remove their invitations first." : App.err(error)}); return; }
    await App.loadBanks(); location.hash = "#/admin/questions";
  };
  box.append(el("div", {class:"card"}, el("h2", {}, "Survey settings"),
    el("div", {class:"grid2"}, el("label", {class:"f", for:"c-name"}, "Name", cName), el("label", {class:"f", for:"c-desc"}, "Description (for admins)", cDesc)),
    el("div", {class:"stat-l", style:"margin:14px 0 6px"}, "Lane labels for scored sections (lowest to highest)"),
    el("div", {class:"grid2", style:"grid-template-columns:repeat(4,1fr)"}, lanes),
    el("div", {class:"row", style:"margin-top:12px"}, saveCat, el("span", {class:"spacer"}), delCat)));

  const move = async (table, list, idx, dir) => {
    const j = idx + dir; if (j < 0 || j >= list.length) return;
    await Promise.all([sb().from(table).update({sort:list[j].sort}).eq("id", list[idx].id), sb().from(table).update({sort:list[idx].sort === list[j].sort ? list[idx].sort + dir : list[idx].sort}).eq("id", list[j].id)]);
    reload();
  };
  cat.sections.forEach((s, si) => {
    const nameIn = el("input", {type:"text", value:s.name, "aria-label":"Section name", style:"flex:1;min-width:200px"});
    nameIn.onchange = async () => { const {error} = await sb().from("sections").update({name:nameIn.value.trim()}).eq("id", s.id); saved(error); };
    const kindSel = el("select", {"aria-label":"Section type", style:"width:auto"}, [["skill", "Skill (scored)"], ["frequency", "How often (not scored)"], ["tools", "Tools (not scored)"]].map(([v, l]) => el("option", {value:v, selected:s.kind === v}, l)));
    kindSel.onchange = async () => { const {error} = await sb().from("sections").update({kind:kindSel.value}).eq("id", s.id); saved(error); };
    const color = el("input", {type:"color", value:s.color || "#5a5f8c", "aria-label":"Section colour", style:"width:40px;height:32px;padding:2px;border:1px solid var(--line);border-radius:6px"});
    color.onchange = async () => { const {error} = await sb().from("sections").update({color:color.value}).eq("id", s.id); saved(error); };
    const act = el("button", {class:"btn small", type:"button", onclick: async () => { const {error} = await sb().from("sections").update({active:!s.active}).eq("id", s.id); if (error) saved(error); else reload(); }}, s.active ? "Hide section" : "Show section");
    const delS = confirmBtn("Delete section", "Click again: deletes section and its topics", async () => { const {error} = await sb().from("sections").delete().eq("id", s.id); if (error) saved(error); else reload(); });
    const secEl = el("div", {class:"qsec", style: s.active ? "" : "opacity:.6"},
      el("div", {class:"qsec-h"}, el("span", {class:"faint", style:"font-weight:700"}, `Level ${si}`), nameIn, kindSel, color,
        el("button", {class:"btn small", type:"button", "aria-label":"Move section up", onclick:() => move("sections", cat.sections, si, -1)}, "↑"),
        el("button", {class:"btn small", type:"button", "aria-label":"Move section down", onclick:() => move("sections", cat.sections, si, 1)}, "↓"), act, delS));
    s.questions.forEach((qq, qi) => {
      const t = el("input", {type:"text", value:qq.title, "aria-label":"Topic"});
      t.onchange = async () => { const {error} = await sb().from("questions").update({title:t.value.trim()}).eq("id", qq.id); saved(error); };
      const d = el("textarea", {rows:"2", "aria-label":"Description"}, qq.description || "");
      d.onchange = async () => { const {error} = await sb().from("questions").update({description:d.value.trim()}).eq("id", qq.id); saved(error); };
      const hide = el("button", {class:"btn small", type:"button", onclick: async () => { const {error} = await sb().from("questions").update({active:!qq.active}).eq("id", qq.id); if (error) saved(error); else reload(); }}, qq.active ? "Hide" : "Show");
      secEl.append(el("div", {class:"qrow" + (qq.active ? "" : " off")}, el("span", {class:"faint", style:"padding-top:8px"}, qi + 1), t, d,
        el("div", {class:"row", style:"gap:4px"},
          el("button", {class:"btn small", type:"button", "aria-label":"Move up", onclick:() => move("questions", s.questions, qi, -1)}, "↑"),
          el("button", {class:"btn small", type:"button", "aria-label":"Move down", onclick:() => move("questions", s.questions, qi, 1)}, "↓"), hide,
          confirmBtn("Delete", "Sure?", async () => { const {error} = await sb().from("questions").delete().eq("id", qq.id); if (error) saved(error); else reload(); }))));
    });
    const addQ = el("button", {class:"btn small", type:"button", onclick: async () => {
      const sort = Math.max(-1, ...s.questions.map(x => x.sort)) + 1;
      const {error} = await sb().from("questions").insert({section_id:s.id, sort, title:"New topic", description:""}); if (error) saved(error); else reload(); }}, "+ Add topic");
    secEl.append(el("div", {style:"padding:8px 12px;border-top:1px solid var(--line)"}, addQ));
    box.append(secEl);
  });
  box.append(el("div", {}, el("button", {class:"btn", type:"button", onclick: async () => {
    const sort = Math.max(-1, ...cat.sections.map(x => x.sort)) + 1;
    const {error} = await sb().from("sections").insert({category_id:catId, sort, name:"New section", short:"New", color:"#3f9f57", kind:"skill"}); if (error) saved(error); else reload(); }}, "+ Add section")));
},

/* ───────── Settings ───────── */
async settings(box) {
  const [adm, set] = await Promise.all([sb().from("admins").select("*").order("added_at"), sb().from("app_settings").select("value").eq("key", "exclude_words").maybeSingle()]);
  if (adm.error) throw adm.error;
  box.textContent = "";
  const mine = [App.me.gh, App.me.email];
  const newAdmin = el("input", {type:"text", id:"s-admin", placeholder:"github-username or name@codewalnut.com"});
  const aMsg = el("span", {class:"faint", style:"font-size:13px"});
  const addA = el("button", {class:"btn primary", type:"button"}, "Add admin");
  addA.onclick = async () => { const list = normIds(newAdmin.value); if (!list.length) return;
    const {error} = await sb().from("admins").upsert(list.map(identity => ({identity, added_by:App.me.gh || App.me.email})), {onConflict:"identity", ignoreDuplicates:true});
    if (error) aMsg.textContent = App.err(error); else App.renderAdmin("settings"); };
  box.append(el("div", {class:"card"}, el("h2", {}, "Admins"), el("p", {class:"desc"}, "Admins see every team, every individual result, and can change questions. Add them by GitHub username or by the main email on their GitHub account."),
    el("div", {class:"chips", style:"margin-bottom:12px"}, (adm.data || []).map(a => el("span", {class:"chip"}, a.identity,
      mine.includes(a.identity) ? el("span", {class:"faint"}, " (you)") : el("button", {type:"button", "aria-label":"Remove " + a.identity, onclick: async () => { await sb().from("admins").delete().eq("identity", a.identity); App.renderAdmin("settings"); }}, "×")))),
    el("div", {class:"row"}, el("div", {style:"flex:1;min-width:240px"}, newAdmin), addA, aMsg)));

  const words = el("input", {type:"text", id:"s-words", value:((set.data && set.data.value) || []).join(", ")});
  const wMsg = el("span", {class:"faint", style:"font-size:13px"});
  const saveW = el("button", {class:"btn", type:"button"}, "Save");
  saveW.onclick = async () => { const list = normIds(words.value);
    const {error} = await sb().from("app_settings").upsert({key:"exclude_words", value:list}); wMsg.textContent = error ? App.err(error) : "Saved ✓"; };
  box.append(el("div", {class:"card"}, el("h2", {}, "Leave out of reports"), el("p", {class:"desc"}, "Responses are left out of every report when any of these words appears in the person's GitHub username, email, name or invitation. Use it for internal staff and test runs. You can also exclude individuals on the Invitations page."),
    el("label", {class:"f", for:"s-words"}, "Words (comma separated)", words), el("div", {class:"row", style:"margin-top:10px"}, saveW, wMsg)));

  box.append(el("div", {class:"card"}, el("h2", {}, "Survey link"), el("p", {class:"desc"}, "Everyone uses this one link. The app works out each person's team and survey when they sign in."),
    el("div", {class:"row"}, el("code", {style:"background:var(--surface-2);padding:6px 10px;border-radius:6px"}, App.siteUrl()),
      (() => { const b = el("button", {class:"btn small", type:"button"}, "Copy"); b.onclick = () => App.copy(App.siteUrl(), b, "Copy"); return b; })())));
},
};
})();

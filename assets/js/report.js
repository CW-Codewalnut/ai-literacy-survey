/* Team report: built as a list of sections so the same content renders as a page, a PDF or slides. */
"use strict";
(function () {
const {el} = App;

/* Load everything a report needs for one team + category */
App.loadReportData = async (teamId, catId) => {
  const [inv, set] = await Promise.all([
    App.sb.from("invitations").select("id, identity, exclude_from_reports, created_at, responses(*)").eq("team_id", teamId).eq("category_id", catId),
    App.sb.from("app_settings").select("value").eq("key", "exclude_words").maybeSingle()]);
  if (inv.error) throw inv.error;
  const words = ((set.data && set.data.value) || []).map(w => String(w).toLowerCase()).filter(Boolean);
  const invites = (inv.data || []).map(i => {
    const r = Array.isArray(i.responses) ? i.responses[0] : i.responses;
    const hay = [i.identity, r && r.github_username, r && r.email, r && r.display_name].filter(Boolean).join(" ").toLowerCase();
    const excluded = i.exclude_from_reports || words.some(w => hay.includes(w));
    return {...i, response: r || null, excluded};
  });
  return {invites, words};
};

function summarise(bank, responses) {
  const per = {}, learn = {};
  bank.items.forEach(i => { per[i.id] = [0, 0, 0, 0]; learn[i.id] = 0; });
  responses.forEach(r => {
    const rt = (r.answers && r.answers.ratings) || {};
    for (const [k, v] of Object.entries(rt)) if (per[k] && v >= 0 && v <= 3) per[k][v]++;
    ((r.answers && r.answers.learn) || []).forEach(k => { if (k in learn) learn[k]++; });
  });
  return {per, learn, n: responses.length};
}
const pctOfSec = (sec, per) => Math.round(sec.questions.reduce((a, q) => a + App.avgOf(per[q.id] || [0, 0, 0, 0]), 0) / sec.questions.length / 3 * 100);

function distRow(label, counts, lanes, flags) {
  const t = counts.reduce((a, b) => a + b, 0) || 1;
  const bar = el("div", {class:"seg-bar"});
  counts.forEach((v, li) => { if (v) bar.append(App.hoverTip(el("span", {style:`width:${v / t * 100}%;background:${App.LV_HEX[li]}`}), `${label} · ${lanes[li].long}: ${v} of ${t}`)); });
  return el("div", {class:"dist"}, el("span", {}, label), bar, el("div", {class:"flags"}, flags));
}
const legend = lanes => el("div", {class:"legend"}, lanes.map((l, i) => el("span", {}, el("i", {style:`background:${App.LV_HEX[i]}`}), l.long)));

/* Returns [{key, title, node}] */
App.buildReport = ({team, bank, data, includeIndividuals}) => {
  const counted = data.invites.filter(i => !i.excluded);
  const responses = counted.filter(i => i.response).map(i => i.response);
  const S = summarise(bank, responses);
  const out = [];
  const skillLanes = App.lanesFor({kind:"skill"}, bank.cat);
  const sub = `${team.name} · ${bank.cat.name}`;
  const card = (title, desc, ...kids) => el("div", {class:"card"}, el("h2", {}, title), desc ? el("p", {class:"desc"}, desc) : null, ...kids);

  if (!S.n) {
    out.push({key:"summary", title:"Summary", node: el("div", {class:"empty"}, counted.length ? `None of the ${counted.length} invited people have finished the survey yet.` : "No one has been invited to this survey yet.")});
    return out;
  }

  // 1. Summary
  const all = bank.skillItems.map(i => S.per[i.id]);
  const teamIdx = Math.round(all.reduce((a, c) => a + App.avgOf(c), 0) / (all.length || 1) / 3 * 100);
  const cells = all.reduce((a, c) => a + c[0] + c[1] + c[2] + c[3], 0) || 1;
  const hands = Math.round(all.reduce((a, c) => a + c[2] + c[3], 0) / cells * 100);
  const never = Math.round(all.reduce((a, c) => a + c[0], 0) / cells * 100);
  const freqQs = bank.sections.filter(s => s.kind === "frequency").flatMap(s => s.questions);
  const weekly = freqQs.length ? responses.filter(r => freqQs.some(q => ((r.answers || {}).ratings || {})[q.id] >= 2)).length : null;
  const tiles = [
    [`${S.n} of ${counted.length}`, "People who completed it", counted.length > S.n ? `${counted.length - S.n} still to complete` : "Everyone invited has completed it"],
    [String(teamIdx), "Team AI readiness score (0–100)", `${App.stage(teamIdx)[0]} on average`],
    [hands + "%", "Topics rated hands-on", `'Can implement' or higher. ${never}% were 'never heard of it'.`]];
  if (weekly != null) tiles.push([`${weekly} of ${S.n}`, "Use AI at work weekly or more", `${S.n - weekly} use it less often`]);
  out.push({key:"summary", title:"Summary", node: el("div", {class:"stack"},
    el("div", {class:"tiles", style:`grid-template-columns:repeat(${tiles.length},1fr)`}, tiles.map(([v, l, s]) => el("div", {class:"tile"}, el("div", {class:"stat-l"}, l), el("div", {class:"stat-v"}, v), el("div", {class:"sub"}, s)))),
    el("p", {class:"faint", style:"font-size:13px;margin:0"}, "Self-assessment. The readiness score averages every skill rating, where 'Confident / Expert' on every topic = 100. Respondents' individual answers are not shown in this view."))});

  // 2. Strength by area
  const areas = bank.skillSecs.map(s => ({s, pct:pctOfSec(s, S.per)})).sort((a, b) => b.pct - a.pct);
  out.push({key:"areas", title:"Strength by area", node: card("Strength by area", "Average self-rating in each area, as a share of the maximum (everyone 'Confident / Expert' = 100%).",
    el("div", {class:"bars"}, areas.map(({s, pct}) => el("div", {class:"bar-row"}, el("span", {}, s.name),
      el("div", {class:"bar-track"}, el("div", {class:"bar-fill", style:`width:${pct}%;background:${s.color}`})), el("span", {class:"num"}, pct + "%")))))});

  // 3. Topic breakdown, one block per area
  bank.skillSecs.forEach(s => {
    out.push({key:"sec-" + s.id, title:s.name, node: card(s.name, "How many people chose each level for every topic in this area. 'No expert yet' marks topics nobody rated at the top level.",
      legend(skillLanes),
      s.questions.map(q => { const c = S.per[q.id]; const t = c[0] + c[1] + c[2] + c[3] || 1;
        return distRow(q.title, c, skillLanes, [c[3] === 0 ? el("span", {class:"chip crit"}, "No expert yet") : null, c[0] / t >= .5 ? el("span", {class:"chip"}, `${c[0]} never heard`) : null]); }))});
  });
  const wants = bank.skillItems.map(i => ({i, n:S.learn[i.id] || 0})).filter(x => x.n).sort((a, b) => b.n - a.n).slice(0, 5);
  if (wants.length) out[out.length - 1].node.append(el("div", {class:"faint", style:"font-size:13px;margin-top:14px"}, "Most requested to learn across all areas: " + wants.map(x => `${x.i.title} (${x.n})`).join(" · ")));

  // 4. Frequency and tool sections
  bank.otherSecs.forEach(s => {
    const lanes = App.lanesFor(s, bank.cat);
    out.push({key:"sec-" + s.id, title: s.kind === "tools" ? "Tool adoption" : "How often people use AI", node: card(s.kind === "tools" ? "Tool adoption" : "How often people use AI today", null,
      legend(lanes),
      s.questions.map(q => { const c = S.per[q.id];
        return distRow(q.title, c, lanes, [el("span", {class:"chip"}, `${c[2] + c[3]} ${s.kind === "tools" ? "use at work" : "weekly or more"}`)]); }))});
  });

  // 5. Individuals (admins only, optional)
  if (includeIndividuals) {
    const rows = counted.filter(i => i.response).map(i => ({i, r:i.response, p:App.profileOf(i.response.answers, bank)})).sort((a, b) => b.p.index - a.p.index);
    const nameOf = x => x.r.display_name ? `${x.r.display_name}` : (x.r.github_username ? "@" + x.r.github_username : x.i.identity);
    const heat = pct => { const t = Math.max(0, Math.min(1, pct / 100)); const a = [238, 240, 246], b = [29, 95, 138]; const c = a.map((x, k) => Math.round(x + (b[k] - x) * t)); return {bg:`rgb(${c})`, fg: t > .55 ? "#fff" : "var(--ink)"}; };
    const csvBtn = el("button", {class:"btn small no-print", type:"button"}, "Copy as CSV");
    csvBtn.onclick = () => {
      const head = ["Name", "GitHub", "Email", "Invited as", "Readiness score", "Stage", ...bank.skillSecs.map(s => s.name + " %"), ...bank.items.map(i => i.title), "Wants to learn", "Attempts", "Last submitted"];
      const lines = [head, ...rows.map(x => [nameOf(x), x.r.github_username || "", x.r.email || "", x.i.identity, x.p.index, App.stage(x.p.index)[0], ...x.p.cats.map(c => c.pct),
        ...bank.items.map(i => (x.r.answers.ratings || {})[i.id] ?? ""), (x.r.answers.learn || []).map(id => (bank.items.find(i => i.id === id) || {}).title).filter(Boolean).join("; "), x.r.attempts, x.r.submitted_at])];
      App.copy(lines.map(l => l.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(",")).join("\n"), csvBtn, "Copy as CSV");
    };
    const tb = el("tbody");
    rows.forEach(x => {
      const h = heat(x.p.index);
      const tr = el("tr", {class:"person", tabindex:"0"}, el("td", {}, el("b", {}, nameOf(x)), el("div", {class:"faint", style:"font-size:12px"}, [x.r.github_username && "@" + x.r.github_username, x.r.email].filter(Boolean).join(" · "))),
        el("td", {class:"cell", style:`background:${h.bg};color:${h.fg}`}, x.p.index),
        x.p.cats.map(({pct}) => { const c = heat(pct); return el("td", {class:"cell", style:`background:${c.bg};color:${c.fg}`}, pct); }),
        el("td", {class:"num"}, x.r.attempts), el("td", {}, App.fmtDate(x.r.submitted_at)));
      const det = el("tr", {class:"detail", hidden:true}, el("td", {colspan:String(4 + bank.skillSecs.length)},
        bank.sections.map(s => [el("div", {class:"cat-h"}, el("i", {style:`background:${s.color}`}), s.name),
          el("div", {class:"pgrid"}, s.questions.map(q => { const v = (x.r.answers.ratings || {})[q.id]; const lanes = App.lanesFor(s, bank.cat);
            return el("div", {}, el("span", {}, ((x.r.answers.learn || []).includes(q.id) ? "★ " : "") + q.title),
              v == null ? el("span", {class:"faint"}, "–") : el("span", {class:"pill", style:`background:${App.LV_HEX[v]};color:${v >= 2 ? "#fff" : "var(--ink)"}`}, lanes[v].short)); }))])));
      const toggle = () => { det.hidden = !det.hidden; };
      tr.addEventListener("click", toggle); tr.addEventListener("keydown", e => { if (e.key === "Enter") toggle(); });
      tb.append(tr, det);
    });
    const pending = counted.filter(i => !i.response);
    out.push({key:"people", title:"Individuals", individual:true, node: card("Individuals", "Each person's score per area. Click a row for their answer to every topic.",
      el("div", {class:"row", style:"margin-bottom:10px"}, csvBtn),
      el("div", {class:"tbl-wrap"}, el("table", {}, el("thead", {}, el("tr", {}, el("th", {}, "Person"), el("th", {class:"num"}, "Score"), bank.skillSecs.map(s => el("th", {class:"num", title:s.name}, s.short || s.name)), el("th", {class:"num"}, "Attempts"), el("th", {}, "Submitted"))), tb)),
      pending.length ? el("p", {class:"faint", style:"font-size:13px;margin-top:12px"}, `Not completed yet (${pending.length}): ` + pending.map(i => i.identity).join(", ")) : null)});
  }
  out.forEach(o => o.sub = sub);
  return out;
};

/* Full-screen presentation of report sections, one per slide */
App.present = (sections, title) => {
  const box = App.$("present"); box.hidden = false; box.textContent = "";
  let i = 0;
  const slide = el("div", {class:"slide"}); const counter = el("span");
  const prev = el("button", {class:"btn small", type:"button", onclick:() => go(i - 1)}, "← Previous");
  const next = el("button", {class:"btn small", type:"button", onclick:() => go(i + 1)}, "Next →");
  const close = el("button", {class:"btn small", type:"button", onclick:exit}, "Exit (Esc)");
  box.append(slide, el("div", {class:"pbar"}, el("img", {src:"assets/img/logo.svg", alt:"CodeWalnut"}), el("span", {}, title), el("span", {class:"spacer"}), counter, prev, next, close));
  function go(n) {
    i = Math.max(0, Math.min(sections.length - 1, n)); slide.textContent = "";
    const s = sections[i];
    slide.append(el("div", {class:"faint", style:"font-weight:600;margin-bottom:6px"}, s.sub || ""), el("h2", {}, s.title), s.node.cloneNode(true));
    slide.querySelectorAll(".card>h2").forEach(h => h.remove());
    slide.querySelectorAll(".no-print").forEach(n => n.remove());
    counter.textContent = `${i + 1} / ${sections.length}`; prev.disabled = i === 0; next.disabled = i === sections.length - 1;
  }
  function key(e) { if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(i + 1); } else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(i - 1); } else if (e.key === "Escape") exit(); }
  function exit() { box.hidden = true; box.textContent = ""; document.removeEventListener("keydown", key, true); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
  document.addEventListener("keydown", key, true);
  if (box.requestFullscreen) box.requestFullscreen().catch(() => {});
  go(0);
};
})();

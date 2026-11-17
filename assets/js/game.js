/* Survey game: topic blocks fall into four lanes. Fully driven by the question bank. */
"use strict";
(function () {
const {el, $} = App;
let G = null;   // current game state

App.renderSurveyIntro = (inv, bank, existing) => {
  const main = $("main"); main.textContent = "";
  const skillLanes = App.lanesFor({kind:"skill"}, bank.cat);
  const start = el("button", {class:"btn primary big", type:"button", onclick: () => startGame(inv, bank)}, existing ? "Retake the survey" : "Start the survey");
  main.append(el("div", {class:"hero"},
    el("div", {},
      el("div", {class:"faint", style:"font-weight:600;margin-bottom:6px"}, `${inv.teams.name} · ${bank.cat.name}`),
      el("h1", {}, "How deep is your AI stack?"),
      el("p", {class:"muted"}, `A ${Math.max(4, Math.round(bank.items.length / 5))}-minute self-check. ${bank.items.length} topic blocks fall one at a time. Drop each one into the lane that matches what you honestly know today. There are no right answers and nothing is timed.`),
      el("ul", {class:"how"},
        el("li", {}, el("span", {}, "01"), el("span", {}, "Read the topic and its one-line description.")),
        el("li", {}, el("span", {}, "02"), el("span", {}, "Press ", el("span", {class:"kbd"}, "1"), "–", el("span", {class:"kbd"}, "4"), " or tap a lane to drop it. ", el("span", {class:"kbd"}, "←"), el("span", {class:"kbd"}, "→"), " and ", el("span", {class:"kbd"}, "Space"), " work too.")),
        el("li", {}, el("span", {}, "03"), el("span", {}, "Press ", el("span", {class:"kbd"}, "L"), " or the star to flag a topic you'd like to learn. ", el("span", {class:"kbd"}, "⌫"), " undoes the last block.")),
        el("li", {}, el("span", {}, "04"), el("span", {}, "Clear every level to see your AI literacy card."))),
      el("div", {class:"row"}, start,
        existing ? el("a", {class:"btn", href:`#/result/${inv.id}`}, "View my last result") : null),
      existing ? el("p", {class:"faint", style:"font-size:13px"}, `You last took it on ${App.fmtDate(existing.submitted_at)}. Retaking replaces your previous answers.`) : null,
      el("p", {class:"faint", style:"font-size:13px;margin-top:14px"}, "Your individual answers are visible only to the survey administrators at CodeWalnut.")),
    el("div", {},
      el("div", {class:"stat-l", style:"margin-bottom:8px"}, "The four lanes"),
      el("div", {class:"lanes-legend"}, skillLanes.map((l, i) => el("div", {class:"lv l" + i}, el("b", {}, i + 1), el("span", {}, l.long)))),
      el("div", {class:"stat-l", style:"margin:18px 0 8px"}, "The levels"),
      el("div", {class:"chips"}, bank.sections.map((s, i) => el("span", {class:"chip", style:`border-color:${s.color || "#888"}`}, `${i}. ${s.name}`))))));
};

function startGame(inv, bank) {
  G = {inv, bank, answers:[], idx:0, lane:null, star:false, busy:false, score:0, startedAt:Date.now(), lastSec:-1, laneKey:null};
  const main = $("main"); main.textContent = "";
  main.append(el("div", {class:"cabinet"}, el("div", {class:"game"},
    el("div", {class:"hud"},
      el("div", {class:"cpanel"},
        el("div", {class:"stat-l"}, "Level ", el("span", {id:"g-lvl"}, "0"), " / ", String(bank.sections.length - 1)),
        el("div", {class:"levelname", id:"g-lvlname"}),
        el("div", {class:"segs", id:"g-segs"}, bank.sections.map(() => el("i"))),
        el("div", {class:"row", style:"justify-content:space-between;margin-top:12px"},
          el("div", {}, el("div", {class:"stat-l"}, "Blocks"), el("div", {class:"stat-v", id:"g-blocks"}, "0")),
          el("div", {style:"text-align:right"}, el("div", {class:"stat-l"}, "Score"), el("div", {class:"stat-v", id:"g-score"}, "0")))),
      el("div", {class:"cpanel now"},
        el("div", {class:"stat-l"}, "Now falling"),
        el("h3", {id:"g-name"}), el("p", {id:"g-desc"}),
        el("button", {class:"cbtn", id:"g-star", type:"button", style:"width:100%;margin-top:12px", "aria-pressed":"false", onclick:toggleStar}, "☆ I want to learn this ", el("span", {class:"kbd"}, "L"))),
      el("div", {class:"cpanel keys"},
        el("div", {}, el("span", {class:"kbd"}, "1"), "–", el("span", {class:"kbd"}, "4"), " drop into lane"),
        el("div", {}, el("span", {class:"kbd"}, "←"), " ", el("span", {class:"kbd"}, "→"), " move · ", el("span", {class:"kbd"}, "Space"), " drop"),
        el("button", {class:"cbtn", type:"button", onclick:undo}, "Undo last block ", el("span", {class:"kbd"}, "⌫")),
        el("a", {class:"cbtn", href:"#/"}, "Quit without saving"))),
    el("div", {class:"board", id:"g-board"},
      el("div", {class:"lanes", id:"g-lanes"}),
      el("div", {class:"guide", id:"g-guide"}),
      el("div", {class:"piece unset", id:"g-piece"}, el("div", {class:"blk", id:"g-blk"})),
      el("div", {class:"toast", id:"g-toast"}),
      el("div", {class:"banner", id:"g-banner"}, el("div", {class:"lvl", id:"g-ban-lvl"}), el("h2", {id:"g-ban-title"}), el("p", {id:"g-ban-sub"}))))));
  nextPiece();
}

const laneKeyOf = sec => sec.kind === "skill" ? "skill" : sec.id;
function buildLanes(sec) {
  const lanes = $("g-lanes"); lanes.textContent = "";
  App.lanesFor(sec, G.bank.cat).forEach((l, i) => {
    const lane = el("div", {class:"lane", "data-l":String(i), role:"button", "aria-label":`Drop into: ${l.long}`},
      el("div", {class:"count", id:"g-cnt" + i}, "0"), el("div", {class:"lstack", id:"g-stack" + i}),
      el("div", {class:"lane-label"}, el("b", {}, l.short), el("small", {}, l.sub), el("span", {class:"kbd"}, String(i + 1))));
    lane.addEventListener("mouseenter", () => { if (!G.busy) setLane(i); });
    lane.addEventListener("click", () => drop(i));
    lanes.append(lane);
  });
  G.laneKey = laneKeyOf(sec);
  renderStacks();
}
function renderStacks() {
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) { const s = $("g-stack" + i); if (s) s.textContent = ""; }
  G.answers.forEach(a => {
    const it = G.bank.items.find(x => x.id === a.id);
    if (laneKeyOf(it.sec) !== G.laneKey) return;
    counts[a.v]++;
    $("g-stack" + a.v).append(el("div", {class:"brick" + (a.star ? " star" : ""), style:`background:${it.sec.color || "#5a5f8c"}`, title:it.title}));
  });
  counts.forEach((c, i) => { const n = $("g-cnt" + i); if (n) n.textContent = c; });
  const board = $("g-board"); const avail = board.clientHeight - 150; const mx = Math.max(1, ...counts);
  board.style.setProperty("--bh", Math.max(4, Math.min(16, Math.floor(avail / mx) - 2)) + "px");
}
function setLane(i) {
  G.lane = i; const p = $("g-piece"); p.classList.remove("unset"); p.style.left = (i * 25) + "%";
  document.querySelectorAll(".lane").forEach((l, j) => l.classList.toggle("hot", j === i));
}
function hud(it) {
  $("g-lvl").textContent = it.si; $("g-lvlname").textContent = it.sec.name;
  $("g-name").textContent = it.title; $("g-desc").textContent = it.description || "";
  $("g-blocks").textContent = `${G.idx}/${G.bank.items.length}`; $("g-score").textContent = G.score.toLocaleString();
  const sb = $("g-star"); sb.hidden = it.sec.kind !== "skill"; sb.setAttribute("aria-pressed", String(G.star));
  sb.firstChild.textContent = (G.star ? "★" : "☆") + " I want to learn this ";
  [...$("g-segs").children].forEach((seg, i) => {
    const s = G.bank.sections[i]; const done = s.questions.filter(q => G.answers.some(a => a.id === q.id)).length;
    seg.style.background = done === s.questions.length ? s.color : (i === it.si ? `linear-gradient(90deg, ${s.color} ${Math.round(100 * done / s.questions.length)}%, var(--cab-3) 0)` : "");
  });
}
function nextPiece() {
  if (G.idx >= G.bank.items.length) return finish();
  const it = G.bank.items[G.idx];
  if (G.laneKey !== laneKeyOf(it.sec)) buildLanes(it.sec);
  G.star = !!G.restoreStar; G.restoreStar = false; G.lane = null;
  hud(it);
  const p = $("g-piece"), blk = $("g-blk");
  p.className = "piece unset"; p.style.left = ""; p.style.transition = ""; p.style.top = "-80px";
  blk.textContent = it.title; blk.style.background = it.sec.color || "#5a5f8c";
  document.querySelectorAll(".lane").forEach(l => l.classList.remove("hot"));
  const tag = p.querySelector(".tag"); if (tag) tag.remove();
  if (G.star) p.append(el("span", {class:"tag"}, "★ learn"));
  void p.offsetHeight;
  const go = () => { G.busy = false; requestAnimationFrame(() => { p.style.transition = "top 1.6s cubic-bezier(.2,.7,.3,1), left .12s ease-out"; p.style.top = "56px"; $("g-guide").style.top = "56px"; }); };
  if (it.si !== G.lastSec) {
    G.lastSec = it.si; G.busy = true;
    $("g-ban-lvl").textContent = `LEVEL ${it.si} OF ${G.bank.sections.length - 1}`;
    $("g-ban-title").textContent = it.sec.name;
    $("g-ban-sub").textContent = it.sec.intro || `${it.sec.questions.length} blocks. Lanes mean how well you know each topic.`;
    $("g-banner").classList.add("on");
    setTimeout(() => { const b = $("g-banner"); if (b) { b.classList.remove("on"); go(); } }, 1500);
  } else go();
}
function toggleStar() {
  const it = G && G.bank.items[G.idx]; if (!it || it.sec.kind !== "skill" || G.busy) return;
  G.star = !G.star; const p = $("g-piece"); const tag = p.querySelector(".tag"); if (tag) tag.remove();
  if (G.star) p.append(el("span", {class:"tag"}, "★ learn"));
  hud(it);
}
function toast(t) { const n = $("g-toast"); if (!n) return; n.textContent = t; n.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(() => n.classList.remove("on"), 900); }
function drop(lane) {
  if (!G || G.busy || G.idx >= G.bank.items.length) return;
  if (lane == null) lane = G.lane;
  if (lane == null) { toast("Pick a lane: 1–4"); return; }
  G.busy = true; setLane(lane);
  const it = G.bank.items[G.idx]; const p = $("g-piece");
  p.style.transition = ""; p.classList.add("dropping");
  const target = $("g-board").clientHeight - 90 - $("g-stack" + lane).offsetHeight - 50;
  p.style.top = Math.max(60, target) + "px";
  setTimeout(() => {
    if (!G) return;
    G.answers = G.answers.filter(a => a.id !== it.id);
    G.answers.push({id:it.id, v:lane, star: it.sec.kind === "skill" && G.star});
    G.score += 100 + (G.star ? 25 : 0); G.idx++;
    const next = G.bank.items[G.idx];
    if (!next || next.si !== it.si) { G.score += 500; toast("LEVEL CLEAR +500"); }
    renderStacks(); nextPiece();
  }, 300);
}
function undo() {
  if (!G || G.busy || !G.answers.length) return;
  const last = G.answers.pop();
  G.idx = G.bank.items.findIndex(i => i.id === last.id);
  G.score = Math.max(0, G.score - 100 - (last.star ? 25 : 0));
  G.lastSec = G.bank.items[G.idx].si; G.restoreStar = last.star;
  if (G.laneKey !== laneKeyOf(G.bank.items[G.idx].sec)) buildLanes(G.bank.items[G.idx].sec); else renderStacks();
  nextPiece();
}
document.addEventListener("keydown", e => {
  if (!G || !$("g-board")) return;
  if (e.target.matches && e.target.matches("input,textarea,select")) return;
  if (e.key >= "1" && e.key <= "4") { e.preventDefault(); drop(+e.key - 1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); if (!G.busy) setLane(G.lane == null ? 1 : Math.max(0, G.lane - 1)); }
  else if (e.key === "ArrowRight") { e.preventDefault(); if (!G.busy) setLane(G.lane == null ? 2 : Math.min(3, G.lane + 1)); }
  else if (e.key === " " || e.key === "ArrowDown" || e.key === "Enter") { e.preventDefault(); drop(); }
  else if (e.key === "l" || e.key === "L") { e.preventDefault(); toggleStar(); }
  else if (e.key === "Backspace") { e.preventDefault(); undo(); }
});
window.addEventListener("resize", () => { if (G && $("g-board")) renderStacks(); });
window.addEventListener("hashchange", () => { if (!$("g-board")) G = null; });

async function finish() {
  const {inv, bank} = G;
  const answers = {ratings:{}, learn:[], durationSec:Math.round((Date.now() - G.startedAt) / 1000), score:G.score};
  G.answers.forEach(a => { answers.ratings[a.id] = a.v; if (a.star) answers.learn.push(a.id); });
  G = null;
  const main = $("main"); main.textContent = ""; main.append(el("div", {class:"loading"}, "Saving your answers…"));
  let error = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    ({error} = await App.sb.from("responses").upsert({invitation_id:inv.id, user_id:App.me.uid, display_name:App.me.name || null, answers}, {onConflict:"invitation_id"}));
    if (!error) break;
    await new Promise(r => setTimeout(r, 800));
  }
  App.renderResult(inv, bank, {answers, submitted_at:new Date().toISOString()}, error ? App.err(error) : null);
}

App.renderResult = (inv, bank, resp, saveError) => {
  const main = $("main"); main.textContent = "";
  const pr = App.profileOf(resp.answers, bank); const [stage, stageDesc] = App.stage(pr.index);
  const r = resp.answers.ratings || {};
  const strong = bank.skillItems.filter(i => r[i.id] >= 2).sort((a, b) => r[b.id] - r[a.id]).slice(0, 8);
  const learn = (resp.answers.learn || []).map(id => bank.items.find(i => i.id === id)).filter(Boolean);
  main.append(
    el("div", {class:"pagehead"}, el("div", {}, el("h1", {}, "Your AI literacy card"), el("p", {}, `${inv.teams.name} · ${bank.cat.name}`))),
    saveError ? el("div", {class:"empty", style:"border-color:var(--crit);color:var(--crit);margin-bottom:16px"}, "Your answers were not saved: " + saveError + ". Press Retake to try again.") : null,
    el("div", {class:"result"},
      el("div", {class:"card-id"},
        el("div", {class:"stat-l", style:"color:#8a8fbd"}, "AI readiness score"),
        el("div", {class:"big"}, String(pr.index), el("small", {}, "/100")),
        el("div", {class:"arche"}, stage), el("div", {style:"font-size:14px;color:var(--cab-ink-2)"}, stageDesc),
        el("div", {style:"font-size:13px;color:" + (saveError ? "#ffb2a8" : "#a6e6b4")}, saveError ? "Not saved" : "✓ Saved " + App.fmtDate(resp.submitted_at)),
        el("div", {class:"row", style:"margin-top:auto"},
          el("a", {class:"cbtn", href:`#/survey/${inv.id}`}, "Retake"), el("a", {class:"cbtn", href:"#/"}, "My surveys"))),
      el("div", {class:"card"},
        el("h2", {style:"margin-bottom:12px"}, "Your profile by area"),
        el("div", {class:"bars"}, pr.cats.map(({sec, pct}) => el("div", {class:"bar-row"}, el("span", {}, sec.name),
          el("div", {class:"bar-track"}, el("div", {class:"bar-fill", style:`width:${pct}%;background:${sec.color}`})), el("span", {class:"num"}, pct + "%")))),
        el("div", {class:"grid2", style:"margin-top:20px"},
          el("div", {}, el("div", {class:"stat-l", style:"margin-bottom:6px"}, "Your strongest topics"),
            el("div", {class:"chips"}, strong.length ? strong.map(i => el("span", {class:"chip", style:`border-color:${i.sec.color}`}, i.title)) : el("span", {class:"faint", style:"font-size:14px"}, "None rated hands-on yet. Plenty of room to grow."))),
          el("div", {}, el("div", {class:"stat-l", style:"margin-bottom:6px"}, "You flagged to learn"),
            el("div", {class:"chips"}, learn.length ? learn.map(i => el("span", {class:"chip warn"}, "★ " + i.title)) : el("span", {class:"faint", style:"font-size:14px"}, "No topics flagged.")))))));
};
})();

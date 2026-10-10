// Generates the portfolio visuals as light + dark SVGs into ../assets.
// Every number here is copied from the source repo named beside it; re-check there before changing one.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
mkdirSync(OUT, { recursive: true });

const THEMES = {
  light: {
    surface: "#fcfcfb", ink: "#0b0b0b", ink2: "#52514e", muted: "#898781", grid: "#e1e0d9",
    axis: "#c3c2b7", border: "rgba(11,11,11,0.10)", s1: "#2a78d6", s2: "#eb6834", deemph: "#c3c2b7",
    node: "#f3f2ee", accentWash: "#e4eefb", good: "#0ca30c", critical: "#d03b3b",
  },
  dark: {
    surface: "#1a1a19", ink: "#ffffff", ink2: "#c3c2b7", muted: "#898781", grid: "#2c2c2a",
    axis: "#383835", border: "rgba(255,255,255,0.10)", s1: "#3987e5", s2: "#d95926", deemph: "#4a4a46",
    node: "#242422", accentWash: "#16283f", good: "#0ca30c", critical: "#e66767",
  },
};
const FONT = `system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`;
const MONO = `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 14}" font-weight="${o.weight ?? 400}" fill="${o.fill}" text-anchor="${o.anchor ?? "start"}"${o.mono ? ` font-family="${MONO}"` : ""}>${esc(s)}</text>`;
// Bar with a 4px rounded data-end and a square baseline end.
const hbar = (x, y, w, h, fill) => {
  const r = Math.min(4, w);
  return `<path d="M${x},${y}h${w - r}a${r},${r} 0 0 1 ${r},${r}v${h - 2 * r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - r)}z" fill="${fill}"/>`;
};
const frame = (w, h, t, title, desc, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" font-family="${FONT}">
<title>${esc(title)}</title><desc>${esc(desc)}</desc>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="12" fill="${t.surface}" stroke="${t.border}"/>
${body}
</svg>\n`;

// ---------------------------------------------------------------------------------------------
// evalplane: consent calibration curve. Source: evalplane/docs/benchmark-tau2.md,
// "An independent implementation, and a 35x calibration curve".
function evalplaneCalibration(t) {
  const W = 880, H = 470, X0 = 330, XMAX = 800, MAXV = 30;
  const sx = (v) => (v / MAXV) * (XMAX - X0);
  const rows = [
    { a: "One yes covers the rest", b: "of the conversation", note: "llmcontract-tau2", retail: 0.8, airline: 0.2 },
    { a: "One yes lasts until the", b: "customer speaks again", note: "Evalplane default", retail: 4.2, airline: 3.7 },
    { a: "One yes per action", b: "", note: "each: true", retail: 27.8, airline: 13.9 },
  ];
  let b = "";
  b += text(40, 52, "One policy sentence, three defensible readings", { size: 22, weight: 650, fill: t.ink });
  b += text(40, 78, "Share of τ²-bench runs scored as solved that still broke “confirm before acting”", { size: 14, fill: t.ink2 });
  // legend
  b += `<rect x="40" y="100" width="12" height="12" rx="3" fill="${t.s1}"/>` + text(58, 111, "Retail", { size: 13, fill: t.ink2 });
  b += `<rect x="112" y="100" width="12" height="12" rx="3" fill="${t.s2}"/>` + text(130, 111, "Airline", { size: 13, fill: t.ink2 });
  // grid
  const top = 140, rowH = 84, bottom = top + rows.length * rowH;
  for (const g of [0, 10, 20, 30]) {
    const x = X0 + sx(g);
    b += `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="${g === 0 ? t.axis : t.grid}" stroke-width="1"/>`;
    b += text(x, bottom + 20, `${g}%`, { size: 12, fill: t.muted, anchor: "middle" });
  }
  rows.forEach((r, i) => {
    const y = top + i * rowH + 14;
    b += text(40, y + 16, r.a, { size: 14, weight: 600, fill: t.ink });
    if (r.b) b += text(40, y + 34, r.b, { size: 14, weight: 600, fill: t.ink });
    b += text(40, y + (r.b ? 54 : 36), r.note, { size: 12, fill: t.muted, mono: true });
    b += hbar(X0, y, Math.max(sx(r.retail), 2), 22, t.s1);
    b += text(X0 + sx(r.retail) + 8, y + 16, `${r.retail}%`, { size: 13, weight: 600, fill: t.ink });
    b += hbar(X0, y + 24, Math.max(sx(r.airline), 2), 22, t.s2);
    b += text(X0 + sx(r.airline) + 8, y + 40, `${r.airline}%`, { size: 13, weight: 600, fill: t.ink });
  });
  b += text(40, H - 28, "Same trajectories, same rule, same tool sets. Only how long a “yes” lasts changes: a 35× spread in retail, 70× in airline.", { size: 13, fill: t.ink2 });
  return frame(W, H, t, "Evalplane: consent calibration curve on τ²-bench",
    "Violation rate among solved runs under three readings of one confirmation rule. Retail: 0.8%, 4.2%, 27.8%. Airline: 0.2%, 3.7%, 13.9%.", b);
}

// ---------------------------------------------------------------------------------------------
// f1-fantasy: embedding bakeoff. Source: f1-fantasy/EVALS.md, "Embedding model" (current corpus column).
function f1Embedding(t) {
  const W = 880, H = 366, X0 = 300, XMAX = 780;
  const sx = (v) => (v / 100) * (XMAX - X0);
  const rows = [
    { name: "all-MiniLM-L6-v2", note: "384 dims · symmetric", v: 53, pick: false },
    { name: "all-mpnet-base-v2", note: "768 dims · symmetric", v: 80, pick: false },
    { name: "bge-large-en-v1.5", note: "1024 dims · retrieval-tuned · chosen", v: 93, pick: true },
  ];
  let b = "";
  b += text(40, 52, "Picking the embedding model by measurement", { size: 22, weight: 650, fill: t.ink });
  b += text(40, 78, "recall@1 on 15 hand-labelled questions, chunking held constant", { size: 14, fill: t.ink2 });
  const top = 108, rowH = 58, bottom = top + rows.length * rowH;
  for (const g of [0, 25, 50, 75, 100]) {
    const x = X0 + sx(g);
    b += `<line x1="${x}" y1="${top}" x2="${x}" y2="${bottom}" stroke="${g === 0 ? t.axis : t.grid}" stroke-width="1"/>`;
    b += text(x, bottom + 20, `${g}%`, { size: 12, fill: t.muted, anchor: "middle" });
  }
  rows.forEach((r, i) => {
    const y = top + i * rowH + 17;
    b += text(40, y + 10, r.name, { size: 14, weight: 600, fill: t.ink, mono: true });
    b += text(40, y + 28, r.note, { size: 12, fill: t.muted });
    b += hbar(X0, y, sx(r.v), 24, r.pick ? t.s1 : t.deemph);
    b += text(X0 + sx(r.v) + 8, y + 17, `${r.v}%`, { size: 13, weight: 600, fill: t.ink });
  });
  b += text(40, H - 24, "A cross-encoder reranker was tested the same way and rejected: recall@1 fell from 14/15 to 13/15.", { size: 13, fill: t.ink2 });
  return frame(W, H, t, "f1-fantasy: embedding model bakeoff",
    "recall@1: all-MiniLM-L6-v2 53%, all-mpnet-base-v2 80%, bge-large-en-v1.5 93% (chosen).", b);
}

// ---------------------------------------------------------------------------------------------
// Diagram helpers
const defs = (t) =>
  `<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${t.muted}"/></marker></defs>`;
const node = (t, x, y, w, h, title, sub, o = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${o.accent ? t.accentWash : t.node}" stroke="${o.accent ? t.s1 : t.border}" stroke-width="${o.accent ? 1.5 : 1}"/>` +
  text(x + w / 2, y + (sub ? h / 2 - 3 : h / 2 + 5), title, { size: o.mono ? 12.5 : 14, weight: 600, fill: t.ink, anchor: "middle", mono: o.mono }) +
  (sub ? text(x + w / 2, y + h / 2 + 16, sub, { size: 12, fill: t.ink2, anchor: "middle" }) : "");
const arrow = (t, d, o = {}) =>
  `<path d="${d}" fill="none" stroke="${t.muted}" stroke-width="1.5"${o.dash ? ' stroke-dasharray="5 4"' : ""} marker-end="url(#arr)"${o.both ? ' marker-start="url(#arr)"' : ""}/>`;

// f1-fantasy: team-builder graph. Source: f1-fantasy/src/team_builder.py (build graph, MAX_RETRIES = 2).
function f1Graph(t) {
  const W = 880, H = 330, y = 128, h = 64;
  let b = defs(t);
  b += text(40, 52, "A hard budget is checked by code, not by the model", { size: 22, weight: 650, fill: t.ink });
  b += text(40, 78, "The team-builder graph: the LLM proposes, deterministic Python validates, and failures loop back", { size: 14, fill: t.ink2 });
  const xs = [40, 222, 420, 582, 754], ws = [160, 176, 140, 150, 86];
  b += node(t, xs[0], y, ws[0], h, "load_static_context", "full price tables", { mono: true });
  b += node(t, xs[1], y, ws[1], h, "fetch_live_conditions", "web search, untrusted", { mono: true });
  b += node(t, xs[2], y, ws[2], h, "propose_team", "LLM picks 5 + 2", { mono: true });
  b += node(t, xs[3], y, ws[3], h, "validate_budget", "pure Python, $100M cap", { mono: true, accent: true });
  b += node(t, xs[4], y, ws[4], h, "finalize", "", { mono: true });
  for (let i = 0; i < 4; i++) b += arrow(t, `M${xs[i] + ws[i]},${y + h / 2}H${xs[i + 1] - 3}`);
  b += text((xs[3] + ws[3] + xs[4]) / 2, y - 10, "valid", { size: 11, fill: t.ink2, anchor: "middle" });
  // retry loop
  const rx1 = xs[3] + ws[3] / 2, rx2 = xs[2] + ws[2] / 2, ry = y + h + 46;
  b += arrow(t, `M${rx1},${y + h}V${ry - 8}a8,8 0 0 1 -8,8H${rx2 + 8}a8,8 0 0 1 -8,-8V${y + h + 3}`, { dash: true });
  b += text((rx1 + rx2) / 2, ry + 20, "invalid: retry with the exact errors, up to 2 times", { size: 12, fill: t.ink2, anchor: "middle" });
  b += text(40, H - 24, "Catches over-budget teams, wrong roster sizes, unknown driver names and a captain outside the roster.", { size: 13, fill: t.ink2 });
  return frame(W, H, t, "f1-fantasy: team-builder graph",
    "load_static_context, fetch_live_conditions, propose_team, validate_budget, then finalize; an invalid proposal loops back to propose_team up to twice.", b);
}

// Trazer: architecture. Source: Trazer/README.md and ARCHITECTURE.md diagrams.
function trazerArch(t) {
  const W = 880, H = 516;
  let b = defs(t);
  b += text(40, 52, "The conversation never waits for the work", { size: 22, weight: 650, fill: t.ink });
  b += text(40, 78, "Trazer keeps listening while background subagents do the task", { size: 14, fill: t.ink2 });

  // conversation loop band
  b += text(40, 112, "CONVERSATION LOOP · real time, runs locally", { size: 11, weight: 600, fill: t.muted });
  const y = 156, h = 60, xs = [40, 170, 300, 462, 640, 770], ws = [90, 90, 122, 138, 90, 70];
  b += node(t, xs[0], y, ws[0], h, "Mic", "always on");
  b += node(t, xs[1], y, ws[1], h, "VAD", "Silero");
  b += node(t, xs[2], y, ws[2], h, "Speech to text", "faster-whisper");
  b += node(t, xs[3], y, ws[3], h, "Orchestrator", "LLM · ack + delegate", { accent: true });
  b += node(t, xs[4], y, ws[4], h, "TTS", "Piper");
  b += node(t, xs[5], y, ws[5], h, "Speaker", "");
  for (let i = 0; i < 5; i++) b += arrow(t, `M${xs[i] + ws[i]},${y + h / 2}H${xs[i + 1] - 3}`);
  // barge-in: VAD cuts playback
  const bx1 = xs[1] + ws[1] / 2, bx2 = xs[5] + ws[5] / 2;
  b += arrow(t, `M${bx1},${y}V${y - 22 + 8}a8,8 0 0 1 8,-8H${bx2 - 8}a8,8 0 0 1 8,8V${y - 3}`, { dash: true });
  b += text(bx2 - 14, y - 30, "barge-in: speech cuts playback", { size: 11, fill: t.ink2, anchor: "end" });

  // work loop
  const ox = xs[3] + ws[3] / 2, ry = 280;
  b += text(40, ry - 8, "WORK LOOP · background", { size: 11, weight: 600, fill: t.muted });
  b += arrow(t, `M${ox - 24},${y + h}V${ry - 3}`);
  b += arrow(t, `M${ox + 24},${ry}V${y + h + 3}`);
  b += text(ox - 34, y + h + 38, "spawn / cancel", { size: 11, fill: t.ink2, anchor: "end" });
  b += text(ox + 34, y + h + 38, "spoken updates", { size: 11, fill: t.ink2 });
  b += node(t, ox - 110, ry, 220, 50, "Task registry", "");
  const wy = 370, wn = ["web", "files", "calendar", "research", "agent"], ww = 104, gap = 16;
  const wx0 = ox - (wn.length * ww + (wn.length - 1) * gap) / 2;
  wn.forEach((n, i) => {
    const x = wx0 + i * (ww + gap);
    b += node(t, x, wy, ww, 44, n, "", { mono: true });
    b += arrow(t, `M${ox},${ry + 50}V${ry + 70}H${x + ww / 2}V${wy - 3}`);
  });
  b += text(wx0 - 14, wy + 27, "subagents", { size: 12, fill: t.ink2, anchor: "end" });

  // feedback + tracing
  b += `<line x1="40" y1="440" x2="${W - 40}" y2="440" stroke="${t.grid}"/>`;
  b += text(40, 468, "Feedback", { size: 13, weight: 600, fill: t.ink });
  b += text(118, 468, "corrections → reflection → evidence-weighted learnings.json → next prompt", { size: 13, fill: t.ink2 });
  b += text(40, 492, "Tracing", { size: 13, weight: 600, fill: t.ink });
  b += text(118, 492, "every LLM call logged locally, correlated by session across the whole delegate chain", { size: 13, fill: t.ink2 });
  return frame(W, H, t, "Trazer architecture",
    "Mic, VAD, speech-to-text, orchestrator, TTS and speaker form a real-time loop; the orchestrator delegates to background subagents through a task registry and speaks their results.", b);
}

const charts = {
  "evalplane-calibration": evalplaneCalibration,
  "f1-embedding-bakeoff": f1Embedding,
  "f1-team-builder-graph": f1Graph,
  "trazer-architecture": trazerArch,
};
for (const [name, fn] of Object.entries(charts))
  for (const [mode, t] of Object.entries(THEMES)) {
    writeFileSync(join(OUT, `${name}-${mode}.svg`), fn(t));
    console.log(`wrote ${name}-${mode}.svg`);
  }

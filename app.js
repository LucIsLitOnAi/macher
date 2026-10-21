// Macher – Rezeptbox für die Geschwister. Alles lokal auf dem Gerät, kein Server.
"use strict";

const APP_NAME = "Macher";
const STORE_KEY = "macher.rezepte.v1";
const THEME_KEY = "macher.theme";
const THEMES = {
  papier: { name: "Papier", colors: ["#f4efe6", "#2b2620", "#b4532a"] },
  nacht:  { name: "Nacht",  colors: ["#16161a", "#ece8e1", "#e8a35a"] },
  salbei: { name: "Salbei", colors: ["#e6ebe1", "#26302a", "#3f6b4f"] },
  ozean:  { name: "Ozean",  colors: ["#e3edf2", "#1d2c36", "#1f6f8b"] },
};

const app = document.getElementById("app");
const crossed = {}; // Rezept-ID -> Set der durchgestrichenen Zutaten (nur solange die App offen ist)

// ---------- Speicher ----------
function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
}
function save(recipes) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(recipes)); }
  catch { toast("Speichern hat nicht geklappt"); }
}
function getTheme() {
  try { return localStorage.getItem(THEME_KEY) || "papier"; } catch { return "papier"; }
}
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEMES[t].colors[0];
  try { localStorage.setItem(THEME_KEY, t); } catch {}
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => /^https?:\/\//i.test(u || "") ? u : "";

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("show"), 2200);
}

// ---------- Teilen: Rezept steckt im Link ----------
function encodeRecipe(r, note) {
  const data = { t: r.title, s: r.subtitle, i: r.ingredients.map((x) => x.text),
    n: r.notes, l: r.links.map((x) => [x.title, x.url]), m: note || "" };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeRecipe(code) {
  const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
  const d = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  return {
    recipe: {
      title: String(d.t || "Ohne Titel"), subtitle: String(d.s || ""),
      ingredients: (d.i || []).map((text) => ({ id: uid(), text: String(text) })),
      notes: String(d.n || ""),
      links: (d.l || []).map(([title, url]) => ({ title: String(title || ""), url: String(url || "") })),
    },
    note: String(d.m || ""),
  };
}
async function shareRecipe(r) {
  const note = prompt("Kleine Nachricht dazu? (optional)", "") ?? null;
  if (note === null) return;
  const url = location.origin + location.pathname + "#import=" + encodeRecipe(r, note);
  const text = note ? `${note}\n\n` : "";
  if (navigator.share) {
    try { await navigator.share({ title: r.title, text: text + `Rezept: ${r.title}`, url }); } catch {}
  } else {
    try { await navigator.clipboard.writeText(url); toast("Link kopiert"); }
    catch { prompt("Link kopieren:", url); }
  }
}

// ---------- Ansichten ----------
function viewList() {
  const recipes = load().sort((a, b) => a.title.localeCompare(b.title, "de"));
  app.innerHTML = `
    <div class="wrap">
      <div class="bar">
        <h1 class="serif">${APP_NAME}</h1>
        <a class="btn icon-btn" href="#/einstellungen" aria-label="Einstellungen">⚙︎</a>
      </div>
      ${recipes.length ? `<input class="search" type="search" placeholder="Suchen: Titel, Zutat, Notiz …" id="q">` : ""}
      <ul class="list" id="list"></ul>
      ${recipes.length ? "" : `<div class="empty serif">Noch keine Rezepte.<br>Tipp auf + und schreib das erste auf.</div>`}
    </div>
    <a class="btn fab" href="#/neu" aria-label="Neues Rezept">+</a>`;
  const list = document.getElementById("list");
  const render = (q) => {
    q = (q || "").toLowerCase().trim();
    const hits = recipes.filter((r) => !q || [r.title, r.subtitle, r.notes,
      ...r.ingredients.map((i) => i.text), ...r.links.map((l) => l.title)].join(" ").toLowerCase().includes(q));
    list.innerHTML = hits.map((r) => `
      <li><a href="#/r/${r.id}">
        <div class="t serif">${esc(r.title)}</div>
        ${r.subtitle ? `<div class="s">${esc(r.subtitle)}</div>` : ""}
      </a></li>`).join("") || (q ? `<div class="empty">Nichts gefunden.</div>` : "");
  };
  render("");
  const qEl = document.getElementById("q");
  if (qEl) qEl.addEventListener("input", (e) => render(e.target.value));
}

function recipeCard(r, shareNote) {
  const done = crossed[r.id] || new Set();
  return `
    <article class="card">
      ${shareNote ? `<div class="share-note">„${esc(shareNote)}“</div>` : ""}
      <h2 class="serif">${esc(r.title)}</h2>
      ${r.subtitle ? `<div class="sub serif">${esc(r.subtitle)}</div>` : ""}
      ${r.ingredients.length ? `
        <div class="section"><h3>Zutaten</h3>
          <ul class="ingredients">${r.ingredients.map((i) =>
            `<li data-id="${i.id}" class="${done.has(i.id) ? "done" : ""}">${esc(i.text)}</li>`).join("")}</ul>
        </div>` : ""}
      ${r.notes ? `<div class="section"><h3>Notizen</h3><div class="notes">${esc(r.notes)}</div></div>` : ""}
      ${r.links.some((l) => safeUrl(l.url)) ? `
        <div class="section refs"><h3>Quellen</h3><ul>${r.links.filter((l) => safeUrl(l.url)).map((l) =>
          `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title || l.url)}</a></li>`).join("")}</ul>
        </div>` : ""}
    </article>`;
}

function viewRecipe(id) {
  const r = load().find((x) => x.id === id);
  if (!r) return (location.hash = "#/");
  app.innerHTML = `
    <div class="wrap">
      <div class="bar">
        <a class="btn" href="#/">‹ Alle</a><span class="spacer"></span>
        <button id="share">Teilen</button>
        <a class="btn" href="#/e/${r.id}">Bearbeiten</a>
      </div>
      ${recipeCard(r)}
      ${r.ingredients.length ? `<p class="hint">Tipp beim Kochen auf eine Zutat, um sie durchzustreichen.
        <button class="btn-ghost" id="reset">Zurücksetzen</button></p>` : ""}
    </div>`;
  app.querySelectorAll(".ingredients li").forEach((li) => li.addEventListener("click", () => {
    const set = (crossed[r.id] ||= new Set());
    set.has(li.dataset.id) ? set.delete(li.dataset.id) : set.add(li.dataset.id);
    li.classList.toggle("done");
  }));
  document.getElementById("share").onclick = () => shareRecipe(r);
  const reset = document.getElementById("reset");
  if (reset) reset.onclick = () => { delete crossed[r.id]; viewRecipe(id); };
}

function viewEdit(id) {
  const recipes = load();
  const existing = recipes.find((x) => x.id === id);
  const r = existing ? structuredClone(existing)
    : { id: uid(), title: "", subtitle: "", ingredients: [], notes: "", links: [] };
  if (!r.ingredients.length) r.ingredients.push({ id: uid(), text: "" });

  const draw = () => {
    app.innerHTML = `
      <div class="wrap">
        <div class="bar">
          <a class="btn btn-ghost" href="${existing ? "#/r/" + r.id : "#/"}">Abbrechen</a>
          <span class="spacer"></span>
          <button class="btn-primary" id="save">Sichern</button>
        </div>
        <label for="title">Titel</label>
        <input type="text" id="title" value="${esc(r.title)}" placeholder="z. B. Omas Linsensuppe">
        <label for="subtitle">Untertitel</label>
        <input type="text" id="subtitle" value="${esc(r.subtitle)}" placeholder="z. B. für 4, am besten am Vortag">

        <label>Zutaten (in der Reihenfolge, wie du sie brauchst)</label>
        <div id="ings">${r.ingredients.map((i, n) => `
          <div class="row">
            <input type="text" data-ing="${n}" value="${esc(i.text)}" placeholder="z. B. 200 g rote Linsen">
            <button data-up="${n}" aria-label="Nach oben">↑</button>
            <button data-down="${n}" aria-label="Nach unten">↓</button>
            <button data-del="${n}" aria-label="Entfernen">✕</button>
          </div>`).join("")}</div>
        <button class="add" id="addIng">+ Zutat</button>

        <label for="notes">Notizen</label>
        <textarea id="notes" placeholder="Was du dir merken willst: „Abschmecken!“, „Den großen blauen Topf nehmen“ …">${esc(r.notes)}</textarea>

        <label>Quellen (YouTube, Blogs, Apps …)</label>
        <div id="links">${r.links.map((l, n) => `
          <div class="row">
            <input type="text" data-lt="${n}" value="${esc(l.title)}" placeholder="Name" style="flex:.7">
            <input type="url" data-lu="${n}" value="${esc(l.url)}" placeholder="https://…">
            <button data-ldel="${n}" aria-label="Entfernen">✕</button>
          </div>`).join("")}</div>
        <button class="add" id="addLink">+ Quelle</button>

        ${existing ? `<div class="actions"><button class="btn-danger" id="del">Rezept löschen</button></div>` : ""}
      </div>`;
    bind();
  };

  // Eingaben in r übernehmen, bevor neu gezeichnet wird
  const collect = () => {
    r.title = document.getElementById("title").value;
    r.subtitle = document.getElementById("subtitle").value;
    r.notes = document.getElementById("notes").value;
    app.querySelectorAll("[data-ing]").forEach((el) => (r.ingredients[el.dataset.ing].text = el.value));
    app.querySelectorAll("[data-lt]").forEach((el) => (r.links[el.dataset.lt].title = el.value));
    app.querySelectorAll("[data-lu]").forEach((el) => (r.links[el.dataset.lu].url = el.value));
  };
  const move = (arr, from, to) => {
    if (to < 0 || to >= arr.length) return;
    arr.splice(to, 0, arr.splice(from, 1)[0]);
  };

  const bind = () => {
    const on = (sel, fn) => app.querySelectorAll(sel).forEach((el) => (el.onclick = () => { collect(); fn(el); draw(); }));
    on("[data-up]", (el) => move(r.ingredients, +el.dataset.up, +el.dataset.up - 1));
    on("[data-down]", (el) => move(r.ingredients, +el.dataset.down, +el.dataset.down + 1));
    on("[data-del]", (el) => r.ingredients.splice(+el.dataset.del, 1));
    on("[data-ldel]", (el) => r.links.splice(+el.dataset.ldel, 1));
    on("#addIng", () => r.ingredients.push({ id: uid(), text: "" }));
    on("#addLink", () => r.links.push({ title: "", url: "" }));
    // Enter in einer Zutat springt in eine neue Zeile
    app.querySelectorAll("[data-ing]").forEach((el) => el.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault(); collect();
      r.ingredients.splice(+el.dataset.ing + 1, 0, { id: uid(), text: "" });
      draw();
      app.querySelector(`[data-ing="${+el.dataset.ing + 1}"]`)?.focus();
    }));
    document.getElementById("save").onclick = () => {
      collect();
      r.title = r.title.trim();
      if (!r.title) { toast("Bitte einen Titel eingeben"); return; }
      r.ingredients = r.ingredients.filter((i) => i.text.trim());
      r.links = r.links.filter((l) => l.url.trim())
        .map((l) => ({ title: l.title.trim(), url: /^https?:\/\//i.test(l.url.trim()) ? l.url.trim() : "https://" + l.url.trim() }));
      r.updated = Date.now();
      const all = load().filter((x) => x.id !== r.id);
      all.push(r); save(all);
      location.hash = "#/r/" + r.id;
    };
    const del = document.getElementById("del");
    if (del) del.onclick = () => {
      if (!confirm(`„${existing.title}“ wirklich löschen?`)) return;
      save(load().filter((x) => x.id !== r.id));
      location.hash = "#/";
    };
  };
  draw();
}

function viewImport(code) {
  let data;
  try { data = decodeRecipe(code); } catch { toast("Der Link ist kaputt"); return (location.hash = "#/"); }
  const r = { id: uid(), ...data.recipe };
  app.innerHTML = `
    <div class="wrap">
      <div class="bar"><a class="btn btn-ghost" href="#/">Abbrechen</a><span class="spacer"></span>
        <button class="btn-primary" id="take">In meine Rezepte</button></div>
      <p class="hint">Jemand hat dir ein Rezept geschickt:</p>
      ${recipeCard(r, data.note)}
    </div>`;
  document.getElementById("take").onclick = () => {
    r.updated = Date.now();
    save([...load(), r]);
    toast("Gespeichert");
    location.hash = "#/r/" + r.id;
  };
}

function viewSettings() {
  const current = getTheme();
  const count = load().length;
  app.innerHTML = `
    <div class="wrap">
      <div class="bar"><a class="btn" href="#/">‹ Alle</a></div>
      <h2 class="serif">Aussehen</h2>
      <div class="themes">${Object.entries(THEMES).map(([k, t]) => `
        <button class="theme-pick ${k === current ? "active" : ""}" data-theme-pick="${k}" style="background:${t.colors[0]};color:${t.colors[1]}">
          <span class="serif">${t.name}</span>
          <div class="swatch">${t.colors.map((c) => `<span style="background:${c}"></span>`).join("")}</div>
        </button>`).join("")}</div>

      <h2 class="serif" style="margin-top:32px">Sicherung</h2>
      <p class="hint">Deine ${count} Rezepte liegen nur auf diesem Gerät. Ab und zu sichern schadet nicht.</p>
      <div class="actions">
        <button class="btn-primary" id="export">Sicherung speichern</button>
        <label class="btn" style="margin:0;font-size:inherit;font-weight:normal;color:var(--accent)">
          Sicherung laden<input type="file" id="import" accept="application/json,.json" hidden>
        </label>
      </div>
    </div>`;
  app.querySelectorAll("[data-theme-pick]").forEach((b) => (b.onclick = () => { setTheme(b.dataset.themePick); viewSettings(); }));
  document.getElementById("export").onclick = async () => {
    const file = new File([JSON.stringify(load(), null, 2)],
      `macher-rezepte-${new Date().toISOString().slice(0, 10)}.json`, { type: "application/json" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Macher-Sicherung" }); return; } catch {}
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file); a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  document.getElementById("import").onchange = async (e) => {
    try {
      const incoming = JSON.parse(await e.target.files[0].text());
      if (!Array.isArray(incoming)) throw 0;
      const byId = new Map(load().map((r) => [r.id, r]));
      incoming.filter((r) => r && r.id && r.title).forEach((r) => byId.set(r.id, {
        id: r.id, title: r.title, subtitle: r.subtitle || "", notes: r.notes || "",
        ingredients: r.ingredients || [], links: r.links || [], updated: r.updated || Date.now() }));
      save([...byId.values()]);
      toast(`${incoming.length} Rezepte geladen`);
      viewSettings();
    } catch { toast("Die Datei passt nicht"); }
  };
}

// ---------- Router ----------
function route() {
  const h = location.hash || "#/";
  window.scrollTo(0, 0);
  if (h.startsWith("#import=")) return viewImport(h.slice(8));
  if (h === "#/neu") return viewEdit(null);
  if (h === "#/einstellungen") return viewSettings();
  let m;
  if ((m = h.match(/^#\/r\/(.+)$/))) return viewRecipe(m[1]);
  if ((m = h.match(/^#\/e\/(.+)$/))) return viewEdit(m[1]);
  viewList();
}

setTheme(getTheme());
window.addEventListener("hashchange", route);
route();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// =====================================================================
// En-tête commun à toutes les pages : logo + menus déroulants
// Pour ajouter une catégorie ou une sous-catégorie : modifier MENU ci-dessous
// =====================================================================
const MENU = [
  { id: "velo", nom: "Vélo", sous: [
    { id: "journee", nom: "À la journée" },
    { id: "plusieurs-jours", nom: "Plusieurs jours" }
  ]},
  { id: "rando", nom: "Randonnée", sous: [
    { id: "journee", nom: "À la journée" },
    { id: "plusieurs-jours", nom: "Plusieurs jours" }
  ]}
];

(function () {
  const fleche = '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 4l4 4 4-4"/></svg>';
  const menus = MENU.map(m => `
    <div class="deroulant">
      <button class="onglet" aria-expanded="false">${m.nom} ${fleche}</button>
      <div class="panneau">
        ${m.sous.map(s => `<a href="index.html#${m.id}-${s.id}">${s.nom}</a>`).join("")}
        <a class="tout" href="index.html#${m.id}">Tous les parcours ${m.nom.toLowerCase()}</a>
      </div>
    </div>`).join("");

  const entete = document.createElement("header");
  entete.className = "entete";
  entete.innerHTML = `
    <div class="contenu">
      <a class="logo" href="index.html">
        <svg viewBox="0 0 32 32" fill="none" stroke="#e4572e" stroke-width="2"><path d="M2 26 L11 12 L16 19 L21 9 L30 26 Z"/><path d="M8 26c3-4 6-2 8-5s5-4 8 0" stroke="#fff" stroke-width="1.4"/></svg>
        Kévin à vélo
      </a>
      <nav class="menu">${menus}</nav>
    </div>`;
  document.body.prepend(entete);

  // Ouverture au clic (indispensable sur téléphone) ; un seul menu ouvert à la fois
  const onglets = entete.querySelectorAll(".onglet");
  onglets.forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    const ouvert = b.getAttribute("aria-expanded") === "true";
    onglets.forEach(o => o.setAttribute("aria-expanded", "false"));
    b.setAttribute("aria-expanded", String(!ouvert));
  }));
  document.addEventListener("click", () => onglets.forEach(o => o.setAttribute("aria-expanded", "false")));
})();

// Libellé lisible d'un parcours, ex. "Vélo · À la journée"
function libelleCategorie(activite, format) {
  const m = MENU.find(x => x.id === activite);
  const s = m && m.sous.find(x => x.id === format);
  return [m && m.nom, s && s.nom].filter(Boolean).join(" · ");
}

// --- Fond graphique quand il n'y a pas encore de photo : courbes de niveau ---
function courbesDeNiveau() {
  let s = '<svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="700" fill="#18201c"/>';
  const centres = [[880, 260, 1], [300, 520, .8], [620, 120, .6]];
  for (const [cx, cy, f] of centres) {
    for (let r = 30; r < 520 * f; r += 22) {
      let d = "";
      for (let a = 0; a <= 360; a += 8) {
        const t = a * Math.PI / 180;
        const k = r * (1 + 0.08 * Math.sin(3 * t + r / 40) + 0.05 * Math.cos(5 * t - r / 60));
        d += (a ? "L" : "M") + (cx + k * Math.cos(t) * 1.35).toFixed(1) + " " + (cy + k * Math.sin(t)).toFixed(1);
      }
      const maitresse = (r / 22) % 5 === 0;
      s += `<path d="${d}Z" fill="none" stroke="${maitresse ? "#e4572e" : "#3b4a42"}" stroke-opacity="${maitresse ? .45 : .7}" stroke-width="${maitresse ? 1.4 : 1}"/>`;
    }
  }
  return s + "</svg>";
}

// --- Fonds de carte communs (Esri Topo par défaut, secours OpenTopoMap) ---
function fondsDeCarte(carte) {
  const esri = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19, attribution: "Tiles © Esri - Esri, HERE, Garmin, FAO, NOAA, USGS, © OpenStreetMap contributors, and the GIS User Community" });
  const relief = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "© OpenStreetMap, © OpenTopoMap" });
  const plan = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
  esri.addTo(carte);
  L.control.layers({ "Topo (Esri)": esri, "Relief (OpenTopoMap)": relief, "Plan (OSM)": plan }).addTo(carte);
  let ok = 0, ko = 0;
  esri.on("tileload", () => ok++);
  esri.on("tileerror", () => { if (++ko >= 6 && ok === 0 && carte.hasLayer(esri)) { carte.removeLayer(esri); relief.addTo(carte); } });
}

// --- Petite silhouette SVG d'une trace (fiches de la page d'accueil) ---
function silhouette(trace, w = 400, h = 260, pad = 26) {
  const k = Math.cos(trace[0][0] * Math.PI / 180);
  const xs = trace.map(p => p[1] * k), ys = trace.map(p => p[0]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.min((w - 2 * pad) / (x1 - x0 || 1), (h - 2 * pad) / (y1 - y0 || 1));
  const ox = (w - (x1 - x0) * s) / 2, oy = (h - (y1 - y0) * s) / 2;
  const pas = Math.max(1, Math.floor(trace.length / 500));
  let d = "";
  for (let i = 0; i < trace.length; i += pas) d += (d ? "L" : "M") + (ox + (xs[i] - x0) * s).toFixed(1) + " " + (h - oy - (ys[i] - y0) * s).toFixed(1);
  return `<svg viewBox="0 0 ${w} ${h}" class="silhouette"><path d="${d}"/></svg>`;
}

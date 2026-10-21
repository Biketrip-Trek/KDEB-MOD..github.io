// =====================================================================
// FICHIER : assets/nord.js
// RÔLE    : construit la page « Traces du Nord » (nord.html) :
//             1. charge la liste data/liste-nord.js
//             2. charge chaque trace (textes + trace, comme les voyages)
//             3. remplit les compteurs, la carte, les filtres et les fiches
//
// Pour ajouter une trace : ajoute son nom dans data/liste-nord.js
// (traces_nord.py le fait tout seul).
// Les couleurs et noms des pratiques sont dans assets/entete.js (PRATIQUES).
// =====================================================================


// ---------------------------------------------------------------------
// RÉGLAGES FACILES À MODIFIER
// ---------------------------------------------------------------------

// Filtres de durée : [texte du bouton, jours mini, jours maxi]
const DUREES = [
  ["Toutes durées", 1, Infinity],
  ["À la journée", 1, 1],
  ["2-3 jours", 2, Infinity]
];

// Filtres de distance : [texte du bouton, km mini, km maxi]
const TRANCHES_KM = [
  ["Toutes distances", 0, Infinity],
  ["Moins de 50 km", 0, 50],
  ["50 à 100 km", 50, 100],
  ["Plus de 100 km", 100, Infinity]
];


// ---------------------------------------------------------------------
// OUTILS
// ---------------------------------------------------------------------
const fmtN = n => Number(n).toLocaleString("fr-FR");
const couleurPratique = p => (PRATIQUES[p.pratique] || {}).coul || "#e4572e";
// Fiche complète sans « pratique » (ex. un voyage rangé dans le Nord) : on affiche l'activité
const nomPratique = p => (PRATIQUES[p.pratique] || {}).nom || (MENU.find(m => m.id === p.activite) || {}).nom || "";

document.getElementById("fond").innerHTML = courbesDeNiveau();
document.getElementById("etiquette-section").textContent = SECTION_NORD.nom;


// ---------------------------------------------------------------------
// CHARGEMENT : data/liste-nord.js, puis chaque trace
// ---------------------------------------------------------------------
(async function () {
  const trouvee = await chargerScript("data/liste-nord.js");
  if (!trouvee) ERREURS.push("Fichier introuvable : <b>data/liste-nord.js</b>.");
  const noms = window.LISTE_NORD || [];
  const traces = (await Promise.all(noms.map(chargerParcours))).filter(Boolean);
  construire(traces);
  afficherErreurs();
})();


// ---------------------------------------------------------------------
// CONSTRUCTION DE LA PAGE
// ---------------------------------------------------------------------
function construire(traces) {

  // --- 1. Compteurs ---
  const km = traces.reduce((t, p) => t + (p.distance_km || 0), 0);
  const dp = traces.reduce((t, p) => t + (p.denivele_m || 0), 0);
  document.getElementById("compteurs").innerHTML = `
    <div><b class="mono">${traces.length}</b><span>traces</span></div>
    <div><b class="mono">${traces.filter(p => joursDe(p) > 1).length}</b><span>sur plusieurs jours</span></div>
    <div><b class="mono">${fmtN(km)}</b><span>km tracés</span></div>
    <div><b class="mono">${fmtN(dp)}</b><span>m de dénivelé</span></div>`;

  // --- 2. Carte : une trace colorée par pratique ---
  const carte = L.map("carte-globale", { scrollWheelZoom: false });
  fondsDeCarte(carte);
  const calques = new Map();   // trace > son calque sur la carte
  for (const p of traces) {
    const ll = p.trace.map(x => [x[0], x[1]]);
    const c = couleurPratique(p);
    const ligne = L.polyline(segments(p.trace), { color: c, weight: 4 });   // sans trait droit aux coupures
    const g = L.featureGroup([
      L.polyline(segments(p.trace), { color: "#fff", weight: 8, opacity: .85 }),
      ligne,
      L.circleMarker(ll[0], { radius: 6, color: "#fff", weight: 2, fillColor: c, fillOpacity: 1 })
    ]).bindPopup(`<b>${p.nom} ${p.nom_gras || ""}</b><span class="km">${nomPratique(p)}${joursDe(p) > 1 ? " · " + joursDe(p) + " jours" : ""}</span><br>
      ${fmtN(p.distance_km)} km · ${fmtN(p.denivele_m)} m D+<br><a href="parcours.html?p=${p.slug}">Voir la trace</a>`);
    g.on("mouseover", () => ligne.setStyle({ weight: 7 }));
    g.on("mouseout", () => ligne.setStyle({ weight: 4 }));
    g.addTo(carte);
    calques.set(p, g);
  }
  const tout = traces.flatMap(p => p.trace.map(x => [x[0], x[1]]));
  if (tout.length) carte.fitBounds(L.latLngBounds(tout), { padding: [30, 30] });
  else carte.setView([50.7, 2.9], 10);

  // --- 3. Fiches courtes ---
  document.getElementById("fiches").innerHTML = traces.length
    ? traces.map(ficheCourte).join("")
    : `<p class="bientot">Les premières traces arrivent bientôt.</p>`;

  // --- 4. Filtres : pratique + durée + distance (ils se combinent) ---
  let pratique = "tout", duree = 0, tranche = 0;
  const appliquer = () => {
    const [, mini, maxi] = TRANCHES_KM[tranche];
    const [, jmin, jmax] = DUREES[duree];
    const visibles = traces.filter(p =>
      (pratique === "tout" || p.pratique === pratique) && joursDe(p) >= jmin && joursDe(p) <= jmax
      && p.distance_km >= mini && p.distance_km < maxi);
    for (const p of traces) {
      const ok = visibles.includes(p);
      ok ? carte.addLayer(calques.get(p)) : carte.removeLayer(calques.get(p));
      const el = document.querySelector(`[data-trace="${p.slug}"]`);
      if (el) el.style.display = ok ? "" : "none";
    }
    document.getElementById("nb-visibles").textContent = visibles.length;
    if (visibles.length) carte.fitBounds(L.latLngBounds(visibles.flatMap(p => p.trace.map(x => [x[0], x[1]]))), { padding: [30, 30] });
  };
  // Boutons de pratique : seulement celles qui ont au moins une trace
  const zoneP = document.getElementById("filtres-pratique");
  const choixP = [["tout", "Toutes les pratiques", null], ...Object.entries(PRATIQUES)
    .filter(([id]) => traces.some(p => p.pratique === id)).map(([id, v]) => [id, v.nom, v.coul])];
  for (const [id, nom, coul] of choixP) {
    const n = id === "tout" ? traces.length : traces.filter(p => p.pratique === id).length;
    zoneP.appendChild(bouton(`${coul ? `<span class="pastille" style="background:${coul}"></span>` : ""}${nom} <span class="mono">${n}</span>`,
      id === "tout", b => { pratique = id; activer(zoneP, b); appliquer(); }));
  }
  // Boutons de durée (seulement s'il y a à la fois des sorties d'un jour et de plusieurs jours)
  const zoneJ = document.getElementById("filtres-duree");
  if (traces.some(p => joursDe(p) > 1) && traces.some(p => joursDe(p) === 1)) {
    DUREES.forEach(([nom, jmin, jmax], i) => {
      const n = traces.filter(p => joursDe(p) >= jmin && joursDe(p) <= jmax).length;
      zoneJ.appendChild(bouton(`${nom} <span class="mono">${n}</span>`, i === 0, b => { duree = i; activer(zoneJ, b); appliquer(); }));
    });
  } else zoneJ.style.display = "none";
  // Boutons de distance
  const zoneD = document.getElementById("filtres-distance");
  TRANCHES_KM.forEach(([nom], i) => zoneD.appendChild(bouton(nom, i === 0, b => { tranche = i; activer(zoneD, b); appliquer(); })));
  appliquer();
}

// Fabrique un bouton de filtre
function bouton(html, actif, clic) {
  const b = document.createElement("button");
  b.className = "filtre"; b.innerHTML = html;
  b.setAttribute("aria-pressed", String(actif));
  b.onclick = () => clic(b);
  return b;
}
function activer(zone, b) {
  zone.querySelectorAll(".filtre").forEach(x => x.setAttribute("aria-pressed", "false"));
  b.setAttribute("aria-pressed", "true");
}


// ---------------------------------------------------------------------
// FICHE COURTE (vignette) : photo ou silhouette, pratique, titre,
// départ, 2 lignes de description, chiffres
// ---------------------------------------------------------------------
function ficheCourte(p) {
  const visuel = p.photo_principale
    ? `<img src="photos/${p.slug}/${p.photo_principale}" alt="" loading="lazy">`
    : silhouette(p.trace);
  const nbInc = (p.incontournables || []).length;
  return `<a class="fiche fiche-courte" data-trace="${p.slug}" href="parcours.html?p=${p.slug}">
    <div class="visuel ${p.photo_principale ? "" : "sans-photo"}">${visuel}
      <span class="etiquette" style="background:${couleurPratique(p)}">${nomPratique(p)}${joursDe(p) > 1 ? " · " + joursDe(p) + " jours" : ""}</span></div>
    <div class="corps">
      <h4>${p.nom} ${p.nom_gras ? `<em>${p.nom_gras}</em>` : ""}</h4>
      <p class="lieu">${p.depart ? "Départ : " + p.depart : ""}</p>
      ${propre(p.chapeau) ? `<p class="resume">${propre(p.chapeau)}</p>` : ""}
      <div class="chiffres mono"><span>${fmtN(p.distance_km)} km</span><span>${fmtN(p.denivele_m)} m D+</span><span>${joursDe(p) > 1 ? joursDe(p) + " j" : "1 j"}</span>${nbInc ? `<span>${nbInc} incontournable${nbInc > 1 ? "s" : ""}</span>` : ""}</div>
    </div>
  </a>`;
}

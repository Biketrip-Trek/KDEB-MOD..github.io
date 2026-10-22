// =====================================================================
// FICHIER : assets/categorie.js
// RÔLE    : construit la page d'une catégorie (categorie.html?c=nord ou ?c=france) :
//             1. lit la catégorie demandée dans l'adresse (c=...) et les filtres
//                déjà choisis (a=velo|rando, d=journee|plusieurs-jours)
//             2. charge la liste de la catégorie, puis chaque trace
//             3. remplit le titre, les compteurs, la carte, les filtres et les vignettes
//
// Pour ajouter une trace : ajoute son nom dans data/liste-nord.js ou data/liste.js.
// Titres et textes des catégories : CATEGORIES dans assets/entete.js.
// Couleurs et noms des pratiques (route, gravel, VTT) : PRATIQUES dans assets/entete.js.
// =====================================================================


// ---------------------------------------------------------------------
// RÉGLAGES FACILES À MODIFIER
// ---------------------------------------------------------------------

// Filtres de distance : [texte du bouton, km mini, km maxi]
const TRANCHES_KM = [
  ["Toutes distances", 0, Infinity],
  ["Moins de 50 km", 0, 50],
  ["50 à 100 km", 50, 100],
  ["Plus de 100 km", 100, Infinity]
];

// Couleur des traces sur la carte quand elles n'ont pas de « pratique »
const COULEUR_ACTIVITE = { velo: "#e4572e", rando: "#2e5a45" };


// ---------------------------------------------------------------------
// OUTILS
// ---------------------------------------------------------------------
const fmtN = n => Number(n).toLocaleString("fr-FR");
const couleurPratique = p => (PRATIQUES[p.pratique] || {}).coul || COULEUR_ACTIVITE[p.activite] || "#e4572e";
const nomPratique = p => (PRATIQUES[p.pratique] || {}).nom || (MENU.find(m => m.id === p.activite) || {}).nom || "";

// Catégorie demandée dans l'adresse (par défaut : la première, Traces du Nord)
const PARAMS = new URLSearchParams(location.search);
const CAT = CATEGORIES.find(c => c.id === PARAMS.get("c")) || CATEGORIES[0];

document.getElementById("fond").innerHTML = courbesDeNiveau();
document.title = CAT.nom + " - " + NOM_DU_SITE;
document.getElementById("etiquette").textContent = CAT.nom;
document.getElementById("titre").innerHTML = CAT.titre || CAT.nom;
document.getElementById("chapo").textContent = CAT.chapo || CAT.accroche || "";


// ---------------------------------------------------------------------
// CHARGEMENT : la liste de la catégorie, puis chaque trace
// ---------------------------------------------------------------------
(async function () {
  const listes = await chargerListes();
  const traces = (await Promise.all((listes[CAT.id] || []).map(chargerParcours))).filter(Boolean);
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

  // --- 3. Vignettes ---
  document.getElementById("fiches").innerHTML = traces.length
    ? traces.map(ficheCourte).join("")
    : `<p class="bientot">Les premières traces arrivent bientôt.</p>`;

  // --- 4. Filtres : activité + pratique + durée + distance (ils se combinent).
  //        Une rangée de boutons n'apparaît que si elle permet vraiment de trier.
  const choix = {
    activite: MENU.some(m => m.id === PARAMS.get("a")) ? PARAMS.get("a") : "tout",
    pratique: "tout",
    duree:    ["journee", "plusieurs-jours"].includes(PARAMS.get("d")) ? PARAMS.get("d") : "tout",
    tranche:  0
  };
  const passe = (p, sauf) =>
    (sauf === "activite" || choix.activite === "tout" || p.activite === choix.activite) &&
    (sauf === "pratique" || choix.pratique === "tout" || p.pratique === choix.pratique) &&
    (sauf === "duree"    || choix.duree === "tout"    || dureeDe(p) === choix.duree) &&
    p.distance_km >= TRANCHES_KM[choix.tranche][1] && p.distance_km < TRANCHES_KM[choix.tranche][2];
  const appliquer = () => {
    const visibles = traces.filter(p => passe(p));
    for (const p of traces) {
      const ok = visibles.includes(p);
      ok ? carte.addLayer(calques.get(p)) : carte.removeLayer(calques.get(p));
      const el = document.querySelector(`[data-trace="${p.slug}"]`);
      if (el) el.style.display = ok ? "" : "none";
    }
    document.getElementById("nb-visibles").textContent = visibles.length;
    document.getElementById("aucune").hidden = visibles.length > 0 || !traces.length;
    if (visibles.length) carte.fitBounds(L.latLngBounds(visibles.flatMap(p => p.trace.map(x => [x[0], x[1]]))), { padding: [30, 30] });
  };
  // Fabrique une rangée de boutons : [code, texte, couleur éventuelle]
  const rangee = (idZone, cle, options, champ) => {
    const zone = document.getElementById(idZone);
    // seulement les choix qui ont au moins une trace (+ celui demandé dans l'adresse)
    const utiles = options.filter(([id]) => id === "tout" || id === choix[cle] || traces.some(p => champ(p) === id));
    if (utiles.length < 3) { zone.style.display = "none"; return; }   // rien à trier
    for (const [id, nom, coul] of utiles) {
      const n = id === "tout" ? traces.length : traces.filter(p => champ(p) === id).length;
      zone.appendChild(bouton(`${coul ? `<span class="pastille" style="background:${coul}"></span>` : ""}${nom} <span class="mono">${n}</span>`,
        choix[cle] === id, b => { choix[cle] = id; activer(zone, b); appliquer(); }));
    }
  };
  rangee("filtres-activite", "activite",
    [["tout", "Toutes les activités"], ...MENU.map(m => [m.id, m.nom, COULEUR_ACTIVITE[m.id]])], p => p.activite);
  rangee("filtres-pratique", "pratique",
    [["tout", "Toutes les pratiques"], ...Object.entries(PRATIQUES).map(([id, v]) => [id, v.nom, v.coul])], p => p.pratique);
  rangee("filtres-duree", "duree",
    [["tout", "Toutes durées"], ...MENU[0].sous.map(s => [s.id, s.nom])], p => dureeDe(p));
  const zoneD = document.getElementById("filtres-distance");
  TRANCHES_KM.forEach(([nom], i) => zoneD.appendChild(bouton(nom, i === 0, b => { choix.tranche = i; activer(zoneD, b); appliquer(); })));
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
// VIGNETTE d'une trace : photo ou silhouette, étiquette, titre,
// lieu ou départ, 2 lignes de description, chiffres
// ---------------------------------------------------------------------
function ficheCourte(p) {
  const visuel = p.photo_principale
    ? `<img src="photos/${p.slug}/${p.photo_principale}" alt="" loading="lazy">`
    : silhouette(p.trace);
  const nbInc = (p.incontournables || []).length;
  return `<a class="fiche fiche-courte" data-trace="${p.slug}" href="parcours.html?p=${p.slug}">
    <div class="visuel ${p.photo_principale ? "" : "sans-photo"}">${visuel}
      <span class="etiquette"><span class="pastille" style="background:${couleurPratique(p)}"></span>${etiquetteFiche(p)}</span></div>
    <div class="corps">
      <h4>${p.nom} ${p.nom_gras ? `<em>${p.nom_gras}</em>` : ""}</h4>
      <p class="lieu">${(p.lieu || []).length ? p.lieu.join(" · ") : p.depart ? "Départ : " + p.depart : ""}</p>
      ${propre(p.chapeau) ? `<p class="resume">${propre(p.chapeau)}</p>` : ""}
      <div class="chiffres mono"><span>${fmtN(p.distance_km)} km</span><span>${fmtN(p.denivele_m)} m D+</span><span>${joursDe(p) > 1 ? joursDe(p) + " j" : "1 j"}</span>${nbInc ? `<span>${nbInc} incontournable${nbInc > 1 ? "s" : ""}</span>` : ""}</div>
    </div>
  </a>`;
}

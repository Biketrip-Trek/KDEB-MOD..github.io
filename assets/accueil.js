// =====================================================================
// FICHIER : assets/accueil.js
// RÔLE    : construit la PAGE D'ACCUEIL (index.html) :
//             1. charge les deux listes (data/liste-nord.js et data/liste.js)
//             2. charge chaque parcours : textes (data/<nom>.js)
//                et trace (data/traces/<nom>.js)
//             3. remplit les compteurs, la grande carte et les deux grandes
//                vignettes des catégories (chacune ouvre sa page :
//                categorie.html?c=nord ou ?c=france)
//
// Ce fichier n'a normalement PAS besoin d'être modifié pour ajouter un
// parcours : il suffit d'ajouter son nom dans la bonne liste.
// =====================================================================


// ---------------------------------------------------------------------
// RÉGLAGES FACILES À MODIFIER
// ---------------------------------------------------------------------

// Couleur des traces sur la grande carte, selon l'activité.
// Les codes couleur sont au format #RRVVBB (cherche "color picker" sur
// internet pour trouver le code d'une couleur).
const COULEUR_ACTIVITE = {
  velo:  "#e4572e",  // orange
  rando: "#2e5a45"   // vert forêt
};


// ---------------------------------------------------------------------
// OUTILS
// ---------------------------------------------------------------------

// Les deux vues de la grande carte (boutons « France entière » et « Le Nord ») :
// - France : rectangle fixe autour de la France métropolitaine ;
// - Nord   : cadrée sur toutes les Traces du Nord (catégorie "nord").
// La carte s'ouvre sur la première vue de la liste.
const VUES_CARTE = [
  { id: "france", nom: "France entière", rectangle: [[42.2, -4.9], [51.2, 8.3]] },
  { id: "nord",   nom: "Le Nord",        categorie: "nord" }
];

// Écrit un nombre à la française : 12345 devient "12 345"
const fmtN = n => Number(n).toLocaleString("fr-FR");

// Fond de courbes de niveau derrière le grand titre
document.getElementById("fond").innerHTML = courbesDeNiveau();

// ---------------------------------------------------------------------
// CHARGEMENT DES DONNÉES
// 1) data/liste.js  2) textes + trace de chaque parcours  3) construction
// (chargerParcours et afficherErreurs sont définies dans entete.js)
// ---------------------------------------------------------------------
(async function () {
  const listes = await chargerListes();                       // { nord: [...], france: [...] }
  const noms = [...new Set(CATEGORIES.flatMap(c => listes[c.id]))];
  const parcours = (await Promise.all(noms.map(chargerParcours))).filter(Boolean);
  parcours.forEach(p => p.categorie = categorieDe(p.slug, listes).id);
  construireAccueil(parcours);
  afficherErreurs();
})();


// ---------------------------------------------------------------------
// CONSTRUCTION DE LA PAGE
// ---------------------------------------------------------------------
function construireAccueil(parcours) {

  // --- 1. Compteurs sous le grand titre (nombre de parcours, km, D+) ---
  const km = parcours.reduce((total, p) => total + (p.distance_km || 0), 0);
  const dp = parcours.reduce((total, p) => total + (p.denivele_m || 0), 0);
  document.getElementById("compteurs").innerHTML = `
    <div><b class="mono">${parcours.length}</b><span>parcours</span></div>
    <div><b class="mono">${fmtN(km)}</b><span>km tracés</span></div>
    <div><b class="mono">${fmtN(dp)}</b><span>m de dénivelé</span></div>`;

  // --- 2. Grande carte avec toutes les traces ---
  // scrollWheelZoom: false = la molette de la souris fait défiler la page
  // au lieu de zoomer la carte (on zoome avec les boutons + / -)
  const carte = L.map("carte-globale", { scrollWheelZoom: false });
  fondsDeCarte(carte);
  const groupes = {};   // un groupe de traces par activité (pour les filtres)
  for (const p of parcours) {
    const ll = p.trace.map(x => [x[0], x[1]]);          // [latitude, longitude]
    const c = COULEUR_ACTIVITE[p.activite] || "#e4572e";
    const halo = L.polyline(segments(p.trace), { color: "#fff", weight: 8, opacity: .85 }); // liseré blanc (sans trait droit aux coupures)
    const ligne = L.polyline(segments(p.trace), { color: c, weight: 4 });   // trace colorée
    const depart = L.circleMarker(ll[0], { radius: 6, color: "#fff", weight: 2, fillColor: c, fillOpacity: 1 });
    // Bulle qui s'ouvre au clic sur une trace
    const cat = CATEGORIES.find(c => c.id === p.categorie) || {};
    const bulle = `<b>${p.nom} ${p.nom_gras || ""}</b><span class="km">${cat.nom} · ${etiquetteFiche(p)}</span><br>
      ${fmtN(p.distance_km)} km · ${fmtN(p.denivele_m)} m D+<br><a href="parcours.html?p=${p.slug}">Voir le parcours</a>`;
    const g = L.featureGroup([halo, ligne, depart]).bindPopup(bulle);
    // La trace s'épaissit au survol de la souris
    g.on("mouseover", () => ligne.setStyle({ weight: 7 }));
    g.on("mouseout", () => ligne.setStyle({ weight: 4 }));
    (groupes[p.activite] = groupes[p.activite] || L.featureGroup().addTo(carte)).addLayer(g);
      }
  // Cadrage d'une vue : rectangle fixe, ou toutes les traces d'une catégorie
  const cadrer = v => {
    const pts = v.categorie ? parcours.filter(p => p.categorie === v.categorie).flatMap(p => p.trace.map(x => [x[0], x[1]])) : [];
    carte.fitBounds(pts.length ? L.latLngBounds(pts) : L.latLngBounds(v.rectangle), { padding: [24, 24] });
  };
  cadrer(VUES_CARTE[0]);

  // --- 3. Boutons de filtre au-dessus de la carte (Tous / Vélo / Randonnée) ---
  const filtres = document.getElementById("filtres");
  // (un clic ne fait que montrer ou cacher des traces ; le cadrage reste celui de la vue choisie)
  const choix = [{ id: "tout", nom: "Tous les parcours" }, ...MENU.map(m => ({ id: m.id, nom: m.nom }))];
  for (const f of choix) {
    const b = document.createElement("button");
    b.className = "filtre"; b.type = "button";
    b.setAttribute("aria-pressed", String(f.id === "tout"));  // "Tous" est actif au départ
    const n = f.id === "tout" ? parcours.length : parcours.filter(p => p.activite === f.id).length;
    const pastille = f.id === "tout" ? "" : `<span class="pastille" style="background:${COULEUR_ACTIVITE[f.id]}"></span>`;
    b.innerHTML = `${pastille}${f.nom} <span class="mono">${n}</span>`;
    b.onclick = () => {
      filtres.querySelectorAll(".filtre").forEach(x => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      for (const [activite, g] of Object.entries(groupes)) {
        const afficher = f.id === "tout" || f.id === activite;
        afficher ? carte.addLayer(g) : carte.removeLayer(g);
      }
      // (la vue choisie, France ou Nord, est gardée)
    };
    filtres.appendChild(b);
  }

  // --- 3 bis. Boutons de vue, à droite des filtres : France entière / Le Nord ---
  const vues = document.createElement("div");
  vues.className = "vues"; vues.setAttribute("role", "group"); vues.setAttribute("aria-label", "Vue de la carte");
  VUES_CARTE.forEach((v, i) => {
    const b = document.createElement("button");
    b.className = "vue"; b.type = "button"; b.textContent = v.nom;
    b.setAttribute("aria-pressed", String(i === 0));
    b.onclick = () => {
      vues.querySelectorAll(".vue").forEach(x => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      cadrer(v);
    };
    vues.appendChild(b);
  });
  filtres.appendChild(vues);

  // --- 4. Les deux catégories sous la carte : une grande vignette chacune,
  //        qui ouvre la page de la catégorie (categorie.html?c=...).
  //        Photo : champ "photo" de la catégorie dans assets/entete.js.
  document.getElementById("rubriques").innerHTML = `<div class="portes">${CATEGORIES.map(c => {
    const dans = parcours.filter(p => p.categorie === c.id);
    const km = dans.reduce((t, p) => t + (p.distance_km || 0), 0);
    const choisi = dans.find(p => p.slug === c.photo && p.photo_principale) || dans.find(p => p.photo_principale);
    const photo = choisi ? `<img src="photos/${choisi.slug}/${choisi.photo_principale}" alt="" loading="lazy">` : "";
    const activites = MENU.map(m => [m.nom, dans.filter(p => p.activite === m.id).length]).filter(([, n]) => n);
    return `<a class="porte" href="${lienCategorie(c.id)}">
      <div class="photo-porte">${photo}</div>
      <div class="nom-porte"><h2>${c.nom}</h2><span class="mono">${dans.length} trace${dans.length > 1 ? "s" : ""} · ${fmtN(km)} km</span></div>
      <p>${c.accroche || ""}</p>
      <span class="voir">${activites.map(([nom, n]) => `${nom} ${n}`).join(" · ")}<b>Voir les traces</b></span>
    </a>`;
  }).join("")}</div>`;

  // --- 5. Anciens liens vers les rubriques (ex. index.html#nord-velo-journee) :
  //        on ouvre la page de la catégorie avec les bons filtres.
  const h = decodeURIComponent(location.hash.slice(1));
  const cat = CATEGORIES.find(c => h === c.id || h.startsWith(c.id + "-"));
  if (cat) {
    const reste = h.slice(cat.id.length + 1);
    const m = MENU.find(x => reste === x.id || reste.startsWith(x.id + "-"));
    const d = m && reste.slice(m.id.length + 1);
    location.replace(lienCategorie(cat.id, m && m.id, d || ""));
  }
}

// =====================================================================
// FICHIER : assets/entete.js
// RÔLE    : tout ce qui est COMMUN aux deux pages du site
//           (accueil index.html et fiche parcours.html) :
//             1. le nom du site, le menu (catégories), le pied de page
//             2. la création de l'en-tête et du pied de page
//             3. le chargement des parcours et les messages d'erreur
//             4. des petites "boîtes à outils" (fonctions) utilisées
//                par accueil.js et parcours.js : fond de carte, dessin
//                de la trace, motif de courbes de niveau...
//
// À SAVOIR : une ligne qui commence par // est un commentaire.
//            Le navigateur l'ignore : c'est juste une note pour toi.
// =====================================================================


// ---------------------------------------------------------------------
// 1. RÉGLAGES FACILES À MODIFIER
// ---------------------------------------------------------------------

// Nom du site : affiché dans le logo en haut à gauche
// et dans le titre de l'onglet du navigateur.
const NOM_DU_SITE = "Carnet de traces";

// LES DEUX GRANDES CATÉGORIES DU SITE (menu, accueil, étiquettes).
// Une trace appartient à la catégorie de la liste où son nom est écrit :
//   data/liste-nord.js > Traces du Nord ; data/liste.js > Traces ailleurs en France.
// - "id"    : code interne (ancres de l'accueil : index.html#nord, #france...)
// - "nom"   : texte affiché sur le site, libre
// - "carte" : page avec la carte et les filtres de la catégorie (facultatif)
const CATEGORIES = [
  { id: "nord",   nom: "Traces du Nord",            liste: "data/liste-nord.js", variable: "LISTE_NORD",     carte: "nord.html",
    accroche: "Près de chez moi : les petites routes, les chemins et les sentiers que j'ai testés moi-même, de la Flandre aux Ardennes." },
  { id: "france", nom: "Traces ailleurs en France", liste: "data/liste.js",      variable: "LISTE_PARCOURS",
    accroche: "Voyages à vélo et randonnées de plusieurs jours, des Vosges aux Alpes du Sud." }
];

// Dans chaque catégorie : les activités, puis la durée.
// - "id"  : code interne, SANS accent ni espace. C'est ce code qu'on écrit
//           dans les fiches (champs "activite" et "format").
// - "nom" : texte affiché sur le site, libre.
// Pour ajouter une activité (ex. "Ski de rando"), copie un bloc { ... }
// complet, colle-le après le dernier, et sépare les blocs par une virgule.
const MENU = [
  {
    id: "velo", nom: "Vélo",
    sous: [
      { id: "journee",         nom: "À la journée" },
      { id: "plusieurs-jours", nom: "Plusieurs jours" }
    ]
  },
  {
    id: "rando", nom: "Randonnée",
    sous: [
      { id: "journee",         nom: "À la journée" },
      { id: "plusieurs-jours", nom: "Plusieurs jours" }
    ]
  }
];


// Raccourci vers la catégorie « Traces du Nord » (page nord.html)
const SECTION_NORD = { nom: CATEGORIES[0].nom, lien: CATEGORIES[0].carte };

// Pratiques des traces du Nord (champ "pratique" des fiches courtes) :
// texte affiché et couleur sur la carte et les étiquettes.
const PRATIQUES = {
  route:  { nom: "Route",  coul: "#e4572e" },   // orange
  gravel: { nom: "Gravel", coul: "#b07d0a" },   // ocre
  vtt:    { nom: "VTT",    coul: "#7a4fa3" },   // violet
  marche: { nom: "À pied", coul: "#2e5a45" }    // vert forêt
};


// Liens du pied de page, en bas de toutes les pages.
// Un lien laissé à "#" n'est pas affiché (pas de lien qui ne mène nulle part).
// Remplace les "#" par tes vrais liens, par exemple :
//   { texte: "Instagram", lien: "https://www.instagram.com/ton-compte" }
//   { texte: "Contact",   lien: "mailto:ton.adresse@mail.fr" }
// Pour retirer un lien : supprime sa ligne. Pour en ajouter : copie une ligne.
const PIED_DE_PAGE = [
  { texte: "À propos",  lien: "#" },
  { texte: "Contact",   lien: "#" },
  { texte: "Instagram", lien: "#" }
];
const MENTION_CARTES = "Fonds de carte © Esri, contributeurs OpenStreetMap, OpenTopoMap";


// ---------------------------------------------------------------------
// 2. CRÉATION DE L'EN-TÊTE (logo + menus) ET DU PIED DE PAGE
//    Ce bloc s'exécute tout seul au chargement de la page.
//    Il fabrique le code HTML de l'en-tête (placé en haut de la page)
//    et du pied de page (placé tout en bas).
// ---------------------------------------------------------------------
(function () {
  // Petite flèche "v" à côté de chaque menu (dessin SVG = dessin en code)
  const fleche = '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 4l4 4 4-4"/></svg>';

  // Pour chaque grande catégorie, un bouton + un panneau déroulant, avec les
  // activités (Vélo, Randonnée) et leurs durées. Les liens mènent à la bonne
  // rubrique de l'accueil (ex. index.html#nord-velo-journee).
  const menus = CATEGORIES.map(c => `
    <div class="deroulant">
      <button class="onglet" aria-expanded="false">${c.nom} ${fleche}</button>
      <div class="panneau">
        ${MENU.map(m => `<span class="groupe">${m.nom}</span>` +
          m.sous.map(s => `<a href="index.html#${c.id}-${m.id}-${s.id}">${s.nom}</a>`).join("")).join("")}
        ${c.carte ? `<a class="tout" href="${c.carte}">Carte et filtres des ${c.nom}</a>` : ""}
        <a class="tout${c.carte ? " suite" : ""}" href="index.html#${c.id}">Toutes les ${c.nom}</a>
      </div>
    </div>`).join("");

  // L'en-tête complet : logo (montagne dessinée + nom du site) puis menus
  const entete = document.createElement("header");
  entete.className = "entete";
  entete.innerHTML = `
    <div class="contenu">
      <a class="logo" href="index.html">
        <svg viewBox="0 0 32 32" fill="none" stroke="#e4572e" stroke-width="2"><path d="M2 26 L11 12 L16 19 L21 9 L30 26 Z"/><path d="M8 26c3-4 6-2 8-5s5-4 8 0" stroke="#fff" stroke-width="1.4"/></svg>
        ${NOM_DU_SITE}
      </a>
      <nav class="menu">${menus}</nav>
    </div>`;
  document.body.prepend(entete); // "prepend" = placer tout en haut de la page

  // Ouverture des menus au clic (indispensable sur téléphone, où il n'y a
  // pas de survol à la souris). Un seul menu ouvert à la fois.
  const onglets = entete.querySelectorAll(".onglet");
  onglets.forEach(bouton => bouton.addEventListener("click", e => {
    e.stopPropagation();
    const ouvert = bouton.getAttribute("aria-expanded") === "true";
    onglets.forEach(o => o.setAttribute("aria-expanded", "false")); // ferme tous les menus
    bouton.setAttribute("aria-expanded", String(!ouvert));          // ouvre/ferme celui cliqué
  }));
  // Un clic ailleurs sur la page ferme les menus
  document.addEventListener("click", () => onglets.forEach(o => o.setAttribute("aria-expanded", "false")));

  // Pied de page : fabriqué à partir de PIED_DE_PAGE et placé tout en bas
  const pied = document.createElement("footer");
  pied.className = "pied";
  pied.innerHTML = `
    <div class="contenu">
      <div>${PIED_DE_PAGE.filter(l => l.lien && l.lien !== "#").map(l => `<a href="${l.lien}">${l.texte}</a>`).join("")}</div>
      <span>${MENTION_CARTES}</span>
    </div>`;
  document.body.appendChild(pied);
})();


// ---------------------------------------------------------------------
// 3. CHARGEMENT DES PARCOURS ET MESSAGES D'ERREUR
//    Chaque parcours = 2 fichiers obligatoires + 1 facultatif :
//      data/<nom>.js         les TEXTES (modifiés à la main)
//      data/traces/<nom>.js  la TRACE (générée par gpx2trace.py)
//      data/pois/<nom>.js    les POINTS D'INTÉRÊT trouvés automatiquement
//                            dans OpenStreetMap (générés par gpx2pois.py)
//    Si un fichier manque ou contient une faute de frappe, un message
//    rouge s'affiche en bas de la page au lieu d'une page blanche.
// ---------------------------------------------------------------------

// "?v=..." oblige le navigateur à relire les fichiers à chaque visite
// (une mise à jour envoyée sur GitHub apparaît tout de suite).
const VERSION = "?v=" + Date.now();

// Liste des problèmes rencontrés, affichée par afficherErreurs()
const ERREURS = [];

// Le navigateur signale ici toute faute de frappe dans un fichier de
// données : on note le nom du fichier et le numéro de ligne.
window.addEventListener("error", e => {
  const m = (e.filename || "").match(/data\/.*?\.js/);
  if (m) ERREURS.push(`Faute de frappe dans <b>${m[0]}</b>, ligne <b>${e.lineno}</b>. Regarde cette ligne et celle juste au-dessus : il manque souvent une virgule en fin de ligne, ou un guillemet.`);
});

// Charge un fichier .js et indique s'il a été trouvé (true) ou non (false)
function chargerScript(chemin) {
  return new Promise(ok => {
    const s = document.createElement("script");
    s.src = chemin + VERSION;
    s.onload = () => ok(true);
    s.onerror = () => ok(false);
    document.head.appendChild(s);
  });
}

// Charge les textes + la trace d'un parcours et les réunit.
// Renvoie le parcours complet, ou null s'il y a un problème (noté dans ERREURS).
async function chargerParcours(nom) {
  const [texteTrouve, traceTrouvee] = await Promise.all([
    chargerScript("data/" + nom + ".js"),
    chargerScript("data/traces/" + nom + ".js"),
    chargerScript("data/pois/" + nom + ".js")      // facultatif : pas d'erreur s'il n'existe pas
  ]);
  const textes = (window.PARCOURS || {})[nom];
  const trace = (window.TRACES || {})[nom];
  if (!texteTrouve) ERREURS.push(`Fichier introuvable : <b>data/${nom}.js</b>. Vérifie son nom (il doit être identique à celui écrit dans data/liste.js).`);
  else if (!textes && !ERREURS.some(x => x.includes(`data/${nom}.js`))) {
    // Fichier trouvé mais illisible. En ligne, le message ci-dessus (avec le numéro
    // de ligne) a normalement déjà été noté ; sur ton PC, le navigateur ne donne
    // pas la ligne, d'où ce message plus général.
    ERREURS.push(`<b>data/${nom}.js</b> n'a pas pu être lu. Deux causes possibles : une faute de frappe (virgule ou guillemet manquant, souvent près de ta dernière modification), ou le nom entre crochets <b>window.PARCOURS["..."]</b> qui n'est pas exactement <b>${nom}</b>.`);
  }
  if (!traceTrouvee) ERREURS.push(`Trace introuvable : <b>data/traces/${nom}.js</b>. Génère-la avec gpx2trace.py et dépose-la dans data/traces/.`);
  if (!textes || !trace) return null;

  // Points d'intérêt = ceux écrits à la main dans les textes
  //                  + ceux trouvés automatiquement (data/pois/<nom>.js),
  //                    sauf ceux dont le code "osm" figure dans "pois_exclus".
  const exclus = textes.pois_exclus || [];
  const auto = ((window.POIS || {})[nom] || []).filter(p => !exclus.includes(p.osm));
  // Les « incontournables » d'une fiche courte (Traces du Nord) sont aussi
  // affichés sur la carte, le profil et la feuille de route.
  const incontournables = (textes.incontournables || []).map(x => ({ ...x, type: "incontournable" }));
  const pois = [...(textes.pois || []), ...incontournables, ...auto];

  return { ...textes, ...trace, pois, slug: nom };   // textes + trace + points d'intérêt
}

// Affiche les problèmes éventuels dans un bandeau rouge en bas de l'écran
function afficherErreurs() {
  if (!ERREURS.length) return;
  const b = document.createElement("div");
  b.className = "alerte";
  b.innerHTML = `<button aria-label="Fermer">×</button><b>Le site a repéré ${ERREURS.length > 1 ? "des problèmes" : "un problème"} :</b><ul>${[...new Set(ERREURS)].map(x => `<li>${x}</li>`).join("")}</ul>`;
  b.querySelector("button").onclick = () => b.remove();
  document.body.appendChild(b);
}


// ---------------------------------------------------------------------
// 4. BOÎTES À OUTILS (fonctions utilisées par accueil.js et parcours.js)
// ---------------------------------------------------------------------

// libelleCategorie("velo", "journee") renvoie le texte "Vélo · À la journée".
// Sert pour les étiquettes orange sur les fiches et en haut des pages.
function libelleCategorie(activite, format) {
  const m = MENU.find(x => x.id === activite);
  const s = m && m.sous.find(x => x.id === format);
  return [m && m.nom, s && s.nom].filter(Boolean).join(" · ");
}

// libelleFiche(P) : comme libelleCategorie, mais sait aussi écrire
// « Traces du Nord · VTT » ou « Traces du Nord · Gravel · 2 jours »
// pour une fiche courte (format "locale").
function libelleFiche(P) {
  if (P.format === "locale") return [SECTION_NORD.nom, (PRATIQUES[P.pratique] || {}).nom, joursDe(P) > 1 ? joursDe(P) + " jours" : ""].filter(Boolean).join(" · ");
  return libelleCategorie(P.activite, P.format);
}

// propre(v) : texte prêt à afficher, sans les mentions de rappel « [À compléter] ... ».
// Tout ce qui suit « [À compléter] » est retiré (c'est la consigne pour toi, pas pour le
// visiteur) ; « à compléter » seul devient vide. Une liste [ ] garde ses lignes non vides.
// Tes fichiers ne changent pas : la mention reste visible quand tu les ouvres.
function propre(v) {
  if (Array.isArray(v)) return v.map(propre).filter(Boolean);
  if (v == null) return "";
  return String(v).replace(/\s*\[\s*à compléter\s*\][\s\S]*$/i, "").replace(/^\s*à compléter\s*\.?\s*$/i, "").trim();
}

// joursDe(P) : nombre de jours d'une fiche (1 si le champ "jours" est absent)
function joursDe(P) { return Math.max(1, parseInt(P.jours, 10) || 1); }

// dureeDe(P) : "journee" ou "plusieurs-jours" (codes de MENU), pour toutes les fiches
function dureeDe(P) { return joursDe(P) > 1 ? "plusieurs-jours" : "journee"; }

// etiquetteFiche(P) : « Vélo · 3 jours », « VTT · À la journée »... (sans la catégorie)
function etiquetteFiche(P) {
  const act = (PRATIQUES[P.pratique] || {}).nom || (MENU.find(m => m.id === P.activite) || {}).nom || "";
  return [act, joursDe(P) > 1 ? joursDe(P) + " jours" : "À la journée"].filter(Boolean).join(" · ");
}

// chargerListes() : charge les deux listes et renvoie, pour chaque catégorie,
// la liste des noms de traces ({ nord: [...], france: [...] }).
async function chargerListes() {
  const out = {};
  for (const c of CATEGORIES) {
    const ok = await chargerScript(c.liste);
    if (!ok) ERREURS.push(`Fichier introuvable : <b>${c.liste}</b>.`);
    out[c.id] = window[c.variable] || [];
  }
  return out;
}

// categorieDe(nom, listes) : la catégorie (objet de CATEGORIES) d'une trace
function categorieDe(nom, listes) {
  return CATEGORIES.find(c => (listes[c.id] || []).includes(nom)) || CATEGORIES[CATEGORIES.length - 1];
}

// courbesDeNiveau() dessine un fond sombre avec des courbes de niveau.
// Il s'affiche quand un parcours n'a pas encore de photo principale,
// et en fond de la page d'accueil.
function courbesDeNiveau() {
  let s = '<svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice"><rect width="1200" height="700" fill="#18201c"/>';
  // Trois "sommets" : position horizontale, position verticale, taille
  const centres = [[880, 260, 1], [300, 520, .8], [620, 120, .6]];
  for (const [cx, cy, taille] of centres) {
    // Une courbe tous les 22 pixels, de plus en plus grande
    for (let r = 30; r < 520 * taille; r += 22) {
      let d = "";
      for (let a = 0; a <= 360; a += 8) {
        const t = a * Math.PI / 180;
        // Petites ondulations pour que les courbes aient l'air naturelles
        const k = r * (1 + 0.08 * Math.sin(3 * t + r / 40) + 0.05 * Math.cos(5 * t - r / 60));
        d += (a ? "L" : "M") + (cx + k * Math.cos(t) * 1.35).toFixed(1) + " " + (cy + k * Math.sin(t)).toFixed(1);
      }
      // Une courbe sur 5 est une "courbe maîtresse", tracée en orange
      const maitresse = (r / 22) % 5 === 0;
      s += `<path d="${d}Z" fill="none" stroke="${maitresse ? "#e4572e" : "#3b4a42"}" stroke-opacity="${maitresse ? .45 : .7}" stroke-width="${maitresse ? 1.4 : 1}"/>`;
    }
  }
  return s + "</svg>";
}

// fondsDeCarte(carte) ajoute les fonds de plan à une carte Leaflet.
// - Esri Topo est affiché par défaut.
// - Le bouton "calques" (en haut à droite de la carte) permet de choisir.
// - Si Esri ne répond pas (6 erreurs sans aucune image reçue),
//   le site bascule tout seul sur OpenTopoMap.
// Pour changer le fond par défaut : remplace "esri.addTo(carte)" par
// "relief.addTo(carte)" ou "plan.addTo(carte)".
function fondsDeCarte(carte) {
  const esri = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19,
    attribution: "Tiles © Esri - Esri, HERE, Garmin, FAO, NOAA, USGS, © OpenStreetMap contributors, and the GIS User Community"
  });
  const relief = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 17, attribution: "© OpenStreetMap, © OpenTopoMap"
  });
  const plan = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "© OpenStreetMap"
  });

  esri.addTo(carte); // fond affiché par défaut

  // Le bouton de choix du fond : "texte affiché": fond correspondant
  L.control.layers({
    "Topo (Esri)": esri,
    "Relief (OpenTopoMap)": relief,
    "Plan (OSM)": plan
  }).addTo(carte);

  // Secours automatique si Esri est en panne
  let imagesRecues = 0, erreurs = 0;
  esri.on("tileload", () => imagesRecues++);
  esri.on("tileerror", () => {
    if (++erreurs >= 6 && imagesRecues === 0 && carte.hasLayer(esri)) {
      carte.removeLayer(esri);
      relief.addTo(carte);
    }
  });
}

// COUPURE_M : au-delà de cette distance entre deux points qui se suivent, la
// trace est considérée comme coupée (deux fichiers GPX qui ne se raccordent pas :
// navette, enregistrement arrêté...). On ne trace pas de ligne droite entre eux.
const COUPURE_M = 1000;
function ecartM(a, b) {
  const r = Math.PI / 180, l1 = a[0] * r, l2 = b[0] * r;
  const h = Math.sin((l2 - l1) / 2) ** 2 + Math.cos(l1) * Math.cos(l2) * Math.sin((b[1] - a[1]) * r / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}
// segments(trace) : la trace en morceaux continus, [[ [lat,lon], ... ], ...],
// à donner à L.polyline (qui accepte plusieurs morceaux).
function segments(trace) {
  const out = [];
  trace.forEach((p, i) => {
    if (!i || ecartM(trace[i - 1], p) > COUPURE_M) out.push([]);
    out[out.length - 1].push([p[0], p[1]]);
  });
  return out;
}

// silhouette(trace) dessine la forme de la trace en orange, en petit.
// Sert de vignette sur l'accueil quand un parcours n'a pas de photo.
// "trace" est la liste des points [latitude, longitude, altitude, km].
function silhouette(trace, largeur = 400, hauteur = 260, marge = 26) {
  // Correction pour que la forme ne soit pas écrasée (la Terre est ronde)
  const k = Math.cos(trace[0][0] * Math.PI / 180);
  const xs = trace.map(p => p[1] * k), ys = trace.map(p => p[0]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  // Mise à l'échelle pour remplir le cadre, en gardant les proportions
  const echelle = Math.min((largeur - 2 * marge) / (x1 - x0 || 1), (hauteur - 2 * marge) / (y1 - y0 || 1));
  const ox = (largeur - (x1 - x0) * echelle) / 2, oy = (hauteur - (y1 - y0) * echelle) / 2;
  // On garde au plus ~500 points : c'est largement assez pour une vignette
  const pas = Math.max(1, Math.floor(trace.length / 500));
  let d = "";
  // Une coupure dans la trace (voir COUPURE_M) : on lève le crayon (« M ») au lieu de relier
  const coupures = new Set();
  trace.forEach((p, i) => { if (i && ecartM(trace[i - 1], p) > COUPURE_M) coupures.add(i); });
  let leve = true;
  for (let i = 0; i < trace.length; i++) {
    if (coupures.has(i)) leve = true;
    if (i % pas && i !== trace.length - 1 && !leve && !coupures.has(i + 1)) continue;
    d += (leve ? "M" : "L") + (ox + (xs[i] - x0) * echelle).toFixed(1) + " " + (hauteur - oy - (ys[i] - y0) * echelle).toFixed(1);
    leve = false;
  }
  return `<svg viewBox="0 0 ${largeur} ${hauteur}" class="silhouette"><path d="${d}"/></svg>`;
}

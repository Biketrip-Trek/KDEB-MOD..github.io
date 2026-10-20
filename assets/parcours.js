// =====================================================================
// FICHIER : assets/parcours.js
// RÔLE    : construit la PAGE D'UN PARCOURS (parcours.html).
//
// COMMENT ÇA MARCHE :
//   L'adresse de la page contient le nom du parcours après "?p=".
//   Exemple : parcours.html?p=dolce-via
//   Le script charge alors data/dolce-via.js (les textes) et
//   data/traces/dolce-via.js (la trace), puis remplit,
//   dans l'ordre de la page :
//     bandeau (photo + titre) > chiffres > photos > carte + profil
//     > l'essentiel > feuille de route > étapes > carnet du jour > crédits
//
// Les TEXTES se modifient dans data/<nom>.js, pas ici.
// Ici, on modifie la façon dont ils sont AFFICHÉS.
// =====================================================================


// ---------------------------------------------------------------------
// 1. RÉGLAGES : icônes, types de points d'intérêt, couleurs
// ---------------------------------------------------------------------

// Petits dessins (SVG) utilisés dans les pastilles de la carte.
// Ce sont des tracés de lignes : pas besoin de les comprendre pour
// utiliser le site.
const ICONES = {
  mont:    '<path d="M2 20L9 8l4 6 3-4 6 10z"/>',
  pave:    '<rect x="3" y="4" width="8" height="6"/><rect x="13" y="4" width="8" height="6"/><rect x="7" y="14" width="10" height="6"/>',
  eau:     '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  ravito:  '<path d="M3 9h18l-2 11H5z"/><path d="M8 9l4-6 4 6"/>',                // panier
  resto:   '<path d="M5 3v8a3 3 0 0 0 6 0V3M8 3v18M17 3c-2 2-2 6 0 8v10"/>',  // couverts
  bivouac: '<path d="M2 20L12 4l10 16zM12 4v16M8 20l4-6 4 6"/>',
  gare:    '<rect x="5" y="3" width="14" height="13" rx="2"/><path d="M5 11h14M8 20l2-4M16 20l-2-4"/>',
  vue:     '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  velo:    '<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M6 16l4-8h5l3 8M10 8l2 8"/>',
  depart:  '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  incontournable: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'  // étoile
};

// Types de points d'intérêt (POI) qu'on peut mettre dans une fiche
// (champ "type" de chaque point dans "pois").
// Pour chaque type : le texte affiché dans les filtres et sa couleur.
// Pour ajouter un type : ajoute une ligne ici + une icône dans ICONES
// (sinon l'icône "vue" est utilisée par défaut).
const TYPES = {
  mont:    { nom: "Montées",        coul: null },      // couleur selon la difficulté (voir NIVEAUX)
  pave:    { nom: "Secteurs pavés", coul: "#6b6f73" },
  eau:     { nom: "Points d'eau",   coul: "#2a7ab9" },
  ravito:  { nom: "Ravitaillement", coul: "#7a4fa3" },   // magasins, boulangeries
  resto:   { nom: "Bars et restaurants", coul: "#8c5a2b" },
  bivouac: { nom: "Bivouac / dodo", coul: "#2e5a45" },
  gare:    { nom: "Gares",          coul: "#1c2420" },
  vue:     { nom: "Points de vue",  coul: "#c99a06" },
  velo:    { nom: "Atelier vélo",   coul: "#b8337a" },
  incontournable: { nom: "Incontournables", coul: "#b8411f" }   // fiches courtes « Traces du Nord »
};

// Couleur et nom des niveaux de difficulté des montées ("niveau": 1 à 4)
const NIVEAUX    = { 1: "#4c9a5f", 2: "#e0b422", 3: "#ef8a17", 4: "#c0262d" };
const NOM_NIVEAU = { 1: "Facile", 2: "Moyen", 3: "Difficile", 4: "Très difficile" };

// Icônes de la barre de chiffres sous le bandeau
const STAT_ICONES = {
  distance: '<path d="M3 17c4 0 4-10 9-10s5 10 9 10"/><circle cx="3" cy="17" r="1.5"/><circle cx="21" cy="17" r="1.5"/>',
  dplus:    '<path d="M3 20l6-9 4 5 3-4 5 8z"/><path d="M15 4h5v5M20 4l-6 6"/>',
  jours:    '<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  sommet:   '<path d="M2 20l8-14 4 6 2-3 6 11z"/><path d="M10 6V2l4 1-4 1"/>',
  terrain:  '<path d="M3 18c3-3 5-3 8 0s5 3 10-2M3 12c3-3 5-3 8 0s5 3 10-2"/>',
  velo:     ICONES.velo,
  temps:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',                          // horloge (rando)
  balisage: '<path d="M12 3v18M5 6h11l3 3-3 3H5zM19 13H9l-3 3 3 3h10"/>',                    // panneau (rando)
  materiel: '<rect x="5" y="7" width="14" height="14" rx="3"/><path d="M9 7V5a3 3 0 0 1 6 0v2M5 13h14"/>' // sac (rando)
};


// ---------------------------------------------------------------------
// 2. PETITS OUTILS
// ---------------------------------------------------------------------

// Couleur d'un point d'intérêt (montée : selon son niveau ; sinon : selon son type)
const couleur = p => p.type === "mont" ? NIVEAUX[p.niveau] || "#ef8a17" : (TYPES[p.type] || {}).coul || "#555";
// Code SVG d'une icône
const icone = (type, extra = "") => `<svg viewBox="0 0 24 24" ${extra}>${ICONES[type] || ICONES.vue}</svg>`;
// $("titre") = l'élément de la page qui a id="titre" (raccourci)
const $ = id => document.getElementById(id);
// Nombre à la française (12345 > "12 345"), ou "-" si la valeur est vide
const fmt = n => n == null ? "-" : Number(n).toLocaleString("fr-FR");


// ---------------------------------------------------------------------
// 3. CHARGEMENT DE LA FICHE DU PARCOURS
// ---------------------------------------------------------------------

// Nom du parcours lu dans l'adresse (?p=...). Sans "?p=", on affiche le Flandrien.
const slug = new URLSearchParams(location.search).get("p") || "flandrien-challenge";
// Charge textes + trace (fonction définie dans entete.js), puis construit la page.
// En cas de problème, un message rouge explique quoi corriger.
chargerParcours(slug).then(P => {
  if (P) construire(P);
  else $("titre").textContent = "Parcours introuvable";
  afficherErreurs();
});


// ---------------------------------------------------------------------
// 4. CONSTRUCTION DE LA PAGE (P = toutes les infos de la fiche)
// ---------------------------------------------------------------------
function construire(P) {
  P.pois = (P.pois || []).sort((a, b) => a.km - b.km);       // points d'intérêt triés par km
  const altMax = Math.max(...P.trace.map(p => p[2]));         // altitude la plus haute
  document.title = `${P.nom} ${P.nom_gras || ""} - ${NOM_DU_SITE}`; // titre de l'onglet

  // --- Bandeau du haut : photo principale (ou courbes de niveau), étiquettes, titre, résumé ---
  $("fond").innerHTML = P.photo_principale
    ? `<img src="photos/${P.slug}/${P.photo_principale}" alt="">`
    : courbesDeNiveau();
  const cat = libelleFiche(P);   // ex. « Vélo · À la journée » ou « Traces du Nord · VTT »
  $("lieu").innerHTML = (cat ? `<span class="cat">${cat}</span>` : "") + (P.lieu || []).map(l => `<span>${l}</span>`).join("");
  $("titre").innerHTML = `${P.nom}${P.nom_gras ? ` <em>${P.nom_gras}</em>` : ""}`; // nom_gras = partie en orange
  $("chapeau").textContent = propre(P.chapeau) || propre(P.description_courte);

  // --- Vélo ou randonnée ? Certains chiffres et encarts changent ---
  const rando = P.activite === "rando";
  // --- Fiche courte « Traces du Nord » (format "locale") : page allégée ---
  const courte = P.format === "locale";
  if (courte) document.body.classList.add("courte");
  // Masque une section : son titre (idTitre) et son contenu (idBloc)
  const masquer = (...ids) => ids.forEach(id => { const el = $(id); if (el) el.style.display = "none"; });

  // --- Barre de chiffres ---
  // Chaque ligne : [icône, intitulé, valeur]. On peut en retirer ou en ajouter.
  // Les 4 premières sont communes, les suivantes dépendent de l'activité.
  // Une case sans valeur (champ vide ou « à compléter ») n'est pas affichée.
  const terrain = [
    P.pct_hors_bitume != null ? P.pct_hors_bitume + " % piste" : null,
    P.pct_singletrack != null ? P.pct_singletrack + " % single" : null
  ].filter(Boolean).join(" · ");
  const stats = courte ? [
    ["distance", "Distance",        fmt(P.distance_km) + " km"],
    ["dplus",    "Dénivelé +",      fmt(P.denivele_m) + " m"],
    ["jours",    "Durée",           joursDe(P) > 1 ? joursDe(P) + " jours" : "À la journée"],
    ["velo",     "Pratique",        (PRATIQUES[P.pratique] || {}).nom || "-"],
    ["sommet",   "Départ",          P.depart || "à préciser"],
    ["sommet",   "Point culminant", fmt(altMax) + " m"]
  ] : [
    ["distance", "Distance",        fmt(P.distance_km) + " km"],
    ["dplus",    "Dénivelé +",      fmt(P.denivele_m) + " m"],
    ["jours",    "Durée",           P.jours ? P.jours + " j" : P.duree],
    ["sommet",   "Point culminant", fmt(altMax) + " m"],
    ...(rando
      ? [["temps",   "Temps de marche", propre(P.temps_marche)]]   // randonnée
      : [["terrain", "Hors bitume",     terrain],                  // vélo
         ["velo",    "Vélo conseillé",  propre(P.velo)]])
  ].filter(([, , valeur]) => valeur);
  $("stats").innerHTML = stats.map(([i, intitule, valeur]) =>
    `<div class="stat"><svg viewBox="0 0 24 24">${STAT_ICONES[i]}</svg><div><span>${intitule}</span><b>${valeur}</b></div></div>`
  ).join("");

  // --- Le carnet du jour : une page de carnet par étape qui a un "ressenti" ---
  // Les étapes sans ressenti n'ont pas de page. Aucune : la section est masquée.
  const pages = (P.etapes || []).filter(e => propre(e.ressenti));
  if (pages.length) {
    $("carnet").innerHTML = pages.map(e => `<article class="page-carnet">
        <div class="jour">${e.jour || ""}</div>
        <div class="trajet">${[e.de, e.a].filter(Boolean).join(" > ")}</div>
        <p class="mots">${propre(e.ressenti)}</p>
      </article>`).join("");
  } else {
    $("carnet-titre").style.display = "none";
    $("carnet").style.display = "none";
  }

  // --- L'essentiel : les encarts pratiques ---
  // Chaque ligne : [titre de l'encart, icône, champ de la fiche].
  // Un champ entre [ ] dans la fiche devient une liste à puces.
  // Un encart vide (ou seulement « à compléter ») n'est pas affiché.
  const contenu = v => Array.isArray(v) ? `<ul>${v.map(x => `<li>${x}</li>`).join("")}</ul>` : `<p>${v}</p>`;
  const rempli = v => Array.isArray(v) ? v.length > 0 : !!v;
  // En randonnée : « Sentiers et balisage » et « Équipement » en plus,
  // et certains titres changent (terrain, nuits).
  const encarts = [
    ["Points forts",          STAT_ICONES.sommet, P.points_forts],
    ["À savoir absolument",   '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>', P.a_savoir],
    ...(rando ? [["Sentiers et balisage", STAT_ICONES.balisage, P.balisage]] : []),
    [rando ? "Terrain et passages délicats" : "Terrain et vélo", STAT_ICONES.terrain, P.terrain_machine],
    ...(rando ? [["Équipement",           STAT_ICONES.materiel, P.materiel]] : []),
    ["Eau et ravitaillement", ICONES.eau, P.ravitaillement],
    [rando ? "Refuges et nuits" : "Dormir", ICONES.bivouac, P.hebergement],
    ["Saison",                '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>', P.saison],
    ["Accès et retour",       ICONES.gare, P.acces],
    ["Infos complémentaires", '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', P.infos_complementaires]
  ];
  // Fiche courte : pas d'encarts ; tableau des étapes seulement pour une sortie de plusieurs jours
  const encartsRemplis = encarts.map(([t, ic, v]) => [t, ic, propre(v)]).filter(([, , v]) => rempli(v));
  if (courte || !encartsRemplis.length) masquer("essentiel-titre", "encarts");
  if (courte && (joursDe(P) < 2 || !(P.etapes || []).length)) masquer("etapes-titre", "etapes-bloc");
  $("encarts").innerHTML = encartsRemplis.map(([titre, ic, v]) =>
    `<div class="encart"><h3><svg viewBox="0 0 24 24">${ic}</svg>${titre}</h3>${contenu(v)}</div>`
  ).join("");

  // --- Tableau des étapes (une ligne par jour) ---
  // Colonne « Temps » ajoutée seulement si au moins une étape a un "duree"
  // (utile en randonnée : ex. "6 h").
  const avecTemps = (P.etapes || []).some(e => e.duree);
  if (avecTemps) document.querySelector("table.etapes thead th:nth-child(4)").insertAdjacentHTML("afterend", "<th>Temps</th>");
  // Trajet : « départ > arrivée », ou ce qui est connu, ou « - » si rien n'est rempli.
  // Colonne « Notes » retirée si aucune étape n'a de note.
  const avecNotes = (P.etapes || []).some(e => propre(e.note));
  if (!avecNotes) { const th = document.querySelector("table.etapes thead th:last-child"); if (th) th.remove(); }
  $("etapes").innerHTML = (P.etapes || []).map(e =>
    `<tr><td class="nw"><b>${e.jour}</b></td><td>${[e.de, e.a].filter(Boolean).join(" > ") || "-"}</td><td class="mono nw">${fmt(e.km)}</td><td class="mono nw">${e.dplus == null ? "-" : fmt(e.dplus) + " m"}</td>${avecTemps ? `<td class="mono nw">${e.duree || "-"}</td>` : ""}${avecNotes ? `<td>${propre(e.note)}</td>` : ""}</tr>`
  ).join("");

  // --- Galerie photos (section masquée s'il n'y en a pas) ---
  const gal = $("galerie");
  if (!(P.photos || []).length) masquer("photos-titre", "galerie");
  gal.dataset.n = Math.min((P.photos || []).length, 6);   // disposition de la mosaïque (voir style.css, section 15)
  gal.innerHTML = (P.photos || []).map(ph => `<figure><img src="photos/${P.slug}/${ph.fichier}" alt="${ph.legende || ""}" loading="lazy"><figcaption>${ph.legende || ""}</figcaption></figure>`).join("");
  visionneuse(P);

  // --- Fiche courte : lien de retour vers toutes les traces du Nord ---
  if (courte) { $("retour").hidden = false; $("retour").innerHTML = `<a href="${SECTION_NORD.lien}">Retour aux ${SECTION_NORD.nom}</a>`; }

  // --- Crédits en bas de page ---
  $("credits").innerHTML = `<b>Parcours tracé et ${rando ? "marché" : "roulé"} par ${P.auteur || "Kévin"}${P.date_trace ? (/^\d/.test(P.date_trace) ? " le " : " en ") + P.date_trace : ""}.</b> ${P.date_maj ? "Mise à jour : " + P.date_maj + ". " : ""}Un chemin fermé, un point d'eau à sec ? Écris-moi pour que je corrige la trace. ${P.origine_trace || ""}`;

  carteProfilFeuille(P);
}


// ---------------------------------------------------------------------
// 5. CARTE + FILTRES + PROFIL + FEUILLE DE ROUTE + BOUTONS GPX
//    Ces éléments sont reliés : survoler le profil déplace un point sur
//    la carte, cliquer une ligne de la feuille de route zoome la carte.
// ---------------------------------------------------------------------
function carteProfilFeuille(P) {
  const pts = P.trace;                       // chaque point : [latitude, longitude, altitude, km]
  const ll = pts.map(p => [p[0], p[1]]);     // seulement [latitude, longitude]

  // --- La carte ---
  const carte = L.map("carte", { scrollWheelZoom: false });
  fondsDeCarte(carte);
  L.polyline(segments(pts), { color: "#fff", weight: 8, opacity: .8 }).addTo(carte);  // liseré blanc (sans trait droit aux coupures)
  const ligne = L.polyline(segments(pts), { color: "#e4572e", weight: 4 }).addTo(carte); // trace orange
  carte.fitBounds(ligne.getBounds(), { padding: [24, 24] });                  // cadrage sur la trace

  // Pastille ronde colorée avec une icône (marqueurs de la carte)
  const pastille = (coul, type) => L.divIcon({
    className: "", iconSize: [24, 24], iconAnchor: [12, 12],
    html: `<div class="marqueur" style="background:${coul}">${icone(type)}</div>`
  });
  L.marker(ll[0], { icon: pastille("#1c2420", "depart") }).bindPopup("<b>Départ</b>").addTo(carte);
  L.marker(ll[ll.length - 1], { icon: pastille("#1c2420", "depart") }).bindPopup("<b>Arrivée</b>").addTo(carte);
  // Point orange qui suit la souris quand on survole le profil
  const curseur = L.circleMarker(ll[0], { radius: 7, color: "#fff", weight: 2, fillColor: "#e4572e", fillOpacity: 1 });

  // --- Marqueurs des points d'intérêt, rangés par type ---
  const groupes = {}, marqueurs = [];
  for (const p of P.pois) {
    groupes[p.type] = groupes[p.type] || L.layerGroup().addTo(carte);
    const niv = p.type === "mont" && p.niveau ? ` · ${NOM_NIVEAU[p.niveau]}` : "";
    const m = L.marker([p.lat, p.lon], { icon: pastille(couleur(p), p.type) })
      .bindPopup(`<b>${p.nom}</b><span class="km">km ${p.km.toFixed(1)}${niv}</span><br>${p.info || ""}`);
    groupes[p.type].addLayer(m);
    marqueurs.push(m);
  }

  // --- Filtres au-dessus de la carte (un bouton par type présent) ---
  // Un clic masque/affiche ce type sur la carte, le profil et la feuille de route.
  const filtres = $("filtres");
  for (const t of Object.keys(TYPES)) {
    const n = P.pois.filter(p => p.type === t).length;
    if (!n) continue;                         // pas de bouton pour un type absent
    const b = document.createElement("button");
    b.className = "filtre"; b.setAttribute("aria-pressed", "true");
    const c = t === "mont" ? "linear-gradient(135deg,#4c9a5f,#e0b422,#ef8a17,#c0262d)" : TYPES[t].coul;
    b.innerHTML = `<span class="pastille" style="background:${c}">${icone(t)}</span>${TYPES[t].nom} <span class="mono">${n}</span>`;
    b.onclick = () => {
      const actif = b.getAttribute("aria-pressed") === "true";
      b.setAttribute("aria-pressed", String(!actif));
      actif ? carte.removeLayer(groupes[t]) : carte.addLayer(groupes[t]);
      document.querySelectorAll(`[data-type="${t}"]`).forEach(el => el.style.display = actif ? "none" : "");
    };
    filtres.appendChild(b);
  }

  // --- Profil altimétrique (dessin SVG de 1000 x 160) ---
  const W = 1000, H = 160, haut = 10, bas = 4;
  const total = pts[pts.length - 1][3];                       // distance totale en km
  const alts = pts.map(p => p[2]);
  // Altitudes mini/maxi arrondies à 50 m
  const mini = Math.floor(Math.min(...alts) / 50) * 50, maxi = Math.ceil(Math.max(...alts) / 50) * 50 || mini + 50;
  // Conversion km > position horizontale, altitude > position verticale
  const X = km => km / total * W;
  const Y = a => haut + (1 - (a - mini) / (maxi - mini)) * (H - haut - bas);
  let d = `M0 ${H}`;
  for (const p of pts) d += `L${X(p[3]).toFixed(1)} ${Y(p[2]).toFixed(1)}`;
  d += `L${W} ${H}Z`;
  // Graduations : tous les 50, 20 ou 10 km selon la longueur
  const pas = total > 150 ? 50 : total > 60 ? 20 : 10;
  let graduations = "", reperes = "";
  for (let k = pas; k < total - pas * .4; k += pas) {
    graduations += `<line class="axe" x1="${X(k)}" x2="${X(k)}" y1="0" y2="${H}"/>`;
    reperes += `<span style="left:${(k / total * 100).toFixed(2)}%">${k} km</span>`;
  }
  // Trouve le point de la trace le plus proche d'un km donné
  const pointAuKm = km => {
    let a = 0, b = pts.length - 1;
    while (b - a > 1) { const m = (a + b) >> 1; pts[m][3] < km ? a = m : b = m; }
    return pts[b];
  };
  // Petits traits colorés sur le profil à l'emplacement de chaque point d'intérêt
  const traits = P.pois.map(p =>
    `<line data-type="${p.type}" x1="${X(p.km)}" x2="${X(p.km)}" y1="${Y(pointAuKm(p.km)[2])}" y2="${Y(pointAuKm(p.km)[2]) - 9}" stroke="${couleur(p)}" stroke-width="3" vector-effect="non-scaling-stroke"/>`
  ).join("");
  const svg = $("profil");
  svg.innerHTML = graduations + `<path class="aire" d="${d}"/>` + traits + `<line class="curseur" id="lc" y1="0" y2="${H}" visibility="hidden"/>`;
  $("reperes").innerHTML = reperes;

  // Survol du profil (souris ou doigt) : ligne verticale + infos + point sur la carte
  const lc = $("lc"), info = $("info");
  info.textContent = `alt. ${mini} - ${maxi} m`;
  const survol = x => {
    const r = svg.getBoundingClientRect();
    const p = pointAuKm(Math.max(0, Math.min(1, (x - r.left) / r.width)) * total);
    lc.setAttribute("x1", X(p[3])); lc.setAttribute("x2", X(p[3])); lc.setAttribute("visibility", "visible");
    info.textContent = `km ${p[3].toFixed(1)} · ${p[2]} m`;
    curseur.setLatLng([p[0], p[1]]).addTo(carte);
  };
  svg.addEventListener("mousemove", e => survol(e.clientX));
  svg.addEventListener("touchmove", e => survol(e.touches[0].clientX), { passive: true });
  svg.addEventListener("mouseleave", () => { lc.setAttribute("visibility", "hidden"); info.textContent = `alt. ${mini} - ${maxi} m`; curseur.remove(); });

  // --- Feuille de route : tableau des points d'intérêt, par km ---
  // Sur une fiche courte, elle s'appelle « Les incontournables ».
  // Sans aucun point d'intérêt, la section est masquée.
  if (P.format === "locale") $("feuille-titre").textContent = "Les incontournables";
  if (!P.pois.length) { $("feuille-titre").style.display = "none"; $("feuille-bloc").style.display = "none"; }
  // Un clic sur une ligne remonte à la carte, zoome sur le point et ouvre sa bulle.
  $("feuille").innerHTML = P.pois.map((p, i) => `<tr data-i="${i}" data-type="${p.type}">
      <td class="km">${p.km.toFixed(1)}</td>
      <td><span class="type"><span class="rond" style="background:${couleur(p)}"></span>${p.type === "mont" ? NOM_NIVEAU[p.niveau] || "Montée" : (TYPES[p.type] || {}).nom || p.type}</span></td>
      <td>${p.nom}</td><td>${p.info || ""}</td></tr>`).join("");
  $("feuille").onclick = e => {
    const tr = e.target.closest("tr"); if (!tr) return;
    const m = marqueurs[+tr.dataset.i];
    $("carte-titre").scrollIntoView({ behavior: "smooth" });
    carte.setView(m.getLatLng(), 14);           // 14 = niveau de zoom
    setTimeout(() => m.openPopup(), 400);
  };

  // --- Boutons de téléchargement ---
  // "Trace GPX" : le fichier gpx/<nom>.gpx tel quel.
  $("gpx").href = "gpx/" + P.slug + ".gpx";
  $("gpx").setAttribute("download", P.slug + ".gpx");
  // "GPX avec points d'intérêt" : fabriqué à la volée dans le navigateur
  // (trace + points d'intérêt de la fiche, lisibles par un GPS ou Komoot).
  $("gpx-poi").onclick = () => {
    const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const wpt = P.pois.map(p => `<wpt lat="${p.lat}" lon="${p.lon}"><name>${esc(p.nom)}</name><desc>${esc("km " + p.km.toFixed(1) + " - " + (p.info || ""))}</desc><type>${p.type}</type></wpt>`).join("\n");
    const trk = pts.map(p => `<trkpt lat="${p[0]}" lon="${p[1]}"><ele>${p[2]}</ele></trkpt>`).join("");
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="${esc(NOM_DU_SITE)}" xmlns="http://www.topografix.com/GPX/1/1">\n${wpt}\n<trk><name>${esc(P.nom + " " + (P.nom_gras || ""))}</name><trkseg>${trk}</trkseg></trk>\n</gpx>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([gpx], { type: "application/gpx+xml" }));
    a.download = P.slug + "-avec-poi.gpx";
    a.click();
  };
}


// ---------------------------------------------------------------------
// 6. VISIONNEUSE PHOTOS
//    Clic sur une photo de la galerie : elle s'ouvre en grand.
//    Pour passer d'une photo à l'autre :
//      - ordinateur : flèches à gauche/droite de la photo, ou touches
//        ← et → du clavier ; touche Échap pour fermer
//      - téléphone : glisser le doigt vers la gauche ou la droite
//    Clic sur le fond sombre ou sur la croix : fermeture.
// ---------------------------------------------------------------------
function visionneuse(P) {
  const photos = P.photos || [];
  if (!photos.length) return;
  const loupe = $("loupe"), img = $("loupe-img");
  let actuelle = 0;   // numéro de la photo affichée (0 = la première)

  const afficher = n => {
    actuelle = (n + photos.length) % photos.length;   // après la dernière, on revient à la première
    const ph = photos[actuelle];
    img.src = `photos/${P.slug}/${ph.fichier}`;
    img.alt = ph.legende || "";
    $("loupe-legende").textContent = ph.legende || "";
    $("loupe-compteur").textContent = `${actuelle + 1} / ${photos.length}`;
    // On précharge la photo suivante pour qu'elle s'affiche sans attendre
    new Image().src = `photos/${P.slug}/${photos[(actuelle + 1) % photos.length].fichier}`;
  };
  const ouvrir = n => { afficher(n); loupe.style.display = "grid"; document.body.style.overflow = "hidden"; };
  const fermer = () => { loupe.style.display = "none"; document.body.style.overflow = ""; };
  const ouverte = () => loupe.style.display === "grid";

  // Clic sur une photo de la galerie : on ouvre la visionneuse sur cette photo
  $("galerie").onclick = e => {
    if (e.target.tagName !== "IMG") return;
    const n = [...$("galerie").querySelectorAll("img")].indexOf(e.target);
    ouvrir(n);
  };

  // Flèches et croix (stopPropagation : le clic ne "traverse" pas jusqu'au fond)
  $("loupe-prec").onclick = e => { e.stopPropagation(); afficher(actuelle - 1); };
  $("loupe-suiv").onclick = e => { e.stopPropagation(); afficher(actuelle + 1); };
  $("loupe-fermer").onclick = e => { e.stopPropagation(); fermer(); };
  img.onclick = e => { e.stopPropagation(); afficher(actuelle + 1); };   // clic sur la photo = suivante
  loupe.onclick = fermer;                                                // clic sur le fond = fermer

  // Clavier
  document.addEventListener("keydown", e => {
    if (!ouverte()) return;
    if (e.key === "ArrowRight") afficher(actuelle + 1);
    if (e.key === "ArrowLeft") afficher(actuelle - 1);
    if (e.key === "Escape") fermer();
  });

  // Téléphone : glisser le doigt (au moins 40 px) vers la gauche ou la droite
  let departX = null;
  loupe.addEventListener("touchstart", e => { departX = e.touches[0].clientX; }, { passive: true });
  loupe.addEventListener("touchend", e => {
    if (departX === null) return;
    const ecart = e.changedTouches[0].clientX - departX;
    if (Math.abs(ecart) > 40) afficher(actuelle + (ecart < 0 ? 1 : -1));
    departX = null;
  });

  // Une seule photo : pas besoin de flèches
  if (photos.length < 2) { $("loupe-prec").hidden = true; $("loupe-suiv").hidden = true; }
}

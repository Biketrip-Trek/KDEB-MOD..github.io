// =====================================================================
// FICHIER : assets/accueil.js
// RÔLE    : construit la PAGE D'ACCUEIL (index.html) :
//             1. charge les deux listes (data/liste-nord.js et data/liste.js)
//             2. charge chaque parcours : textes (data/<nom>.js)
//                et trace (data/traces/<nom>.js)
//             3. remplit les compteurs, la grande carte et les rubriques :
//                Traces du Nord / Traces ailleurs en France,
//                puis Vélo / Randonnée, puis à la journée / plusieurs jours
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
  const tousLesPoints = [];
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
    tousLesPoints.push(...ll);
  }
  // Cadrage de la carte sur toutes les traces (ou sur la France s'il n'y en a pas)
  if (tousLesPoints.length) carte.fitBounds(L.latLngBounds(tousLesPoints), { padding: [30, 30] });
  else carte.setView([46.6, 2.5], 6);

  // --- 3. Boutons de filtre au-dessus de la carte (Tous / Vélo / Randonnée) ---
  const filtres = document.getElementById("filtres");
  const choix = [{ id: "tout", nom: "Tous les parcours" }, ...MENU.map(m => ({ id: m.id, nom: m.nom }))];
  for (const f of choix) {
    const b = document.createElement("button");
    b.className = "filtre";
    b.setAttribute("aria-pressed", String(f.id === "tout"));  // "Tous" est actif au départ
    const n = f.id === "tout" ? parcours.length : parcours.filter(p => p.activite === f.id).length;
    const pastille = f.id === "tout" ? "" : `<span class="pastille" style="background:${COULEUR_ACTIVITE[f.id]}"></span>`;
    b.innerHTML = `${pastille}${f.nom} <span class="mono">${n}</span>`;
    b.onclick = () => {
      filtres.querySelectorAll(".filtre").forEach(x => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      const visibles = [];
      for (const [activite, g] of Object.entries(groupes)) {
        const afficher = f.id === "tout" || f.id === activite;
        afficher ? carte.addLayer(g) : carte.removeLayer(g);
        if (afficher) visibles.push(g.getBounds());
      }
      // Recadre la carte sur les traces affichées
      if (visibles.length) carte.fitBounds(visibles.reduce((a, b2) => a.extend(b2)), { padding: [30, 30] });
    };
    filtres.appendChild(b);
  }

  // --- 4. Rubriques sous la carte : les deux catégories (Traces du Nord,
  //        Traces ailleurs en France), puis Vélo / Randonnée, puis
  //        À la journée / Plusieurs jours.
  // Chaque rubrique a un "id" (ex. nord-velo-journee) : c'est lui que visent
  // les liens du menu (index.html#nord-velo-journee).
  const rub = document.getElementById("rubriques");
  rub.innerHTML = CATEGORIES.map(c => {
    const dansCat = parcours.filter(p => p.categorie === c.id);
    return `<section class="categorie" id="${c.id}">
      <header class="entete-categorie">
        <div><span class="cat">${dansCat.length} trace${dansCat.length > 1 ? "s" : ""} · ${fmtN(dansCat.reduce((t, p) => t + (p.distance_km || 0), 0))} km</span>
          <h2>${c.nom}</h2>
          <p>${c.accroche || ""}</p></div>
        ${c.carte ? `<a class="aller" href="${c.carte}">Carte et filtres</a>` : ""}
      </header>
      ${MENU.map(m => {
        const dansAct = dansCat.filter(p => p.activite === m.id);
        return `<div class="rubrique" id="${c.id}-${m.id}">
          <h3 class="titre-rubrique"><span class="pastille" style="background:${COULEUR_ACTIVITE[m.id]}"></span>${m.nom} <span class="mono">${dansAct.length}</span></h3>
          ${m.sous.map(s => {
            const liste = dansAct.filter(p => dureeDe(p) === s.id);
            return `<div class="sous-rubrique" id="${c.id}-${m.id}-${s.id}">
              <h4>${s.nom} <span class="mono">${liste.length}</span></h4>
              <div class="grille">${liste.length ? liste.map(fiche).join("") : `<p class="bientot">De nouvelles traces arrivent bientôt.</p>`}</div>
            </div>`;
          }).join("")}
        </div>`;
      }).join("")}
    </section>`;
  }).join("");

  // --- 5. Arrivée depuis le menu (ex. index.html#velo-journee) ---
  // On fait défiler la page jusqu'à la bonne rubrique et on la fait "clignoter".
  const allerA = () => {
    const cible = location.hash && document.getElementById(location.hash.slice(1));
    if (!cible) return;
    cible.scrollIntoView({ behavior: "smooth", block: "start" });
    cible.classList.remove("eclair"); void cible.offsetWidth; cible.classList.add("eclair");
  };
  allerA();
  window.addEventListener("hashchange", allerA);
}


// ---------------------------------------------------------------------
// VIGNETTE d'un parcours (photo ou silhouette de la trace + chiffres)
// ---------------------------------------------------------------------
function fiche(p) {
  const visuel = p.photo_principale
    ? `<img src="photos/${p.slug}/${p.photo_principale}" alt="" loading="lazy">`
    : silhouette(p.trace);
  return `<a class="fiche" href="parcours.html?p=${p.slug}">
    <div class="visuel ${p.photo_principale ? "" : "sans-photo"}">${visuel}
      <span class="etiquette">${etiquetteFiche(p)}</span></div>
    <div class="corps">
      <h4>${p.nom} ${p.nom_gras ? `<em>${p.nom_gras}</em>` : ""}</h4>
      <p class="lieu">${(p.lieu || []).length ? p.lieu.join(" · ") : p.depart ? "Départ : " + p.depart : ""}</p>
      <div class="chiffres mono"><span>${fmtN(p.distance_km)} km</span><span>${fmtN(p.denivele_m)} m D+</span><span>${joursDe(p)} j</span></div>
    </div>
  </a>`;
}

// =====================================================================
// FICHIER : assets/accueil.js
// RÔLE    : construit la PAGE D'ACCUEIL (index.html) :
//             1. charge les deux listes (data/liste-nord.js et data/liste.js)
//             2. charge chaque parcours : textes (data/<nom>.js)
//                et trace (data/traces/<nom>.js)
//             3. remplit la partie magazine (À la une, catégories, citation,
//                dernières traces), la grande carte et les rubriques :
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


// Trace mise « À la une » en haut de l'accueil (grande photo, titre, chiffres).
// Écris le nom du fichier sans ".js". Laisse "" pour prendre automatiquement
// la dernière trace ajoutée qui a une photo.
const A_LA_UNE = "cretes-du-jura-en-3-jours";

// Photo de chaque grande catégorie (nom du parcours dont on prend la photo
// principale). Laisse "" pour prendre la première trace de la catégorie qui a une photo.
const PHOTO_CATEGORIE = {
  nord:   "des-lacs-et-des-copains-en-2-jours",
  france: "tmv-vosges-2026"
};

// Citation tirée d'un carnet du jour, au milieu de l'accueil.
// texte = phrase recopiée telle quelle ; source = parcours et jour ; slug = lien.
// Laisse texte vide ("") pour ne pas afficher de citation.
const CITATION = {
  texte:  "Pas une goutte d'eau sur la crête à cette saison : détour par Menthières pour remplir les gourdes, c'est le prix à payer pour rester tout là-haut.",
  source: "Le carnet du jour · Crêtes du Jura, jour 2",
  slug:   "cretes-du-jura-en-3-jours"
};

// Nombre de vignettes dans « Dernières traces »
const NB_DERNIERES = 3;


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
  // Rang d'ajout : 0 = dernier nom de sa liste (le plus récent), 1 = l'avant-dernier...
  parcours.forEach(p => { const l = listes[p.categorie] || []; p.rang = l.length - 1 - l.indexOf(p.slug); });
  construireAccueil(parcours);
  afficherErreurs();
})();


// ---------------------------------------------------------------------
// CONSTRUCTION DE LA PAGE
// ---------------------------------------------------------------------
function construireAccueil(parcours) {

  // --- 1. Partie magazine : compteur de l'en-tête, À la une, catégories,
  //        citation, dernières traces (fonctions plus bas dans ce fichier)
  const km = parcours.reduce((total, p) => total + (p.distance_km || 0), 0);
  const compteur = document.createElement("span");
  compteur.className = "compteur-entete mono";
  compteur.textContent = `${parcours.length} traces · ${fmtN(km)} km`;
  document.querySelector(".entete .contenu").appendChild(compteur);
  const avecPhoto = parcours.filter(p => p.photo_principale).sort((a, b) => a.rang - b.rang);
  const une = parcours.find(p => p.slug === A_LA_UNE) || avecPhoto[0];
  if (une) document.getElementById("une").innerHTML = blocUne(une);
  document.getElementById("portes").innerHTML = CATEGORIES.map(c => porte(c, parcours)).join("");
  document.getElementById("citation").innerHTML = CITATION.texte ? `
    <span class="guillemet" aria-hidden="true">«</span>
    <blockquote><p>${CITATION.texte}</p>
      <a class="source" href="parcours.html?p=${CITATION.slug}">${CITATION.source}</a></blockquote>` : "";
  const dernieres = avecPhoto.filter(p => p !== une).slice(0, NB_DERNIERES);
  document.getElementById("dernieres").innerHTML = dernieres.length ? `
    <div class="tete-bloc"><h2 class="titre-bloc">Dernières traces</h2><a href="#toutes-les-traces">Toutes les traces</a></div>
    <div class="grille-dernieres">${dernieres.map(carteRecente).join("")}</div>` : "";

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



// ---------------------------------------------------------------------
// PARTIE MAGAZINE DE L'ACCUEIL
// ---------------------------------------------------------------------

// Nom de la catégorie d'un parcours (« Traces du Nord »...)
const nomCategorie = p => (CATEGORIES.find(c => c.id === p.categorie) || {}).nom || "";

// Début du chapô : les premières phrases, jusqu'à environ 280 caractères
function debutChapeau(texte) {
  const phrases = (propre(texte) || "").match(/[^.!?]+[.!?]+/g) || [];
  let sortie = "";
  for (const ph of phrases) { if (sortie && (sortie + ph).length > 280) break; sortie += ph; }
  return sortie.trim();
}

// Bloc « À la une » : grande photo, étiquette, titre, chapô, barre de chiffres
function blocUne(p) {
  const altMax = Math.max(...p.trace.map(x => x[2] || 0));
  const depart = p.depart || ((p.etapes || [])[0] || {}).de || "";
  const n = joursDe(p);
  const chiffres = [
    ["Distance", `${fmtN(p.distance_km)} km`],
    ["Dénivelé +", `${fmtN(p.denivele_m)} m`],
    ["Durée", n > 1 ? `${n} jours` : "1 jour"],
    altMax > 0 ? ["Point culminant", `${fmtN(Math.round(altMax))} m`] : null,
    depart ? ["Départ", depart] : null
  ].filter(Boolean);
  return `
    <a class="photo-une" href="parcours.html?p=${p.slug}"><img src="photos/${p.slug}/${p.photo_principale}" alt="${p.nom} ${p.nom_gras || ""}"></a>
    <div class="contenu">
      <div class="titre-une">
        <div>
          <span class="surtitre">À la une · ${nomCategorie(p)} · ${etiquetteFiche(p)}</span>
          <h1><a href="parcours.html?p=${p.slug}">${p.nom}${p.nom_gras ? ` <em>${p.nom_gras}</em>` : ""}</a></h1>
          ${debutChapeau(p.chapeau) ? `<p class="chapo">${debutChapeau(p.chapeau)}</p>` : ""}
        </div>
        <a class="bouton-noir" href="parcours.html?p=${p.slug}">Lire la trace</a>
      </div>
      <div class="barre-chiffres">${chiffres.map(([t, v]) => `<div><span>${t}</span><b class="mono">${v}</b></div>`).join("")}</div>
    </div>`;
}

// Porte d'entrée d'une catégorie : photo, nom, compteur, accroche
function porte(c, parcours) {
  const dans = parcours.filter(p => p.categorie === c.id);
  const km = dans.reduce((t, p) => t + (p.distance_km || 0), 0);
  const choisi = dans.find(p => p.slug === PHOTO_CATEGORIE[c.id] && p.photo_principale) || dans.find(p => p.photo_principale);
  const photo = choisi ? `<img src="photos/${choisi.slug}/${choisi.photo_principale}" alt="" loading="lazy">` : "";
  return `<a class="porte" href="#${c.id}">
    <div class="photo-porte">${photo}</div>
    <div class="nom-porte"><h2>${c.nom}</h2><span class="mono">${dans.length} trace${dans.length > 1 ? "s" : ""} · ${fmtN(km)} km</span></div>
    <p>${c.accroche || ""}</p>
  </a>`;
}

// Vignette « Dernières traces »
function carteRecente(p) {
  return `<a class="recente" href="parcours.html?p=${p.slug}">
    <div class="photo-recente"><img src="photos/${p.slug}/${p.photo_principale}" alt="" loading="lazy"></div>
    <span class="surtitre">${nomCategorie(p)} · ${etiquetteFiche(p)}</span>
    <h3>${p.nom}${p.nom_gras ? ` <em>${p.nom_gras}</em>` : ""}</h3>
    <span class="mono chiffres-recente">${fmtN(p.distance_km)} km · ${fmtN(p.denivele_m)} m D+</span>
  </a>`;
}

// =====================================================================
// Page d'accueil : grande carte de tous les parcours + fiches par rubrique
// Les parcours affichés sont ceux listés dans data/liste.js
// =====================================================================
const COULEUR_ACTIVITE = { velo: "#e4572e", rando: "#2e5a45" };
const fmtN = n => Number(n).toLocaleString("fr-FR");

document.getElementById("fond").innerHTML = courbesDeNiveau();

// "?v=..." force le navigateur à relire les données à chaque visite :
// une mise à jour envoyée sur GitHub apparaît tout de suite (pas d'ancienne copie en cache)
const VERSION = "?v=" + Date.now();

// 1) Charge la liste des parcours (data/liste.js), 2) charge chaque data/<slug>.js, 3) construit la page
const liste = document.createElement("script");
liste.src = "data/liste.js" + VERSION;
liste.onload = liste.onerror = () => {
  const slugs = window.LISTE_PARCOURS || [];
  let restants = slugs.length;
  if (!restants) construireAccueil([]);
  for (const slug of slugs) {
    const s = document.createElement("script");
    s.src = "data/" + slug + ".js" + VERSION;
    s.onload = s.onerror = () => { if (--restants === 0) construireAccueil(slugs.map(x => (window.PARCOURS || {})[x]).filter(Boolean)); };
    document.head.appendChild(s);
  }
};
document.head.appendChild(liste);

function construireAccueil(parcours) {
  // Compteurs du bandeau
  const km = parcours.reduce((t, p) => t + (p.distance_km || 0), 0);
  const dp = parcours.reduce((t, p) => t + (p.denivele_m || 0), 0);
  document.getElementById("compteurs").innerHTML = `
    <div><b class="mono">${parcours.length}</b><span>parcours</span></div>
    <div><b class="mono">${fmtN(km)}</b><span>km tracés</span></div>
    <div><b class="mono">${fmtN(dp)}</b><span>m de dénivelé</span></div>`;

  // Grande carte
  const carte = L.map("carte-globale", { scrollWheelZoom: false });
  fondsDeCarte(carte);
  const groupes = {};
  const tout = [];
  for (const p of parcours) {
    const ll = p.trace.map(x => [x[0], x[1]]);
    const c = COULEUR_ACTIVITE[p.activite] || "#e4572e";
    const halo = L.polyline(ll, { color: "#fff", weight: 8, opacity: .85 });
    const ligne = L.polyline(ll, { color: c, weight: 4 });
    const depart = L.circleMarker(ll[0], { radius: 6, color: "#fff", weight: 2, fillColor: c, fillOpacity: 1 });
    const popup = `<b>${p.nom} ${p.nom_gras || ""}</b><span class="km">${libelleCategorie(p.activite, p.format)}</span><br>
      ${fmtN(p.distance_km)} km · ${fmtN(p.denivele_m)} m D+<br><a href="parcours.html?p=${p.slug}">Voir le parcours</a>`;
    const g = L.featureGroup([halo, ligne, depart]).bindPopup(popup);
    g.on("mouseover", () => ligne.setStyle({ weight: 7 }));
    g.on("mouseout", () => ligne.setStyle({ weight: 4 }));
    (groupes[p.activite] = groupes[p.activite] || L.featureGroup().addTo(carte)).addLayer(g);
    tout.push(...ll);
  }
  if (tout.length) carte.fitBounds(L.latLngBounds(tout), { padding: [30, 30] });
  else carte.setView([46.6, 2.5], 6);

  // Filtres de la carte
  const filtres = document.getElementById("filtres");
  const choix = [{ id: "tout", nom: "Tous les parcours" }, ...MENU.map(m => ({ id: m.id, nom: m.nom }))];
  for (const f of choix) {
    const b = document.createElement("button");
    b.className = "filtre"; b.setAttribute("aria-pressed", String(f.id === "tout"));
    const n = f.id === "tout" ? parcours.length : parcours.filter(p => p.activite === f.id).length;
    const pastille = f.id === "tout" ? "" : `<span class="pastille" style="background:${COULEUR_ACTIVITE[f.id]}"></span>`;
    b.innerHTML = `${pastille}${f.nom} <span class="mono">${n}</span>`;
    b.onclick = () => {
      filtres.querySelectorAll(".filtre").forEach(x => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
      const visibles = [];
      for (const [act, g] of Object.entries(groupes)) {
        const on = f.id === "tout" || f.id === act;
        on ? carte.addLayer(g) : carte.removeLayer(g);
        if (on) visibles.push(g.getBounds());
      }
      if (visibles.length) carte.fitBounds(visibles.reduce((a, b2) => a.extend(b2)), { padding: [30, 30] });
    };
    filtres.appendChild(b);
  }

  // Rubriques : Vélo / Randonnée, puis À la journée / Plusieurs jours
  const rub = document.getElementById("rubriques");
  rub.innerHTML = MENU.map(m => `
    <section class="rubrique" id="${m.id}">
      <h2 class="titre-rubrique"><span class="pastille" style="background:${COULEUR_ACTIVITE[m.id]}"></span>${m.nom}</h2>
      ${m.sous.map(s => {
        const liste = parcours.filter(p => p.activite === m.id && p.format === s.id);
        return `<div class="sous-rubrique" id="${m.id}-${s.id}">
          <h3>${s.nom} <span class="mono">${liste.length}</span></h3>
          <div class="grille">${liste.length ? liste.map(fiche).join("") : `<p class="bientot">De nouveaux parcours arrivent bientôt.</p>`}</div>
        </div>`;
      }).join("")}
    </section>`).join("");

  // Arrivée depuis le menu (ex. index.html#velo-journee) : aller à la bonne rubrique
  const allerA = () => {
    const cible = location.hash && document.getElementById(location.hash.slice(1));
    if (!cible) return;
    cible.scrollIntoView({ behavior: "smooth", block: "start" });
    cible.classList.remove("eclair"); void cible.offsetWidth; cible.classList.add("eclair");
  };
  allerA();
  window.addEventListener("hashchange", allerA);
}

function fiche(p) {
  const visuel = p.photo_principale
    ? `<img src="photos/${p.slug}/${p.photo_principale}" alt="" loading="lazy">`
    : silhouette(p.trace);
  return `<a class="fiche" href="parcours.html?p=${p.slug}">
    <div class="visuel ${p.photo_principale ? "" : "sans-photo"}">${visuel}
      <span class="etiquette">${libelleCategorie(p.activite, p.format)}</span></div>
    <div class="corps">
      <h4>${p.nom} ${p.nom_gras ? `<em>${p.nom_gras}</em>` : ""}</h4>
      <p class="lieu">${(p.lieu || []).join(" · ")}</p>
      <div class="chiffres mono"><span>${fmtN(p.distance_km)} km</span><span>${fmtN(p.denivele_m)} m D+</span><span>${p.jours || "-"} j</span></div>
    </div>
  </a>`;
}

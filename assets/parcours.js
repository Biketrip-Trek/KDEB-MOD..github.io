// =====================================================================
// Page parcours : charge data/<slug>.js puis construit toute la page
// =====================================================================

// --- Icônes (traits simples, s'affichent en blanc dans les pastilles) ---
const ICONES = {
  mont: '<path d="M2 20L9 8l4 6 3-4 6 10z"/>',
  pave: '<rect x="3" y="4" width="8" height="6"/><rect x="13" y="4" width="8" height="6"/><rect x="7" y="14" width="10" height="6"/>',
  eau: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  ravito: '<path d="M5 3v8a3 3 0 0 0 6 0V3M8 3v18M17 3c-2 2-2 6 0 8v10"/>',
  bivouac: '<path d="M2 20L12 4l10 16zM12 4v16M8 20l4-6 4 6"/>',
  gare: '<rect x="5" y="3" width="14" height="13" rx="2"/><path d="M5 11h14M8 20l2-4M16 20l-2-4"/>',
  vue: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  velo: '<circle cx="6" cy="16" r="4"/><circle cx="18" cy="16" r="4"/><path d="M6 16l4-8h5l3 8M10 8l2 8"/>',
  depart: '<path d="M5 21V4h11l-2 4 2 4H5"/>'
};
// Types de points d'intérêt : libellé, couleur. Ajouter un type = ajouter une ligne.
const TYPES = {
  mont:    { nom: "Montées",          coul: null },          // couleur selon la difficulté
  pave:    { nom: "Secteurs pavés",   coul: "#6b6f73" },
  eau:     { nom: "Points d'eau",     coul: "#2a7ab9" },
  ravito:  { nom: "Ravitaillement",   coul: "#7a4fa3" },
  bivouac: { nom: "Bivouac / dodo",   coul: "#2e5a45" },
  gare:    { nom: "Gares",            coul: "#1c2420" },
  vue:     { nom: "Points de vue",    coul: "#c99a06" },
  velo:    { nom: "Atelier vélo",     coul: "#b8337a" }
};
const NIVEAUX = { 1: "#4c9a5f", 2: "#e0b422", 3: "#ef8a17", 4: "#c0262d" };
const NOM_NIVEAU = { 1: "Facile", 2: "Moyen", 3: "Difficile", 4: "Très difficile" };
const couleur = p => p.type === "mont" ? NIVEAUX[p.niveau] || "#ef8a17" : (TYPES[p.type] || {}).coul || "#555";
const icone = (t, extra = "") => `<svg viewBox="0 0 24 24" ${extra}>${ICONES[t] || ICONES.vue}</svg>`;
const STAT_ICONES = {
  distance: '<path d="M3 17c4 0 4-10 9-10s5 10 9 10"/><circle cx="3" cy="17" r="1.5"/><circle cx="21" cy="17" r="1.5"/>',
  dplus: '<path d="M3 20l6-9 4 5 3-4 5 8z"/><path d="M15 4h5v5M20 4l-6 6"/>',
  jours: '<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  sommet: '<path d="M2 20l8-14 4 6 2-3 6 11z"/><path d="M10 6V2l4 1-4 1"/>',
  terrain: '<path d="M3 18c3-3 5-3 8 0s5 3 10-2M3 12c3-3 5-3 8 0s5 3 10-2"/>',
  velo: ICONES.velo
};

const $ = id => document.getElementById(id);
const fmt = n => n == null ? "-" : Number(n).toLocaleString("fr-FR");

// --- Chargement des données du parcours ---
const slug = new URLSearchParams(location.search).get("p") || "flandrien-challenge";
const script = document.createElement("script");
script.src = "data/" + slug + ".js?v=" + Date.now(); // ?v= : toujours la dernière version des données
script.onload = () => construire(window.PARCOURS[slug]);
script.onerror = () => { $("titre").textContent = "Parcours introuvable"; };
document.head.appendChild(script);

function construire(P) {
  P.pois = (P.pois || []).sort((a, b) => a.km - b.km);
  const altMax = Math.max(...P.trace.map(p => p[2]));
  document.title = `${P.nom} ${P.nom_gras || ""} - Kévin à vélo`;

  // Bandeau
  $("fond").innerHTML = P.photo_principale
    ? `<img src="photos/${P.slug}/${P.photo_principale}" alt="">`
    : courbesDeNiveau();
  const cat = libelleCategorie(P.activite, P.format);
  $("lieu").innerHTML = (cat ? `<span class="cat">${cat}</span>` : "") + (P.lieu || []).map(l => `<span>${l}</span>`).join("");
  $("titre").innerHTML = `${P.nom}${P.nom_gras ? ` <em>${P.nom_gras}</em>` : ""}`;
  $("chapeau").textContent = P.chapeau || P.description_courte || "";

  // Barre de chiffres
  const terrain = [P.pct_hors_bitume != null ? P.pct_hors_bitume + " % piste" : null, P.pct_singletrack != null ? P.pct_singletrack + " % single" : null].filter(Boolean).join(" · ");
  const stats = [
    ["distance", "Distance", fmt(P.distance_km) + " km"],
    ["dplus", "Dénivelé +", fmt(P.denivele_m) + " m"],
    ["jours", "Durée", P.jours ? P.jours + " j" : P.duree],
    ["sommet", "Point culminant", fmt(altMax) + " m"],
    ["terrain", "Hors bitume", terrain || "à compléter"],
    ["velo", "Vélo conseillé", P.velo || "-"]
  ];
  $("stats").innerHTML = stats.map(([i, l, v]) => `<div class="stat"><svg viewBox="0 0 24 24">${STAT_ICONES[i]}</svg><div><span>${l}</span><b>${v}</b></div></div>`).join("");

  // Difficulté
  const D = P.difficulte || {};
  const jauge = (l, v) => `<div class="jauge"><span>${l}</span><div class="barre">${Array.from({ length: 10 }, (_, i) => `<i class="${i < v ? "on" : ""}"></i>`).join("")}</div><span class="mono">${v ?? "-"}/10</span></div>`;
  $("jauges").innerHTML = `
    <div class="note-globale"><div class="chiffre">${D.globale ?? "-"}<small>/10</small></div><p>Difficulté globale</p></div>
    <div>${jauge("Dénivelé", D.denivele)}${jauge("Technique", D.technique)}${jauge("Physique", D.physique)}${jauge("Logistique", D.logistique)}
    ${D.note ? `<p class="note-ex">${D.note}</p>` : ""}</div>`;

  // Encarts pratiques
  const liste = v => Array.isArray(v) ? `<ul>${v.map(x => `<li>${x}</li>`).join("")}</ul>` : `<p>${v || "à compléter"}</p>`;
  const encarts = [
    ["Points forts", STAT_ICONES.sommet, P.points_forts],
    ["À savoir absolument", '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>', P.a_savoir],
    ["Terrain et vélo", STAT_ICONES.terrain, P.terrain_machine],
    ["Eau et ravitaillement", ICONES.eau, P.ravitaillement],
    ["Dormir", ICONES.bivouac, P.hebergement],
    ["Saison", '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>', P.saison],
    ["Accès et retour", ICONES.gare, P.acces],
    ["Infos complémentaires", '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', P.infos_complementaires]
  ];
  $("encarts").innerHTML = encarts.map(([t, ic, v]) => `<div class="encart"><h3><svg viewBox="0 0 24 24">${ic}</svg>${t}</h3>${liste(v)}</div>`).join("");

  // Étapes
  $("etapes").innerHTML = (P.etapes || []).map(e => `<tr><td><b>${e.jour}</b></td><td>${e.de} > ${e.a}</td><td class="mono">${fmt(e.km)}</td><td class="mono">${e.dplus == null ? "-" : fmt(e.dplus) + " m"}</td><td>${e.note || ""}</td></tr>`).join("");

  // Galerie
  const gal = $("galerie");
  gal.innerHTML = (P.photos || []).length
    ? P.photos.map(ph => `<figure><img src="photos/${P.slug}/${ph.fichier}" alt="${ph.legende || ""}" loading="lazy"><figcaption>${ph.legende || ""}</figcaption></figure>`).join("")
    : [1, 2, 3, 4].map(i => `<figure><div class="vide">Photo ${i} à venir</div></figure>`).join("");
  const loupe = $("loupe");
  gal.onclick = e => { if (e.target.tagName === "IMG") { loupe.querySelector("img").src = e.target.src; loupe.style.display = "grid"; } };
  loupe.onclick = () => loupe.style.display = "none";

  // Crédits
  $("credits").innerHTML = `<b>Parcours tracé et roulé par ${P.auteur || "Kévin"}${P.date_trace ? " en " + P.date_trace : ""}.</b> ${P.date_maj ? "Mise à jour : " + P.date_maj + ". " : ""}Un chemin fermé, un point d'eau à sec ? Écris-moi pour que je corrige la trace. ${P.origine_trace || ""}`;

  carteProfilFeuille(P);
}

// --- Carte, filtres, profil et feuille de route, synchronisés ---
function carteProfilFeuille(P) {
  const pts = P.trace; // [lat, lon, altitude, km]
  const ll = pts.map(p => [p[0], p[1]]);
  const carte = L.map("carte", { scrollWheelZoom: false });
  fondsDeCarte(carte);
  L.polyline(ll, { color: "#fff", weight: 8, opacity: .8 }).addTo(carte);
  const ligne = L.polyline(ll, { color: "#e4572e", weight: 4 }).addTo(carte);
  carte.fitBounds(ligne.getBounds(), { padding: [24, 24] });
  const pastille = (c, t) => L.divIcon({ className: "", iconSize: [24, 24], iconAnchor: [12, 12], html: `<div class="marqueur" style="background:${c}">${icone(t)}</div>` });
  L.marker(ll[0], { icon: pastille("#1c2420", "depart") }).bindPopup("<b>Départ</b>").addTo(carte);
  L.marker(ll[ll.length - 1], { icon: pastille("#1c2420", "depart") }).bindPopup("<b>Arrivée</b>").addTo(carte);
  const curseur = L.circleMarker(ll[0], { radius: 7, color: "#fff", weight: 2, fillColor: "#e4572e", fillOpacity: 1 });

  // Marqueurs par type
  const groupes = {}, marqueurs = [];
  for (const p of P.pois) {
    groupes[p.type] = groupes[p.type] || L.layerGroup().addTo(carte);
    const niv = p.type === "mont" && p.niveau ? ` · ${NOM_NIVEAU[p.niveau]}` : "";
    const m = L.marker([p.lat, p.lon], { icon: pastille(couleur(p), p.type) })
      .bindPopup(`<b>${p.nom}</b><span class="km">km ${p.km.toFixed(1)}${niv}</span><br>${p.info || ""}`);
    groupes[p.type].addLayer(m);
    marqueurs.push(m);
  }

  // Filtres (légende cliquable)
  const filtres = $("filtres");
  for (const t of Object.keys(TYPES)) {
    const n = P.pois.filter(p => p.type === t).length;
    if (!n) continue;
    const b = document.createElement("button");
    b.className = "filtre"; b.setAttribute("aria-pressed", "true");
    const c = t === "mont" ? "linear-gradient(135deg,#4c9a5f,#e0b422,#ef8a17,#c0262d)" : TYPES[t].coul;
    b.innerHTML = `<span class="pastille" style="background:${c}">${icone(t)}</span>${TYPES[t].nom} <span class="mono">${n}</span>`;
    b.onclick = () => {
      const on = b.getAttribute("aria-pressed") === "true";
      b.setAttribute("aria-pressed", String(!on));
      on ? carte.removeLayer(groupes[t]) : carte.addLayer(groupes[t]);
      document.querySelectorAll(`[data-type="${t}"]`).forEach(el => el.style.display = on ? "none" : "");
    };
    filtres.appendChild(b);
  }

  // Profil altimétrique, avec repères colorés des points d'intérêt
  const W = 1000, H = 160, haut = 10, bas = 4;
  const total = pts[pts.length - 1][3];
  const alts = pts.map(p => p[2]);
  const mini = Math.floor(Math.min(...alts) / 50) * 50, maxi = Math.ceil(Math.max(...alts) / 50) * 50 || mini + 50;
  const X = km => km / total * W, Y = a => haut + (1 - (a - mini) / (maxi - mini)) * (H - haut - bas);
  let d = `M0 ${H}`;
  for (const p of pts) d += `L${X(p[3]).toFixed(1)} ${Y(p[2]).toFixed(1)}`;
  d += `L${W} ${H}Z`;
  const pas = total > 150 ? 50 : total > 60 ? 20 : 10;
  let grad = "", rep = "";
  for (let k = pas; k < total - pas * .4; k += pas) {
    grad += `<line class="axe" x1="${X(k)}" x2="${X(k)}" y1="0" y2="${H}"/>`;
    rep += `<span style="left:${(k / total * 100).toFixed(2)}%">${k} km</span>`;
  }
  const altA = km => { let a = 0, b = pts.length - 1; while (b - a > 1) { const m = (a + b) >> 1; pts[m][3] < km ? a = m : b = m; } return pts[b]; };
  const ticks = P.pois.map(p => `<line data-type="${p.type}" x1="${X(p.km)}" x2="${X(p.km)}" y1="${Y(altA(p.km)[2])}" y2="${Y(altA(p.km)[2]) - 9}" stroke="${couleur(p)}" stroke-width="3" vector-effect="non-scaling-stroke"/>`).join("");
  const svg = $("profil");
  svg.innerHTML = grad + `<path class="aire" d="${d}"/>` + ticks + `<line class="curseur" id="lc" y1="0" y2="${H}" visibility="hidden"/>`;
  $("reperes").innerHTML = rep;
  const lc = $("lc"), info = $("info");
  info.textContent = `alt. ${mini} - ${maxi} m`;
  const survol = x => {
    const r = svg.getBoundingClientRect();
    const p = altA(Math.max(0, Math.min(1, (x - r.left) / r.width)) * total);
    lc.setAttribute("x1", X(p[3])); lc.setAttribute("x2", X(p[3])); lc.setAttribute("visibility", "visible");
    info.textContent = `km ${p[3].toFixed(1)} · ${p[2]} m`;
    curseur.setLatLng([p[0], p[1]]).addTo(carte);
  };
  svg.addEventListener("mousemove", e => survol(e.clientX));
  svg.addEventListener("touchmove", e => survol(e.touches[0].clientX), { passive: true });
  svg.addEventListener("mouseleave", () => { lc.setAttribute("visibility", "hidden"); info.textContent = `alt. ${mini} - ${maxi} m`; curseur.remove(); });

  // Feuille de route : un clic centre la carte sur le point
  $("feuille").innerHTML = P.pois.map((p, i) => `<tr data-i="${i}" data-type="${p.type}">
      <td class="km">${p.km.toFixed(1)}</td>
      <td><span class="type"><span class="rond" style="background:${couleur(p)}"></span>${p.type === "mont" ? NOM_NIVEAU[p.niveau] || "Montée" : (TYPES[p.type] || {}).nom || p.type}</span></td>
      <td>${p.nom}</td><td>${p.info || ""}</td></tr>`).join("");
  $("feuille").onclick = e => {
    const tr = e.target.closest("tr"); if (!tr) return;
    const m = marqueurs[+tr.dataset.i];
    $("carte-titre").scrollIntoView({ behavior: "smooth" });
    carte.setView(m.getLatLng(), 14);
    setTimeout(() => m.openPopup(), 400);
  };

  // GPX trace seule, et GPX avec points d'intérêt (créé dans le navigateur)
  $("gpx").href = "gpx/" + P.slug + ".gpx";
  $("gpx").setAttribute("download", P.slug + ".gpx");
  $("gpx-poi").onclick = () => {
    const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const wpt = P.pois.map(p => `<wpt lat="${p.lat}" lon="${p.lon}"><name>${esc(p.nom)}</name><desc>${esc("km " + p.km.toFixed(1) + " - " + (p.info || ""))}</desc><type>${p.type}</type></wpt>`).join("\n");
    const trk = pts.map(p => `<trkpt lat="${p[0]}" lon="${p[1]}"><ele>${p[2]}</ele></trkpt>`).join("");
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Kévin à vélo" xmlns="http://www.topografix.com/GPX/1/1">\n${wpt}\n<trk><name>${esc(P.nom + " " + (P.nom_gras || ""))}</name><trkseg>${trk}</trkseg></trk>\n</gpx>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([gpx], { type: "application/gpx+xml" }));
    a.download = P.slug + "-avec-poi.gpx"; a.click();
  };
}

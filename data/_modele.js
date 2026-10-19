// ====================================================================
// MODÈLE DE FICHE : pour créer un nouveau parcours.
//
// 1. Fais une copie de ce fichier et nomme-la <nom-du-parcours>.js
//    (minuscules, sans accent, tirets : ex. vosges-2027.js)
// 2. Remplace "nom-du-parcours" ci-dessous par ce même nom (2 fois).
// 3. Remplis les textes. Un champ que tu ne connais pas encore peut
//    rester "" (vide) ou null (sans guillemets).
// 4. Ajoute "nom-du-parcours" dans data/liste.js.
// 5. Génère la trace avec gpx2trace.py et dépose-la dans data/traces/.
//
// Ce modèle n'apparaît pas sur le site (il n'est pas dans liste.js).
// Les lignes qui commencent par // sont des explications : tu peux les
// garder ou les supprimer dans ta copie.
// ====================================================================
window.PARCOURS = window.PARCOURS || {};
window.PARCOURS["nom-du-parcours"] = {
  "slug": "nom-du-parcours",           // identique au nom du fichier, sans .js

  // --- Titre et classement ---
  "nom": "Nom du parcours",            // partie du titre en blanc
  "nom_gras": "en 3 jours",            // partie du titre en orange (peut être "")
  "activite": "velo",                  // "velo" ou "rando"
  "format": "plusieurs-jours",         // "journee" ou "plusieurs-jours"
  "jours": "3",                        // nombre de jours, entre guillemets
  "lieu": ["France", "Région"],        // étiquettes de lieu (autant que tu veux)

  // --- Présentation ---
  "chapeau": "Résumé de 3 à 4 lignes qui donne envie.",
  "photo_principale": "01-photo.jpg",  // photo de couverture (ou null si pas encore de photo)
  "photos": [                          // photos rangées dans photos/nom-du-parcours/
    { "fichier": "01-photo.jpg", "legende": "Légende de la photo." },
    { "fichier": "02-photo.jpg", "legende": "Une autre légende." }
  ],

  // --- Barre de chiffres (distance et D+ sont calculés tout seuls) ---
  // VÉLO seulement :
  "velo": "Gravel",                    // vélo conseillé
  "pct_hors_bitume": null,             // nombre sans guillemets, ex. 60 (ou null)
  "pct_singletrack": null,             // idem
  // RANDONNÉE seulement (inutile pour un parcours vélo, tu peux supprimer ces lignes) :
  "temps_marche": "",                  // ex. "5 à 7 h par jour" (barre de chiffres)
  "balisage": "",                      // encart « Sentiers et balisage » (GR, couleurs, hors sentier...)
  "materiel": "",                      // encart « Équipement » (chaussures, bâtons, crampons...)

  // --- L'essentiel ---
  // En randonnée, "terrain_machine" s'affiche sous le titre « Terrain et
  // passages délicats » et "hebergement" sous « Refuges et nuits ».
  "points_forts": [                    // liste à puces
    "Premier point fort.",
    "Deuxième point fort."
  ],
  "a_savoir": [
    "Ce qu'il faut absolument savoir avant de partir."
  ],
  "terrain_machine": "Revêtement, vélo, pneus conseillés.",
  "ravitaillement": "Où trouver de l'eau et à manger.",
  "hebergement": "Où dormir.",
  "saison": "Meilleure période.",
  "acces": "Comment venir et repartir (train, voiture).",
  "infos_complementaires": "Tout le reste.",

  // --- Étapes : une ligne { ... } par jour, séparées par des virgules ---
  // "ressenti" : ce que tu as vécu ce jour-là (météo, humeur, un moment).
  // Il s'affiche en fin de page, dans « Le carnet du jour », écrit à la main.
  // Laisse "" si tu n'as rien à dire : la page de ce jour n'apparaît pas.
  // En randonnée, tu peux ajouter "duree": "6 h" dans une étape :
  // une colonne « Temps » apparaît alors dans le tableau.
  "etapes": [
    { "jour": "Jour 1", "de": "Ville A", "a": "Ville B", "km": 60, "dplus": 800, "note": "Commentaire.",
      "ressenti": "Départ sous la pluie, les jambes lourdes. Le soleil revient au col et tout s'éclaire." },
    { "jour": "Jour 2", "de": "Ville B", "a": "Ville C", "km": 55, "dplus": 600, "note": "", "ressenti": "" }
  ],

  // --- Points d'intérêt sur la carte (peut rester vide : []) ---
  // type possible : eau, ravito, resto, bivouac, gare, vue, velo, mont, pave
  // km : position sur la trace (lis-la en survolant le profil du site)
  // lat / lon : coordonnées (clic droit sur Google Maps)
  "pois": [
    { "type": "eau", "nom": "Fontaine", "km": 12.5, "lat": 45.0, "lon": 4.5, "info": "Eau potable" }
  ],
  // Points trouvés automatiquement (data/pois/) à NE PAS afficher :
  // recopie ici leur code "osm" (visible dans data/pois/<nom>.js), ex. "node/123456"
  "pois_exclus": [],

  // --- Crédits en bas de page ---
  "auteur": "Kévin",
  "date_trace": "mai 2027",
  "date_maj": "mai 2027",
  "origine_trace": "Trace enregistrée par Kévin."
};

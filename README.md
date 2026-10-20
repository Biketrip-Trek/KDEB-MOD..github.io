# Carnet de traces - mode d'emploi du site

Ce site est un site **statique** : de simples fichiers (pages, styles, photos, traces), sans base de données ni serveur à gérer. Il est hébergé gratuitement par GitHub Pages. Chaque fichier envoyé sur GitHub est en ligne en 1 à 2 minutes.

Ce fichier README s'affiche sous la liste des fichiers du dépôt, sur GitHub. Il n'apparaît pas sur le site.

---

## 1. Plan du site : à quoi sert chaque fichier

```
index.html            Page d'accueil (structure : bandeau, carte, rubriques)
parcours.html         Modèle de page commun à TOUS les parcours
nord.html             Page « Traces du Nord » (boucles près de chez moi)
README.md             Ce mode d'emploi

assets/               "Moteur" et apparence du site
  style.css           Couleurs, polices, tailles, mise en page
  entete.js           Nom du site, menu, outils communs (fond de carte...)
  accueil.js          Construit la page d'accueil
  nord.js             Construit la page Traces du Nord
  parcours.js         Construit la page d'un parcours
  leaflet/            Bibliothèque de cartes (ne pas modifier)

data/                 Contenu des parcours
  liste.js            Liste des voyages affichés (liste-nord.js : Traces du Nord)
  _modele.js          Modèle commenté pour créer une nouvelle fiche
  <nom>.js            TEXTES d'un parcours (c'est toi qui les modifies)
  traces/<nom>.js     TRACE d'un parcours (générée par l'Atelier, ne pas modifier)
  pois/<nom>.js       POINTS D'INTÉRÊT automatiques (générés par le robot POI, facultatif)
  pois/etat.js        Avancement du robot POI, fiche par fiche (généré)
  pois/_cache/        Tranches déjà obtenues par le robot, en attente de la fin (généré)

outils/pois_auto.py   Le robot POI (lancé par GitHub, voir section 3)
.github/workflows/    Réglage du lancement automatique du robot POI

gpx/<nom>.gpx         Trace téléchargeable de chaque parcours
photos/<nom>/         Photos de chaque parcours (format .jpg)
```

Un parcours est toujours désigné par **un nom court, sans accent ni espace**, par exemple `dolce-via`. On retrouve ce même nom à 5 endroits : dans `data/liste.js`, `data/dolce-via.js` (textes), `data/traces/dolce-via.js` (trace), `gpx/dolce-via.gpx` et le dossier `photos/dolce-via/`.

**Principe : chaque information n'existe qu'à un seul endroit.** Les textes ne sont que dans `data/<nom>.js`, et c'est toi qui les modifies. La trace n'est que dans `data/traces/<nom>.js`, générée par l'Atelier. Regénérer une trace ne touche jamais à tes textes.

La page d'un parcours a pour adresse `parcours.html?p=dolce-via`.

---

## 2. Modifier un fichier sur GitHub (méthode de base)

1. Ouvre le fichier dans le dépôt, puis clique sur le **crayon** (Edit this file).
2. Fais ta modification.
3. Clique sur **Commit changes**, puis encore sur **Commit changes** dans la fenêtre qui s'ouvre.
4. Attends 1 à 2 minutes, puis recharge le site (Ctrl+F5).

Pour **annuler** une modification, ouvre le fichier, clique sur **History**, choisis la version d'avant et recopie son contenu.

---

## 3. Modifier les textes d'un parcours

Ouvre `data/<nom>.js`. Chaque information est sur sa propre ligne, sous la forme `"champ": "texte",`. Le fichier `data/_modele.js` explique chaque champ en commentaire.

| Champ | Ce que c'est | Où ça s'affiche |
|---|---|---|
| `nom` / `nom_gras` | Titre (la partie `nom_gras` est en orange) | Bandeau, vignette |
| `activite` | `velo` ou `rando` | Rubrique de l'accueil |
| `format` | `journee` ou `plusieurs-jours` | Rubrique de l'accueil |
| `jours` | Nombre de jours | Barre de chiffres |
| `lieu` | Liste des étiquettes de lieu | Bandeau, vignette |
| `chapeau` | Résumé de 4 lignes | Sous le titre |
| `photo_principale` | Nom de la photo de couverture | Bandeau, vignette |
| `photos` | Photos et leurs légendes | Galerie |
| `velo` | Vélo conseillé (vélo seulement) | Barre de chiffres |
| `pct_hors_bitume` | Pourcentage de piste (un nombre, sans guillemets, ou `null`) (vélo seulement) | Barre de chiffres |
| `temps_marche` | Temps de marche (randonnée seulement) | Barre de chiffres |
| `balisage`, `materiel` | Sentiers et balisage, équipement (randonnée seulement) | L'essentiel |
| `points_forts`, `a_savoir` | Listes à puces | L'essentiel |
| `terrain_machine`, `ravitaillement`, `hebergement`, `saison`, `acces`, `infos_complementaires` | Textes libres | L'essentiel |
| `etapes` | Une ligne par jour (`duree` en randonnée = colonne Temps) | Tableau des étapes |
| `ressenti` (dans chaque étape) | Ce que tu as ressenti ce jour-là, en quelques phrases | Le carnet du jour |
| `pois` | Points d'intérêt ajoutés à la main (eau, gare, vue...) | Carte, feuille de route |
| `pois_auto`, `pois_rayon_m` | Points d'intérêt automatiques oui / non, et zone en mètres (robot POI) | Carte, feuille de route |
| `pois_exclus` | Codes OpenStreetMap des points automatiques à masquer | - |
| `auteur`, `date_trace`, `date_maj`, `origine_trace` | Crédits | Bas de page |
| Distance, D+, trace | Calculés depuis le GPX | Dans `data/traces/<nom>.js`, ne pas modifier |

### Les 4 règles pour ne rien casser

1. Ne modifie **que le texte entre les guillemets** `"..."`.
2. Garde les guillemets `"`, les virgules `,` en fin de ligne, les crochets `[ ]` et les accolades `{ }`.
3. Dans un texte, n'utilise pas de guillemets droits `"`. Prends les guillemets français `« »`. Les apostrophes `'` et les accents ne posent aucun problème.
4. Ne modifie pas les fichiers de `data/traces/` : ils sont générés par Python.

**En cas d'erreur**, le site affiche un bandeau rouge en bas de l'écran qui dit quel fichier pose problème. En ligne, il donne aussi le numéro de ligne : regarde cette ligne et celle juste au-dessus. Il manque presque toujours une virgule ou un guillemet. Tu peux aussi annuler la modification via **History**.

### Exemples

Changer une légende :
```
"legende": "Arrivée au col sous la neige."
```

Ajouter un point fort à une liste (chaque élément entre guillemets, séparé par une virgule) :
```
"points_forts": [
  "Premier point fort.",
  "Nouveau point fort."
],
```

Ajouter un point d'intérêt (type possible : `eau`, `ravito`, `resto`, `bivouac`, `gare`, `vue`, `velo`, `mont`, `pave`). La latitude et la longitude se copient depuis Google Maps (clic droit sur le lieu, puis clic sur les coordonnées). Le `km` est la position sur la trace : survole le profil de la page pour le lire.
```
"pois": [
  {
    "type": "eau",
    "nom": "Fontaine du village",
    "km": 42.5,
    "lat": 44.9061,
    "lon": 4.4236,
    "info": "Eau potable toute l'année"
  }
],
```
Pour plusieurs points, sépare les blocs `{ ... }` par une virgule.

### Points d'intérêt automatiques (OpenStreetMap) : le robot POI

Le robot POI cherche dans OpenStreetMap ce qui se trouve autour de la trace : points d'eau, boulangeries, épiceries et supermarchés, bars, cafés et restaurants, campings, hôtels, refuges et abris, gares, points de vue, magasins et bornes vélo. Il tourne tout seul sur les serveurs de GitHub : rien à installer ni à lancer.

1. **Le choix se fait dans l'Atelier**, étape 1 « La trace » : case « Ajouter les points d'intérêt sur la carte » et zone autour de la trace (250 m à 5 km ; proposé : 3 km à vélo, 1 km à pied). Dans la fiche, cela donne :
```
"pois_auto": true,
"pois_rayon_m": 3000,
```
2. **À chaque publication**, le robot lit ce réglage et crée `data/pois/<nom>.js`. Il refait les points si la zone ou la trace change, et les retire si `"pois_auto"` passe à `false`. Les fiches sans ce réglage (anciennes fiches) et les fichiers faits à la main avec `gpx2pois.py` ne sont jamais touchés.
3. **Délai** : environ 1 minute par tranche de 25 km de trace, plus 1 minute de mise en ligne (5 à 7 minutes pour 150 km) quand OpenStreetMap répond bien ; plusieurs heures pour de longues traces quand il est saturé. Quand les serveurs gratuits d'OpenStreetMap sont saturés, le robot s'arrête au bout de 25 minutes, garde ce qu'il a obtenu, patiente 10 minutes et se relance tout seul jusqu'à avoir fini. En attendant, la page du parcours affiche « Points d'intérêt en cours de recherche ».
4. **Pour masquer un point faux ou inutile**, ne modifie pas le fichier généré. Copie son code `"osm"` (ex. `"node/123456"`) dans `"pois_exclus"` de `data/<nom>.js` :
```
"pois_exclus": ["node/123456", "way/7890"]
```
5. Les points ajoutés à la main dans `"pois"` restent affichés en plus des points automatiques.
6. **Suivre le robot** : onglet **Actions** du dépôt, « Robot POI ». Chaque passage liste ses tranches et les réponses des serveurs (annotations). Bouton **Run workflow** pour le relancer à la main.

Ce qui est cherché se règle en haut de `outils/pois_auto.py` (`RECHERCHES`). Les données OpenStreetMap ne sont pas toujours complètes ni à jour, surtout pour les points d'eau et les horaires : vérifie les points importants. Le classement suit OpenStreetMap (un gîte d'étape peut y être déclaré « chambre d'hôtes »).

---

## 4. Ajouter ou changer des photos

1. Réduis les photos à environ 1 600 px de large, au format **.jpg**, pour qu'elles se chargent vite.
2. Donne-leur des noms simples, sans espace ni accent : `01-col.jpg`, `02-lac.jpg`...
3. Dans le dépôt, ouvre `photos/<nom>/`, puis **Add file > Upload files** et glisse les photos.
4. Dans `data/<nom>.js`, ajoute un bloc dans `"photos"` :
```
{
  "fichier": "02-lac.jpg",
  "legende": "Pause au bord du lac."
}
```
La **première** photo de la liste s'affiche en grand dans la galerie. La photo de couverture se choisit avec `"photo_principale"`.

---

## 5. Ajouter un nouveau parcours

**Méthode habituelle : l'Atelier de parcours + Claude.**
1. Ouvre l'Atelier dans Safari ou Chrome (l'appli Claude n'ouvre pas le choix de fichiers). Pour repartir d'une page blanche : **Nouvelle publication**, en haut.
2. Dépose la trace : un GPX par jour, ou un KML / KMZ. Les jours sont rangés selon « J1, J2, Jour 3, Étape 2... » écrit dans le nom des fichiers (Komoot commence les noms par une date de création, qui n'est pas l'ordre des jours), sinon par nom ; boutons **Monter / Descendre** pour corriger. Si l'Atelier signale une « coupure », vérifie d'abord l'ordre des jours.
3. Remplis la fiche (photos, textes, étapes, carnet du jour, points d'intérêt), puis **Envoyer pour publication**.
4. Écris « publie » à Claude dans la conversation : il vérifie la fiche, l'ajoute à la liste, met le site à jour et le contrôle en ligne. Le robot POI suit tout seul.

**Secours** : dans l'Atelier, « Télécharger le zip », puis sur GitHub **Add file > Upload files** avec tout le contenu du dossier dézippé.

**Anciens outils du PC** (`publier.py`, `gpx2trace.py`, `gpx2pois.py`, `traces_nord.py`) : ils fonctionnent encore, mais l'Atelier les remplace. Une fiche modifiée sur GitHub serait écrasée si on la republie avec `publier.py`.

**Trace coupée** : quand deux points qui se suivent sont à plus de 1 km l'un de l'autre (deux GPX qui ne se raccordent pas : navette, enregistrement arrêté), le site ne les relie pas par un trait droit et ce saut ne compte ni en km ni en D+.

Pour **masquer** un parcours sans le supprimer, retire simplement sa ligne de `data/liste.js`.

---

## 6. Personnaliser le site

| Je veux changer... | Fichier | Où |
|---|---|---|
| Le nom du site (logo) | `assets/entete.js` | `const NOM_DU_SITE = "..."` |
| Le titre de l'onglet de l'accueil | `index.html` | Ligne `<title>` |
| Le grand titre et l'accroche de l'accueil | `index.html` | Lignes `<h1>` et `<p class="chapeau">` |
| Les catégories du menu | `assets/entete.js` | Bloc `const MENU = [...]` |
| Les liens du pied de page (Instagram, contact) | `assets/entete.js` | `PIED_DE_PAGE` : remplace les `#` (un lien resté à `#` n'est pas affiché) |
| Les couleurs du site | `assets/style.css` | Bloc `:root` tout en haut |
| *(après toute modification de `style.css` ou d'un `.js` de `assets`)* | `index.html`, `parcours.html` **et** `nord.html` | Change le numéro `?v=...` des liens (ex. la date du jour) pour que les visiteurs voient tout de suite la nouvelle version |
| La couleur des traces vélo / rando sur l'accueil | `assets/accueil.js` | `COULEUR_ACTIVITE` |
| Le fond de carte par défaut | `assets/entete.js` | Fonction `fondsDeCarte` |
| L'ordre des sections d'une page parcours | `parcours.html` | Déplace les blocs entre deux `<h2 class="section">` |
| Les encarts de « L'essentiel » | `assets/parcours.js` | Tableau `encarts` |
| Les types de points d'intérêt et leurs couleurs | `assets/parcours.js` | `TYPES` |

---

## 7. Bon à savoir

- **Le fond Esri Topo** utilise un service gratuit sans clé, qu'Esri peut arrêter un jour. Dans ce cas, le site bascule tout seul sur OpenTopoMap.
- **Le site est public**, comme le dépôt GitHub. Pense à la vie privée : pas de trace qui commence devant un domicile, pas de photo d'une personne qui ne serait pas d'accord.
- **Après une modification**, si l'ancienne version reste affichée, fais Ctrl+F5 ou ouvre une fenêtre de navigation privée.
- **Ce que le site n'affiche pas** : une rubrique vide, une mention « [À compléter] ... » ou « à compléter » (elles restent dans la fiche comme rappel, mais le visiteur ne les voit pas), une galerie sans photo, une colonne « Notes » vide dans les étapes, un lien du pied de page laissé à `#`.
- **La galerie** s'adapte au nombre de photos : 2 côte à côte, 3 ou 4 avec la première en grand à gauche, 5 avec la première en grand au centre, 6 et plus en grille régulière.
- **Pour tester les pages sur ton PC sans les mettre en ligne**, télécharge le dépôt (bouton vert **Code > Download ZIP**), dézippe-le et double-clique sur `index.html`.

---

## Traces du Nord (fiches courtes)

Page `nord.html` : les traces autour de chez moi, à la journée ou sur 2-3 jours (trek, bike trip), avec une carte commune, des filtres (pratique, durée, distance) et des fiches courtes.

- Liste des traces : `data/liste-nord.js` (un nom par ligne).
- Fiche courte `data/<nom>.js` avec `"format": "locale"` : `nom`, `nom_gras`, `pratique` (`route`, `gravel`, `vtt` ou `marche`), `jours` (`"1"` = à la journée, `"2"` ou `"3"` = plusieurs jours, avec alors un tableau `etapes`), `depart`, `chapeau` (2 ou 3 lignes), 1 ou 2 `photos`, `incontournables` (nom, km, lat, lon, info).
- Les incontournables s'affichent sur la carte, sur le profil et dans la liste « Les incontournables ».
- Nom de la section, couleurs des pratiques : `SECTION_NORD` et `PRATIQUES` dans `assets/entete.js`.

Ajouter des traces :
- **plusieurs d'un coup** : GPX dans le dossier `nord\` des outils (une sortie de 2-3 jours = un sous-dossier avec un GPX par jour), puis `python traces_nord.py --depart "Nieppe"` ; tout le contenu de `a_deposer\` va sur GitHub ;
- **une seule** : l'Atelier de parcours, choix « Trace du Nord » (méthode habituelle).

Dans les deux cas, le départ et l'arrivée sont masqués sur 600 m (ton adresse n'apparaît ni sur la carte ni dans le GPX).

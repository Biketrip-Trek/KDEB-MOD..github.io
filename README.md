# Kévin à vélo - mode d'emploi du site

Ce site est un site **statique** : de simples fichiers (pages, styles, photos, traces), sans base de données ni serveur à gérer. Il est hébergé gratuitement par GitHub Pages. Chaque fichier envoyé sur GitHub est en ligne en 1 à 2 minutes.

Ce fichier README s'affiche sous la liste des fichiers du dépôt, sur GitHub. Il n'apparaît pas sur le site.

---

## 1. Plan du site : à quoi sert chaque fichier

```
index.html            Page d'accueil (structure : bandeau, carte, rubriques)
parcours.html         Modèle de page commun à TOUS les parcours
README.md             Ce mode d'emploi

assets/               "Moteur" et apparence du site
  style.css           Couleurs, polices, tailles, mise en page
  entete.js           Nom du site, menu, outils communs (fond de carte...)
  accueil.js          Construit la page d'accueil
  parcours.js         Construit la page d'un parcours
  leaflet/            Bibliothèque de cartes (ne pas modifier)

data/                 Contenu des parcours
  liste.js            Liste des parcours affichés
  _modele.js          Modèle commenté pour créer une nouvelle fiche
  <nom>.js            TEXTES d'un parcours (c'est toi qui les modifies)
  traces/<nom>.js     TRACE d'un parcours (générée par gpx2trace.py, ne pas modifier)

gpx/<nom>.gpx         Trace téléchargeable de chaque parcours
photos/<nom>/         Photos de chaque parcours (format .jpg)
```

Un parcours est toujours désigné par **un nom court, sans accent ni espace**, par exemple `dolce-via`. On retrouve ce même nom à 5 endroits : dans `data/liste.js`, `data/dolce-via.js` (textes), `data/traces/dolce-via.js` (trace), `gpx/dolce-via.gpx` et le dossier `photos/dolce-via/`.

**Principe : chaque information n'existe qu'à un seul endroit.** Les textes ne sont que dans `data/<nom>.js`, et c'est toi qui les modifies. La trace n'est que dans `data/traces/<nom>.js`, générée par Python. Regénérer une trace ne touche jamais à tes textes.

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
| `velo` | Vélo conseillé | Barre de chiffres |
| `pct_hors_bitume` | Pourcentage de piste (un nombre, sans guillemets, ou `null`) | Barre de chiffres |
| `difficulte` | Notes sur 10 (nombres sans guillemets, ou `null`) | Section Difficulté |
| `points_forts`, `a_savoir` | Listes à puces | L'essentiel |
| `terrain_machine`, `ravitaillement`, `hebergement`, `saison`, `acces`, `infos_complementaires` | Textes libres | L'essentiel |
| `etapes` | Une ligne par jour | Tableau des étapes |
| `pois` | Points d'intérêt (eau, gare, vue...) | Carte, feuille de route |
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

Ajouter un point d'intérêt (type possible : `eau`, `ravito`, `bivouac`, `gare`, `vue`, `velo`, `mont`, `pave`). La latitude et la longitude se copient depuis Google Maps (clic droit sur le lieu, puis clic sur les coordonnées). Le `km` est la position sur la trace : survole le profil de la page pour le lire.
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

Choisis d'abord le nom court du parcours, par exemple `vosges-2027`.

1. **La trace.** Sur ton PC, dans le dossier des outils, lance `python gpx2trace.py ma-trace.gpx vosges-2027`. Si ta trace est un KML ou un KMZ, convertis-la d'abord avec `kml2gpx.py`. Le script crée `traces\vosges-2027.js` : dépose-le dans `data/traces/`. Dépose aussi le GPX dans `gpx/`, renommé `vosges-2027.gpx`.
2. **Les textes.** Dans `data/`, copie `_modele.js` sous le nom `vosges-2027.js` et remplis-le. Sur GitHub : ouvre `_modele.js`, copie tout son contenu, puis **Add file > Create new file**.
3. **Les photos.** Dépose-les dans `photos/vosges-2027/`.
4. **La liste.** Ajoute la ligne `"vosges-2027",` dans `data/liste.js`.

Tu peux aussi envoyer à Claude le GPX, les photos et quelques lignes de texte : il te renverra les fichiers prêts à déposer.

Pour **masquer** un parcours sans le supprimer, retire simplement sa ligne de `data/liste.js`.

---

## 6. Personnaliser le site

| Je veux changer... | Fichier | Où |
|---|---|---|
| Le nom du site (logo) | `assets/entete.js` | `const NOM_DU_SITE = "..."` |
| Le titre de l'onglet de l'accueil | `index.html` | Ligne `<title>` |
| Le grand titre et l'accroche de l'accueil | `index.html` | Lignes `<h1>` et `<p class="chapeau">` |
| Les catégories du menu | `assets/entete.js` | Bloc `const MENU = [...]` |
| Les liens du pied de page (Instagram, contact) | `assets/entete.js` | `PIED_DE_PAGE` : remplace les `#` |
| Les couleurs du site | `assets/style.css` | Bloc `:root` tout en haut |
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
- **Pour tester les pages sur ton PC sans les mettre en ligne**, télécharge le dépôt (bouton vert **Code > Download ZIP**), dézippe-le et double-clique sur `index.html`.

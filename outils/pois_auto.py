# =====================================================================
# OUTIL : outils/pois_auto.py
# RÔLE  : le « robot POI ». Lancé automatiquement par GitHub (voir
#         .github/workflows/pois.yml) à chaque mise à jour du site.
#         Même recherche que gpx2pois.py (OpenStreetMap, service Overpass),
#         mais réglée fiche par fiche, depuis l'Atelier :
#
#   Dans data/<nom>.js :
#     "pois_auto": true      > le robot crée data/pois/<nom>.js
#     "pois_rayon_m": 3000   > zone autour de la trace, en mètres
#     "pois_auto": false     > le robot retire les POI générés
#     champ absent           > le robot ne touche à rien (anciennes fiches)
#
#   Il refait les POI seulement si c'est utile : nouvelle fiche, zone
#   changée ou trace GPX changée. Sinon il ne fait rien (pas de requête).
#
# UTILISATION À LA MAIN (facultatif, depuis la racine du dépôt) :
#     python outils/pois_auto.py            > traite toutes les fiches
#     python outils/pois_auto.py --essai    > dit ce qu'il ferait, sans rien faire
#
# Données © contributeurs OpenStreetMap (licence ODbL), mention déjà
# présente en bas des cartes du site.
# =====================================================================

import re, math, json, sys, os, time, hashlib, shutil
import urllib.request, urllib.parse, urllib.error

# ---------------------------------------------------------------------
# RÉGLAGES (mêmes valeurs que gpx2pois.py)
# ---------------------------------------------------------------------
RAYON_MIN, RAYON_MAX = 100, 10000   # zone acceptée, en mètres
COUPURE_M = 1000                    # saut entre deux points au-delà duquel la trace est coupée (comme le site)
MORCEAU_KM = 25                     # longueur des morceaux interrogés un par un
PAUSE_S = 3                         # pause entre deux requêtes (service gratuit)
ATTENTES_S = [15, 45]               # serveurs saturés : on attend 15 s, puis 45 s, avant de réessayer
DELAI_REQUETE_S = 90                # attente maximale d'une réponse (avant : 240 s)
BUDGET_S = 12 * 60                  # durée maximale du robot : au-delà il s'arrête sans rien écrire de faux
DEBUT = time.time()
SERVEURS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]
# ("clé", "valeur", "type du site", "nom par défaut") : copie de gpx2pois.py
RECHERCHES = [
    ("amenity", "drinking_water",         "eau",     "Point d'eau potable"),
    ("amenity", "water_point",            "eau",     "Point d'eau"),
    ("shop",    "supermarket",            "ravito",  "Supermarché"),
    ("shop",    "convenience",            "ravito",  "Épicerie"),
    ("shop",    "bakery",                 "ravito",  "Boulangerie"),
    ("amenity", "restaurant",             "resto",   "Restaurant"),
    ("amenity", "bar",                    "resto",   "Bar"),
    ("amenity", "pub",                    "resto",   "Bar"),
    ("amenity", "cafe",                   "resto",   "Café"),
    ("tourism", "camp_site",              "bivouac", "Camping"),
    ("tourism", "wilderness_hut",         "bivouac", "Cabane"),
    ("tourism", "alpine_hut",             "bivouac", "Refuge"),
    ("amenity", "shelter",                "bivouac", "Abri"),
    ("tourism", "hotel",                  "bivouac", "Hôtel"),
    ("tourism", "guest_house",            "bivouac", "Chambre d'hôtes"),
    ("tourism", "hostel",                 "bivouac", "Auberge de jeunesse"),
    ("railway", "station",                "gare",    "Gare"),
    ("railway", "halt",                   "gare",    "Halte ferroviaire"),
    ("tourism", "viewpoint",              "vue",     "Point de vue"),
    ("shop",    "bicycle",                "velo",    "Magasin vélo"),
    ("amenity", "bicycle_repair_station", "velo",    "Borne de réparation vélo"),
]
# Version du robot : la changer fait refaire tous les POI automatiques
# (v2 : réponses vides ou incomplètes d'Overpass détectées et redemandées)
VERSION_ROBOT = 2
SIGNATURE_RECHERCHES = hashlib.md5((str(RECHERCHES) + f"v{VERSION_ROBOT}").encode()).hexdigest()[:6]
ESSAI = "--essai" in sys.argv


def distance_m(a, b):
    """Distance en mètres entre deux points (latitude, longitude)."""
    lat1, lat2 = math.radians(a[0]), math.radians(b[0])
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(math.radians(b[1] - a[1]) / 2) ** 2
    return 12742000 * math.asin(math.sqrt(h))


# ---------------------------------------------------------------------
# 1. Lecture des fiches et des listes du site
# ---------------------------------------------------------------------
def slugs_du_site():
    noms = []
    for f in ["data/liste.js", "data/liste-nord.js"]:
        if os.path.exists(f):
            texte = re.sub(r"//.*", "", open(f, encoding="utf-8").read())   # sans les commentaires
            noms += re.findall(r'"([a-z0-9-]+)"', texte)
    return list(dict.fromkeys(noms))

def lire_fiche(nom):
    """Renvoie le dictionnaire de data/<nom>.js, ou None s'il est illisible."""
    texte = open(f"data/{nom}.js", encoding="utf-8").read()
    m = re.search(r'window\.PARCOURS\[\s*"' + re.escape(nom) + r'"\s*\]\s*=\s*', texte)
    if not m:
        return None
    try:
        return json.loads(texte[m.end():texte.rindex(";")])
    except ValueError:
        return None

def entete_pois(nom):
    """Lit la ligne « // auto : ... » d'un fichier de POI déjà généré par ce robot."""
    f = f"data/pois/{nom}.js"
    if not os.path.exists(f):
        return None
    m = re.search(r"// auto : rayon=(\d+) trace=(\w+) recherches=(\w+)", open(f, encoding="utf-8").read(2000))
    return {"rayon": int(m.group(1)), "trace": m.group(2), "recherches": m.group(3)} if m else {"manuel": True}


# ---------------------------------------------------------------------
# 2. Recherche OpenStreetMap pour une trace (logique de gpx2pois.py)
# ---------------------------------------------------------------------
def interroger(question):
    """Envoie la question aux serveurs Overpass.
    Attention : un serveur saturé peut répondre « 200 OK » avec une liste VIDE et
    une simple remarque d'erreur (délai dépassé, mémoire). Une telle réponse est
    traitée comme un échec : on essaie le serveur suivant. Une réponse vide sans
    remarque est vérifiée auprès d'un deuxième serveur avant d'être acceptée."""
    donnees = urllib.parse.urlencode({"data": question}).encode()
    vides = 0
    for attente in [0] + ATTENTES_S:
        if attente:
            print(f"    pause de {attente} s avant de réessayer...")
            time.sleep(attente)
        for serveur in SERVEURS:
            nom_serveur = serveur.split("/")[2]
            try:
                req = urllib.request.Request(serveur, data=donnees, headers={"User-Agent": "carnet-de-traces/1.0 (site perso)"})
                if time.time() - DEBUT > BUDGET_S:
                    raise RuntimeError(f"temps maximal de {BUDGET_S // 60} min dépassé, POI non mis à jour (relancer plus tard)")
                with urllib.request.urlopen(req, timeout=DELAI_REQUETE_S) as r:
                    rep = json.loads(r.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                print(f"::warning title={nom_serveur}::erreur HTTP {e.code} ({int(time.time() - DEBUT)} s)", flush=True); continue
            except RuntimeError:
                raise
            except Exception as e:
                print(f"::warning title={nom_serveur}::ne répond pas : {type(e).__name__} {str(e)[:80]} ({int(time.time() - DEBUT)} s)", flush=True); continue
            remarque = rep.get("remark", "")
            if "error" in remarque.lower():
                print(f"::warning title={nom_serveur}::réponse incomplète : {remarque[:100]} ({int(time.time() - DEBUT)} s)", flush=True); continue
            elements = rep.get("elements", [])
            if elements:
                print(f"::notice title=Overpass::{nom_serveur} : {len(elements)} éléments ({int(time.time() - DEBUT)} s)", flush=True)
                return elements
            vides += 1
            print(f"    {nom_serveur} : aucune réponse utile ({vides})")
            if vides >= 2:
                return []          # deux serveurs confirment : il n'y a vraiment rien
    raise RuntimeError("aucun serveur Overpass n'a donné de réponse complète")

def generer(nom, rayon):
    texte = open(f"gpx/{nom}.gpx", encoding="utf-8").read()
    points = [(float(a), float(b)) for a, b in re.findall(r'<trkpt\s+lat="([\d.-]+)"\s+lon="([\d.-]+)"', texte)]
    if len(points) < 2:
        raise RuntimeError("aucun point dans le GPX")
    # Distance cumulée, comme sur le site : un saut de plus de COUPURE_M entre deux
    # points (deux GPX qui ne se raccordent pas) n'ajoute pas de km
    cumul, coupure = [0.0], set()
    for i in range(1, len(points)):
        d = distance_m(points[i - 1], points[i])
        if d > COUPURE_M:
            coupure.add(i)
        cumul.append(cumul[-1] + (0 if d > COUPURE_M else d))

    # Un point de requête tous les 250 m (plus espacé pour une grande zone : jusqu'à 1 km).
    # Morceaux de ~25 km ; une coupure ferme le morceau en cours, pour ne pas
    # chercher de POI le long d'une ligne droite entre deux GPX.
    pas = max(250, min(1000, rayon / 2))     # 1 km de zone > un point tous les 500 m
    morceaux, courant, dernier, debut = [], [], -1e9, 0.0
    for i, p in enumerate(points):
        if i in coupure:
            if len(courant) > 1: morceaux.append(courant)
            courant, dernier, debut = [], -1e9, cumul[i]
        if cumul[i] - dernier >= pas or i == len(points) - 1 or (i + 1) in coupure:
            courant.append(p); dernier = cumul[i]
            if cumul[i] - debut >= MORCEAU_KM * 1000:
                morceaux.append(courant); courant, debut = [p], cumul[i]
    if len(courant) > 1 or not morceaux:
        morceaux.append(courant)

    # Requête « rectangle » (bbox) autour de chaque morceau, agrandi de la zone :
    # bien plus rapide pour Overpass qu'une recherche « à moins de X m d'une ligne ».
    # Le tri à la bonne distance de la trace est fait ensuite, ici (voir plus bas).
    par_cle = {}
    for cle, val, _, _ in RECHERCHES:
        par_cle.setdefault(cle, []).append(val)
    filtres = "\n".join(f'  nwr["{cle}"~"^({"|".join(vals)})$"];' for cle, vals in par_cle.items())

    # Les morceaux déjà obtenus sont gardés dans data/pois/_cache/<nom>/ (enregistrés sur
    # GitHub) : si les serveurs saturent, le passage suivant reprend où il s'était arrêté.
    empreinte = hashlib.sha1(texte.encode()).hexdigest()[:10]
    dossier = f"data/pois/_cache/{nom}"
    cle_cache = f"r{rayon}-t{empreinte}-{SIGNATURE_RECHERCHES}"
    os.makedirs(dossier, exist_ok=True)
    for f in os.listdir(dossier):                      # restes d'une autre zone ou d'une autre trace
        if not f.startswith(cle_cache):
            os.remove(os.path.join(dossier, f))

    elements, par_morceau = [], []
    for n, m in enumerate(morceaux, 1):
        f_cache = os.path.join(dossier, f"{cle_cache}-{n}.json")
        if os.path.exists(f_cache):
            recus = json.load(open(f_cache, encoding="utf-8"))
            print(f"::notice title={nom}::morceau {n}/{len(morceaux)} déjà obtenu ({len(recus)} éléments)", flush=True)
        else:
            lats, lons = [p[0] for p in m], [p[1] for p in m]
            dlat = rayon / 111320
            dlon = rayon / (111320 * math.cos(math.radians(sum(lats) / len(lats))))
            bbox = f"{min(lats) - dlat:.5f},{min(lons) - dlon:.5f},{max(lats) + dlat:.5f},{max(lons) + dlon:.5f}"
            print(f"::notice title={nom}::morceau {n}/{len(morceaux)} ({int(time.time() - DEBUT)} s)", flush=True)
            recus = interroger(f"[out:json][timeout:60][bbox:{bbox}];\n(\n{filtres}\n);\nout center tags;")
            json.dump(recus, open(f_cache, "w", encoding="utf-8"))
            time.sleep(PAUSE_S)
        par_morceau.append(len(recus))
        elements += recus

    def classer(tags):
        for cle, val, type_site, nom_defaut in RECHERCHES:
            if tags.get(cle) == val:
                return type_site, nom_defaut
        return None, None

    def infos(tags, nom_defaut):
        t = [nom_defaut]
        if tags.get("opening_hours"): t.append("horaires : " + tags["opening_hours"])
        if tags.get("ele"): t.append(tags["ele"] + " m")
        if tags.get("drinking_water") == "no": t.append("eau non potable")
        if tags.get("seasonal") == "yes": t.append("saisonnier")
        return " · ".join(t)

    def a_distance(m):
        return f"à {int(round(m, -1))} m de la trace" if m < 1000 else f"à {m / 1000:.1f} km de la trace".replace(".", ",")

    pois, vus = [], set()
    for e in elements:
        tags = e.get("tags", {})
        type_site, nom_defaut = classer(tags)
        if not type_site or (e["type"], e["id"]) in vus:
            continue
        vus.add((e["type"], e["id"]))
        lat = e.get("lat", e.get("center", {}).get("lat"))
        lon = e.get("lon", e.get("center", {}).get("lon"))
        if lat is None:
            continue
        k = math.cos(math.radians(lat))
        i = min(range(len(points)), key=lambda j: (points[j][0] - lat) ** 2 + ((points[j][1] - lon) * k) ** 2)
        ecart = distance_m((lat, lon), points[i])
        if ecart > rayon:
            continue
        pois.append({"type": type_site, "nom": tags.get("name", nom_defaut), "km": round(cumul[i] / 1000, 1),
                     "lat": round(lat, 5), "lon": round(lon, 5),
                     "info": infos(tags, nom_defaut) + " · " + a_distance(ecart), "osm": f"{e['type']}/{e['id']}"})
    pois.sort(key=lambda p: p["km"])
    uniques = []
    for p in pois:   # doublons (ex. camping dessiné en point et en contour)
        if not any(q["type"] == p["type"] and q["nom"] == p["nom"] and distance_m((q["lat"], q["lon"]), (p["lat"], p["lon"])) < 200 for q in uniques):
            uniques.append(p)
    return uniques, par_morceau

def ecrire(nom, rayon, empreinte, pois, par_morceau):
    os.makedirs("data/pois", exist_ok=True)
    with open(f"data/pois/{nom}.js", "w", encoding="utf-8") as f:
        f.write(f"// Fichier GÉNÉRÉ par le robot POI (OpenStreetMap, rayon {rayon} m) : ne pas modifier à la main.\n")
        f.write(f"// Pour supprimer un point : ajoute son code \"osm\" dans \"pois_exclus\" de data/{nom}.js\n")
        f.write(f"// auto : rayon={rayon} trace={empreinte} recherches={SIGNATURE_RECHERCHES}\n")
        f.write(f"// éléments OpenStreetMap reçus par morceau de {MORCEAU_KM} km : {par_morceau}\n")
        f.write("window.POIS = window.POIS || {};\n")
        f.write("window.POIS[" + json.dumps(nom) + "] = [\n")
        f.write(",\n".join("  " + json.dumps(p, ensure_ascii=False) for p in pois))
        f.write("\n];\n")


# ---------------------------------------------------------------------
# 3. Décision fiche par fiche
# ---------------------------------------------------------------------
bilan, echecs = [], []
for nom in slugs_du_site():
    if not os.path.exists(f"data/{nom}.js"):
        continue
    fiche = lire_fiche(nom)
    if fiche is None:
        echecs.append(f"{nom} : fiche illisible"); continue
    if "pois_auto" not in fiche:
        continue                                          # ancienne fiche : on ne touche à rien
    deja = entete_pois(nom)
    if not fiche["pois_auto"]:
        if deja and not deja.get("manuel"):               # retire seulement ce que le robot a fait
            bilan.append(f"{nom} : POI retirés")
            if not ESSAI: os.remove(f"data/pois/{nom}.js")
        continue
    try:
        rayon = int(fiche.get("pois_rayon_m") or 1000)
    except (TypeError, ValueError):
        rayon = 1000
    rayon = max(RAYON_MIN, min(RAYON_MAX, rayon))
    if not os.path.exists(f"gpx/{nom}.gpx"):
        echecs.append(f"{nom} : gpx/{nom}.gpx manquant"); continue
    empreinte = hashlib.sha1(open(f"gpx/{nom}.gpx", "rb").read()).hexdigest()[:10]
    if deja and deja.get("manuel"):
        continue                                          # fichier fait à la main avec gpx2pois.py : on le garde
    if deja and deja["rayon"] == rayon and deja["trace"] == empreinte and deja["recherches"] == SIGNATURE_RECHERCHES:
        continue                                          # déjà à jour
    raison = "nouvelle fiche" if not deja else "zone changée" if deja["rayon"] != rayon else "trace ou recherches changées"
    print(f"{nom} : recherche des POI à {rayon} m ({raison})")
    if ESSAI:
        bilan.append(f"{nom} : à générer, rayon {rayon} m ({raison})"); continue
    try:
        pois, par_morceau = generer(nom, rayon)
        ecrire(nom, rayon, empreinte, pois, par_morceau)
        shutil.rmtree(f"data/pois/_cache/{nom}", ignore_errors=True)   # fiche terminée : morceaux en attente inutiles
        compte = {}
        for p in pois: compte[p["type"]] = compte.get(p["type"], 0) + 1
        bilan.append(f"{nom} : {len(pois)} POI à {rayon} m ({', '.join(f'{t} {n}' for t, n in sorted(compte.items()))})")
    except Exception as e:
        echecs.append(f"{nom} : {e}")

print("\n".join(bilan) or ("" if echecs else "Rien à faire : tous les POI sont à jour."))
if echecs:
    # Pas d'échec du passage : les morceaux déjà obtenus doivent être enregistrés,
    # et le passage suivant (toutes les heures) reprendra là où celui-ci s'est arrêté.
    for e in echecs:
        print(f"::warning title=POI à reprendre::{e}")

# =====================================================================
# OUTIL : outils/pois_auto.py   (robot POI, version 3)
# RÔLE  : trouver les points d'intérêt (POI) d'OpenStreetMap autour des
#         traces du site. Lancé tout seul par GitHub (voir
#         .github/workflows/pois.yml) :
#           - à chaque publication (trace ou fiche modifiée),
#           - et toutes les 30 minutes, pour finir ce qui est resté en attente.
#
#   Réglage fiche par fiche (posé par l'Atelier, dans data/<nom>.js) :
#     "pois_auto": true      > le robot crée data/pois/<nom>.js
#     "pois_rayon_m": 3000   > zone autour de la trace, en mètres
#     "pois_auto": false     > le robot retire les POI qu'il avait générés
#     champ absent           > le robot ne touche à rien (anciennes fiches)
#
#   Il refait les POI seulement si c'est utile : nouvelle fiche, zone
#   changée ou trace GPX changée. Sinon il ne fait rien (aucune requête).
#
# COMMENT IL TRAVAILLE (leçons du 20/10/2026, serveurs OpenStreetMap saturés) :
#   1. La trace est coupée en tranches de 25 km (une coupure entre deux GPX
#      qui ne se raccordent pas ferme aussi la tranche).
#   2. Pour chaque tranche, il demande à Overpass tout ce qui se trouve dans
#      un RECTANGLE autour de la tranche (requête légère, la plus rapide),
#      puis garde lui-même ce qui est à la bonne distance de la trace.
#   3. Chaque tranche obtenue est enregistrée dans data/pois/_cache/<nom>/ :
#      si les serveurs saturent, il s'arrête au bout de 25 min et le passage
#      suivant (30 min plus tard) reprend là où il s'était arrêté.
#   4. Il essaie d'abord le serveur qui a répondu en dernier, puis les autres
#      dans l'ordre de fiabilité observé.
#   5. Il écrit son état dans data/pois/etat.js : la page du parcours affiche
#      « points d'intérêt en cours de recherche » tant que ce n'est pas fini.
#
#   Durée habituelle : environ 1 min par tranche de 25 km, plus 1 min pour
#   la mise en ligne du site. Serveurs saturés : jusqu'à une heure ou deux.
#
# UTILISATION À LA MAIN (facultatif, depuis la racine du dépôt) :
#     python outils/pois_auto.py            > traite toutes les fiches
#     python outils/pois_auto.py --essai    > dit ce qu'il ferait, sans rien faire
#
# Données © contributeurs OpenStreetMap (licence ODbL), mention présente
# en bas des cartes du site.
# =====================================================================

import re, math, json, sys, os, time, hashlib, shutil
from datetime import datetime, timezone
import urllib.request, urllib.parse, urllib.error

# ---------------------------------------------------------------------
# RÉGLAGES
# ---------------------------------------------------------------------
RAYON_MIN, RAYON_MAX = 100, 10000   # zone acceptée, en mètres
COUPURE_M = 1000                    # saut entre deux points au-delà duquel la trace est coupée (comme le site)
MORCEAU_KM = 25                     # longueur des tranches interrogées une par une
PAUSE_S = 3                         # pause entre deux requêtes (service gratuit)
ATTENTES_S = [15, 45]               # tous les serveurs ont échoué : on attend 15 s, puis 45 s, et on recommence
DELAI_REQUETE_S = 75                # attente maximale d'une réponse ; une requête « rectangle » saine répond en moins d'1 min
BUDGET_S = 25 * 60                  # durée maximale d'un passage ; la suite au passage suivant (toutes les 30 min)
DEBUT = time.time()
# Serveurs Overpass gratuits, dans l'ordre de fiabilité observé (20/10/2026) :
# overpass-api.de le plus souvent utile (parfois 502 quand il sature),
# private.coffee de temps en temps, mail.ru rarement, kumi.systems presque jamais.
SERVEURS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
# ("clé", "valeur", "type du site", "nom par défaut") : mêmes recherches que gpx2pois.py
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
# Version des résultats : la changer fait refaire tous les POI automatiques.
# (Elle ne bouge pas quand seule la façon d'interroger les serveurs change.)
VERSION_ROBOT = 2
SIGNATURE_RECHERCHES = hashlib.md5((str(RECHERCHES) + f"v{VERSION_ROBOT}").encode()).hexdigest()[:6]
ESSAI = "--essai" in sys.argv
FICHIER_ETAT = "data/pois/etat.js"   # sans « _ » au début : GitHub Pages masque ces fichiers


def distance_m(a, b):
    """Distance en mètres entre deux points (latitude, longitude)."""
    lat1, lat2 = math.radians(a[0]), math.radians(b[0])
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(math.radians(b[1] - a[1]) / 2) ** 2
    return 12742000 * math.asin(math.sqrt(h))

def ecoule():
    return int(time.time() - DEBUT)


# ---------------------------------------------------------------------
# 1. Lecture des fiches, des listes et de l'état précédent
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

def lire_etat():
    try:
        t = open(FICHIER_ETAT, encoding="utf-8").read()
        return json.loads(t[t.index("window.ETAT_POIS =") + len("window.ETAT_POIS ="):t.rindex(";")])
    except (OSError, ValueError):
        return {}


# ---------------------------------------------------------------------
# 2. Questions aux serveurs Overpass
# ---------------------------------------------------------------------
class TempsDepasse(Exception):
    pass

dernier_bon = None   # serveur qui a répondu en dernier : essayé en premier ensuite

def interroger(question):
    """Envoie la question aux serveurs, du plus fiable au moins fiable.
    Un serveur saturé peut répondre « 200 OK » avec une liste VIDE et une simple
    remarque d'erreur : c'est traité comme un échec. Une réponse vide sans remarque
    est vérifiée auprès d'un deuxième serveur avant d'être acceptée."""
    global dernier_bon
    donnees = urllib.parse.urlencode({"data": question}).encode()
    vides = 0
    for attente in [0] + ATTENTES_S:
        if attente:
            print(f"    pause de {attente} s avant de réessayer...", flush=True)
            time.sleep(attente)
        ordre = ([dernier_bon] if dernier_bon else []) + [s for s in SERVEURS if s != dernier_bon]
        for serveur in ordre:
            nom_serveur = serveur.split("/")[2]
            if time.time() - DEBUT + DELAI_REQUETE_S > BUDGET_S:
                raise TempsDepasse(f"temps maximal de {BUDGET_S // 60} min atteint")
            try:
                req = urllib.request.Request(serveur, data=donnees, headers={"User-Agent": "carnet-de-traces/1.0 (site perso)"})
                with urllib.request.urlopen(req, timeout=DELAI_REQUETE_S) as r:
                    rep = json.loads(r.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                print(f"::warning title={nom_serveur}::erreur HTTP {e.code} ({ecoule()} s)", flush=True); continue
            except Exception as e:
                print(f"::warning title={nom_serveur}::ne répond pas : {type(e).__name__} {str(e)[:80]} ({ecoule()} s)", flush=True); continue
            remarque = rep.get("remark", "")
            if "error" in remarque.lower():
                print(f"::warning title={nom_serveur}::réponse incomplète : {remarque[:100]} ({ecoule()} s)", flush=True); continue
            elements = rep.get("elements", [])
            if elements:
                dernier_bon = serveur
                print(f"::notice title=Overpass::{nom_serveur} : {len(elements)} éléments ({ecoule()} s)", flush=True)
                return elements
            vides += 1
            print(f"    {nom_serveur} : réponse vide ({vides})", flush=True)
            if vides >= 2:
                return []          # deux serveurs confirment : il n'y a vraiment rien
    raise TempsDepasse("aucun serveur n'a donné de réponse complète")


# ---------------------------------------------------------------------
# 3. Recherche des POI d'une trace
# ---------------------------------------------------------------------
def lire_trace(nom):
    texte = open(f"gpx/{nom}.gpx", encoding="utf-8").read()
    points = [(float(a), float(b)) for a, b in re.findall(r'<trkpt\s+lat="([\d.-]+)"\s+lon="([\d.-]+)"', texte)]
    if len(points) < 2:
        raise RuntimeError("aucun point dans le GPX")
    # Distance cumulée, comme sur le site : un saut de plus de COUPURE_M n'ajoute pas de km
    cumul, coupure = [0.0], set()
    for i in range(1, len(points)):
        d = distance_m(points[i - 1], points[i])
        if d > COUPURE_M:
            coupure.add(i)
        cumul.append(cumul[-1] + (0 if d > COUPURE_M else d))
    return texte, points, cumul, coupure

def decouper(points, cumul, coupure, rayon):
    """Tranches de ~25 km ; une coupure ferme la tranche en cours."""
    pas = max(250, min(1000, rayon / 2))
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
    return morceaux

def generer(nom, rayon, suivi):
    """Renvoie (POI, éléments reçus par tranche). Met à jour suivi = {"obtenus", "total"}."""
    texte, points, cumul, coupure = lire_trace(nom)
    morceaux = decouper(points, cumul, coupure, rayon)
    suivi["total"], suivi["obtenus"] = len(morceaux), 0

    par_cle = {}
    for cle, val, _, _ in RECHERCHES:
        par_cle.setdefault(cle, []).append(val)
    filtres = "\n".join(f'  nwr["{cle}"~"^({"|".join(vals)})$"];' for cle, vals in par_cle.items())

    # Tranches déjà obtenues : data/pois/_cache/<nom>/ (enregistré sur GitHub)
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
            print(f"::notice title={nom}::tranche {n}/{len(morceaux)} déjà obtenue ({len(recus)} éléments)", flush=True)
        else:
            lats, lons = [p[0] for p in m], [p[1] for p in m]
            dlat = rayon / 111320
            dlon = rayon / (111320 * math.cos(math.radians(sum(lats) / len(lats))))
            bbox = f"{min(lats) - dlat:.5f},{min(lons) - dlon:.5f},{max(lats) + dlat:.5f},{max(lons) + dlon:.5f}"
            print(f"::notice title={nom}::tranche {n}/{len(morceaux)} ({ecoule()} s)", flush=True)
            recus = interroger(f"[out:json][timeout:60][bbox:{bbox}];\n(\n{filtres}\n);\nout center tags;")
            json.dump(recus, open(f_cache, "w", encoding="utf-8"))
            time.sleep(PAUSE_S)
        par_morceau.append(len(recus))
        elements += recus
        suivi["obtenus"] = n

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
        if ecart > rayon:                                # le rectangle déborde : on ne garde que la bonne distance
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
        f.write(f"// éléments OpenStreetMap reçus par tranche de {MORCEAU_KM} km : {par_morceau}\n")
        f.write("window.POIS = window.POIS || {};\n")
        f.write("window.POIS[" + json.dumps(nom) + "] = [\n")
        f.write(",\n".join("  " + json.dumps(p, ensure_ascii=False) for p in pois))
        f.write("\n];\n")


# ---------------------------------------------------------------------
# 4. Décision fiche par fiche, puis état d'avancement
# ---------------------------------------------------------------------
ancien_etat = lire_etat()
etat, bilan, echecs = {}, [], []

def noter(nom, **infos):
    """Etat d'une fiche ; la date ne change que si l'état change (pas de mise à jour inutile du site)."""
    precedent = {k: v for k, v in ancien_etat.get(nom, {}).items() if k != "maj"}
    etat[nom] = dict(infos, maj=ancien_etat.get(nom, {}).get("maj") if precedent == infos
                     else datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ"))

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
        if not ESSAI: shutil.rmtree(f"data/pois/_cache/{nom}", ignore_errors=True)
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
        if nom in ancien_etat: etat[nom] = ancien_etat[nom]   # déjà à jour : état inchangé
        else: noter(nom, etat="ok", rayon=rayon, poi=open(f"data/pois/{nom}.js", encoding="utf-8").read().count('{"type"'))
        continue
    raison = "nouvelle fiche" if not deja else "zone changée" if deja["rayon"] != rayon else "trace ou recherches changées"
    print(f"{nom} : recherche des POI à {rayon} m ({raison})", flush=True)
    if ESSAI:
        bilan.append(f"{nom} : à générer, rayon {rayon} m ({raison})"); continue
    suivi = {"obtenus": 0, "total": 0}
    try:
        pois, par_morceau = generer(nom, rayon, suivi)
        ecrire(nom, rayon, empreinte, pois, par_morceau)
        shutil.rmtree(f"data/pois/_cache/{nom}", ignore_errors=True)   # fiche terminée
        compte = {}
        for p in pois: compte[p["type"]] = compte.get(p["type"], 0) + 1
        bilan.append(f"{nom} : {len(pois)} POI à {rayon} m ({', '.join(f'{t} {n}' for t, n in sorted(compte.items()))})")
        noter(nom, etat="ok", rayon=rayon, poi=len(pois))
    except TempsDepasse as e:
        # Serveurs saturés : on garde les tranches obtenues, la suite au passage suivant
        echecs.append(f"{nom} : {suivi['obtenus']}/{suivi['total']} tranches obtenues, {e}")
        noter(nom, etat="en_attente", rayon=rayon, obtenus=suivi["obtenus"], total=suivi["total"])
    except Exception as e:
        echecs.append(f"{nom} : {e}")
        noter(nom, etat="erreur", rayon=rayon, message=str(e)[:120])

if not ESSAI:
    os.makedirs("data/pois", exist_ok=True)
    with open(FICHIER_ETAT, "w", encoding="utf-8") as f:
        f.write("// Fichier GÉNÉRÉ par le robot POI : état de la recherche des points d'intérêt, fiche par fiche.\n")
        f.write("// ok = POI en ligne ; en_attente = recherche en cours (serveurs OpenStreetMap saturés) ; erreur = à regarder.\n")
        f.write("window.ETAT_POIS = " + json.dumps(etat, ensure_ascii=False, indent=1, sort_keys=True) + ";\n")

print("\n".join(bilan) or ("" if echecs else "Rien à faire : tous les POI sont à jour."))
for e in echecs:
    # Le passage ne s'arrête pas en échec : les tranches obtenues doivent être enregistrées,
    # et le passage suivant (toutes les heures) reprendra là où celui-ci s'est arrêté.
    print(f"::warning title=POI à reprendre::{e}")

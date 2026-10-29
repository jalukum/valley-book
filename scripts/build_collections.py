"""museum, fish, recipes, shipping, walnuts, perfection, achievements, special_orders (+ extras: monster_slayer,
stardrops, secret_notes, powers, island_upgrades)."""
import re, json
from common import *
import wikiapi as W

ITEMS = json.load(open(os.path.join(DATA, "items.json")))["data"]
SA = lambda f: sapp(f"src/data/{f}.json")
CATS = {"-4": "Any Fish", "-5": "Any Egg", "-6": "Any Milk", "-777": "Any Wild Seeds", "-7": "Cooking", "-2": "Any Mineral/Gem",
        "-75": "Any Vegetable", "-79": "Any Fruit", "-81": "Any Forage", "-80": "Any Flower"}
LOCNAME = {"Town": "Pelican Town", "Mountain": "Mountain lake", "Forest": "Cindersap Forest", "Beach": "The Beach",
           "Woods": "Secret Woods", "Sewer": "Sewers", "BugLand": "Mutant Bug Lair", "Desert": "Calico Desert",
           "WitchSwamp": "Witch's Swamp", "UndergroundMine": "The Mines", "Submarine": "Night Market submarine",
           "Caldera": "Volcano Caldera", "IslandSouth": "Ginger Island (south)", "IslandSouthEast": "Ginger Island (southeast)",
           "IslandWest": "Ginger Island (west)", "IslandNorth": "Ginger Island (north)", "IslandSouthEastCave": "Pirate Cove",
           "IslandFarmCave": "Island Farm cave", "Backwoods": "Backwoods", "Railroad": "Railroad", "BeachNightMarket": "Night Market",
           "FishShop": "Fish Shop", "Farm": "The Farm", "MovieTheater": "Movie Theater", "Default": "Anywhere (fallback)"}

def ref(qid, extra=None):
    if qid is None: return None
    qid = str(qid)
    if not qid.startswith("("):
        if qid.lstrip("-").isdigit() and qid.startswith("-"):
            return {"category": int(qid), "name": CATS.get(qid, f"category {qid}"), **(extra or {})}
        qid = "(O)" + qid
    it = ITEMS.get(qid)
    return {"qid": qid, "name": it["name"] if it else qid, **(extra or {})}

def item_pairs(s):
    p = s.split()
    return [ref(p[i], {"count": int(p[i+1])}) for i in range(0, len(p) - 1, 2)]

# ---------------- museum
def museum():
    sa = SA("museum")
    out = []
    for kind, label in (("artifacts", "Artifact"), ("minerals", "Mineral")):
        for iid, v in sa[kind].items():
            r = ref(iid); r.update({"kind": label, "foundIn": v.get("locations", [])})
            out.append(r)
    game_mus = [q for q, it in ITEMS.items() if q.startswith("(O)") and it["type"] in ("Arch", "Minerals")]
    rewards = []
    for k, v in game("Data/MuseumRewards.json").items():
        req = []
        for t in v["TargetContextTags"]:
            tag = t["Tag"]
            if tag.startswith("id_o_"): req.append(ref(tag[5:], {"count": t["Count"]}))
            else: req.append({"tag": tag, "name": {"item_type_arch": "Artifacts (any)", "item_type_minerals": "Minerals (any)", "": "Any donations"}.get(tag, tag), "count": t["Count"]})
        rewards.append({"id": k, "requires": req, "reward": ref(v["RewardItemId"], {"count": v["RewardItemCount"], "isRecipe": v["RewardItemIsRecipe"]}) if v["RewardItemId"] else None,
                        "actions": v["RewardActions"]})
    write("museum", {"items": out, "rewards": rewards}, {"source": [SOURCES["stardewapp"], SOURCES["game"]], "license": [GAME_LICENSE, "stardew.app MIT"],
          "note": f"{len(out)} donatable items (game has {len(game_mus)} Arch/Minerals-type objects incl. non-donatable)"})
    return len(out), len(rewards)

# ---------------- fish
def fish():
    raw = game("Data/Fish.json")
    sa = SA("fish")
    locs = {}
    for ln, l in game("Data/Locations.json").items():
        for f in l.get("Fish") or []:
            ids = [f["ItemId"]] if f.get("ItemId") else (f.get("RandomItemId") or [])
            for i in ids:
                if not i or not str(i).startswith("(O)"): continue
                e = {"location": ln, "locationName": LOCNAME.get(ln, ln)}
                if f.get("Season"): e["season"] = f["Season"]
                if f.get("Condition"): e["condition"] = f["Condition"]
                if f.get("FishAreaId"): e["area"] = f["FishAreaId"]
                if f.get("IsBossFish"): e["legendary"] = True
                if f.get("MinFishingLevel"): e["minFishingLevel"] = f["MinFishingLevel"]
                locs.setdefault(i, []).append(e)
    LEG = {"159", "160", "163", "775", "682"}; FAM = {"898", "899", "900", "901", "902"}
    out = []
    keys = list(dict.fromkeys(list(sa) + list(raw)))
    for iid in keys:
        r = ref(iid)
        f = raw.get(iid, "").split("/")
        d = {}
        if len(f) > 2 and f[1] == "trap":
            d = {"method": "crab pot", "water": f[4], "chance": float(f[2])}
        elif len(f) > 12:
            times = list(map(int, f[5].split()))
            d = {"method": "rod", "difficulty": int(f[1]), "behavior": f[2], "size": [int(f[3]), int(f[4])],
                 "times": [[times[i], times[i+1]] for i in range(0, len(times), 2)], "seasons": f[6].split(),
                 "weather": f[7], "minFishingLevel": int(f[12])}
        s = sa.get(iid, {})
        it = ITEMS.get(r["qid"], {})
        r.update(d)
        r.update({"collection": iid in sa, "legendary": iid in LEG, "legendaryFamily": iid in FAM,
                  "price": it.get("price"), "summary": {k: s.get(k) for k in ("locations", "time", "seasons", "weather", "difficulty") if s.get(k) is not None},
                  "spawns": locs.get(r["qid"], [])})
        out.append(r)
    write("fish", out, {"source": [SOURCES["game"], SOURCES["stardewapp"]], "license": [GAME_LICENSE, "stardew.app MIT"],
          "note": "collection=true marks the 72 fish in the Collections tab (perfection). times are game clock HHMM (600-2600)."})
    return len(out), sum(1 for x in out if x["collection"])

# ---------------- recipes
def recipes():
    saC, saF = SA("cooking"), SA("crafting")
    out = {"cooking": [], "crafting": []}
    for name, v in game("Data/CookingRecipes.json").items():
        f = v.split("/")
        y = f[2].split()
        r = {"recipe": name, "displayName": name, "ingredients": item_pairs(f[0]), "output": ref(y[0], {"count": int(y[1]) if len(y) > 1 else 1}),
             "unlockRaw": f[3]}
        r["unlock"] = saC.get(y[0], {}).get("unlockConditions")
        r["countsForPerfection"] = y[0] in saC
        out["cooking"].append(r)
    for name, v in game("Data/CraftingRecipes.json").items():
        f = v.split("/")
        big = f[3] == "true"
        y = f[2].split()
        oq = ("(BC)" if big else "(O)") + y[0] if not y[0].startswith("(") else y[0]
        r = {"recipe": name, "displayName": resolve(f[5]) if len(f) > 5 and f[5] else name, "ingredients": item_pairs(f[0]),
             "output": ref(oq, {"count": int(y[1]) if len(y) > 1 else 1}), "bigCraftable": big, "unlockRaw": f[4]}
        sa = saF.get(y[0]) if saF.get(y[0], {}).get("isBigCraftable", False) == big else None
        r["unlock"] = sa and sa.get("unlockConditions")
        r["countsForPerfection"] = name != "Wedding Ring"
        out["crafting"].append(r)
    write("recipes", out, {"source": [SOURCES["game"], SOURCES["stardewapp"]], "license": [GAME_LICENSE, "stardew.app MIT"],
          "note": "unlock = human-readable (stardew.app); unlockRaw = game data ('default', 's Farming 2', 'f Lewis 9', 'l N' = learned elsewhere e.g. TV/mail, 'none')."})
    return len(out["cooking"]), len(out["crafting"]), sum(1 for r in out["crafting"] if not r["unlock"])

# ---------------- shipping
def shipping():
    sa = SA("shipping")
    out = []
    for iid, v in sa.items():
        if ITEMS.get("(O)" + iid, {}).get("category") == -4:
            continue  # e.g. Clam: category Fish since 1.6 -> Fish tab, not Items Shipped (wiki template omits it; 154 total)
        r = ref(iid); r.update({"seasons": v.get("seasons", []), "monoculture": v.get("monoculture"), "polyculture": v.get("polyculture"),
                                "category": ITEMS.get(r["qid"], {}).get("categoryName")})
        out.append(r)
    write("shipping", out, {"source": SOURCES["stardewapp"], "license": "stardew.app MIT; names from game data",
          "note": "Farm & Forage collection. Wiki Perfection table counts 154 for perfection; this list has %d (see validation)." % len(out)})
    return len(out)

# ---------------- walnuts
def walnuts():
    sa = SA("walnuts")
    out = [{"id": k, "name": v["name"], "count": v["count"], "hint": v["description"]} for k, v in sa.items()]
    write("walnuts", out, {"source": [SOURCES["stardewapp"], wiki_url("Golden Walnut")], "license": "stardew.app MIT",
          "note": "id = game mail flag / save key; total %d walnuts" % sum(x["count"] for x in out)})
    return len(out), sum(x["count"] for x in out)

# ---------------- perfection
def perfection():
    t = W.wikitext("Qi's Walnut Room")
    sec = re.search(r"<section begin=\"?Perfection\"?\s*/>(.*?)<section end", t, re.S).group(1)
    cats = []
    for row in sec.split("\n|-")[1:]:
        c = [clean_wikitext(x).strip() for x in row.strip().split("\n|")]
        c = [x.lstrip("| ").strip() for x in c if x.strip()]
        if len(c) >= 4:
            cats.append({"name": c[0], "requirement": c[1], "total": int(c[2]), "weightPercent": int(c[3].rstrip("%"))})
    stardrops = [
        {"id": "CF_Fair", "source": "Stardew Valley Fair: buy for 2,000 star tokens"},
        {"id": "CF_Mines", "source": "The Mines: treasure chest on floor 100"},
        {"id": "CF_Sewer", "source": "Krobus' shop in the Sewers: 20,000g"},
        {"id": "CF_Fish", "source": "Letter from Willy the day after earning the Master Angler achievement"},
        {"id": "CF_Spouse", "source": "From your spouse or roommate when friendship reaches 12.5 hearts"},
        {"id": "museumComplete", "source": "Museum: reward for donating all 95 items"},
        {"id": "CF_Statue", "source": "Old Master Cannoli statue in the Secret Woods: give a Sweet Gem Berry"},
    ]
    assert sum(c["weightPercent"] for c in cats) == 100, cats
    write("perfection", {"categories": cats, "stardrops": stardrops, "skills": ["Farming", "Mining", "Foraging", "Fishing", "Combat"],
                         "obelisks": ["Earth Obelisk", "Water Obelisk", "Desert Obelisk", "Island Obelisk"],
                         "waiver": {"vendor": "Fizz (Ginger Island mushroom cave)", "price": 500000, "percent": 1}},
          {"source": [wiki_url("Qi's Walnut Room") + "#Perfection_Tracker", wiki_url("Perfection"), wiki_url("Stardrop")], "license": WIKI_LICENSE})
    return cats

# ---------------- achievements
def achievements():
    sa = SA("achievements")
    g = game("Data/Achievements.json")
    out = []
    for name, v in sa.items():
        gid = v.get("gameID")
        gv = g.get(str(gid)) if gid is not None else None
        out.append({"name": name, "description": v["description"], "gameId": gid, "inGame": gv is not None,
                    "platformOnly": gv is None, "icon": {"file": "Achievement_" + name.replace(" ", "_") + ".jpg", "url": v.get("iconURL")},
                    "hiddenUntilPrereq": gv.split("^")[3] if gv else None})
    write("achievements", out, {"source": [SOURCES["stardewapp"], SOURCES["game"]], "license": "stardew.app MIT; game strings © ConcernedApe",
          "note": "inGame=false: Steam/console-only achievements not tracked in the in-game collection"})
    return len(out), sum(1 for x in out if x["inGame"])

# ---------------- special orders
def special_orders():
    S = gstr("SpecialOrderStrings")
    def tx(s):
        return re.sub(r"\[([A-Za-z0-9_]+)\]", lambda m: S.get(m.group(1), m.group(0)), s or "")
    out = []
    for k, v in game("Data/SpecialOrders.json").items():
        rewards = []
        for r in v["Rewards"]:
            d = r.get("Data") or {}
            if r["Type"] == "Money": rewards.append({"type": "gold", "amount": d.get("Amount")})
            elif r["Type"] == "Gems": rewards.append({"type": "qiGems", "amount": d.get("Amount")})
            elif r["Type"] == "Friendship": rewards.append({"type": "friendship", **d})
            elif r["Type"] == "Mail": rewards.append({"type": "unlock", "mailFlag": d.get("MailReceived")})
            else: rewards.append({"type": r["Type"].lower(), **d})
        out.append({"id": k, "name": tx(v["Name"]), "requester": v["Requester"], "board": "Qi" if v["OrderType"] == "Qi" else ("Desert Festival" if k.startswith("Desert") else "Town"),
                    "text": tx(v["Text"]), "duration": v["Duration"], "repeatable": v["Repeatable"],
                    "unused": "NOT_IMPLEMENTED" in (v["RequiredTags"] or ""),
                    "requiredTags": v["RequiredTags"], "condition": v["Condition"], "specialRule": v["SpecialRule"],
                    "objectives": [{"type": o["Type"], "text": tx(o["Text"]), "count": o["RequiredCount"], "data": o.get("Data")} for o in v["Objectives"]],
                    "rewards": rewards, "randomized": bool(v["RandomizedElements"]), "wikiUrl": wiki_url("Quests") + "#List_of_Special_Orders"})
    write("special_orders", out, {"source": [SOURCES["game"], wiki_url("Quests")], "license": GAME_LICENSE,
          "note": "text may contain {placeholders} filled by RandomizedElements at runtime"})
    return len(out), sum(1 for o in out if o["board"] == "Town"), sum(1 for o in out if o["board"] == "Qi" and not o["unused"]), sum(o["unused"] for o in out)

# ---------------- extras
def extras():
    ms = []
    for k, v in game("Data/MonsterSlayerQuests.json").items():
        ms.append({"id": k, "name": resolve(v["DisplayName"]), "targets": v["Targets"], "count": v["Count"], "reward": ref(v["RewardItemId"]) if v["RewardItemId"] else None})
    write("monster_slayer", ms, {"source": SOURCES["game"], "license": GAME_LICENSE})
    notes = []
    for k, v in game("Data/SecretNotes.json").items():
        notes.append({"id": int(k), "kind": "Journal Scrap" if int(k) >= 1000 else "Secret Note", "text": re.sub(r"%[a-z]+:[^%]*", "", v).replace("^", "\n").strip(),
                      "revealsTastes": re.findall(r"%revealtaste:([^:%]+):([^%]+)", v)})
    write("secret_notes", notes, {"source": SOURCES["game"], "license": GAME_LICENSE})
    pw = [{"id": k, "name": resolve(v["DisplayName"]), "description": resolve(v["Description"]) if v.get("Description") else None, "condition": v["UnlockedCondition"]}
          for k, v in game("Data/Powers.json").items()]
    write("powers", pw, {"source": SOURCES["game"], "license": GAME_LICENSE})
    iu = [{"id": k, **v} for k, v in SA("island_upgrades").items()]
    write("island_upgrades", iu, {"source": SOURCES["stardewapp"], "license": "stardew.app MIT"})
    return len(ms), len(notes), len(pw), len(iu)

if __name__ == "__main__":
    print("museum items/rewards", museum())
    print("fish total/collection", fish())
    print("recipes cooking/crafting/crafting-without-unlock-text", recipes())
    print("shipping", shipping())
    print("walnut spots/total", walnuts())
    print("perfection", [(c["name"], c["total"], c["weightPercent"]) for c in perfection()])
    print("achievements total/inGame", achievements())
    print("special orders total/town/qi/unused", special_orders())
    print("monster slayer/notes/powers/island upgrades", extras())

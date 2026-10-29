"""Daily-guide data: crops (+seed prices), forage, heart events, story quests, raccoon requests, cart pool, unlock facts.
Game data from kronosta/stardew-data (Data/*.json); prose facts and quest list from the Stardew Valley Wiki (cited per record)."""
import re, json
from common import game, resolve, write, SOURCES
from wikiapi import wikitext

WIKI = "https://stardewvalleywiki.com/"
O = game("Data/Objects.json")
def oname(i): return resolve(O[i]["DisplayName"]) if i in O else None
NAME2ID = {}
for k, v in O.items():
    NAME2ID.setdefault(resolve(v["DisplayName"]).lower(), k)
SEASONS = ["spring", "summer", "fall", "winter"]

# ---------- crops & seed prices ----------
crops_raw = game("Data/Crops.json"); shops = game("Data/Shops.json")
def season_of(cond):
    m = re.search(r"SEASON ([a-z ]+?)(?:,|$)", cond or ""); return m.group(1).split() if m else None
def year_of(cond):
    m = re.search(r"YEAR (\d+)", cond or ""); return int(m.group(1)) if m else 1
def offers(shop, mult_default, joja=False):
    out = {}
    sh = shops[shop]; mods = sh.get("PriceModifiers") or []
    shopMult = 1.0  # unconditional shop markup (SeedShop x2). Joja's conditional NonMemberMarkup is applied in the app.
    for m in mods:
        if m["Modification"] == "Multiply" and (m.get("Condition") is None): shopMult *= m["Amount"]
    for it in sh["Items"]:
        iid = (it.get("ItemId") or "")
        if not iid.startswith("(O)"): continue
        sid = iid[3:]
        if sid not in crops_raw: continue
        base = it["Price"] if it["Price"] and it["Price"] > 0 else O[sid]["Price"] * 2  # Object.salePrice() = Price*2
        if not it.get("IgnoreShopPriceModifiers"): base *= shopMult
        cond = it.get("Condition") or ""
        out.setdefault(sid, []).append({"price": round(base), "seasons": season_of(cond), "year": year_of(cond),
                                        "dow": (re.search(r"DAY_OF_WEEK (\w+)", cond) or [None, None])[1]})
    return out
pierre = offers("SeedShop", 2); joja = offers("Joja", 1); sandy = offers("Sandy", 1)
egg = {"745": [{"price": next(i["Price"] for i in shops["Festival_EggFestival_Pierre"]["Items"] if i["ItemId"] == "(O)745"), "seasons": ["spring"], "year": 1, "festival": "spring13"}]}
cart = {}
for it in shops["Traveler"]["Items"]:
    if it.get("ItemId") == "(O)347": cart["347"] = [{"price": it["Price"], "seasons": season_of(it["Condition"]), "year": 1}]
crops = []
for sid, c in crops_raw.items():
    h = c["HarvestItemId"]
    if h not in O or sid not in O: continue
    if any("LOCATION_IS_OUTDOORS" in (r.get("Condition") or "") and r["Result"] == "Deny" for r in c.get("PlantableLocationRules") or []): continue  # e.g. cactus: indoors only
    src = {}
    for name, tbl in (("pierre", pierre), ("joja", joja), ("oasis", sandy), ("egg", egg), ("cart", cart)):
        if sid in tbl: src[name] = tbl[sid]
    if not src: continue
    extra = c.get("ExtraHarvestChance") or 0
    yld = (c["HarvestMinStack"] + max(c["HarvestMinStack"], c["HarvestMaxStack"])) / 2 + (extra / (1 - extra) if extra < 1 else 0)
    crops.append({"seed": sid, "seedName": oname(sid), "item": h, "name": oname(h), "seasons": [s.lower() for s in c["Seasons"]],
                  "days": sum(c["DaysInPhase"]), "regrow": c["RegrowDays"], "raised": c["IsRaised"], "paddy": c["IsPaddyCrop"],
                  "yield": round(yld, 3), "sell": O[h]["Price"], "cat": O[h]["Category"], "shops": src})

# ---------- forage ----------
locs = game("Data/Locations.json")
LOC_ACCESS = {"Town": None, "Beach": None, "Mountain": None, "Forest": None, "BusStop": None, "Backwoods": None,
              "Railroad": "railroad", "Desert": "bus", "Woods": "woods", "IslandNorthCave1": "island"}
LOC_NAME = {"Town": "Pelican Town", "Beach": "the Beach", "Mountain": "the Mountain", "Forest": "Cindersap Forest",
            "BusStop": "the Bus Stop", "Backwoods": "the Backwoods", "Railroad": "the Railroad", "Desert": "the Calico Desert",
            "Woods": "the Secret Woods", "IslandNorthCave1": "Ginger Island (north cave)"}
forage = []
for L, d in locs.items():
    if L not in LOC_ACCESS: continue
    for f in d.get("Forage") or []:
        iid = f["ItemId"][3:]
        ss = [f["Season"].lower()] if f.get("Season") else (season_of((f.get("Condition") or "").replace("LOCATION_SEASON Here", "SEASON")) or SEASONS)
        forage.append({"item": iid, "loc": L, "seasons": ss, "chance": f.get("Chance")})
# Curated extra forage, each with a wiki citation (not in Locations.json Forage lists)
EXTRA_FORAGE = [
    {"item": "399", "loc": "Forest", "seasons": ["spring"], "note": "Spring Onions grow in a patch in the south of Cindersap Forest.", "src": WIKI + "Spring_Onion"},
    {"item": "296", "loc": "Forest", "seasons": ["spring"], "days": [15, 18], "note": "Salmonberry bushes fruit on Spring 15–18.", "src": WIKI + "Salmonberry"},
    {"item": "410", "loc": "Forest", "seasons": ["fall"], "days": [8, 11], "note": "Blackberry bushes fruit on Fall 8–11.", "src": WIKI + "Blackberry"},
    {"item": "393", "loc": "Beach", "seasons": SEASONS, "access": "bridge", "note": "Coral washes up in the tide pools east of the repaired bridge.", "src": WIKI + "Coral"},
    {"item": "397", "loc": "Beach", "seasons": SEASONS, "access": "bridge", "note": "Sea Urchins wash up in the tide pools east of the repaired bridge.", "src": WIKI + "Sea_Urchin"},
    {"item": "78", "loc": "Mine", "seasons": SEASONS, "access": "mine", "note": "Cave Carrots appear on Mines floors.", "src": WIKI + "Cave_Carrot"},
]
for e in EXTRA_FORAGE:
    forage.append({**e, "loc": e["loc"]})
LOC_NAME["Mine"] = "the Mines"

# ---------- heart events ----------
EV_LOC = {"Town": "Pelican Town", "Beach": "the Beach", "Mountain": "the Mountain", "Forest": "Cindersap Forest", "BusStop": "the Bus Stop",
          "Backwoods": "the Backwoods", "Railroad": "the Railroad", "Woods": "the Secret Woods", "Mine": "the Mines entrance",
          "Farm": "your Farm", "FarmHouse": "your farmhouse", "AnimalShop": "Marnie's Ranch", "ArchaeologyHouse": "the Museum",
          "BathHouse_Pool": "the Spa pool", "CommunityCenter": "the Community Center", "ElliottHouse": "Elliott's cabin",
          "FishShop": "Willy's Fish Shop", "HaleyHouse": "2 Willow Lane (Haley & Emily)", "HarveyRoom": "Harvey's apartment",
          "Hospital": "the Clinic", "JoshHouse": "1 River Road (Alex)", "LeahHouse": "Leah's cottage", "ManorHouse": "the Mayor's Manor",
          "Saloon": "the Stardrop Saloon", "SamHouse": "1 Willow Lane (Sam)", "ScienceHouse": "the Carpenter's Shop",
          "SebastianRoom": "Sebastian's room", "SeedShop": "Pierre's General Store", "Tent": "Linus' tent", "Trailer": "Pam's trailer",
          "Trailer_Big": "Pam's house", "WizardHouse": "the Wizard's Tower", "Sewer": "the Sewers", "Desert": "the Calico Desert",
          "SandyHouse": "the Oasis", "IslandSouth": "Ginger Island", "IslandWest": "Ginger Island (west)", "IslandNorth": "Ginger Island (north)",
          "IslandHut": "Ginger Island (Leo's hut)", "IslandFarmHouse": "your Island farmhouse", "Sunroom": "Caroline's sunroom",
          "BoatTunnel": "Willy's boat", "QiNutRoom": "Qi's Walnut Room"}
EV_ACCESS = {"Railroad": "railroad", "Woods": "woods", "Sewer": "sewer", "Desert": "bus", "SandyHouse": "bus", "BoatTunnel": "boat",
             "IslandSouth": "island", "IslandWest": "island", "IslandNorth": "island", "IslandHut": "island", "IslandFarmHouse": "island",
             "QiNutRoom": "qi"}
import os
from common import SRC
npcs = game("Data/Characters.json")
DAYS3 = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}
OK_CODES = {"f", "t", "w", "z", "d", "y", "e", "k", "o", "p", "a", "F", "u", "j", "U", "O", "H", "x", "*"}
events = []
for fn in sorted(os.listdir(os.path.join(SRC, "game", "Data", "Events"))):
    if "-" in fn or not fn.endswith(".json"): continue
    L = fn[:-5]
    if L in ("Temp", "DesertFestival", "AbandonedJojaMart"): continue
    for key in game("Data/Events/" + fn):
        parts = key.split("/")
        if not parts[0].lstrip("-").isdigit() or len(parts) < 2: continue
        ev = {"id": parts[0], "loc": L, "locName": EV_LOC.get(L, L), "access": EV_ACCESS.get(L), "f": [], "special": []}
        for p in parts[1:]:
            tok = p.split(" "); c = tok[0]
            if c == "f": ev["f"].append([tok[1], int(tok[2])])
            elif c == "t": ev["t"] = [int(tok[1]), int(tok[2])]
            elif c == "w": ev["w"] = tok[1]
            elif c == "z": ev.setdefault("notSeasons", []).extend(tok[1:])
            elif c == "d": ev.setdefault("notDays", []).extend(DAYS3[x] for x in tok[1:] if x in DAYS3)
            elif c == "y": ev["y"] = int(tok[1])
            elif c == "e": ev.setdefault("after", []).extend(tok[1:])
            elif c == "k": ev.setdefault("notAfter", []).extend(tok[1:])
            elif c == "o": ev["notMarriedTo"] = tok[1]
            elif c == "O": ev["marriedTo"] = tok[1]
            elif c == "u": ev["days"] = [int(x) for x in tok[1:]]
            elif c == "j": ev["minPlayed"] = int(tok[1])
            elif c in ("p", "a", "F", "U", "H", "x", "*"): pass
            elif c == "G" and "IS_PASSIVE_FESTIVAL_TODAY" in p and p.startswith("G !"): pass
            elif c in ("!D", "D", "L"): ev["special"].append(c)
            else: ev["special"].append(c)
        if not ev["f"]: continue
        who, pts = ev["f"][0]
        if who not in npcs: continue
        ev["npc"] = who; ev["hearts"] = pts // 250
        ev["others"] = ev["f"][1:]; del ev["f"]
        ev["special"] = sorted(set(ev["special"]))
        events.append(ev)
events.sort(key=lambda e: (e["npc"], e["hearts"]))

# ---------- story quests (wiki table) ----------
qt = wikitext("Quests")
sec = qt[qt.index("==List of Story Quests=="):]
sec = sec[:sec.index("\n|}")]
rows = [r for r in sec.split("\n|-\n")[1:]]
def strip(s):
    s = re.sub(r"\{\{Collapse.*", "", s, flags=re.S)
    s = re.sub(r"\[\[File:[^\]]*\]\]", "", s)
    s = re.sub(r"\{\{Price\|(\d+)\}\}", r"\1g", s)
    s = re.sub(r"\{\{Name\|([^|}]+)[^}]*\}\}", r"\1", s)
    s = re.sub(r"\{\{[^}]*\}\}", "", s)
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"<br\s*/?>", " ", s); s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"''+", "", s); s = s.replace("&ldquo;", "“").replace("&rdquo;", "”").replace("&#32;", " ")
    return re.sub(r"\s+", " ", s).strip()
QGATE = {  # access needed before the quest can be done (from the quest's own requirement text on the wiki)
    "The Skull Key": "skullkey", "Qi's Challenge": "skull", "Cryptic Note": "skull", "Dark Talisman": "ccdone",
    "Goblin Problem": "talisman", "The Pirate's Wife": "island", "The Mysterious Qi": "bus", "Strange Note": "woods",
    "Exotic Spirits": "bus", "Mayor's Need": None, "Pam Is Thirsty": None, "Staff of Power": None,
}
# Structured start triggers transcribed from the wiki "Requirements/Provided by" column above.
QTRIG = {
    "how-to-win-friends": {"after": ["introductions"]}, "raising-animals": {"after": ["getting-started"]},
    "advancement": {"after": ["getting-started"]}, "explore-the-mine": {"date": {"season": 0, "day": 5, "year": 1}},
    "deeper-in-the-mine": {"mine": 5}, "to-the-bottom": {"mine": 40}, "initiation": {"mine": 5},
    "rat-problem": {"date": {"season": 0, "day": 5, "year": 1}, "weather": "sun", "tip": "Walk into Pelican Town from the Bus Stop between 8am and 1pm on a sunny day."},
    "meet-the-wizard": {"after": ["rat-problem"]}, "smelting": {"after": ["forging-ahead"]},
    "the-skull-key": {"mine": 120}, "the-mysterious-qi-2": {"after": ["the-mysterious-qi"]},
    "the-mysterious-qi-3": {"after": ["the-mysterious-qi-2"]}, "the-mysterious-qi-4": {"after": ["the-mysterious-qi-3"]},
    "goblin-problem": {"after": ["dark-talisman"]}, "a-winter-mystery": {"seasons": [3], "tip": "Leave the Farm toward the Bus Stop in winter between 6am and 4pm."},
    "the-giant-stump": {"raccoon": 1},
}
QNPC_HEARTS = {"Marnie's Request": ["Marnie", 3], "Fish Casserole": ["Jodi", 4]}
quests = []; lastname = None
for r in rows:
    cells = [c for c in re.split(r"\n\|", "\n" + r) if c.strip()]
    if not cells: continue
    first = cells[0]
    m = re.match(r'id="([^"]+)"[^|]*\|(.*)', first)
    if m: name = strip(m.group(2)); cells = cells[1:]; lastname = name; idx = 1
    else:
        name = lastname; idx = sum(1 for q in quests if q["base"] == name) + 1
    cells = [re.sub(r'^(?:data-sort-value="[^"]*"|rowspan="\d+"|\s)*\|', "", c) if re.match(r'^(?:data-sort-value|rowspan)', c) else c for c in cells]
    if len(cells) < 3: continue
    text, prov, req = strip(cells[0]), strip(cells[1]), strip(cells[2])
    rew = strip(cells[3]) if len(cells) > 3 else ""
    if "Meadowlands" in prov: continue
    q = {"base": name, "id": re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") + ("" if idx == 1 else f"-{idx}"), "name": name + ("" if idx == 1 else f" ({idx})"),
         "text": text, "start": prov, "task": req, "reward": rew, "src": WIKI + "Quests#" + name.replace(" ", "_")}
    dm = re.search(r"Mail, (Spring|Summer|Fall|Winter) (\d+)(?:, Year (\d+))?", prov)
    if dm: q["date"] = {"season": SEASONS.index(dm.group(1).lower()), "day": int(dm.group(2)), "year": int(dm.group(3) or 1)}
    if name == "Introductions" or "Package in room at start" in prov: q["date"] = {"season": 0, "day": 1, "year": 1}
    if name in QGATE and QGATE[name]: q["gate"] = QGATE[name]
    if name in QNPC_HEARTS: q["hearts"] = QNPC_HEARTS[name]
    # item to deliver: first "Bring X a/an/N <item>" phrase that matches an object name
    bm = re.search(r"Bring (?:Mayor Lewis|the \w+|\w+) (?:a bottle of |one bunch of |some |an? |\d+ )?([\w' ]+?)\.", req)
    if bm:
        nm = bm.group(1).strip().lower()
        if nm in NAME2ID: q["item"] = NAME2ID[nm]
        cm = re.search(r"Bring (?:Mayor Lewis|\w+) (\d+) ", req)
        if cm: q["qty"] = int(cm.group(1))
    am = re.search(r"Bring (\w+)", req)
    if am and am.group(1) in npcs: q["npc"] = am.group(1)
    q.update(QTRIG.get(q["id"], {}))
    quests.append(q)
for q in quests: del q["base"]

# ---------- raccoon requests (wiki) ----------
RACCOON = {
    "src": WIKI + "Raccoon",
    "unlock": "A strong wind storm can fell the big tree in Cindersap Forest: 10% chance each night once the Greenhouse is built. Repair the Giant Stump with 100 Hardwood.",
    "unlockSrc": WIKI + "Random_Events#Strong_Wind_Storm",
    "gap": "A new request appears 7 days after the previous one is completed.",
    "stages": [
        {"n": 1, "task": "5 crab-pot fish (one kind) + 1 Smoked Fish", "items": ["372", "718", "716", "719", "723", "721", "717"], "artisan": "Fish Smoker"},
        {"n": 2, "task": "1 Dried Fruit + 1 Jelly of an in-season fruit", "artisan": "Dehydrator + Preserves Jar"},
        {"n": 3, "task": "1 Dried Mushrooms + 5 eggs, Cave Carrots or White Algae", "items": ["78", "157"], "artisan": "Dehydrator"},
        {"n": 4, "task": "1 Pickles + 1 Juice of an in-season vegetable", "artisan": "Preserves Jar + Keg"},
        {"n": 5, "task": "2 random items, e.g. 20 Bat Wing, 4 Coral, 8 Geodes, 3 Ghostfish, 10 Moss", "items": ["767", "684", "393", "72", "535", "156", "397"]},
        {"n": 6, "task": "Repeats one of the first five requests at random"},
    ],
}
RACCOON["stages"] = [s for s in RACCOON["stages"]]

# ---------- traveling cart pool ----------
# Traveling Cart standard stock, straight from the wiki's "Standard Stock" tables ("Items not shown are not sold at the
# Traveling Cart"). The old rule-of-thumb pool (IDs 2-789 with a price) wrongly included minerals like Quartz/Prismatic Shard.
_ct = wikitext("Traveling Cart")
_ss = _ct[_ct.index("==Standard Stock=="):]
_ss = _ss[:re.search(r"\n==[^=]", _ss[5:]).start() + 5]
_CART_ALIAS = {"Cookie": "Cookies", "Large Goat Milk": "L. Goat Milk"}
_byname = {}
for k, v in O.items():
    if k.isdigit(): _byname.setdefault(oname(k), []).append(int(k))
cartNames = re.findall(r"\{\{Name\|([^|}]+)", _ss)
cartUnmapped = [n for n in cartNames if _CART_ALIAS.get(n, n) not in _byname]
cartPool = sorted({i for n in cartNames for i in _byname.get(_CART_ALIAS.get(n, n), [])})
assert len(cartPool) > 250 and not cartUnmapped, cartUnmapped

# ---------- unlock & timing facts (wiki, cited) ----------
FACTS = {
    "rod": {"text": "Willy gives you a Bamboo Pole on Spring 2 (Year 1) when you visit the beach — no fishing before that.", "src": WIKI + "Quests#To_The_Beach"},
    "fishShop": {"text": "Willy's shop is open 9am–5pm; closed Saturdays unless it's raining.", "src": WIKI + "Fish_Shop"},
    "pierre": {"text": "Pierre's is open 9am–5pm and closed on Wednesdays until the Community Center is restored.", "src": WIKI + "Pierre%27s_General_Store"},
    "joja": {"text": "JojaMart sells seeds at a 25% markup unless you buy a Joja membership; it closes for good once the Community Center is restored.", "src": WIKI + "JojaMart"},
    "cart": {"text": "The Traveling Cart visits Cindersap Forest on Fridays and Sundays, 6am–8pm, plus every day of the Night Market (Winter 15–17) and Desert Festival (Spring 15–17). Stock is random.", "src": WIKI + "Traveling_Cart"},
    "railroad": {"text": "The Railroad opens after the earthquake on Summer 3, Year 1.", "src": WIKI + "Railroad"},
    "woods": {"text": "The Secret Woods are behind a large log in Cindersap Forest; you need a Steel Axe to cut it.", "src": WIKI + "Secret_Woods"},
    "sewer": {"text": "The Sewers need the Rusty Key, which Gunther mails you after 60 museum donations.", "src": WIKI + "The_Sewers"},
    "bus": {"text": "The bus to the Desert is repaired by the Vault bundles (or the Joja form, 40,000g).", "src": WIKI + "Bus_Stop"},
    "skull": {"text": "Skull Cavern needs the Skull Key (Mines floor 120) and the bus to the Desert.", "src": WIKI + "Skull_Cavern"},
    "island": {"text": "Willy's boat to Ginger Island needs the Community Center (or Joja) finished, then 200 Hardwood, 5 Iridium Bars and 5 Battery Packs; tickets are 1,000g.", "src": WIKI + "Willy%27s_Boat"},
    "greenhouse": {"text": "The Greenhouse is restored by the Pantry bundles (or the Joja form, 35,000g).", "src": WIKI + "Greenhouse"},
    "orders": {"text": "The Special Orders board next to Pierre's opens on Fall 2, Year 1.", "src": WIKI + "Quests#List_of_Special_Orders"},
    "qi": {"text": "Qi's Walnut Room opens after collecting 100 Golden Walnuts.", "src": WIKI + "Qi%27s_Walnut_Room"},
    "kegJar": {"text": "Preserves Jar recipe at Farming level 4, Keg at Farming level 8.", "src": WIKI + "Farming#Farming_Skill"},
    "artisan": {"text": "Wine sells for 3× the fruit; Juice 2.25× the vegetable; Jelly/Pickles 2× + 50g.", "src": WIKI + "Artisan_Goods"},
    "helpWanted": {"text": "The Help Wanted board outside Pierre's may post a random request every day except the first day; delivery requests pay 3× the item's price.", "src": WIKI + "Quests#Help_Wanted_Quests"},
    "rain": {"text": "Rain waters your crops for you, and some fish only bite in rain. Storms and Green Rain count as rain; windy and snowy days count as dry.", "src": WIKI + "Weather"},
    "mineFloors": {"text": "Mine fish: Ghostfish & Stonefish from floor 20, Ice Pip from floor 60, Lava Eel from floor 100.", "src": WIKI + "The_Mines"},
    "greenRain": {"text": "Green Rain happens once each Summer, on one of these days: 5, 6, 7, 14, 15, 16, 18 or 23. It covers about half of all grown trees in Moss, spawns large weeds worth 15 Foraging XP each, and farm Green Rain Trees can give Mossy Seeds.", "src": "https://stardewvalleywiki.com/Weather#Green_Rain"},
    "greenRainY1": {"text": "In Year 1, most villagers stay indoors during Green Rain (except Demetrius, Leah and Linus) and you can't give gifts.", "src": "https://stardewvalleywiki.com/Weather#Green_Rain"},
    "fixedWeather": {"text": "Always sunny on the 1st of Spring, Summer, Fall and Winter and on festival days; in Year 1, Spring 2, 4 and 5 are sunny and Spring 3 rains. Snow only falls in Winter (it never rains then), windy days only happen in Spring and Fall, and Spring has no storms in Year 1.", "src": "https://stardewvalleywiki.com/Modding:Weather_data"},
    "mines": {"text": "The Mines are blocked by a rockslide until Spring 5, Year 1. Every 5th floor is an elevator stop; floor 120 gives the Skull Key.", "src": WIKI + "The_Mines"},
    "backpack": {"text": "Pierre sells the Large Pack (24 slots) for 2,000g and the Deluxe Pack (36 slots) for 10,000g.", "src": WIKI + "Backpack"},
    "tools": {"text": "Clint upgrades tools in 2 days: Copper 2,000g + 5 Copper Bars, Steel 5,000g + 5 Iron Bars, Gold 10,000g + 5 Gold Bars, Iridium 25,000g + 5 Iridium Bars.", "src": WIKI + "Blacksmith"},
    "house": {"text": "Robin's first house upgrade (kitchen) costs 10,000g + 450 Wood; the second 65,000g + 100 Hardwood; the cellar 100,000g.", "src": WIKI + "Farmhouse"},
    "crabPot": {"text": "Crab Pots unlock at Fishing level 3 (craft them or buy from Willy for 1,500g).", "src": WIKI + "Crab_Pot"},
    "storm": {"text": "It is always stormy on Summer 13 and 26. Storms count as rain; lightning can hit your farm, and Lightning Rods (Foraging level 6) turn strikes into Battery Packs.", "src": "https://stardewvalleywiki.com/Weather#Storm"},
}

write("guide", {"crops": crops, "forage": forage, "forageLoc": LOC_NAME, "forageAccess": {**LOC_ACCESS, "Mine": "mine"},
                "events": events, "quests": quests, "raccoon": RACCOON, "cartPool": cartPool, "facts": FACTS},
      {"sources": [SOURCES["game"]["repo"] + "@" + SOURCES["game"]["commit"][:7] + " Data/Crops, Shops, Objects, Locations, Events",
                   WIKI + "Quests", WIKI + "Raccoon", WIKI + "Traveling_Cart", WIKI + "Weather"]})

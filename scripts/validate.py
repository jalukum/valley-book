#!/usr/bin/env python3
"""Spot-check the normalized data against facts from the Stardew Valley Wiki (1.6.15).
Expected values were read from the cited wiki pages; gift validations are live wiki diffs
produced by build_npcs.py / validate_gifts_items.py. Output: data/_validation.json"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import DATA, write

def L(n): return json.load(open(os.path.join(DATA, n + ".json")))["data"]
items = L("items"); npcs = L("npcs"); bundles = L("bundles"); sch = L("schedules")
perf = L("perfection"); rec = L("recipes"); ship = L("shipping"); fish = L("fish")
wal = L("walnuts"); mus = L("museum"); gv = L("_validation_gifts")
gvi = json.load(open(os.path.join(DATA, "_validation_gifts_by_item.json")))["_meta"]
spr = json.load(open(os.path.join(DATA, "sprites.json")))["data"]
def npc(n): return npcs[n] if isinstance(npcs, dict) and n in npcs else next(x for x in (npcs.values() if isinstance(npcs, dict) else npcs) if x["name"] == n)
def room(n): return next(r for r in bundles["rooms"] if r["name"] == n)
def nm(q): return items[q]["name"]
checks = []
def check(name, src, expected, actual):
    ok = expected == actual
    checks.append({"check": name, "source": src, "expected": expected, "actual": actual, "pass": ok})
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"\n   expected {expected}\n   actual   {actual}"))

W = "https://stardewvalleywiki.com/"
check("Abigail loves (personal + universal)", W + "Abigail#Gifts",
      sorted(["Amethyst", "Banana Pudding", "Blackberry Cobbler", "Chocolate Cake", "Monster Compendium", "Pufferfish",
              "Pumpkin", "Spicy Eel", "Golden Pumpkin", "Magic Rock Candy", "Pearl", "Prismatic Shard", "Rabbit's Foot", "Stardrop Tea"]),
      sorted(nm(q) for q in npc("Abigail")["gifts"]["love"]))
check("Abigail birthday", W + "Abigail", {"season": "Fall", "day": 13}, npc("Abigail")["birthday"])
check("Sebastian birthday", W + "Sebastian", {"season": "Winter", "day": 10}, npc("Sebastian")["birthday"])
check("Haley birthday", W + "Haley", {"season": "Spring", "day": 14}, npc("Haley")["birthday"])
check("Krobus birthday", W + "Krobus", {"season": "Winter", "day": 1}, npc("Krobus")["birthday"])
sc = next(b for b in room("Pantry")["bundles"] if b["name"] == "Spring Crops")
check("Spring Crops bundle items", W + "Bundles#Pantry", ["Parsnip", "Green Bean", "Cauliflower", "Potato"], [i["name"] for i in sc["items"]])
check("Spring Crops bundle reward", W + "Bundles#Pantry", {"name": "Speed-Gro", "count": 20}, {"name": sc["reward"]["name"], "count": sc["reward"]["count"]})
check("Vault 2,500g bundle", W + "Bundles#Vault", 2500, next(b for b in room("Vault")["bundles"] if "2,500" in b["name"] or "2500" in b["name"])["items"][0]["gold"])
check("Standard CC bundle count (incl. Missing Bundle)", W + "Bundles", 31, sum(len(r["bundles"]) for r in bundles["rooms"]))
check("Joja total cost (membership + 5 developments)", W + "Joja_Community_Development_Form", 135000, bundles["joja"]["total"])
wl = sch[ "Willy"] if isinstance(sch, dict) else next(x for x in sch if x["npc"] == "Willy")
reg = next(b for b in wl["blocks"] if b["condition"].lower().startswith("regular"))
check("Willy regular (sunny, non-Fri/Sat) schedule times", W + "Willy#Schedule",
      ["6:10 AM", "8:50 AM", "9:00 AM", "5:00 PM", "10:00 PM"], [e["time"] for e in reg["entries"]])
check("Willy works shop counter at 9:00 AM", W + "Willy#Schedule", True, "counter" in reg["entries"][2]["description"].lower())
check("Perfection weights sum to 100%", W + "Perfection", 100, sum(c["weightPercent"] for c in perf["categories"]))
check("Shipping (Farm & Forage) total", W + "Collections#Items_Shipped", 154, len(ship))
check("Fish collection total", W + "Fish", 72, sum(1 for f in fish if f.get("collection")))
check("Cooking recipes", W + "Cooking", 81, len(rec["cooking"]))
check("Crafting recipes counting for perfection", W + "Crafting", 149, sum(1 for r in rec["crafting"] if r.get("countsForPerfection", True)))
check("Golden Walnuts total", W + "Golden_Walnut", 130, sum(w.get("count", w.get("amount", 1)) for w in wal))
check("Museum donatable items", W + "Museum", 95, len(mus["items"]))
check("NPC gift tables: wiki-listed items mismatched (per NPC page)", "build_npcs.py vs wiki ==Gifts== tables", 0,
      sum(len(v["mismatches"]) for v in gv.values()))
checks.append({"check": "Item pages 'Gifts' sections vs computed tastes", "source": "validate_gifts_items.py",
               "expected": "<0.1% mismatch", "actual": f"{gvi['mismatches']}/{gvi['checked']}", "pass": gvi["mismatches"] / gvi["checked"] < 0.001})
print(("PASS " if checks[-1]["pass"] else "FAIL ") + checks[-1]["check"], checks[-1]["actual"])
cov = spr.get("coverage") if isinstance(spr, dict) else None
for g in ("portraits", "fish", "bundles", "rooms"):
    if cov and g in cov:
        check(f"Sprite coverage: {g}", "fetch_sprites.py", cov[g]["total"], cov[g]["found"])
p = sum(c["pass"] for c in checks)
print(f"\n{p}/{len(checks)} checks passed")
write("_validation", checks, {"passed": p, "total": len(checks)})

"""npcs.json: villagers, birthdays, family, portraits, fully-resolved gift tastes for every giftable object,
validated against each NPC's wiki ==Gifts== tables."""
import re, json
from common import *
import wikiapi as W, gifttaste as G

TASTES = ["love", "like", "neutral", "dislike", "hate"]
WIKI_TITLE = {"Mister Qi": "Mr. Qi", "Wizard": "Wizard", "Dwarf": "Dwarf", "Krobus": "Krobus", "Leo": "Leo"}

def giftable(it):
    return it["kind"] in ("object", "trinket") and it["type"] not in ("Quest", "Litter", "interactive") and it["category"] not in (-999,) \
        and it["id"] not in ("SeedSpot", "GoldCoin", "PetLicense") and not it.get("flavoredTemplate")

def infobox(t):
    m = re.search(r"\{\{Infobox villager(.*?)\n\}\}", t, re.S)
    out = {}
    if m:
        for line in m.group(1).split("\n|"):
            if "=" in line:
                k, v = line.split("=", 1); out[k.strip().lstrip("|")] = v.strip()
    return out

def wiki_gifts(t):
    i = t.find("==Gifts=="); j = t.find("\n==", i + 9)
    while j != -1 and t[j:j+4] == "\n===": j = t.find("\n==", j + 4)
    sec = t[i:j if j != -1 else None]
    out = {}
    for m in re.finditer(r"===\s*(Love|Like|Neutral|Dislike|Hate)\s*===(.*?)(?====|\Z)", sec, re.S):
        names = re.findall(r"\n\|\s*\[\[File:[^\]]+\]\]\s*\n\|\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", m.group(2))
        notes = [clean_wikitext(x) for x in re.findall(r"<li>(.*?)</li>", m.group(2))]
        out[m.group(1).lower()] = {"items": [b or a for a, b in names], "notes": notes}
    return out

def build():
    items = json.load(open(os.path.join(DATA, "items.json")))["data"]
    chars = game("Data/Characters.json")
    gt = G._gt()
    names = [k for k in gt if not k.startswith("Universal_")]
    gobj = {q: it for q, it in items.items() if giftable(it)}
    titles = {n: WIKI_TITLE.get(n, resolve(chars.get(n, {}).get("DisplayName") or n)) for n in names}
    pages = W.wikitext_many(list(titles.values()))
    U = G.universal()
    byname = {}
    for q, it in gobj.items():
        for nm in {it["name"].lower(), it["internalName"].lower()}:
            byname.setdefault(nm, []).append(q)
    ALIAS = {"large goat milk": "l. goat milk", "strange doll (green)": "strange doll", "strange doll (yellow)": "strange doll"}
    for a, b in ALIAS.items():
        if b in byname: byname[a] = byname[b]
    npcs, report = {}, {}
    for n in names:
        c = chars.get(n, {})
        t = pages.get(titles[n]) or ""
        ib = infobox(t)
        P = G.personal(n)
        tastes = {k: [] for k in TASTES}; reasons = {}
        for q, it in gobj.items():
            k, why = G.taste(n, it, U, P)
            tastes[k].append(q); reasons[q] = why
        wg = wiki_gifts(t)
        mism, unk = [], []
        for k, v in wg.items():
            for nm in v["items"]:
                qs = byname.get(nm.lower())
                if not qs: unk.append(nm); continue
                if not any(q in tastes[k] for q in qs):
                    got = next(kk for kk in TASTES if qs[0] in tastes[kk])
                    mism.append({"item": nm, "wiki": k, "computed": got, "reason": reasons[qs[0]]})
        report[n] = {"wikiListed": sum(len(v["items"]) for v in wg.values()), "mismatches": mism, "unmatchedNames": unk}
        bd = re.search(r"\{\{Season\|(\w+)\|(\d+)\}\}", ib.get("birthday", ""))
        npcs[n] = {
            "id": n, "name": resolve(c.get("DisplayName") or n), "wikiPage": titles[n], "wikiUrl": wiki_url(titles[n]),
            "birthday": {"season": c.get("BirthSeason") or (bd and bd.group(1)), "day": c.get("BirthDay") or (bd and int(bd.group(2)))},
            "romanceable": bool(c.get("CanBeRomanced")), "gender": c.get("Gender"), "age": c.get("Age"),
            "homeRegion": c.get("HomeRegion"), "address": clean_wikitext(ib.get("address", "")),
            "location": clean_wikitext(ib.get("location", "")),
            "family": {k: resolve(v) for k, v in (c.get("FriendsAndFamily") or {}).items()},
            "perfectionScore": c.get("PerfectionScore", True) if c else False,
            "portraitFile": ib.get("portrait") or f"{titles[n]}.png", "iconFile": f"{titles[n]} Icon.png",
            "giftDialogue": {k: gt[n].split("/")[i] for k, i in (("love", 0), ("like", 2), ("dislike", 4), ("hate", 6), ("neutral", 8))},
            "personalTastes": P,
            "gifts": tastes,
            "giftReasons": reasons,
            "wikiGiftNotes": {k: v["notes"] for k, v in wg.items()},
        }
    write("npcs", npcs, {"source": [SOURCES["game"], "wiki villager pages (infobox)"],
                         "license": [GAME_LICENSE, WIKI_LICENSE],
                         "gifts": "qualified item ids per taste, computed with scripts/gifttaste.py (1.6 precedence rules)",
                         "universalTastes": U})
    write("_validation_gifts", report, {"note": "computed tastes vs wiki ==Gifts== tables"})
    tot = sum(r["wikiListed"] for r in report.values()); bad = sum(len(r["mismatches"]) for r in report.values())
    print(f"NPCs {len(npcs)}; wiki-listed gifts checked {tot}; mismatches {bad}")
    for n, r in report.items():
        if r["mismatches"] or r["unmatchedNames"]: print(n, r["mismatches"][:5], r["unmatchedNames"][:8])

if __name__ == "__main__":
    build()

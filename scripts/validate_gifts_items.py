"""Second, independent gift check: every item's wiki page {{GiftsByItem|love=..|like=..}} vs computed tastes."""
import json, re, os
from common import DATA, write
import wikiapi as W
items = json.load(open(os.path.join(DATA, "items.json")))["data"]
npcs = json.load(open(os.path.join(DATA, "npcs.json")))["data"]
gift_q = set(q for n in npcs.values() for v in n["gifts"].values() for q in v)
titles = sorted({items[q]["name"] for q in gift_q})
pages = W.wikitext_many(titles)
taste_of = {n: {q: k for k, v in d["gifts"].items() for q in v} for n, d in npcs.items()}
name2q = {}
for q in gift_q: name2q.setdefault(items[q]["name"], []).append(q)
checked = mism = nopage = 0; out = []
for t in titles:
    txt = pages.get(t)
    blocks = re.findall(r"(==[^\n]*==)\s*\{\{GiftsByItem(.*?)\}\}", txt or "", re.S)
    if len(blocks) > 1:  # e.g. "Jellies and Pickles": pick the section for this item
        blocks = [b for b in blocks if t.lower() in b[0].lower()]
    m = blocks[0][1] if len(blocks) == 1 else None
    if not m: nopage += 1; continue
    for kv in m.split("|"):
        if "=" not in kv: continue
        k, v = kv.split("=", 1); k = k.strip()
        if k not in ("love", "like", "neutral", "dislike", "hate"): continue
        for npc in [x.strip() for x in v.split(",") if x.strip()]:
            if npc not in taste_of: continue
            checked += 1
            got = {taste_of[npc].get(q) for q in name2q[t]}
            if k not in got:
                mism += 1; out.append({"item": t, "npc": npc, "wiki": k, "computed": sorted(x for x in got if x)})
write("_validation_gifts_by_item", out, {"checked": checked, "mismatches": mism, "itemsWithoutGiftsByItem": nopage})
print(f"item pages {len(titles)}, no GiftsByItem {nopage}, npc-item pairs checked {checked}, mismatches {mism}")
for o in out[:40]: print(o)

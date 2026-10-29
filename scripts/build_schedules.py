"""schedules.json: every villager's wiki ==Schedule== section, as ordered (highest priority first) condition blocks."""
import re, json
from common import *
import wikiapi as W

def links(s):
    return list(dict.fromkeys(m.group(1).split("#")[0].strip() for m in re.finditer(r"\[\[([^\]|]+)(?:\|[^\]]*)?\]\]", s) if not m.group(1).startswith(("File:", "Category:"))))

def parse_condition(h):
    """light-weight structured hints for filtering in-app; raw text is always kept."""
    c = {}
    seasons = re.findall(r"\b(Spring|Summer|Fall|Winter)\b", h)
    if seasons: c["seasons"] = sorted(set(seasons), key=["Spring", "Summer", "Fall", "Winter"].index)
    days = re.findall(r"\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b", h)
    if days: c["weekdays"] = days
    if re.search(r"\b(Spring|Summer|Fall|Winter)\s+\d", h): c["dates"] = True
    if "Green Rain" in h: c["weather"] = "green rain"
    elif re.search(r"\bRain", h): c["weather"] = "rain"
    if re.search(r"Regular|Normal|Default", h, re.I): c["default"] = True
    if re.search(r"Marri|Spouse|married", h, re.I): c["marriage"] = True
    if re.search(r"Island|Resort", h, re.I): c["island"] = True
    m = re.search(r"\(([^)]+)\)", h)
    if m: c["requirement"] = m.group(1)
    return c

def parse_schedule(t):
    t = "\n" + t
    mm = re.search(r"\n==\s*Schedule\s*==[ \t]*\n", t)
    if not mm: return None
    j = mm.end()
    while True:
        j = t.find("\n==", j)
        if j < 0 or t[j:j+4] != "\n===": break
        j += 4
    sec = t[mm.end(): j if j > 0 else None]
    blocks, sub, notes, pos = [], None, [], 0
    BOLD = "'" * 3
    pat = re.compile(r"\n(===+)\s*([^=\n]+?)\s*===+|\{\{ScheduleHeader\|([^}]+)\}\}|\{\|(.*?)\n\|\}", re.S)
    for m in pat.finditer(sec):
        between = sec[pos:m.start()].strip()
        bold = None
        bm = re.search(BOLD + r"(.+?)" + BOLD + r"\s*$", between)
        if bm:
            bold = clean_wikitext(bm.group(1)); between = between[:bm.start()]
        between = re.sub(r"^\s*\|[-}]?\s*$", "", between, flags=re.M).strip()
        if between: notes.append({"subsection": sub, "text": clean_wikitext(between)})
        pos = m.end()
        if m.group(1) or m.group(3):
            sub = (m.group(2) or m.group(3)).strip(); continue
        tb = m.group(0)
        hm = re.search(r"\n!\s*(?:colspan=\"?\d\"?\s*\|)?([^\n]+)", tb)
        if not hm: continue
        head = clean_wikitext(hm.group(1))
        if re.search(r"\bTime\s*$", head):
            head = bold or sub or "Schedule"
        rows = []
        tb = re.sub(r"(\n\|[^\n]*?)\s*\|\|\s*", lambda x: x.group(1) + "\n|", tb)
        for r in re.split(r"\n\|-[^\n]*", tb)[1:]:
            cells = [c for c in re.split(r"\n\|(?!\})", "\n" + r.strip()) if c.strip()]
            cells = [re.sub(r"^style=\"[^\"]*\"\s*\|", "", c.strip()) for c in cells]
            if len(cells) < 2 or cells[0].startswith("!"): continue
            raw = "\n|".join(cells[1:])
            raw = re.sub(r"\n?\|\}\s*$", "", raw)
            quotes = [clean_wikitext(q) for q in re.findall(r"\"([^\"]{3,})\"", raw.replace("<br />", "\n"))]
            desc = re.sub(r"<br\s*/?>\s*\"[^\"]*\"", "", raw)
            rows.append({"time": clean_wikitext(cells[0]), "description": clean_wikitext(desc).strip(), "dialogue": quotes,
                         "locations": links(desc)})
        blocks.append({"priority": len(blocks), "subsection": sub, "condition": head,
                       "conditionTags": parse_condition(head + " " + (sub or "")), "entries": rows})
    tail = re.sub(r"^\s*\|[-}]?\s*$", "", sec[pos:], flags=re.M).strip()
    if tail: notes.append({"subsection": sub, "text": clean_wikitext(tail)})
    return {"notes": notes, "blocks": blocks}

def build():
    npcs = json.load(open(os.path.join(DATA, "npcs.json")))["data"]
    chars = game("Data/Characters.json")
    extra = [resolve(c.get("DisplayName") or k) for k, c in chars.items() if k not in npcs]
    titles = {n: d["wikiPage"] for n, d in npcs.items()}
    for e in extra: titles.setdefault(e, e)
    pages = W.wikitext_many(sorted(set(titles.values())))
    out, missing = {}, []
    for n, title in titles.items():
        s = parse_schedule(pages.get(title) or "")
        if not s or not (s["blocks"] or s["notes"]):
            missing.append(n); continue
        out[n] = {"npc": n, "wikiPage": title, "wikiUrl": wiki_url(title) + "#Schedule", **s}
    write("schedules", out, {"source": wiki_url("Abigail").rsplit("/", 1)[0] + "/<Villager>#Schedule",
                             "license": WIKI_LICENSE,
                             "note": "blocks are in the wiki's priority order (first matching block wins); raw condition text kept, conditionTags are heuristic"})
    print(f"schedules for {len(out)} NPCs, {sum(len(v['blocks']) for v in out.values())} blocks, "
          f"{sum(len(b['entries']) for v in out.values() for b in v['blocks'])} entries; none for: {missing}")

if __name__ == "__main__":
    build()

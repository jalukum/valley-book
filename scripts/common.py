"""Shared helpers: pinned sources, game-string resolution, output writing."""
import json, os, re, subprocess
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA = os.path.join(ROOT, "data")
SRC = os.path.join(ROOT, "cache", "src")
os.makedirs(DATA, exist_ok=True)

SOURCES = {
    "game": {  # unpacked SDV 1.6 Content (Data/*.json, Strings/*.json)
        "repo": "https://github.com/kronosta/stardew-data",
        "commit": "de69cb5ce6f3708a63d53ed414b757b39b3f105e",
    },
    "stardewapp": {  # MIT-licensed tracker data, used for cross-checks / walnut list
        "repo": "https://github.com/communitycenter/stardew.app",
        "commit": "7b27120442a4ee265f04fab2568c97521922f2d1",
    },
}
GAME_VERSION = "1.6.15"

def ensure_sources():
    for name, s in SOURCES.items():
        d = os.path.join(SRC, name)
        if not os.path.isdir(os.path.join(d, ".git")):
            subprocess.run(["git", "clone", "-q", s["repo"], d], check=True)
        head = subprocess.run(["git", "-C", d, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
        if head != s["commit"]:
            subprocess.run(["git", "-C", d, "fetch", "-q", "--depth", "50", "origin", s["commit"]], check=False)
            subprocess.run(["git", "-C", d, "checkout", "-q", s["commit"]], check=True)

def game(path):
    return json.load(open(os.path.join(SRC, "game", path), encoding="utf-8-sig"))

def sapp(path):
    return json.load(open(os.path.join(SRC, "stardewapp", path)))

_strings = {}
def gstr(asset):
    """asset like 'Strings\\Objects' -> dict"""
    a = asset.replace("\\", "/")
    if a not in _strings:
        p = os.path.join(SRC, "game", a + ".json")
        _strings[a] = json.load(open(p, encoding="utf-8-sig")) if os.path.exists(p) else {}
    return _strings[a]

TOKEN = re.compile(r"\[LocalizedText ([^:\]]+):([^\]\s]+)((?: [^\]]*)?)\]")
def resolve(text):
    """Resolve [LocalizedText Strings\\X:Key args] tokens to English."""
    if not text:
        return text
    def sub(m):
        s = gstr(m.group(1)).get(m.group(2))
        if s is None:  # some 1.6.9+ keys moved between assets; fall back to Strings\\Objects / 1_6_Strings
            for alt in ("Strings\\Objects", "Strings\\1_6_Strings", "Strings\\BigCraftables"):
                s = gstr(alt).get(m.group(2))
                if s is not None: break
        if s is None: s = m.group(0)
        args = m.group(3).split()
        for i, a in enumerate(args):
            s = s.replace("{%d}" % i, a)
        return s
    return TOKEN.sub(sub, text)

CATEGORIES = {
    0: "None", -2: "Gem", -4: "Fish", -5: "Egg", -6: "Milk", -7: "Cooking", -8: "Crafting",
    -9: "Big Craftable", -12: "Mineral", -14: "Meat", -15: "Metal Resource", -16: "Building Resource",
    -17: "Sell at Pierre's", -18: "Sell at Pierre's and Marnie's", -19: "Fertilizer", -20: "Trash",
    -21: "Bait", -22: "Fishing Tackle", -23: "Sell at Fish Shop", -24: "Decor", -25: "Cooking Ingredient",
    -26: "Artisan Goods", -27: "Syrup", -28: "Monster Loot", -29: "Equipment", -74: "Seed",
    -75: "Vegetable", -79: "Fruit", -80: "Flower", -81: "Forage", -95: "Hat", -96: "Ring",
    -97: "Boots", -98: "Weapon", -99: "Tool", -100: "Clothing", -101: "Trinket", -102: "Book",
    -103: "Skill Book", -999: "Litter",
}

def write(name, obj, meta=None):
    out = {"_meta": {"gameVersion": GAME_VERSION, **(meta or {})}, "data": obj}
    p = os.path.join(DATA, name + ".json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    n = len(obj) if hasattr(obj, "__len__") else "-"
    print(f"wrote data/{name}.json ({n} records, {os.path.getsize(p)//1024} KB)")

def wiki_url(title):
    return "https://stardewvalleywiki.com/" + title.replace(" ", "_")

WIKI_LICENSE = "CC BY-NC-SA 3.0 (Stardew Valley Wiki, https://stardewvalleywiki.com)"
GAME_LICENSE = "Game data/art (c) ConcernedApe; used for a non-commercial fan app"

def clean_wikitext(s):
    """Wiki markup -> plain text (links, templates we know, html)."""
    if s is None: return s
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"<ref[^>]*>.*?</ref>|<ref[^>]*/>", "", s, flags=re.S)
    s = re.sub(r"\[\[File:[^\]]*\]\]", "", s)
    s = re.sub(r"\{\{(?:Name|name)\|([^|}]+)\|(\d+)[^}]*\}\}", r"\1 (\2)", s)
    s = re.sub(r"\{\{(?:Name|name|NPC|Season|Price|Tooltip|Description)\|([^|}]+)(?:\|[^}]*)?\}\}", r"\1", s)
    s = re.sub(r"\{\{Quality\|([^|}]+)\|[^}]*\}\}", r"\1", s)
    s = re.sub(r"\{\{[Tt]ime\|([^}]+)\}\}", r"\1", s)
    s = re.sub(r"\[\[(?:[^|\]]*\|)?([^\]]*)\]\]", r"\1", s)
    s = re.sub(r"\[https?://\S+ ([^\]]+)\]", r"\1", s)
    s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = s.replace("'''", "").replace("''", "").replace("&nbsp;", " ")
    return re.sub(r"[ \t]+", " ", s).strip()

"""Tiny cached client for the Stardew Valley Wiki MediaWiki API (api.php).
index.php?action=raw is behind a Cloudflare challenge; api.php is not."""
import json, os, re, time, hashlib, urllib.parse, requests
API = "https://stardewvalleywiki.com/mediawiki/api.php"
UA = "sdv-companion-fanapp/0.1 (personal non-commercial; data pipeline)"
CACHE = os.path.join(os.path.dirname(__file__), "..", "cache", "wiki")
os.makedirs(CACHE, exist_ok=True)
S = requests.Session(); S.headers["User-Agent"] = UA

def _get(params):
    params = dict(params, format="json", formatversion="2")
    # python-requests gets a Cloudflare challenge on this host; curl does not.
    import subprocess
    cmd = ["curl", "-s", "-A", UA, API]  # POST form (long title lists)
    for k, v in params.items():
        cmd += ["--data-urlencode", f"{k}={v}"]
    for i in range(5):
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if r.stdout.startswith("{"):
            return json.loads(r.stdout)
        time.sleep(10 * (i + 1))
    raise RuntimeError(f"API failed: {params} :: {r.stdout[:200]}")

def _cpath(key):
    return os.path.join(CACHE, hashlib.md5(key.encode()).hexdigest() + ".json")

def wikitext_many(titles, refresh=False):
    """Return {title: wikitext} (follows redirects), batches of 50, cached."""
    out, todo = {}, []
    for t in titles:
        p = _cpath("wt:" + t)
        if not refresh and os.path.exists(p):
            out[t] = json.load(open(p))["text"]
        else:
            todo.append(t)
    for i in range(0, len(todo), 20):
        batch = todo[i:i+20]
        d = _get({"action": "query", "prop": "revisions", "rvprop": "content", "rvslots": "main",
                  "redirects": "1", "titles": "|".join(batch)})
        q = d["query"]; amap = {}
        for n in q.get("normalized", []): amap[n["from"]] = n["to"]
        rmap = {r["from"]: r["to"] for r in q.get("redirects", [])}
        pages = {p["title"]: p for p in q["pages"]}
        for t in batch:
            tt = amap.get(t, t); tt = rmap.get(tt, tt)
            pg = pages.get(tt, {})
            txt = pg.get("revisions", [{}])[0].get("slots", {}).get("main", {}).get("content") if "revisions" in pg else None
            json.dump({"title": tt, "text": txt}, open(_cpath("wt:" + t), "w"))
            out[t] = txt
        time.sleep(1.0)
    return out

def wikitext(title, refresh=False):
    return wikitext_many([title], refresh)[title]

def parse_html(title, refresh=False):
    p = _cpath("html:" + title)
    if not refresh and os.path.exists(p):
        return json.load(open(p))["html"]
    d = _get({"action": "parse", "page": title, "prop": "text", "redirects": "1", "disablelimitreport": "1"})
    html = d["parse"]["text"]
    json.dump({"html": html}, open(p, "w")); time.sleep(0.5)
    return html

def imageinfo_many(files):
    """files: ['File:Parsnip.png', ...] -> {file: {url,size,width,height,descriptionurl}}"""
    out = {}
    for i in range(0, len(files), 50):
        b = files[i:i+50]
        d = _get({"action": "query", "prop": "imageinfo", "iiprop": "url|size|sha1", "redirects": "1", "titles": "|".join(b)})
        q = d["query"]; norm = {n["to"]: n["from"] for n in q.get("normalized", [])}
        red = {r["to"]: r["from"] for r in q.get("redirects", [])}
        for pg in q["pages"]:
            t = pg["title"]; orig = red.get(t, t); orig = norm.get(orig, orig)
            ii = pg.get("imageinfo")
            out[orig] = ii[0] if ii else None
        time.sleep(0.3)
    return out

def category_members(cat, ns=None):
    res, cont = [], {}
    while True:
        params = {"action": "query", "list": "categorymembers", "cmtitle": cat, "cmlimit": "500", **cont}
        if ns is not None: params["cmnamespace"] = str(ns)
        d = _get(params); res += [m["title"] for m in d["query"]["categorymembers"]]
        if "continue" in d: cont = d["continue"]
        else: return res

def allpages(prefix="", ns=0):
    res, cont = [], {}
    while True:
        d = _get({"action": "query", "list": "allpages", "apprefix": prefix, "apnamespace": str(ns), "aplimit": "500", "apfilterredir": "nonredirects", **cont})
        res += [p["title"] for p in d["query"]["allpages"]]
        if "continue" in d: cont = d["continue"]
        else: return res

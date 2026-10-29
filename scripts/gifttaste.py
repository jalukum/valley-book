"""Re-implementation of SDV 1.6 NPC.getGiftTasteForThisItem() over Data/NPCGiftTastes + Data/Objects."""
from common import game
LOVE, LIKE, DISLIKE, HATE, NEUTRAL, STARDROP = "love", "like", "dislike", "hate", "neutral", "love"
_G = None
def _gt():
    global _G
    if _G is None: _G = game("Data/NPCGiftTastes.json")
    return _G

def _split(s): return (s or "").split()

def _cat_match(tokens, it, allow_zero=True):
    # Universal_Hate lists category "0" (uncategorized items: totems, slime eggs, fossils, jellies, sugar...)
    return (allow_zero or it["category"] != 0) and str(it["category"]) in tokens
def _id_match(tokens, it): return it["id"] in tokens
def _tag_match(tokens, it):
    tags = set(it["contextTags"])
    return any(t in tags for t in tokens if not t.lstrip("-").isdigit())

def universal():
    g = _gt()
    return {k: _split(g["Universal_" + k.capitalize()]) for k in (LOVE, LIKE, NEUTRAL, DISLIKE, HATE)}

def personal(npc):
    p = _gt()[npc].split("/")
    return {LOVE: _split(p[1]), LIKE: _split(p[3]), DISLIKE: _split(p[5]), HATE: _split(p[7]), NEUTRAL: _split(p[9]) if len(p) > 9 else []}

def taste(npc, it, U=None, P=None):
    """returns (taste, reason)"""
    if it["id"] == "StardropTea":
        return LOVE, "stardrop tea"
    U = U or universal(); P = P or personal(npc)
    t, why = NEUTRAL, "default"
    wasIndividual = skip = False
    for k in (LOVE, HATE, LIKE, DISLIKE):
        if _cat_match(U[k], it): t, why = k, "universal category"
    for k in (LOVE, HATE, LIKE, DISLIKE, NEUTRAL):
        if _tag_match(U[k], it):
            t, why = k, "universal tag"
            if k == NEUTRAL: skip = True
    for k in (LOVE, HATE, LIKE, DISLIKE, NEUTRAL):
        if _id_match(U[k], it):
            t, why, wasIndividual = k, "universal item", True
            if k == NEUTRAL: skip = True
    if it["type"] == "Arch":
        t, why = (LIKE, "artifact (Penny/Dwarf)") if npc in ("Penny", "Dwarf") else (DISLIKE, "artifact")
    if t == NEUTRAL and not skip:
        if it["edibility"] != -300 and it["edibility"] < 0: t, why = HATE, "inedible-negative edibility"
        elif it["price"] < 20: t, why = DISLIKE, "sell price < 20g"
    order = (LOVE, HATE, LIKE, DISLIKE, NEUTRAL)
    for k in order:
        if _id_match(P[k], it): return k, "personal item"
    for k in order:
        if _tag_match(P[k], it): return k, "personal tag"
    if not wasIndividual:
        for k in order:
            if _cat_match(P[k], it, allow_zero=False): return k, "personal category"
    return t, why

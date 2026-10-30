// Villager-to-villager relationships, curated from each villager's "Relationships"
// section and infobox (family / friends) on the Stardew Valley Wiki
// (https://stardewvalleywiki.com/<Name>, read Oct 2026). Every link is stored once
// as a pair with a label for each side, so the two directions can never drift apart.
// Label on side A is what B is to A ("Lewis: Marnie (secret romance)").
export type RelKind = 'family' | 'romance' | 'friend' | 'work' | 'rival';
export interface RelPair { a: string; b: string; aSees: string; bSees: string; kind: RelKind; }

const P = (a: string, b: string, aSees: string, bSees: string, kind: RelKind): RelPair => ({ a, b, aSees, bSees, kind });

export const REL_PAIRS: RelPair[] = [
  // Robin, Demetrius, Maru, Sebastian
  P('Robin', 'Demetrius', 'husband', 'wife', 'family'),
  P('Robin', 'Maru', 'daughter', 'mother', 'family'),
  P('Robin', 'Sebastian', 'son', 'mother', 'family'),
  P('Demetrius', 'Maru', 'daughter', 'father', 'family'),
  P('Demetrius', 'Sebastian', 'step-son', 'step-father', 'family'),
  P('Maru', 'Sebastian', 'half-brother', 'half-sister', 'family'),
  // Pierre, Caroline, Abigail
  P('Pierre', 'Caroline', 'wife', 'husband', 'family'),
  P('Pierre', 'Abigail', 'daughter', 'father', 'family'),
  P('Caroline', 'Abigail', 'daughter', 'mother', 'family'),
  // George, Evelyn, Alex
  P('George', 'Evelyn', 'wife', 'husband', 'family'),
  P('George', 'Alex', 'grandson', 'grandfather', 'family'),
  P('Evelyn', 'Alex', 'grandson', 'grandmother', 'family'),
  // Jodi, Kent, Sam, Vincent
  P('Jodi', 'Kent', 'husband', 'wife', 'family'),
  P('Jodi', 'Sam', 'son', 'mother', 'family'),
  P('Jodi', 'Vincent', 'son', 'mother', 'family'),
  P('Kent', 'Sam', 'son', 'father', 'family'),
  P('Kent', 'Vincent', 'son', 'father', 'family'),
  P('Sam', 'Vincent', 'little brother', 'big brother', 'family'),
  // Marnie, Shane, Jas
  P('Marnie', 'Jas', 'niece', 'aunt', 'family'),
  P('Marnie', 'Shane', 'nephew', 'aunt', 'family'),
  P('Shane', 'Jas', 'goddaughter', 'godfather', 'family'),
  // Pam, Penny; Emily, Haley
  P('Pam', 'Penny', 'daughter', 'mother', 'family'),
  P('Emily', 'Haley', 'sister', 'sister', 'family'),
  // romance / crush
  P('Lewis', 'Marnie', 'secret romance', 'secret romance', 'romance'),
  P('Clint', 'Emily', 'his crush', 'has a crush on her', 'romance'),
  // friends
  P('Jas', 'Vincent', 'friend', 'friend', 'friend'),
  P('Jas', 'Leo', 'friend (has a crush on her)', 'friend, his crush', 'friend'),
  P('Vincent', 'Leo', 'friend', 'friend', 'friend'),
  P('Sam', 'Sebastian', 'best friend, bandmate', 'best friend, bandmate', 'friend'),
  P('Sam', 'Abigail', 'friend, bandmate', 'friend, bandmate', 'friend'),
  P('Sebastian', 'Abigail', 'friend, bandmate', 'friend, bandmate', 'friend'),
  P('Sam', 'Penny', 'friend', 'friend', 'friend'),
  P('Maru', 'Penny', 'friend', 'friend', 'friend'),
  P('Alex', 'Haley', 'friend', 'friend', 'friend'),
  P('Caroline', 'Jodi', 'best friend', 'best friend', 'friend'),
  P('Elliott', 'Leah', 'friend', 'friend', 'friend'),
  P('Elliott', 'Willy', 'friend, neighbor', 'friend, neighbor', 'friend'),
  P('Emily', 'Sandy', 'friend (pen pal)', 'friend (pen pal)', 'friend'),
  P('Gus', 'Pam', 'friend, regular', 'friend', 'friend'),
  P('Linus', 'Leo', 'friend, neighbor', 'mentor ("Uncle Linus")', 'friend'),
  // work / school
  P('Harvey', 'Maru', 'assistant', 'boss at the clinic', 'work'),
  P('Gus', 'Emily', 'employee', 'boss at the saloon', 'work'),
  P('Penny', 'Jas', 'student', 'teacher', 'work'),
  P('Penny', 'Vincent', 'student', 'teacher', 'work'),
  P('Penny', 'Leo', 'student', 'teacher', 'work'),
  // rivals
  P('Dwarf', 'Krobus', 'rival (old war)', 'rival (old war)', 'rival'),
];

export interface Rel { who: string; rel: string; kind: RelKind; }
const KIND_ORDER: RelKind[] = ['family', 'romance', 'friend', 'work', 'rival'];

export function relationsOf(id: string): Rel[] {
  const out: Rel[] = [];
  for (const p of REL_PAIRS) {
    if (p.a === id) out.push({ who: p.b, rel: p.aSees, kind: p.kind });
    else if (p.b === id) out.push({ who: p.a, rel: p.bSees, kind: p.kind });
  }
  return out.sort((x, y) => KIND_ORDER.indexOf(x.kind) - KIND_ORDER.indexOf(y.kind));
}

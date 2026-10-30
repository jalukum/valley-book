import { Lk } from '../components/Link';
import { useState } from 'react';
import { heartsLabel } from '../lib/labels';
import { core, npcById, items } from '../data';
import { useProfile, toggle, isDone } from '../lib/state';
import { access, questDone, openQuests, eventGateOk, SEASON_NAMES } from '../lib/guide';
import { TopBar, Panel, Ui, Check, Seg, Sprite, ItemIcon, Bar, Empty } from '../components/ui';

type QF = 'open' | 'all' | 'done';

export function QuestsScreen() {
  const p = useProfile();
  const a = access(core, p);
  const [f, setF] = useState<QF>('open');
  const qs = core.guide.quests;
  const done = qs.filter((q) => questDone(p, q.id, a));
  const openIds = new Set(openQuests(core, p, a).map((q) => q.id));
  const avail = (q: typeof qs[number]) => openIds.has(q.id);
  const list = f === 'open' ? qs.filter(avail) : f === 'done' ? done : qs;
  return (
    <div className="screen">
      <TopBar title="Quests" back="#/progress" sub={`${done.length}/${qs.length} story quests`} />
      <Panel>
        <Bar value={done.length} max={qs.length} />
        <p className="hint">Story and mail quests from the wiki. Tick them as you finish — the daily guide stops suggesting them. Help Wanted requests on Pierre’s board are random each day, so they aren’t listed.</p>
        <Seg small value={f} onChange={setF} options={[{ v: 'open', label: 'Can do now' }, { v: 'all', label: 'All' }, { v: 'done', label: 'Done' }]} />
      </Panel>
      <Panel>
        {list.length ? (
          <div className="list">
            {list.map((q) => {
              const locked = !questDone(p, q.id, a) && !avail(q);
              return (
                <Check key={q.id} on={questDone(p, q.id, a)} onClick={() => toggle('quests', q.id)} dim={locked}
                  icon={q.item ? <ItemIcon qid={q.item} /> : q.npc && npcById[q.npc] ? <Sprite spr={npcById[q.npc].icon || npcById[q.npc].portrait} size={32} /> : <Ui k="Quest" size={28} />}
                  sub={<>{q.task}{q.reward ? ` · Reward: ${q.reward}` : ''}<span className="unlock">{locked ? 'Not available yet · ' : ''}Starts: {q.start}</span></>}>
                  {q.name}
                </Check>
              );
            })}
          </div>
        ) : <Empty>{f === 'open' ? 'No quests to do right now — check your mailbox tomorrow!' : f === 'done' ? 'Nothing ticked yet. Finished a quest? Tick it here.' : 'No quests.'}</Empty>}
      </Panel>
    </div>
  );
}

export function EventsScreen() {
  const p = useProfile();
  const a = access(core, p);
  const [f, setF] = useState<'ready' | 'all'>('ready');
  const evs = core.guide.events.filter((e) => npcById[e.npc]);
  const seen = evs.filter((e) => isDone(p, 'events', e.id)).length;
  const ready = (e: typeof evs[number]) => (p.hearts[e.npc] ?? 0) >= e.hearts && e.others.every((o) => (p.hearts[o.npc] ?? 0) >= o.hearts) && eventGateOk(e, a);
  const list = (f === 'ready' ? evs.filter((e) => !isDone(p, 'events', e.id) && ready(e)) : evs).slice().sort((x, y) => x.npc.localeCompare(y.npc) || x.hearts - y.hearts);
  return (
    <div className="screen">
      <TopBar title="Heart events" back="#/progress" sub={`${seen}/${evs.length} seen`} />
      <Panel>
        <Bar value={seen} max={evs.length} />
        <p className="hint">Cutscenes that play when you have enough hearts with someone. Set hearts on each villager’s page; tick scenes you’ve watched.</p>
        <Seg small value={f} onChange={setF} options={[{ v: 'ready', label: 'Ready to see' }, { v: 'all', label: 'All' }]} />
      </Panel>
      <Panel>
        {list.length ? (
          <div className="list">
            {list.map((e) => (
              <Check key={e.id} on={isDone(p, 'events', e.id)} onClick={() => toggle('events', e.id)} dim={!ready(e)}
                icon={<Sprite spr={npcById[e.npc].icon || npcById[e.npc].portrait} size={32} />}
                sub={<>{e.locName}{e.t ? ` · ${Math.floor(e.t[0] / 100) % 12 || 12}${e.t[0] >= 1200 ? 'pm' : 'am'}–${Math.floor(e.t[1] / 100) % 12 || 12}${e.t[1] >= 1200 && e.t[1] < 2400 ? 'pm' : 'am'}` : ''}{e.w ? ` · ${e.w === 'rainy' ? 'rain' : 'sunny'} only` : ''}{e.notSeasons?.length ? ` · not in ${e.notSeasons.map((s) => SEASON_NAMES[['spring', 'summer', 'fall', 'winter'].indexOf(s)]).join('/')}` : ''}{e.special.length ? ' · has extra conditions' : ''}</>}>
                {npcById[e.npc].name} · {heartsLabel(e.hearts)}
              </Check>
            ))}
          </div>
        ) : <Empty>No new heart scenes are ready. Gift and chat with villagers to earn more hearts!</Empty>}
      </Panel>
    </div>
  );
}

export function RaccoonScreen() {
  const p = useProfile();
  const r = core.guide.raccoon;
  const s = p.setup;
  return (
    <div className="screen">
      <TopBar title="Raccoons" back="#/progress" sub="Giant Stump requests" />
      <Panel title="How it starts" icon={<Ui k="Raccoon" size={24} />}>
        <p className="hint">{r.unlock}</p>
        <p className="hint">{r.gap}</p>
        <p className="hint">Status: {s.raccoon === 0 ? 'the tree hasn’t fallen yet' : s.raccoon === 1 ? 'the stump fell — repair it with 100 Hardwood' : `stump repaired · ${s.raccoonDone}/${r.stages.length} requests done`}. <Lk className="link" href="#/setup">Change ›</Lk></p>
      </Panel>
      <Panel title="Requests" icon={<Ui k="Raccoon" size={24} />}>
        <div className="list">
          {r.stages.map((st, i) => (
            <div key={st.n} className={'row static' + (i < s.raccoonDone ? ' done' : '') + (s.raccoon < 2 ? ' dim' : '')}>
              <span className="row-ic"><ItemIcon qid={st.items[0]} /></span>
              <span className="row-main"><b className="row-t">Request {st.n}</b><small>{st.task}{st.artisan ? ` · needs a ${st.artisan}` : ''}</small>
                {st.items.length > 1 && <span className="ings">{st.items.slice(0, 8).map((q) => <span key={q} className="ing"><ItemIcon qid={q} size={16} />{items[q]?.n}</span>)}</span>}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

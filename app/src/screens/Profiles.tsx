import { useRef, useState } from 'react';
import { useStore, switchProfile, deleteProfile, exportProfiles, parseImport, importProfiles } from '../lib/state';
import { TopBar, Panel, Ui, Chip, Sheet } from '../components/ui';
import { Onboarding } from '../components/Onboarding';
import { farmInfo, farmIconKey } from '../lib/farms';
import { core, SEASONS } from '../data';
import { ccProgress, perfection } from '../lib/progress';

export function ProfilesScreen() {
  const store = useStore();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const del = store.profiles.find((x) => x.id === deleting);
  const doImport = (t: string) => {
    try { const list = parseImport(t); importProfiles(list); setMsg(`Imported ${list.length} farm${list.length === 1 ? '' : 's'}.`); setText(''); }
    catch (e) { setMsg('Couldn’t read that: ' + (e as Error).message); }
  };
  const download = () => {
    const blob = new Blob([exportProfiles()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `valley-book-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const copy = async () => {
    const t = exportProfiles();
    try { await navigator.clipboard.writeText(t); setMsg('Copied all farms to the clipboard.'); } catch { setText(t); setMsg('Copy the text below.'); }
  };
  return (
    <div className="screen">
      <TopBar title="Farms" back="#/more" />
      <Panel title="Your farms" icon={<Ui k="Junimo" size={24} />}>
        <div className="list">
          {store.profiles.map((p) => {
            const on = p.id === store.activeId;
            return (
              <div key={p.id} className={'row farm' + (on ? ' active' : '')}>
                <button className="row-btn" onClick={() => switchProfile(p.id)} aria-pressed={on}>
                  <span className={'radio' + (on ? ' on' : '')} aria-hidden />
                  <span className="farm-ic" title={farmInfo(p.farmType).name + ' Farm'}><Ui k={farmIconKey(p.farmType)} size={30} /></span>
                  <span className="row-main"><span className="row-t">{p.name}</span><span className="row-s">{farmInfo(p.farmType).name} Farm · {SEASONS[p.date.season]} {p.date.day}, Year {p.date.year} · CC {Math.floor(ccProgress(core, p).percent)}% · Perfection {perfection(core, p).percent}%</span></span>
                </button>
                <span className="farm-act">
                  <button className="btn sm" onClick={() => setEditing(p.id)}>Edit</button>
                  {store.profiles.length > 1 && <button className="btn sm danger" onClick={() => setDeleting(p.id)}>Delete</button>}
                </span>
              </div>
            );
          })}
        </div>
        <button className="btn wide" onClick={() => setAdding(true)}>+ Add a farm</button>
      </Panel>
      <Panel title="Backup & move" icon={<Ui k="Gift" size={24} />}>
        <p className="hint">Progress is saved on this device only. Export to keep a backup or move it to another phone.</p>
        <div className="chips">
          <Chip onClick={download}>Download file</Chip>
          <Chip onClick={copy}>Copy as text</Chip>
          <Chip onClick={() => fileRef.current?.click()}>Import file</Chip>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json,text/plain" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) doImport(await f.text()); e.target.value = ''; }} />
        <textarea className="ta" value={text} onChange={(e) => setText(e.target.value)} placeholder="Or paste exported text here" rows={4} />
        <button className="btn wide" disabled={!text.trim()} onClick={() => doImport(text)}>Import pasted text</button>
        {msg && <p className="hint strong" role="status">{msg}</p>}
      </Panel>
      <div className="foot-links"><a href="#/about">About</a></div>
      {adding && <Onboarding mode="new" onClose={() => setAdding(false)} />}
      {editing && <Onboarding mode="edit" profileId={editing} onClose={() => setEditing(null)} />}
      <Sheet open={!!del} onClose={() => setDeleting(null)} title="Delete this farm?" closeLabel="Keep">
        {del && <>
          <p>“{del.name}” and all its progress will be removed from this device. This can’t be undone — download a backup first if you might want it back.</p>
          <div className="confirm-acts">
            <button className="btn" onClick={() => setDeleting(null)}>Keep it</button>
            <button className="btn danger" onClick={() => { deleteProfile(del.id); setDeleting(null); }}>Delete farm</button>
          </div>
        </>}
      </Sheet>
    </div>
  );
}

export function AboutScreen() {
  return (
    <div className="screen">
      <TopBar title="About" back="#/more" />
      <Panel className="about">
        <Ui k="Junimo" size={48} eager />
        <h2>Valley Book</h2>
        <p>A pocket companion for Stardew Valley: bundles, villagers, collections and perfection, all offline.</p>
        <p className="small">Unofficial fan app. Not affiliated with ConcernedApe.</p>
      </Panel>
      <Panel title="Credits">
        <ul className="ul">
          <li>Game data and text from the <a href="https://stardewvalleywiki.com" target="_blank" rel="noreferrer">Stardew Valley Wiki</a>, licensed <a href="https://creativecommons.org/licenses/by-nc-sa/3.0/" target="_blank" rel="noreferrer">CC BY-NC-SA 3.0</a>.</li>
          <li>Stardew Valley art and sprites © ConcernedApe.</li>
          <li>Some data structure from <a href="https://github.com/stardewapp/stardewapp" target="_blank" rel="noreferrer">stardew.app</a> (MIT).</li>
        </ul>
        <p className="hint">Data for Stardew Valley 1.6. Your progress stays on your device.</p>
      </Panel>
      <Panel title="How the daily guide works">
        <ul className="ul">
          <li>Crops, shops, forage spots, heart events and weather rules come from the game’s own data files via <a href="https://github.com/kronosta/stardew-data" target="_blank" rel="noreferrer">kronosta/stardew-data</a> (Data/Crops, Shops, Objects, Locations, Events).</li>
          <li>Which weather can happen on each date (fixed days, storms on Summer 13 and 26, green rain days, no snow outside winter) follows the wiki’s <a href="https://stardewvalleywiki.com/Weather" target="_blank" rel="noreferrer">Weather</a> and <a href="https://stardewvalleywiki.com/Modding:Weather_data" target="_blank" rel="noreferrer">Modding:Weather data</a> pages.</li>
          <li>Quests, raccoon requests and Traveling Cart rules come from the wiki’s <a href="https://stardewvalleywiki.com/Quests" target="_blank" rel="noreferrer">Quests</a>, <a href="https://stardewvalleywiki.com/Raccoon" target="_blank" rel="noreferrer">Raccoon</a>, <a href="https://stardewvalleywiki.com/Traveling_Cart" target="_blank" rel="noreferrer">Traveling Cart</a> and <a href="https://stardewvalleywiki.com/Weather" target="_blank" rel="noreferrer">Weather</a> pages.</li>
          <li>Profits are base quality sell prices minus seed cost. Artisan goods (wine, juice, jelly, pickles) only count once you have Farming 4 (jars) or 8 (kegs).</li>
          <li>Your farm map (Farms › Edit) adds what the wiki’s <a href="https://stardewvalleywiki.com/Farm_Maps" target="_blank" rel="noreferrer">Farm Maps</a> page says it has: fish in the farm’s own water, Forest and Beach farm forage, Large Stumps, the Hill-top quarry, Wilderness night monsters and the Meadowlands coop.</li>
          <li>Random things — Help Wanted requests, cart stock, which Special Orders are posted — can’t be predicted, so the guide only says what’s possible.</li>
        </ul>
        <h3 className="sh3">Facts the guide relies on</h3>
        <ul className="ul">
          {Object.entries(core.guide.facts).map(([k, f]) => <li key={k}>{f.text} <a href={f.src} target="_blank" rel="noreferrer">Source</a></li>)}
        </ul>
      </Panel>
    </div>
  );
}

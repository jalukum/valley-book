import { useRef, useState, type ReactNode } from 'react';
import { core, SEASONS } from '../data';
import { useProfile, newProfile, importProfiles, replaceProfile, exportProfiles } from '../lib/state';
import { readSave, applySave, newFromSave, partLine, IMPORT_PARTS, PART_LABEL, type ImportPart, type SaveData } from '../lib/saveimport';
import { farmInfo, farmIconKey } from '../lib/farms';
import { Panel, Ui, ItemIcon, Seg, Sheet } from './ui';

type Plat = 'pc' | 'android' | 'ios';
const PART_ICON: Record<ImportPart, ReactNode> = {
  date: <Ui k="Calendar" size={28} />, cc: <Ui k="Junimo Bundle" size={28} />, fish: <ItemIcon qid="(O)145" size={28} />, shipping: <Ui k="Gold" size={28} />,
  museum: <Ui k="Museum" size={28} />, recipes: <Ui k="Cooking" size={28} />, friends: <Ui k="Heart" size={28} />, unlocks: <Ui k="Quest" size={28} />,
};

export function downloadBackup() {
  const blob = new Blob([exportProfiles()], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `valley-book-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function SaveImport() {
  const p = useProfile();
  const [doneMsg, onDone] = useState('');
  const [plat, setPlat] = useState<Plat>('pc');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<SaveData | null>(null);
  const [parts, setParts] = useState<Set<ImportPart>>(new Set(IMPORT_PARTS));
  const [confirm, setConfirm] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const close = () => { setFound(null); setConfirm(false); setBackedUp(false); };
  const read = async (f: File) => {
    setErr(''); onDone(''); setBusy(true);
    try { const s = readSave(core, await f.text()); setParts(new Set(IMPORT_PARTS)); setFound(s); }
    catch (e) { setErr((e as Error).message || 'Couldn’t read that file.'); }
    finally { setBusy(false); }
  };
  const flip = (k: ImportPart) => setParts((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const list = IMPORT_PARTS.filter((k) => parts.has(k)).map((k) => PART_LABEL[k].toLowerCase());
  const addNew = () => { if (!found) return; const np = newFromSave(found, parts, newProfile()); importProfiles([np]); close(); onDone(`Added ${np.name} from your save.`); };
  const doUpdate = () => { if (!found) return; replaceProfile(applySave(p, found, parts)); close(); onDone(`Updated ${p.name} from your save: ${list.join(', ')}.`); };
  return (
    <Panel title="Import your game save" icon={<Ui k="Mail" size={24} />}>
      <p className="hint">Fill in a farm from your real save: date, bundles, fish, shipping, museum, recipes and friendships.</p>
      <Seg small value={plat} onChange={setPlat} options={[{ v: 'pc', label: 'PC / Mac / Linux' }, { v: 'android', label: 'Android' }, { v: 'ios', label: 'iOS' }]} />
      <div className="steps" style={{ marginTop: 10 }}>
        {plat === 'pc' && <div className="step"><span className="step-n">1</span><div className="step-b"><b>Open your saves folder</b>Windows: press Win+R and paste
          <code className="path">%appdata%\StardewValley\Saves</code><span style={{ display: 'block', marginTop: 6 }}>Mac and Linux:</span><code className="path">~/.config/StardewValley/Saves</code></div></div>}
        {plat === 'android' && <div className="step"><span className="step-n">1</span><div className="step-b"><b>Find the saves folder</b>In a file manager, open
          <code className="path">Android/data/com.chucklefish.stardewvalley/files/Saves</code>Newer Android versions can hide this folder. If you can’t see it, copy it to a computer first.</div></div>}
        {plat === 'ios' && <div className="step"><span className="step-n">1</span><div className="step-b"><b>Open the Files app</b>Go to <i>On My iPhone › Stardew Valley</i>. Your farm folders are there.</div></div>}
        <div className="step"><span className="step-n">2</span><div className="step-b"><b>Pick your farm’s file</b>Open the folder named like <i>{(p.name || 'Farm').replace(/\s+/g, '')}_123456789</i> and choose the file with the same name, not <i>SaveGameInfo</i>.</div></div>
      </div>
      <div className="drop" style={{ marginTop: 12 }}>
        <Ui k="Junimo" size={32} />
        <span>The file stays on this phone. Nothing is uploaded.</span>
        <button className="btn primary" data-sfx="tap" disabled={busy} onClick={() => file.current?.click()}>{busy ? 'Reading…' : 'Choose save file'}</button>
        <input ref={file} type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) read(f); e.target.value = ''; }} />
      </div>
      {err && <p className="hint strong" role="alert">{err}</p>}
      {doneMsg && <p className="hint strong" role="status">{doneMsg}</p>}
      <p className="cfoot">Works with saves from Stardew Valley 1.5 and 1.6. Fill in the rest on the Setup and Goals pages.</p>

      <Sheet open={!!found} onClose={close} title={confirm ? `Update ${p.name}?` : 'Found your farm'} closeLabel="Cancel">
        {found && !confirm && <>
          <div className="imp-farm"><Ui k={farmIconKey(found.farmType)} size={36} /><span><b>{found.farmName} Farm</b><small>Farmer {found.farmer} · {farmInfo(found.farmType).name} Farm · {SEASONS[found.date.season]} {found.date.day}, Year {found.date.year}</small></span></div>
          <p className="hint" style={{ margin: '0 0 6px' }}>Tick what to bring in. Each line replaces what Valley Book has now.</p>
          <div className="list">
            {IMPORT_PARTS.map((k) => { const on = parts.has(k); return (
              <div key={k} className={'row bitem' + (on ? ' on' : '')}>
                <button className={'row-btn' + (on ? ' on' : '')} aria-pressed={on} onClick={() => flip(k)}>
                  <span className="box" aria-hidden /><span className="row-ic">{PART_ICON[k]}</span>
                  <span className="row-main"><span className="row-t">{PART_LABEL[k]}</span><span className="row-s">{partLine(found, k, p)}</span></span>
                </button>
              </div>); })}
          </div>
          <p className="cfoot">Kept as they are: your notes, stars and Valley Book settings.{found.cc.unmatched.length ? ` Not matched: ${found.cc.unmatched.join(', ')}.` : ''}</p>
          <div className="imp-acts">
            <button className="btn" data-sfx="tap" disabled={!parts.size} onClick={addNew}>Add as new farm</button>
            <button className="btn primary" data-sfx="tap" disabled={!parts.size} onClick={() => setConfirm(true)}>Update {p.name}</button>
          </div>
        </>}
        {found && confirm && <>
          <p>This replaces {list.join(', ')} on “{p.name}” with what’s in your save. It can’t be undone.</p>
          <p className="hint">Save a backup first so you can go back if anything looks wrong.</p>
          <div className="imp-acts">
            <button className="btn" data-sfx="save" onClick={() => { downloadBackup(); setBackedUp(true); }}>{backedUp ? 'Backup saved ✓' : 'Download backup'}</button>
            <button className="btn primary" data-sfx="save" onClick={doUpdate}>Update now</button>
          </div>
          <button className="btn wide" onClick={() => setConfirm(false)}>Back</button>
        </>}
      </Sheet>
    </Panel>
  );
}

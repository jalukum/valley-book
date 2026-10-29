import { core } from '../data';
import { useProfile, update, type Auto } from '../lib/state';
import { access } from '../lib/guide';
import { worldFlags } from '../lib/progress';
import { TopBar, Panel, Ui, Seg, Stepper, Check } from '../components/ui';

const TOOL_LV = ['Basic', 'Copper', 'Steel', 'Gold', 'Iridium'];
const TOOLS: [keyof ReturnType<typeof useProfile>['setup']['tools'], string, string][] = [['pickaxe', 'Pickaxe', 'Pickaxe'], ['axe', 'Axe', 'Axe'], ['hoe', 'Hoe', 'Hoe'], ['can', 'Watering can', 'Watering Can']];
const KEYS: [string, string, string][] = [
  ['skullKey', 'Skull Key', 'From the bottom of the Mines (floor 120).'],
  ['rustyKey', 'Rusty Key', 'Opens the Sewers (60 museum donations).'],
  ['talisman', 'Dark Talisman', 'Opens the Mutant Bug Lair and Witch’s Swamp.'],
  ['boat', 'Willy’s boat repaired', 'Ginger Island trips.'],
  ['qi', 'Qi’s Walnut Room open', '100 Golden Walnuts.'],
];
const AutoSeg = ({ v, on }: { v: Auto; on: (v: Auto) => void }) => <Seg small value={v} onChange={on} options={[{ v: 'auto', label: 'Auto' }, { v: 'yes', label: 'Yes' }, { v: 'no', label: 'No' }]} />;

function Line({ icon, label, sub, children }: { icon?: React.ReactNode; label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="set-line">
      {icon && <span className="row-ic">{icon}</span>}
      <span className="row-main"><b>{label}</b>{sub && <small>{sub}</small>}</span>
      <span className="set-ctl">{children}</span>
    </div>
  );
}

/** The “Where are you in the game?” questions. `quick` = the short version shown during onboarding. */
export function SetupForm({ quick }: { quick?: boolean }) {
  const p = useProfile();
  const s = p.setup;
  const a = access(core, p);
  const wf = worldFlags(core, p);
  return (
    <>
      <Panel title="Path" icon={<Ui k="Community Center" size={24} />}>
        <Line label="Community Center or Joja?" sub="Most players restore the Community Center.">
          <Seg small value={p.cc.route} onChange={(v) => update((x) => { x.cc.route = v; })} options={[{ v: 'cc', label: 'CC' }, { v: 'joja', label: 'Joja' }]} />
        </Line>
      </Panel>
      <Panel title="Mines & caves" icon={<Ui k="Pickaxe" size={24} />}>
        <Line label="Deepest Mines floor" sub={a.minesOpen ? 'Elevator floors are every 5.' : 'The Mines open on Spring 5.'}>
          <Stepper value={s.mine} max={120} onChange={(v) => update((x) => { x.setup.mine = Math.round(v); })} label="Mines floor" />
        </Line>
        <input className="range" type="range" min={0} max={120} step={5} value={s.mine} onChange={(e) => update((x) => { x.setup.mine = Number(e.target.value); })} aria-label="Mines floor" />
        {!quick && <Line label="Deepest Skull Cavern floor"><Stepper value={s.skullDepth} max={999} onChange={(v) => update((x) => { x.setup.skullDepth = v; })} label="Skull Cavern floor" /></Line>}
        {!quick && <Line label="Skull Cavern open" sub={`Auto: ${a.skull ? 'open' : 'needs the Skull Key and the bus'}`}><AutoSeg v={s.skull} on={(v) => update((x) => { x.setup.skull = v; })} /></Line>}
      </Panel>
      <Panel title="Bag & tools" icon={<Ui k="Backpack" size={24} />}>
        <Line label="Backpack" sub="Slots in your inventory">
          <Seg small value={String(s.backpack) as '12' | '24' | '36'} onChange={(v) => update((x) => { x.setup.backpack = Number(v) as 12 | 24 | 36; })} options={[{ v: '12', label: '12' }, { v: '24', label: '24' }, { v: '36', label: '36' }]} />
        </Line>
        {TOOLS.map(([k, label, qid]) => (
          <Line key={k} icon={<Ui k={qid} size={28} />} label={label} sub={TOOL_LV[s.tools[k]]}>
            <Stepper value={s.tools[k]} max={4} onChange={(v) => update((x) => { x.setup.tools[k] = v; })} label={label + ' level'} />
          </Line>
        ))}
        <Line icon={<Ui k="Bamboo Pole" size={28} />} label="Fishing rod" sub={s.rod === 'auto' ? (a.rod ? 'Auto: you have the Bamboo Pole' : 'Auto: Willy gives you one on Spring 2') : undefined}>
          <select className="sel" value={s.rod} onChange={(e) => update((x) => { x.setup.rod = e.target.value as typeof s.rod; })} aria-label="Fishing rod">
            <option value="auto">Auto</option><option value="none">None yet</option><option value="bamboo">Bamboo</option><option value="fiberglass">Fiberglass</option><option value="iridium">Iridium</option>
          </select>
        </Line>
      </Panel>
      <Panel title="Skills" icon={<Ui k="skill:Farming" size={24} />}>
        {core.perfection.skills.map((k: string) => (
          <Line key={k} icon={<Ui k={'skill:' + k} size={24} />} label={k}>
            <Stepper value={p.perf.skills[k] ?? 0} max={10} onChange={(v) => update((x) => { x.perf.skills[k] = v; })} label={k + ' level'} />
          </Line>
        ))}
        <p className="hint">Farming 4 unlocks jars and Farming 8 unlocks kegs, so the guide starts counting artisan profits. Fishing 3 unlocks crab pots.</p>
      </Panel>
      <Panel title="Places & unlocks" icon={<Ui k="Bus" size={24} />}>
        <Line label="Community Center restored" sub={`Auto: ${wf.ccRestored ? 'yes' : 'not yet'} — from your bundles. Changes some villager schedules.`}>
          <AutoSeg v={p.flags.cc} on={(v) => update((x) => { x.flags.cc = v; })} />
        </Line>
        <Line label="Bus to the Desert" sub={`Auto: ${a.bus ? 'running' : 'not yet'} — from your ${p.cc.route === 'joja' ? 'Joja' : 'Vault'} progress`}>
          <AutoSeg v={p.flags.bus} on={(v) => update((x) => { x.flags.bus = v; })} />
        </Line>
        <Line label="Greenhouse" sub={`Auto: ${a.greenhouse ? 'restored' : 'not yet'} — from the Pantry`}>
          <AutoSeg v={s.greenhouse} on={(v) => update((x) => { x.setup.greenhouse = v; })} />
        </Line>
        <Line label="Ginger Island" sub={`Auto: ${a.island ? 'open' : 'not yet'}`}>
          <AutoSeg v={s.island} on={(v) => update((x) => { x.setup.island = v; })} />
        </Line>
        {!quick && <Line label="Beach bridge repaired"><Seg small value={p.flags.bridge ? 'yes' : 'no'} onChange={(v) => update((x) => { x.flags.bridge = v === 'yes'; })} options={[{ v: 'yes', label: 'Yes' }, { v: 'no', label: 'No' }]} /></Line>}
        {!quick && <Line label="House" sub={['Starter cabin', 'Kitchen', 'Nursery', 'Cellar'][s.house]}><Stepper value={s.house} max={3} onChange={(v) => update((x) => { x.setup.house = v as 0 | 1 | 2 | 3; })} label="House upgrades" /></Line>}
      </Panel>
      {!quick && (
        <Panel title="Key items" icon={<Ui k="Skull Key" size={24} />}>
          <div className="list">
            {KEYS.map(([k, label, sub]) => (
              <Check key={k} on={!!s.keys[k]} onClick={() => update((x) => { x.setup.keys[k] = !x.setup.keys[k]; })} sub={sub}>{label}</Check>
            ))}
          </div>
        </Panel>
      )}
      {!quick && (
        <Panel title="Raccoons" icon={<Ui k="Raccoon" size={24} />}>
          <Line label="Giant Stump" sub={core.guide.raccoon.unlock}>
            <Seg small value={String(s.raccoon) as '0' | '1' | '2'} onChange={(v) => update((x) => { x.setup.raccoon = Number(v) as 0 | 1 | 2; })} options={[{ v: '0', label: 'Not yet' }, { v: '1', label: 'Fell' }, { v: '2', label: 'Fixed' }]} />
          </Line>
          <Line label="Raccoon requests done"><Stepper value={s.raccoonDone} max={core.guide.raccoon.stages.length} onChange={(v) => update((x) => { x.setup.raccoonDone = v; })} label="Raccoon requests" /></Line>
        </Panel>
      )}
    </>
  );
}

export function SetupScreen() {
  return (
    <div className="screen">
      <TopBar title="Where are you?" back="#/progress" sub="Your farm’s progress" />
      <p className="hint">Tell the app what you’ve unlocked so the daily guide only suggests things you can do. “Auto” works it out from your bundles and the date.</p>
      <SetupForm />
    </div>
  );
}

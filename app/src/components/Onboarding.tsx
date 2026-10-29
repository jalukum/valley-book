import { useState } from 'react';
import { SEASONS, weekday } from '../data';
import { useProfile, useStore, update, setUi, getUi, addProfile, renameProfile } from '../lib/state';
import { FARM_TYPES, farmInfo, type FarmType } from '../lib/farms';
import { setDate } from './DateSheet';
import { Ui, Stepper } from './ui';
import { SetupForm } from '../screens/Setup';

/** The farm-naming page: name + farm map. Shared by first-run setup, "Add a farm" and "Rename / edit". */
export function FarmNameStep({ name, setName, type, setType, title, intro }: { name: string; setName: (s: string) => void; type: FarmType; setType: (t: FarmType) => void; title: string; intro?: React.ReactNode }) {
  const info = farmInfo(type);
  return (
    <>
      <div className="onb-hero"><Ui k="Junimo" size={56} eager /></div>
      <h2>{title}</h2>
      {intro}
      <label className="onb-f"><span>What’s your farm called?</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Farm" maxLength={40} autoComplete="off" /></label>
      <div className="onb-f"><span>Which farm map did you pick?</span>
        <div className="farm-grid" role="radiogroup" aria-label="Farm map">
          {FARM_TYPES.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={type === f.id} className={'farm-opt' + (type === f.id ? ' on' : '')} onClick={() => setType(f.id)}>
              <Ui k={'farm:' + f.id} size={40} eager /><span>{f.name}</span>
            </button>
          ))}
        </div>
        <p className="farm-blurb"><b>{info.name} Farm</b> · {info.skill}<br />{info.blurb}</p>
      </div>
    </>
  );
}

type Mode = 'first' | 'new' | 'edit';
/** Stardew-styled farm setup card. 'first' = first-run onboarding, 'new' = add a farm, 'edit' = rename / change map of `profileId`. */
export function Onboarding({ mode = 'first', profileId, onClose }: { mode?: Mode; profileId?: string; onClose?: () => void }) {
  const store = useStore();
  const cur = useProfile();
  const target = mode === 'edit' ? store.profiles.find((x) => x.id === profileId) || cur : cur;
  const [step, setStep] = useState(0);
  const [created, setCreated] = useState<string | null>(null);
  const [name, setName] = useState(mode === 'new' ? '' : target.name === 'My Farm' ? '' : target.name);
  const [type, setType] = useState<FarmType>(mode === 'new' ? 'standard' : target.farmType || 'standard');
  const clean = (fallback: string) => (name.trim() || fallback).slice(0, 40);
  const d = cur.date;
  const saveStep0 = () => {
    if (mode === 'new') {
      if (!created) setCreated(addProfile(clean('New Farm'), type).id);
      else renameProfile(created, clean('New Farm'), type);
    } else if (mode === 'first') update((q) => { if (name.trim()) q.name = name.trim().slice(0, 40); q.farmType = type; });
  };
  const finish = () => {
    if (step === 0) saveStep0();
    if (mode === 'first') { location.hash = '#/'; setUi({ onboarded: true, tourOpen: !getUi().tourSeen }); return; }
    if (mode === 'new' && created) renameProfile(created, clean('New Farm'), type);
    onClose?.();
  };
  if (mode === 'edit') {
    const save = () => { renameProfile(target.id, clean(target.name), type); onClose?.(); };
    return (
      <div className="onb" role="dialog" aria-modal="true" aria-label="Edit farm">
        <div className="onb-card">
          <div className="onb-scroll pad"><FarmNameStep name={name} setName={setName} type={type} setType={setType} title="Edit your farm" /></div>
          <div className="onb-nav">
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    );
  }
  const steps = ['Farm', 'Date', 'Progress'];
  const next = () => { if (step === 0) saveStep0(); setStep(step + 1); };
  return (
    <div className="onb" role="dialog" aria-modal="true" aria-label={mode === 'new' ? 'Start a new farm' : 'Welcome to Valley Book'}>
      <div className="onb-card">
        <div className="onb-dots">{steps.map((s, i) => <span key={s} className={i === step ? 'on' : i < step ? 'past' : ''} />)}</div>
        {step === 0 && (
          <div className="onb-scroll pad">
            {mode === 'new'
              ? <FarmNameStep name={name} setName={setName} type={type} setType={setType} title="Start a new farm" intro={<p>Each farm keeps its own date, bundles, friendships and progress.</p>} />
              : <FarmNameStep name={name} setName={setName} type={type} setType={setType} title="Welcome to Valley Book!" intro={<p>A friendly day planner for Stardew Valley. Tell it where you are in your game, and it’ll suggest what’s worth doing each day — nothing you can’t reach yet.</p>} />}
          </div>
        )}
        {step === 1 && (
          <>
            <h2>What day is it in your game?</h2>
            <p className="hint">Check the clock in the top-right of your game screen.</p>
            <div className="onb-f"><span>Season</span>
              <div className="wx-grid four">{SEASONS.map((s, i) => (
                <button key={s} className={'wx' + (d.season === i ? ' on' : '')} onClick={() => update((q) => setDate(q, { ...q.date, season: i }))}><Ui k={'season:' + s} size={24} /><span>{s}</span></button>
              ))}</div></div>
            <div className="onb-row">
              <div className="onb-f"><span>Day ({weekday(d.day)})</span><Stepper value={d.day} min={1} max={28} onChange={(n) => update((q) => setDate(q, { ...q.date, day: n }))} label="Day" /></div>
              <div className="onb-f"><span>Year</span><Stepper value={d.year} min={1} max={99} onChange={(n) => update((q) => setDate(q, { ...q.date, year: n }))} label="Year" /></div>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Where are you in the game?</h2>
            <p className="hint">Rough answers are fine — you can change these any time under Progress.</p>
            <div className="onb-scroll"><SetupForm quick /></div>
          </>
        )}
        <div className="onb-nav">
          {step > 0 ? <button className="btn ghost" onClick={() => setStep(step - 1)}>Back</button>
            : mode === 'new' ? <button className="btn ghost" onClick={onClose}>Cancel</button>
            : <button className="btn ghost" onClick={finish}>Skip</button>}
          {step < steps.length - 1
            ? <button className="btn primary" onClick={next}>Next</button>
            : <button className="btn primary" onClick={finish}>{mode === 'new' ? 'Start farming!' : 'Let’s go!'}</button>}
        </div>
      </div>
    </div>
  );
}

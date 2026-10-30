import type { ReactNode } from 'react';
import { ItemIcon, Ui, Sprite } from './ui';
import { npcById } from '../data';
import { toggle, isDone, useProfile } from '../lib/state';
import type { Icon, Label, Task } from '../lib/guide';

export function GIcon({ icon, size = 32 }: { icon: Icon; size?: number }) {
  if (icon.npc) { const n = npcById[icon.npc]; return n ? <Sprite spr={n.portrait || n.icon} size={size} alt={n.name} className="pt" /> : null; }
  if (icon.qid) return <ItemIcon qid={icon.qid} size={size} />;
  if (icon.ui) return <Ui k={icon.ui} size={size} />;
  return null;
}
const LABEL_CLASS: Record<Label, string> = { Quest: 'lb-quest', Bundle: 'lb-bundle', Money: 'lb-money', Friendship: 'lb-friend', Luck: 'lb-luck' };
export const LabelTag = ({ label }: { label: Label }) => <span className={'lb ' + LABEL_CLASS[label]}>{label}</span>;

/** One line of the daily guide. Tick box marks it done in the saved checklist. */
export function TaskRow({ t, big }: { t: Task; big?: boolean }) {
  const p = useProfile();
  const done = t.tick ? isDone(p, t.tick.col, t.tick.id) : false;
  const body: ReactNode = (
    <>
      <span className="row-ic">{<GIcon icon={t.icon} size={big ? 40 : 32} />}</span>
      <span className="row-main">
        <span className="task-top"><LabelTag label={t.label} />{(t.where || t.when) && <small className="task-where">{[t.where, t.when].filter(Boolean).join(' · ')}</small>}</span>
        <b className="row-t">{t.title}</b>
        <small>{t.why}</small>
      </span>
    </>
  );
  return (
    <div className={'task' + (done ? ' done' : '') + (big ? ' big' : '')}>
      {t.href ? <a className="row-btn" href={t.href}>{body}</a> : <div className="row-btn static">{body}</div>}
      {t.tick && <button className="tick" onClick={() => toggle(t.tick!.col, t.tick!.id)} aria-pressed={done} aria-label={done ? 'Mark not done' : 'Mark done'}><span className="box" /></button>}
    </div>
  );
}

export const Section = ({ title, icon, children, right, tour, sub }: { title: string; icon?: ReactNode; children: ReactNode; right?: ReactNode; tour?: string; sub?: ReactNode }) => (
  <section className="panel" data-tour={tour}>
    <div className="panel-h">{icon}<h2>{title}</h2><span className="grow" />{right}</div>
    {sub && <p className="hint sec-sub">{sub}</p>}
    {children}
  </section>
);

import { Lk } from '../components/Link';
import { core } from '../data';
import { useProfile } from '../lib/state';
import { roadmap } from '../lib/guide';
import { TopBar, Panel, Bar, Ui } from '../components/ui';

export function RoadScreen() {
  const p = useProfile();
  const r = roadmap(core, p);
  return (
    <div className="screen">
      <TopBar title="Road to Perfection" back="#/today" sub={`${r.percent}% Perfection`} />
      <Panel className="perf-hero">
        <Ui k="Gold Clock" size={56} />
        <div><b className="big-n">{r.current ? `Phase ${r.current.n} of 7` : 'All done!'}</b><small>{r.current ? r.current.name : 'You reached Perfection.'}</small></div>
        <Bar value={r.phases.filter((ph) => ph.done).length} max={7} />
      </Panel>
      <p className="hint">A rough order most players follow. You can work on later phases any time — this is worked out from what you’ve ticked and your “Where are you?” answers.</p>
      {r.phases.map((ph) => {
        const cur = r.current?.n === ph.n;
        const have = ph.steps.filter((s) => s.done).length;
        return (
          <section key={ph.n} className={'panel phase' + (ph.done ? ' complete' : '') + (cur ? ' cur' : '')}>
            <div className="panel-h"><span className="ph-n">{ph.n}</span><h2>{ph.name}</h2><span className="grow" /><span className="count">{ph.done ? 'Done' : `${have}/${ph.steps.length}`}</span></div>
            <p className="hint">{ph.blurb}</p>
            {(cur || !ph.done) && (
              <div className="list">
                {ph.steps.map((s) => (
                  <Lk key={s.label} className={'row' + (s.done ? ' done' : '')} href={s.href || '#/road'}>
                    <span className="box" aria-hidden />
                    <span className="row-main"><span className="row-t">{s.label}</span>{s.total != null && !s.done && <Bar value={s.have || 0} max={s.total} />}</span>
                    {s.total != null && <span className="cnt">{s.have}/{s.total}</span>}
                  </Lk>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

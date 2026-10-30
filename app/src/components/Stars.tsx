import { useProfile } from '../lib/state';
import { isStarred, toggleStar, starredGroups } from '../lib/stars';
import { Sheet, Sprite, ItemIcon, Ui, Empty } from './ui';

/** Little gold star toggle for a page's top bar or a bundle card. Grey when off. */
export function StarButton({ k, name }: { k: string; name: string }) {
  const p = useProfile();
  const on = isStarred(p, k);
  return (
    <button className={'star-btn' + (on ? '' : ' off')} aria-pressed={on} aria-label={on ? `Unstar ${name}` : `Star ${name}`} title={on ? 'Starred' : 'Star'} onClick={() => toggleStar(k)}>
      <Ui k="Star" size={24} />
    </button>
  );
}

/** The Starred list: everything starred on this farm, grouped by type. Tap an entry to open it. */
export function StarredSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = useProfile();
  const groups = open ? starredGroups(p) : [];
  return (
    <Sheet open={open} onClose={onClose} title={<><Ui k="Star" size={22} /> Starred</>}>
      {!groups.length ? <Empty>Nothing starred on {p.name} yet. Tap the star on any item, fish, villager or bundle page to keep it here.</Empty> : groups.map((g) => (
        <section key={g.group} className="st-group">
          <h3 className="st-gh">{g.group}<span className="count">{g.list.length}</span></h3>
          <div className="list">
            {g.list.map((e) => (
              <a key={e.key} className="row" href={e.href} onClick={onClose}>
                <span className="row-ic">{e.qid ? <ItemIcon qid={e.qid} size={32} /> : <Sprite spr={e.spr} size={32} />}</span>
                <span className="row-main"><b>{e.name}</b><small>{e.sub}</small></span>
                <span className="chev-r" />
              </a>
            ))}
          </div>
        </section>
      ))}
      <p className="cfoot">Stars are saved per farm. Tap a star again to remove it.</p>
    </Sheet>
  );
}

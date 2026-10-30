// v7.2.1: in-app links without an href. On iPhone a long press on a real <a href> opens the link preview menu
// (Open, Add to Reading List, Copy…). These look and act like links (role="link", Enter key, tap sounds, nav) but have
// no href, so there's nothing to preview. Outside links (https://…) stay real links that open in a new tab.
import type { AnchorHTMLAttributes, KeyboardEvent, MouseEvent } from 'react';
import { go } from '../lib/router';

export function Lk({ href, onClick, onKeyDown, className, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (!href || !href.startsWith('#')) return <a href={href} onClick={onClick} onKeyDown={onKeyDown} className={className} {...rest} />;
  const open = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    e.preventDefault();
    if (/(^|\s)back(\s|$)/.test(className || '')) location.hash = href; else go(href);
  };
  const key = (e: KeyboardEvent<HTMLAnchorElement>) => {
    onKeyDown?.(e);
    if (!e.defaultPrevented && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.currentTarget.click(); }
  };
  return <a role="link" tabIndex={0} data-href={href} className={className} onClick={open} onKeyDown={key} {...rest} />;
}

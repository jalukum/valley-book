import { useEffect, useState } from 'react';
export function useAsync<T>(fn: () => Promise<T>): T | null {
  const [v, setV] = useState<T | null>(null);
  useEffect(() => { let live = true; fn().then((x) => live && setV(x)); return () => { live = false; }; }, []);
  return v;
}

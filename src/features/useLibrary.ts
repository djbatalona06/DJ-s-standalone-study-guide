import { useEffect, useState } from 'react';
import { loadLibrary, type Library } from '../content';

/** The card library once it has loaded, `undefined` until then. Cached after the first load. */
export function useLibrary(): Library | undefined {
  const [library, setLibrary] = useState<Library>();
  useEffect(() => {
    let live = true;
    void loadLibrary().then((loaded) => { if (live) setLibrary(loaded); });
    return () => { live = false; };
  }, []);
  return library;
}

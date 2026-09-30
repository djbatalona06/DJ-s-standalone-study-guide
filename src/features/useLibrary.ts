import { useEffect, useState } from 'react';
import { loadLibrary, type Library } from '../content';

/**
 * The card library once it has loaded, `undefined` until then. Cached after the
 * first load. Pass `false` to hold off fetching it until a screen actually needs it.
 */
export function useLibrary(enabled = true): Library | undefined {
  const [library, setLibrary] = useState<Library>();
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void loadLibrary().then((loaded) => { if (live) setLibrary(loaded); });
    return () => { live = false; };
  }, [enabled]);
  return library;
}

import { useCallback, useEffect, useState } from 'react';

/**
 * Fullscreen for the whole document, which is the right unit here: the game is
 * a single canvas plus overlay, and element-level fullscreen on the canvas
 * would drop the HUD out of the capture on some browsers.
 *
 * iOS Safari has no Fullscreen API on non-video elements, so there
 * `isSupported` is false and the menu row explains that instead of failing
 * silently.
 */
/** Cross-browser fullscreen surface. Safari only ships the webkit-prefixed form. */
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

const fullscreenDoc = (): FullscreenDocument => document as FullscreenDocument;
const fullscreenRoot = (): FullscreenElement => document.documentElement;

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const doc = fullscreenDoc();
    const root = fullscreenRoot();
    setIsSupported(Boolean(root.requestFullscreen || root.webkitRequestFullscreen));

    const onChange = () => {
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  const toggle = useCallback(async () => {
    const doc = fullscreenDoc();
    const root = fullscreenRoot();

    try {
      // Request on the document element: the game is one canvas plus overlays,
      // and element fullscreen on the canvas would drop the HUD on some engines.
      if (doc.fullscreenElement || doc.webkitFullscreenElement) {
        await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      } else {
        await (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.());
      }
    } catch {
      // A denied request (no user gesture, or a policy) is not worth a crash:
      // the menu row stays where it is and simply reports the current state.
    }
  }, []);

  return { isFullscreen, isSupported, toggle };
}

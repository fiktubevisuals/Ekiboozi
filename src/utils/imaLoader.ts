/**
 * Safe Dynamic Loader for Google IMA SDK (ima3.js)
 * 
 * Dynamically loads the Google IMA SDK on-demand with isolated error boundaries.
 * If an ad-blocker or iframe restriction blocks the network request, the error is
 * trapped gracefully without bubbling a cross-origin 'Script error.' to window.onerror.
 */

let imaPromise: Promise<boolean> | null = null;

export function loadImaSdk(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  // If already loaded on window
  if ((window as any).google?.ima) {
    return Promise.resolve(true);
  }

  // Reuse ongoing load promise
  if (imaPromise) {
    return imaPromise;
  }

  imaPromise = new Promise<boolean>((resolve) => {
    try {
      // Check if tag already exists in DOM
      const existing = document.querySelector('script[data-ima-loader="true"]') as HTMLScriptElement | null;
      if (existing) {
        if ((window as any).google?.ima) {
          resolve(true);
          return;
        }
        existing.addEventListener('load', () => resolve(!!(window as any).google?.ima), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-ima-loader', 'true');

      script.onload = () => {
        resolve(!!(window as any).google?.ima);
      };

      script.onerror = (event: any) => {
        // Suppress and handle gracefully: ad blocker or network restriction
        if (event && typeof event.stopPropagation === 'function') {
          event.stopPropagation();
        }
        console.info('[IMA] Ad SDK blocked or unavailable; using lightweight fallback simulation.');
        resolve(false);
      };

      document.head.appendChild(script);
    } catch {
      resolve(false);
    }
  });

  return imaPromise;
}

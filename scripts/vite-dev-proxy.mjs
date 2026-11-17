// `npm run dev` under the canvas's origin guard (T-017, T-015).
//
// In dev, Vite serves the page on its own port (5173) and proxies the API and the socket to the
// canvas. The canvas refuses any page Origin but its own, so without this every request the dev
// page makes gets 403, and its socket, opened at the page's own host, never reached the canvas.
// The proxy presents the dev page as the canvas's own page, and only the dev page: a request whose
// Origin is not the Vite server it was sent to (another site's page, another local dev server) is
// forwarded as it came, and the guard refuses it as it would without Vite.

/** A proxy hook that gives the dev page's own requests the canvas's Origin. */
export function presentDevPageAs(canvasUrl) {
  const canvasOrigin = new URL(canvasUrl).origin;
  return (proxyReq, req) => {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (!origin || !host) return;
    let originHost;
    try {
      originHost = new URL(origin).host;
    } catch {
      return; // `Origin: null` and the like stay as they are, and are refused.
    }
    if (originHost === host.toLowerCase()) proxyReq.setHeader('origin', canvasOrigin);
  };
}

/** The page opens its socket at `/`; only that upgrade goes to the canvas, the page stays Vite's. */
export function isSocketUpgrade(req) {
  return String(req.headers.upgrade || '').toLowerCase() === 'websocket';
}

/** The proxy table for vite.config.js. */
export function canvasProxy(canvasUrl) {
  const configure = proxy => {
    const hook = presentDevPageAs(canvasUrl);
    proxy.on('proxyReq', hook);
    proxy.on('proxyReqWs', hook);
  };
  return {
    '/api': { target: canvasUrl, changeOrigin: true, configure },
    '/health': { target: canvasUrl, changeOrigin: true, configure },
    '^/$': {
      target: canvasUrl,
      changeOrigin: true,
      ws: true,
      configure,
      // A plain GET of `/` is the page: Vite serves it.
      bypass: req => (isSocketUpgrade(req) ? undefined : req.url)
    }
  };
}

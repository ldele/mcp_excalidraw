import type { IncomingMessage } from 'http';
import type { Request, Response, NextFunction } from 'express';
import type { CorsOptions } from 'cors';

// T-015: the canvas answers its own page and this machine's tools, and no other site's page.
//
// A browser names the page a request comes from in `Origin` and the server it was sent to in
// `Host`. A request is refused when its Origin is another site's, or when its Host is not a
// name for this machine (which is what a rebound DNS name looks like). The CLI, the MCP server
// and curl send no Origin and pass: an origin rule cannot tell one local program from another.
//
// Not covered: a cross-site GET sent without an Origin (an <img> or a link). The answer is
// sent, the page that caused it cannot read it, and no GET route changes the canvas.

const LOOPBACK_NAMES = new Set(['127.0.0.1', 'localhost', '[::1]']);
const LOOPBACK_BINDS = new Set(['127.0.0.1', 'localhost', '::1']);

// Read on each call: dotenv fills the environment after this module is loaded.
function allowedOrigins(): Set<string> {
  return new Set(
    (process.env.CANVAS_ALLOWED_ORIGINS || '')
      .split(',')
      .map(origin => origin.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** The name in a Host header, lower-cased and without its port. */
function hostNameOf(host: string): string {
  const value = host.trim().toLowerCase();
  if (value.startsWith('[')) return value.slice(0, value.indexOf(']') + 1);
  const colon = value.lastIndexOf(':');
  return colon === -1 ? value : value.slice(0, colon);
}

function hostIsOurs(host: string | undefined): boolean {
  // Bound beyond loopback on purpose: the owner reaches it by a name only they know.
  const bind = (process.env.HOST || '127.0.0.1').toLowerCase();
  if (!LOOPBACK_BINDS.has(bind)) return true;
  // No Host at all is not a browser.
  if (!host) return true;
  return LOOPBACK_NAMES.has(hostNameOf(host));
}

function originIsOurs(origin: string | undefined, host: string | undefined): boolean {
  if (origin === undefined) return true;
  const value = origin.trim().toLowerCase();
  if (allowedOrigins().has(value)) return true;
  // The same origin: the page was served by the host and port this request is addressed to.
  // `Origin: null` (a file, a sandboxed frame) does not parse, and is refused.
  try {
    return !!host && new URL(value).host === host.trim().toLowerCase();
  } catch {
    return false;
  }
}

export function requestIsOurs(headers: IncomingMessage['headers']): boolean {
  return hostIsOurs(headers.host) && originIsOurs(headers.origin, headers.host);
}

export function originGuard(req: Request, res: Response, next: NextFunction): void {
  if (requestIsOurs(req.headers)) {
    next();
    return;
  }
  res.status(403).json({
    success: false,
    error: 'Refused: this canvas answers its own page and local tools only. '
      + 'To let another origin in, list it in CANVAS_ALLOWED_ORIGINS.'
  });
}

// CORS headers go only to an origin the owner listed. The canvas page needs none.
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    callback(null, !!origin && allowedOrigins().has(origin.trim().toLowerCase()));
  }
};

export function verifySocketClient(
  info: { req: IncomingMessage },
  done: (ok: boolean, code?: number, message?: string) => void
): void {
  if (requestIsOurs(info.req.headers)) done(true);
  else done(false, 403, 'Forbidden');
}

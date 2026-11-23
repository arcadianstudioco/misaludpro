import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'users.json');
const SESSION_COOKIE_NAME = 'msp_session';
const RUNTIME_SESSION_SECRET = crypto.randomBytes(32).toString('hex');

interface StoredUser {
  id: string;
  email: string;
  name: string;
  provider: 'password' | 'google' | 'apple';
  passwordHash?: string;
  acceptedTermsAt: string;
  createdAt: string;
  appState: Record<string, unknown> | null;
}

interface UsersStore {
  usersByEmail: Record<string, StoredUser>;
}

interface SessionPayload {
  userId: string;
  email: string;
  provider: 'password' | 'google' | 'apple';
  exp: number;
}

function getSessionSecret(): string {
  return process.env.SESSION_SECRET?.trim() || RUNTIME_SESSION_SECRET;
}

function getAppBaseUrl(): string {
  const raw = process.env.APP_URL?.trim();
  if (raw && raw !== 'MY_APP_URL' && /^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '');
  }
  return `http://localhost:${PORT}`;
}

function ensureStore(): UsersStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      const initial: UsersStore = { usersByEmail: {} };
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as UsersStore;
    if (!parsed || typeof parsed.usersByEmail !== 'object') {
      return { usersByEmail: {} };
    }
    return parsed;
  } catch {
    return { usersByEmail: {} };
  }
}

function saveStore(store: UsersStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tempPath = `${STORE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tempPath, STORE_FILE);
}

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return resolve(false);
    const [salt, keyHex] = parts;
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const expected = Buffer.from(keyHex, 'hex');
        if (expected.length !== derivedKey.length) return resolve(false);
        resolve(crypto.timingSafeEqual(expected, derivedKey));
      } catch {
        resolve(false);
      }
    });
  });
}

function signToken(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken<T extends { exp?: number }>(token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(encoded)
      .digest('base64url');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as T;
    if (decoded.exp && Date.now() > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const k = pair.slice(0, eqIdx).trim();
    const v = pair.slice(eqIdx + 1).trim();
    if (k) {
      try {
        out[k] = decodeURIComponent(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}

function setSessionCookie(res: Response, token: string, rememberMe: boolean): void {
  const base = `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=None; Partitioned; Path=/`;
  if (rememberMe) {
    res.setHeader('Set-Cookie', `${base}; Max-Age=2592000`);
  } else {
    res.setHeader('Set-Cookie', base);
  }
}

function clearSessionCookie(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=0`
  );
}

function createSessionTokenForUser(user: StoredUser, rememberMe: boolean): string {
  const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    provider: user.provider,
    exp: Date.now() + ttlMs,
  };
  return signToken(payload as unknown as Record<string, unknown>);
}

function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    provider: user.provider,
    acceptedTermsAt: user.acceptedTermsAt,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface AuthenticatedRequest extends Request {
  authUser?: StoredUser;
  authToken?: string;
}

function extractAuth(req: Request): { user: StoredUser; token: string } | null {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies[SESSION_COOKIE_NAME] || '';
  }

  if (!token) return null;
  const payload = verifyToken<SessionPayload>(token);
  if (!payload) return null;

  const store = ensureStore();
  const user = store.usersByEmail[payload.email.toLowerCase()];
  if (!user || user.id !== payload.userId) return null;
  return { user, token };
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const usesCookieOnly = !(authHeader && authHeader.startsWith('Bearer '));
  if (usesCookieOnly && req.method !== 'GET' && req.method !== 'HEAD') {
    const xrw = req.headers['x-requested-with'];
    const origin = req.headers.origin;
    const host = (req.headers['x-forwarded-host'] || req.headers.host || '') as string;
    const originMatchesHost =
      typeof origin === 'string' &&
      host &&
      (() => {
        try {
          return new URL(origin).host === host;
        } catch {
          return false;
        }
      })();
    if (xrw !== 'MiSaludPro' && !originMatchesHost) {
      res.status(403).json({ error: 'Solicitud no autorizada.' });
      return;
    }
  }

  const found = extractAuth(req);
  if (!found) {
    res.status(401).json({ error: 'Sesión inválida o expirada.' });
    return;
  }
  req.authUser = found.user;
  req.authToken = found.token;
  next();
}

function renderOAuthCallbackHtml(payload: Record<string, unknown>): string {
  const safeJson = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Mi Salud Pro · Autenticación</title>
    <style>
      body { background: #0a0d0b; color: #f4f7f4; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
      .card { background: #131a16; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 24px; text-align: center; max-width: 320px; }
      h1 { font-size: 16px; margin: 0 0 8px; }
      p { font-size: 13px; color: #9aa89e; margin: 0; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Autenticación completada</h1>
      <p>Volviendo a Mi Salud Pro...</p>
    </div>
    <script>
      (function() {
        var data = ${safeJson};
        if (window.opener) {
          window.opener.postMessage(data, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      })();
    </script>
  </body>
</html>`;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ extended: true }));

  // --- AUTH: SESSION & EMAIL/PASSWORD ---
  app.get('/api/auth/session', (req, res) => {
    const found = extractAuth(req);
    if (!found) {
      res.json({ authenticated: false });
      return;
    }
    res.json({
      authenticated: true,
      token: found.token,
      user: sanitizeUser(found.user),
      appState: found.user.appState,
    });
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const body = req.body as {
        name?: string;
        email?: string;
        password?: string;
        rememberMe?: boolean;
        acceptedTerms?: boolean;
        appState?: Record<string, unknown>;
      };

      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';
      const name = (body.name || '').trim();
      const rememberMe = Boolean(body.rememberMe);

      if (!name || name.length < 2) {
        res.status(400).json({ error: 'Ingresa tu nombre completo.' });
        return;
      }
      if (!isValidEmail(email)) {
        res.status(400).json({ error: 'Ingresa un correo electrónico válido.' });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
        return;
      }
      if (!body.acceptedTerms) {
        res.status(400).json({
          error: 'Debes aceptar los Términos y Condiciones y la Política de Privacidad.',
        });
        return;
      }

      const store = ensureStore();
      if (store.usersByEmail[email]) {
        res.status(409).json({
          error: 'Ya existe una cuenta registrada con este correo electrónico.',
        });
        return;
      }

      const passwordHash = await hashPassword(password);
      const user: StoredUser = {
        id: `usr_${crypto.randomUUID()}`,
        email,
        name,
        provider: 'password',
        passwordHash,
        acceptedTermsAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        appState: body.appState || null,
      };

      store.usersByEmail[email] = user;
      saveStore(store);

      const token = createSessionTokenForUser(user, rememberMe);
      if (rememberMe) {
        setSessionCookie(res, token, true);
      }

      res.status(201).json({
        token,
        user: sanitizeUser(user),
        appState: user.appState,
      });
    } catch {
      res.status(500).json({ error: 'No se pudo completar el registro.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const body = req.body as {
        email?: string;
        password?: string;
        rememberMe?: boolean;
      };

      const email = (body.email || '').trim().toLowerCase();
      const password = body.password || '';
      const rememberMe = Boolean(body.rememberMe);

      if (!isValidEmail(email) || !password) {
        res.status(400).json({ error: 'Ingresa tu correo y contraseña.' });
        return;
      }

      const store = ensureStore();
      const user = store.usersByEmail[email];
      if (!user) {
        res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        return;
      }

      if (user.provider !== 'password' || !user.passwordHash) {
        const providerLabel = user.provider === 'google' ? 'Google' : 'Apple';
        res.status(401).json({
          error: `Esta cuenta fue creada con ${providerLabel}. Usa el botón de ${providerLabel} para acceder.`,
        });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
        return;
      }

      const token = createSessionTokenForUser(user, rememberMe);
      if (rememberMe) {
        setSessionCookie(res, token, true);
      } else {
        clearSessionCookie(res);
      }

      res.json({
        token,
        user: sanitizeUser(user),
        appState: user.appState,
      });
    } catch {
      res.status(500).json({ error: 'Error al iniciar sesión.' });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  app.post('/api/auth/change-password', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.authUser!;
      if (user.provider !== 'password' || !user.passwordHash) {
        res.status(400).json({
          error: 'Tu cuenta usa inicio de sesión social y no requiere contraseña local.',
        });
        return;
      }
      const { currentPassword, newPassword } = req.body as {
        currentPassword?: string;
        newPassword?: string;
      };
      if (!currentPassword || !newPassword || newPassword.length < 8) {
        res.status(400).json({
          error: 'La nueva contraseña debe tener al menos 8 caracteres.',
        });
        return;
      }
      const ok = await verifyPassword(currentPassword, user.passwordHash);
      if (!ok) {
        res.status(401).json({ error: 'La contraseña actual no es correcta.' });
        return;
      }

      const store = ensureStore();
      const target = store.usersByEmail[user.email];
      target.passwordHash = await hashPassword(newPassword);
      saveStore(store);

      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'No se pudo actualizar la contraseña.' });
    }
  });

  // --- USER DATA SYNC ---
  app.put('/api/user/state', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const user = req.authUser!;
      const { appState } = req.body as { appState?: Record<string, unknown> };
      if (!appState || typeof appState !== 'object') {
        res.status(400).json({ error: 'Estado de aplicación inválido.' });
        return;
      }
      const store = ensureStore();
      const target = store.usersByEmail[user.email];
      if (!target) {
        res.status(404).json({ error: 'Usuario no encontrado.' });
        return;
      }
      target.appState = appState;
      saveStore(store);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'No se pudo sincronizar el estado.' });
    }
  });

  app.delete('/api/user/account', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const user = req.authUser!;
      const store = ensureStore();
      delete store.usersByEmail[user.email];
      saveStore(store);
      clearSessionCookie(res);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: 'No se pudo eliminar la cuenta.' });
    }
  });

  // --- OAUTH: GOOGLE & APPLE ---
  app.get('/api/auth/oauth/status', (_req, res) => {
    const base = getAppBaseUrl();
    res.json({
      googleConfigured: Boolean(
        process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
      ),
      appleConfigured: Boolean(process.env.APPLE_CLIENT_ID?.trim()),
      googleCallbackUrl: `${base}/auth/callback/google`,
      appleCallbackUrl: `${base}/auth/callback/apple`,
    });
  });

  app.get('/api/auth/oauth/google/url', (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const base = getAppBaseUrl();
    const redirectUri = `${base}/auth/callback/google`;

    if (!clientId || !clientSecret) {
      res.json({
        configured: false,
        provider: 'google',
        callbackUrl: redirectUri,
      });
      return;
    }

    const rememberMe = req.query.remember !== '0';
    const stateToken = signToken({
      provider: 'google',
      rememberMe,
      nonce: crypto.randomBytes(12).toString('hex'),
      exp: Date.now() + 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      prompt: 'select_account',
      state: stateToken,
    });

    res.json({
      configured: true,
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    });
  });

  app.get(['/auth/callback/google', '/auth/callback/google/'], async (req, res) => {
    try {
      const code = String(req.query.code || '');
      const stateParam = String(req.query.state || '');
      const stateData = verifyToken<{ provider: string; rememberMe?: boolean; exp: number }>(
        stateParam
      );

      if (!code || !stateData || stateData.provider !== 'google') {
        res.status(400).send(
          renderOAuthCallbackHtml({
            type: 'OAUTH_AUTH_ERROR',
            error: 'Validación OAuth de Google inválida o expirada.',
          })
        );
        return;
      }

      const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || '';
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || '';
      const redirectUri = `${getAppBaseUrl()}/auth/callback/google`;

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        throw new Error('Google token exchange failed');
      }
      const tokenJson = (await tokenRes.json()) as { access_token?: string };
      if (!tokenJson.access_token) {
        throw new Error('Missing Google access token');
      }

      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      });
      if (!userInfoRes.ok) {
        throw new Error('Google userinfo failed');
      }
      const profile = (await userInfoRes.json()) as {
        email?: string;
        name?: string;
      };

      const email = (profile.email || '').trim().toLowerCase();
      if (!isValidEmail(email)) {
        throw new Error('Invalid email returned by Google');
      }

      const store = ensureStore();
      let user = store.usersByEmail[email];
      if (!user) {
        user = {
          id: `usr_${crypto.randomUUID()}`,
          email,
          name: profile.name?.trim() || email.split('@')[0],
          provider: 'google',
          acceptedTermsAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          appState: null,
        };
        store.usersByEmail[email] = user;
        saveStore(store);
      }

      const rememberMe = Boolean(stateData.rememberMe);
      const token = createSessionTokenForUser(user, rememberMe);
      if (rememberMe) {
        setSessionCookie(res, token, true);
      }

      res.send(
        renderOAuthCallbackHtml({
          type: 'OAUTH_AUTH_SUCCESS',
          provider: 'google',
          token,
          user: sanitizeUser(user),
          appState: user.appState,
        })
      );
    } catch {
      res.status(500).send(
        renderOAuthCallbackHtml({
          type: 'OAUTH_AUTH_ERROR',
          error: 'No se pudo completar el acceso con Google.',
        })
      );
    }
  });

  app.get('/api/auth/oauth/apple/url', (req, res) => {
    const clientId = process.env.APPLE_CLIENT_ID?.trim();
    const redirectUri = `${getAppBaseUrl()}/auth/callback/apple`;

    if (!clientId) {
      res.json({
        configured: false,
        provider: 'apple',
        callbackUrl: redirectUri,
      });
      return;
    }

    const rememberMe = req.query.remember !== '0';
    const stateToken = signToken({
      provider: 'apple',
      rememberMe,
      nonce: crypto.randomBytes(12).toString('hex'),
      exp: Date.now() + 10 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code id_token',
      response_mode: 'form_post',
      scope: 'name email',
      state: stateToken,
    });

    res.json({
      configured: true,
      url: `https://appleid.apple.com/auth/authorize?${params.toString()}`,
    });
  });

  app.all(['/auth/callback/apple', '/auth/callback/apple/'], (req, res) => {
    try {
      const payloadSource = req.method === 'POST' ? req.body : req.query;
      const stateParam = String((payloadSource as Record<string, unknown>)?.state || '');
      const idToken = String((payloadSource as Record<string, unknown>)?.id_token || '');
      const stateData = verifyToken<{ provider: string; rememberMe?: boolean; exp: number }>(
        stateParam
      );

      if (!stateData || stateData.provider !== 'apple' || !idToken) {
        res.status(400).send(
          renderOAuthCallbackHtml({
            type: 'OAUTH_AUTH_ERROR',
            error: 'Validación OAuth de Apple inválida o incompleta.',
          })
        );
        return;
      }

      const jwtParts = idToken.split('.');
      if (jwtParts.length !== 3) {
        throw new Error('Malformed Apple id_token');
      }
      const claims = JSON.parse(
        Buffer.from(jwtParts[1], 'base64url').toString('utf8')
      ) as { iss?: string; aud?: string; email?: string; sub?: string };

      const expectedClientId = process.env.APPLE_CLIENT_ID?.trim();
      if (
        claims.iss !== 'https://appleid.apple.com' ||
        (expectedClientId && claims.aud !== expectedClientId)
      ) {
        throw new Error('Apple token audience/issuer mismatch');
      }

      const email = (claims.email || `${claims.sub || 'apple'}@privaterelay.appleid.com`)
        .trim()
        .toLowerCase();

      let fullName = '';
      const rawUser = (payloadSource as Record<string, unknown>)?.user;
      if (typeof rawUser === 'string') {
        try {
          const parsedUser = JSON.parse(rawUser) as {
            name?: { firstName?: string; lastName?: string };
          };
          fullName = [parsedUser.name?.firstName, parsedUser.name?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim();
        } catch {
          // Ignore optional user JSON parse issue
        }
      }

      const store = ensureStore();
      let user = store.usersByEmail[email];
      if (!user) {
        user = {
          id: `usr_${crypto.randomUUID()}`,
          email,
          name: fullName || email.split('@')[0],
          provider: 'apple',
          acceptedTermsAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          appState: null,
        };
        store.usersByEmail[email] = user;
        saveStore(store);
      }

      const rememberMe = Boolean(stateData.rememberMe);
      const token = createSessionTokenForUser(user, rememberMe);
      if (rememberMe) {
        setSessionCookie(res, token, true);
      }

      res.send(
        renderOAuthCallbackHtml({
          type: 'OAUTH_AUTH_SUCCESS',
          provider: 'apple',
          token,
          user: sanitizeUser(user),
          appState: user.appState,
        })
      );
    } catch {
      res.status(500).send(
        renderOAuthCallbackHtml({
          type: 'OAUTH_AUTH_ERROR',
          error: 'No se pudo completar el acceso con Apple.',
        })
      );
    }
  });

  // --- VITE / STATIC FRONTEND ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mi Salud Pro server listening on port ${PORT}`);
  });
}

startServer();

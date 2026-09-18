/** The deployed API. Production builds talk to this unless overridden. */
const PROD_API = 'https://price-intelligence-api-j9jb.onrender.com';

/**
 * Where the API lives.
 *
 * Dev resolves to an empty base, so requests stay same-origin and the Vite
 * proxy in vite.config.js forwards them to the local server on :4000 — running
 * `npm run dev` never touches production. A production build points at
 * PROD_API instead. VITE_API_URL overrides either, and setting it to an empty
 * string forces same-origin, which is what a Vercel rewrite would want.
 *
 * Auth travels in the Authorization header rather than a cookie, so the
 * cross-origin case needs nothing from the browser beyond the server's CORS.
 */
const RAW_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? PROD_API : '');

export const API_BASE = `${RAW_BASE.replace(/\/+$/, '')}/api`;

const TOKEN_KEY = 'pi.token';
const USER_KEY = 'pi.user';

/**
 * "Keep me signed in" chooses where the session is kept:
 *   localStorage    survives closing the browser
 *   sessionStorage  cleared when the tab is closed
 * Reads check both, so an existing session is found either way.
 */
const stores = () => {
  const out = [];
  try { out.push(localStorage); } catch { /* blocked */ }
  try { out.push(sessionStorage); } catch { /* blocked */ }
  return out;
};

const read = (key) => {
  for (const store of stores()) {
    try {
      const value = store.getItem(key);
      if (value != null) return value;
    } catch { /* blocked */ }
  }
  return null;
};

export const getToken = () => read(TOKEN_KEY);
export const getStoredUser = () => {
  try { return JSON.parse(read(USER_KEY) || 'null'); } catch { return null; }
};

export const saveSession = (token, user, remember = true) => {
  // Clear both first, so switching the checkbox never leaves a stale token
  // behind in the store that is no longer being used.
  clearSession();
  try {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
  } catch { /* private browsing */ }
};

export const clearSession = () => {
  for (const store of stores()) {
    try {
      store.removeItem(TOKEN_KEY);
      store.removeItem(USER_KEY);
    } catch { /* ignore */ }
  }
};

/** Thrown for any non-2xx response so callers can show the server's message. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function parse(res) {
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!res.ok) {
    if (res.status === 401) clearSession();
    throw new ApiError(body?.error || `Request failed (${res.status})`, res.status);
  }
  return body;
}

export async function api(path, { method = 'GET', body, signal, headers = {} } = {}) {
  const token = getToken();
  const init = { method, signal, headers: { ...headers } };

  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  if (token) init.headers.Authorization = `Bearer ${token}`;

  return parse(await fetch(`${API_BASE}${path}`, init));
}

export const login = (email, password) => api('/auth/login', { method: 'POST', body: { email, password } });

/** Publishes a previewed upload as the new current price list. */
export const publishUpload = (pendingId) => api(`/upload/${pendingId}/publish`, { method: 'POST' });

/** Throws away a previewed upload without publishing it. */
export const discardUpload = (pendingId) => api(`/upload/${pendingId}`, { method: 'DELETE' });

/** Undoes an uploaded revision. The API allows only the most recent upload. */
export const deleteRevision = (seq) => api(`/history/${seq}`, { method: 'DELETE' });

/** Multipart upload with progress, which fetch cannot report on its own. */
export function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/upload`);
    const token = getToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100);
    };
    xhr.onload = () => {
      let body = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* non-JSON error page */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new ApiError(body?.error || `Upload failed (${xhr.status})`, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('Upload failed. Is the API running?', 0));
    xhr.send(form);
  });
}

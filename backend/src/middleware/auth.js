import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

/** Rejects API calls without a valid bearer token. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not signed in.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Sign in again.' });
  }
}

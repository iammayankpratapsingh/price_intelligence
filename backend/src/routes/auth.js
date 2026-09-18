import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, TOKEN_TTL } from '../config.js';
import { verifyCredentials, publicUser } from '../lib/users.js';

const router = Router();

/**
 * Credentials are checked against the `users` table in Neon, which stores a
 * bcrypt hash rather than the password itself. The token shape is unchanged,
 * so everything downstream — the middleware, /me, the client — stays as it was.
 */
router.post('/login', async (req, res, next) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Enter both your email and password.' });
  }

  try {
    const row = await verifyCredentials(email, password);
    if (!row) {
      // One message for both "no such user" and "wrong password", so the
      // response cannot be used to discover which emails exist.
      return res.status(401).json({ error: 'That email and password combination is not recognised.' });
    }

    const user = publicUser(row);
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: TOKEN_TTL });
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.get('/me', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not signed in.' });
  try {
    const { iat, exp, ...user } = jwt.verify(token, JWT_SECRET);
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Session expired. Sign in again.' });
  }
});

export default router;

import bcrypt from 'bcryptjs';
import { query } from './db.js';

/**
 * Users live in Postgres. Only the bcrypt hash is stored, so the password
 * cannot be recovered from the database — it can only be verified.
 */

const ROUNDS = 10;

/** The public shape of a user: what goes into the JWT and back to the client. */
export const publicUser = (row) => ({
  email: row.email,
  name: row.name,
  role: row.role,
  initials: row.initials,
});

export async function findByEmail(email) {
  const { rows } = await query('select * from users where email = $1', [
    String(email).trim().toLowerCase(),
  ]);
  return rows[0] || null;
}

/** Verifies a password against the stored hash. Never logs or returns it. */
export async function verifyCredentials(email, password) {
  const user = await findByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(String(password), user.password_hash);
  return ok ? user : null;
}

/** Creates or updates a user, hashing the password before it is stored. */
export async function upsertUser({ email, password, name = '', role = '', initials = '' }) {
  const hash = await bcrypt.hash(String(password), ROUNDS);
  const { rows } = await query(
    `insert into users (email, password_hash, name, role, initials)
     values ($1, $2, $3, $4, $5)
     on conflict (email) do update
       set password_hash = excluded.password_hash,
           name = excluded.name, role = excluded.role, initials = excluded.initials
     returning email, name, role, initials, created_at`,
    [String(email).trim().toLowerCase(), hash, name, role, initials],
  );
  return rows[0];
}

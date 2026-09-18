/**
 * Creates (or updates) a user in Neon. The password is bcrypt-hashed here and
 * only the hash is stored.
 *
 *   npm run user:create -- <email> <password> ["Name"] ["Role"]
 *
 * With no arguments it creates the demo account.
 */
import { applySchema, closePool } from '../src/lib/db.js';
import { upsertUser } from '../src/lib/users.js';

const [email = 'pricedemo@gmail.com', password = 'price@demo', name = 'Price demo', role = 'Authorized service'] =
  process.argv.slice(2);

const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

applySchema()
  .then(() => upsertUser({ email, password, name, role, initials }))
  .then((u) => console.log('[user] saved:', u))
  .catch((err) => {
    console.error('[user] failed:', err.message);
    process.exitCode = 1;
  })
  .finally(closePool);

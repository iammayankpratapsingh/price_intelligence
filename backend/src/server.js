import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import uploadRoutes from './routes/upload.js';
import invoiceRoutes from './routes/invoices.js';
import { requireAuth } from './middleware/auth.js';
import { loadCatalog, getCatalog } from './lib/store.js';
import { PORT } from './config.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  let parts = null;
  try {
    parts = getCatalog().parts.length;
  } catch {
    /* catalog still loading */
  }
  res.json({ ok: true, parts, uptime: Math.round(process.uptime()) });
});

app.use('/api/auth', authRoutes);
app.use('/api', requireAuth, catalogRoutes);
app.use('/api/upload', requireAuth, uploadRoutes);
app.use('/api/invoices', requireAuth, invoiceRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: err.message || 'Something went wrong.' });
});

const started = Date.now();

// The catalog is loaded from Neon before the first request is accepted, so no
// route ever has to handle a half-loaded catalog.
try {
  await loadCatalog();
} catch (err) {
  console.error('[startup] catalog failed to load:', err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`[server] Parts Price Intelligence API on http://localhost:${PORT} (ready in ${Date.now() - started} ms)`);
});

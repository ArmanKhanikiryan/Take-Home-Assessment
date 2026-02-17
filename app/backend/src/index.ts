import express from 'express';
import cors from 'cors';
import { isDbReady, getDbPath } from './db.js';
import overviewRouter from './routes/overview.js';
import packagesRouter from './routes/packages.js';
import functionsRouter from './routes/functions.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check — also reports DB status
app.get('/api/health', (_req, res) => {
  const dbReady = isDbReady();
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ok' : 'db_not_ready',
    db: getDbPath(),
    dbReady,
  });
});

// Guard middleware: return 503 with a clear message if DB isn't ready yet
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (!isDbReady()) {
    return res.status(503).json({
      error: 'Database not ready',
      message: `cpg.db is still being generated. Check cpg-gen.log for progress.`,
      db: getDbPath(),
    });
  }
  return next();
});

// Routes
app.use('/api', overviewRouter);
app.use('/api', packagesRouter);
app.use('/api', functionsRouter);

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  const dbReady = isDbReady();
  console.log(`CPG API server running on http://localhost:${PORT}`);
  console.log(`Database: ${getDbPath()} — ${dbReady ? 'READY' : 'NOT READY (still generating)'}`);
});

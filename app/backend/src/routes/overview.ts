import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/overview', (_req, res) => {
  try {
    const stats = query('SELECT key, value FROM dashboard_overview');
    const hotspots = query(`
      SELECT function_id, name, package, hotspot_score, complexity, fan_in, fan_out, loc
      FROM dashboard_hotspots
      ORDER BY hotspot_score DESC
      LIMIT 20
    `);
    const nodeDistribution = query('SELECT node_kind AS kind, count FROM dashboard_node_distribution ORDER BY count DESC');
    const edgeDistribution = query('SELECT edge_kind AS kind, count FROM dashboard_edge_distribution ORDER BY count DESC');
    res.json({ stats, hotspots, nodeDistribution, edgeDistribution });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

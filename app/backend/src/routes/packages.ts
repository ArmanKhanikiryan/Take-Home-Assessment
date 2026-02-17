import { Router } from 'express';
import { query, getDb } from '../db.js';

const router = Router();

// Package dependency graph — configurable via ?limit=N&module=prefix
router.get('/packages/graph', (req, res) => {
  try {
    const db = getDb();
    const limit = Math.min(Number(req.query.limit ?? 30), 200);
    const moduleFilter = req.query.module as string | undefined;

    let pkgQuery = `
      SELECT package, function_count, total_loc, total_complexity
      FROM dashboard_package_treemap
    `;
    if (moduleFilter) {
      pkgQuery += ` WHERE package LIKE '${moduleFilter.replace(/'/g, '')}%'`;
    }
    pkgQuery += ` ORDER BY function_count DESC LIMIT ${limit}`;

    const topPkgs = db.prepare(pkgQuery).all() as Array<{
      package: string; function_count: number; total_loc: number; total_complexity: number;
    }>;

    const pkgSet = new Set(topPkgs.map(p => p.package));
    const pkgList = [...pkgSet];

    const allEdges = db.prepare(`
      SELECT source, target, weight
      FROM dashboard_package_graph
      ORDER BY weight DESC
    `).all() as Array<{ source: string; target: string; weight: number }>;

    // Limit edges proportionally: ~4 edges per node max
    const edgeLimit = limit * 4;
    const edges = allEdges
      .filter(e => pkgSet.has(e.source) && pkgSet.has(e.target))
      .slice(0, edgeLimit);

    // Only keep packages that actually have edges (remove isolated nodes)
    const connectedPkgs = new Set<string>();
    edges.forEach(e => { connectedPkgs.add(e.source); connectedPkgs.add(e.target); });

    const metricsMap: Record<string, { function_count: number; total_loc: number; total_complexity: number }> = {};
    topPkgs.forEach(p => { metricsMap[p.package] = p; });

    const nodes = pkgList
      .filter(pkg => connectedPkgs.has(pkg))
      .map(pkg => ({
        id: pkg,
        label: pkg.split('/').pop() ?? pkg,
        fullPath: pkg,
        ...(metricsMap[pkg] ?? { function_count: 0, total_loc: 0, total_complexity: 0 }),
      }));

    res.json({ nodes, edges });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// All packages list (for search/dropdown)
router.get('/packages', (_req, res) => {
  try {
    const packages = query(`
      SELECT package, function_count, total_loc, total_complexity
      FROM dashboard_package_treemap
      ORDER BY function_count DESC
    `);
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Functions in a package
router.get('/packages/:pkg/functions', (req, res) => {
  try {
    const pkg = decodeURIComponent(req.params.pkg);
    const functions = query(`
      SELECT id, name, file, line, end_line, type_info
      FROM nodes
      WHERE kind IN ('function', 'method') AND package = @pkg
      ORDER BY name
      LIMIT 200
    `, { pkg });
    res.json(functions);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;

import { Router } from 'express';
import { query, queryOne } from '../db.js';

const router = Router();

// Search functions/symbols by name
router.get('/functions/search', (req, res) => {
  try {
    const q = String(req.query.q ?? '');
    const limit = Math.min(Number(req.query.limit ?? 30), 100);
    if (!q) return res.json([]);

    const results = query(`
      SELECT id, name, package, file, line, kind
      FROM nodes
      WHERE kind IN ('function', 'method') AND name LIKE @pattern
      ORDER BY length(name), name
      LIMIT @limit
    `, { pattern: `%${q}%`, limit });
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Direct neighborhood: callers + callees (for call graph view)
router.get('/functions/neighborhood', (req, res) => {
  try {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'id query param required' });

    // The center node itself
    const center = queryOne(`SELECT id, name, package, file, line, end_line, kind FROM nodes WHERE id = @id`, { id });
    if (!center) return res.status(404).json({ error: 'Node not found' });

    // Direct callees (functions this one calls)
    const callees = query(`
      SELECT n.id, n.name, n.package, n.file, n.line, n.kind, 'callee' AS role
      FROM edges e
      JOIN nodes n ON n.id = e.target
      WHERE e.source = @id AND e.kind = 'call' AND n.kind IN ('function','method')
      GROUP BY n.id
      LIMIT 50
    `, { id });

    // Direct callers (functions that call this one)
    const callers = query(`
      SELECT n.id, n.name, n.package, n.file, n.line, n.kind, 'caller' AS role
      FROM edges e
      JOIN nodes n ON n.id = e.source
      WHERE e.target = @id AND e.kind = 'call' AND n.kind IN ('function','method')
      GROUP BY n.id
      LIMIT 50
    `, { id });

    return res.json({ center, callees, callers });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Transitive call chain (what this function eventually calls)
router.get('/functions/call-chain', (req, res) => {
  try {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'id query param required' });
    const depth = Math.min(Number(req.query.depth ?? 4), 8);

    const chain = query(`
      WITH RECURSIVE chain(id, depth, path) AS (
        SELECT @id, 0, @id
        UNION
        SELECT e.target, c.depth + 1, c.path || ' -> ' || e.target
        FROM chain c JOIN edges e ON e.source = c.id
        WHERE e.kind = 'call' AND c.depth < @depth
          AND c.path NOT LIKE '%' || e.target || '%'
      )
      SELECT DISTINCT n.id, n.name, n.package, n.file, n.line, c.depth
      FROM chain c JOIN nodes n ON n.id = c.id
      WHERE n.kind IN ('function','method')
      ORDER BY c.depth, n.name
      LIMIT 80
    `, { id, depth });

    // Edges within the chain
    const chainIds = (chain as Array<{ id: string }>).map(r => r.id);
    let edges: unknown[] = [];
    if (chainIds.length > 1) {
      const placeholders = chainIds.map((_, i) => `@id${i}`).join(',');
      const params: Record<string, string> = {};
      chainIds.forEach((cid, i) => { params[`id${i}`] = cid; });
      edges = query(`
        SELECT source, target FROM edges
        WHERE kind = 'call' AND source IN (${placeholders}) AND target IN (${placeholders})
      `, params);
    }

    return res.json({ nodes: chain, edges });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Source code for a function (from the sources table)
router.get('/functions/source', (req, res) => {
  try {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'id query param required' });
    const node = queryOne(`SELECT id, name, file, line, end_line, package FROM nodes WHERE id = @id`, { id });
    if (!node) return res.status(404).json({ error: 'Node not found' });

    const { file, line, end_line } = node as { file: string | null; line: number | null; end_line: number | null };
    if (!file) return res.json({ source: null });

    const src = queryOne(`SELECT content FROM sources WHERE file = @file`, { file });
    if (!src) return res.json({ source: null, file });

    const { content } = src as { content: string };
    // Slice to function lines if available
    let snippet = content;
    if (line && end_line) {
      const lines = content.split('\n');
      snippet = lines.slice(Math.max(0, line - 1), end_line).join('\n');
    }

    return res.json({ source: snippet, file, line, end_line, fullSource: content });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// Single node detail
router.get('/functions/detail', (req, res) => {
  try {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'id query param required' });
    const node = queryOne(`
      SELECT n.*, m.cyclomatic_complexity, m.fan_in, m.fan_out, m.loc, m.num_params
      FROM nodes n
      LEFT JOIN metrics m ON m.function_id = n.id
      WHERE n.id = @id
    `, { id });
    if (!node) return res.status(404).json({ error: 'Not found' });
    return res.json(node);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;

// config/database.js — PostgreSQL adapter (crash-safe)
// Works with Supabase free tier
const { Pool } = require('pg');
require('dotenv').config();

let pool;

try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // Test connection — but do NOT crash if it fails at startup
  pool.connect()
    .then(client => {
      console.log('✅  Database connected successfully');
      client.release();
    })
    .catch(err => {
      console.error('⚠️  Database connection warning:', err.message);
      console.error('    Check DATABASE_URL environment variable');
      // Do not exit — server stays up, DB retries on next request
    });

} catch (err) {
  console.error('⚠️  Database pool creation failed:', err.message);
  // Create a dummy pool that returns errors gracefully
  pool = {
    execute: async () => { throw new Error('Database not configured. Set DATABASE_URL.'); },
    query:   async () => { throw new Error('Database not configured. Set DATABASE_URL.'); },
  };
}

// ── execute() — mirrors mysql2 pool.execute(sql, params) ───────
pool.execute = async (sql, params = []) => {
  let i = 0;
  let pgSql = sql.replace(/\?/g, () => `$${++i}`);
  pgSql = pgSql.replace(/\bLIKE\b/gi, 'ILIKE');
  if (/^INSERT\s/i.test(pgSql) && !/RETURNING/i.test(pgSql)) {
    pgSql = pgSql + ' RETURNING id';
  }
  const pgParams = (params || []).map(p => {
    if (p === 1 || p === '1') return true;
    if (p === 0 || p === '0') return false;
    return p ?? null;
  });

  const result = await pool.query(pgSql, pgParams);
  const verb = sql.trim().split(/\s+/)[0].toUpperCase();

  if (verb === 'INSERT') {
    return [{ insertId: result.rows[0]?.id ?? null, affectedRows: result.rowCount }];
  }
  if (verb === 'UPDATE' || verb === 'DELETE') {
    return [{ affectedRows: result.rowCount, insertId: null }];
  }

  const rows = result.rows.map(row => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = v instanceof Date ? v.toISOString().split('T')[0] : v;
    }
    return out;
  });
  return [rows];
};

// ── Batch INSERT helper (attendance) ───────────────────────────
const _origQuery = pool.query.bind(pool);
pool.query = async (text, values) => {
  if (typeof text === 'string' && text.includes('VALUES ?') && Array.isArray(values?.[0])) {
    const arr  = values[0];
    const base = text.replace('VALUES ?', '');
    const cols = arr[0].length;
    const groups = arr.map((row, ri) =>
      `(${row.map((_, ci) => `$${ri * cols + ci + 1}`).join(',')})`
    ).join(',');
    const flat = arr.flat().map(p => {
      if (p === 1 || p === '1') return true;
      if (p === 0 || p === '0') return false;
      return p ?? null;
    });
    return _origQuery(`${base} VALUES ${groups} ON CONFLICT DO NOTHING`, flat);
  }
  return values !== undefined ? _origQuery(text, values) : _origQuery(text);
};

module.exports = pool;

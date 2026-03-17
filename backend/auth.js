// config/database.js — PostgreSQL adapter
// Works with Supabase, Railway, Render, or any PostgreSQL provider
const { Pool } = require('pg');
require('dotenv').config();

// Supabase and most cloud PostgreSQL providers require SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Mirrors mysql2 pool.execute(sql, params) interface
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

// Batch INSERT helper
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

// Test connection
(async () => {
  try {
    const c = await pool.connect();
    console.log('✅  Database connected successfully');
    c.release();
  } catch (e) {
    console.error('❌  Database connection failed:', e.message);
    console.error('    Make sure DATABASE_URL environment variable is set correctly');
  }
})();

module.exports = pool;

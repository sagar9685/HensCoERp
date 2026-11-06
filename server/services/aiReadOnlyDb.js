const sql = require('mssql');
let poolPromise;
function readOnlyPool() {
  if (!poolPromise) {
    const required = ['AI_DB_USER','AI_DB_PASSWORD','AI_DB_SERVER','AI_DB_DATABASE'];
    for (const k of required) if (!process.env[k]) {
      throw new Error(`${k} missing. Dynamic AI queries require a dedicated read-only account.`);
    }
    // Do NOT fall back to utils/db.js: that connection currently uses sa.
    poolPromise = new sql.ConnectionPool({
      user: process.env.AI_DB_USER,
      password: process.env.AI_DB_PASSWORD,
      server: process.env.AI_DB_SERVER,
      database: process.env.AI_DB_DATABASE,
      options: { encrypt: true, trustServerCertificate: process.env.AI_DB_TRUST_CERT === 'true' },
      pool: { min: 0, max: 4, idleTimeoutMillis: 30000 },
      connectionTimeout: 8000, requestTimeout: 8000
    }).connect().catch(err => { poolPromise = null; throw err; });
  }
  return poolPromise;
}

// Syntax checks are defense-in-depth only. Actual protection is SQL GRANT SELECT on approved views.
function validateSql(query) {
  let q = String(query || '').trim();
  if (!/^SELECT\s/i.test(q) || q.length > 6500 || /;|--|\/\*|\*\//.test(q)) throw new Error('A single SELECT is required');
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|MERGE|EXEC|EXECUTE|GRANT|REVOKE|DENY|BACKUP|RESTORE|DBCC|WAITFOR|BULK|OPENROWSET|OPENQUERY|OPENDATASOURCE|INTO|OPTION|UNION|INTERSECT|EXCEPT|DECLARE|SET|USE|SHUTDOWN|WAITFOR|OPENJSON)\b/i.test(q)) throw new Error('Unsupported SQL operation');
  if (/\b(sys|information_schema|master|msdb|tempdb|xp_cmdshell)\b/i.test(q)) throw new Error('System data access blocked');
  if (/\b(?:FROM|JOIN)\s*\(/i.test(q)) throw new Error('Derived table queries must use an approved reporting view');
  if (/\b(?:FROM|JOIN)\s+[^\s]+\.[^\s]+\./i.test(q)) throw new Error('Cross database references blocked');
  const matches = [...q.matchAll(/\b(?:FROM|JOIN)\s+(?:\[dbo\]\.|dbo\.)?(\[?[A-Za-z_][A-Za-z0-9_]*\]?)/gi)];
  if (!matches.length) throw new Error('No approved reporting view');
  const allowed = (process.env.AI_ALLOWED_VIEWS || 'AI_Orders,AI_OrderItems,AI_Payments,AI_Customers,AI_DeliveryCash,AI_Stock,AI_CreditNotes')
    .split(',').map(x=>x.trim().toLowerCase());
  for (const match of matches) {
    const name = match[1].replace(/[\[\]]/g,'').toLowerCase();
    if (!allowed.includes(name)) throw new Error(`View not allowed: ${name}`);
  }
  if (/^SELECT\s+DISTINCT\s/i.test(q)) {
    if (!/^SELECT\s+DISTINCT\s+TOP\s*\(?\d+/i.test(q)) q = q.replace(/^SELECT\s+DISTINCT\s/i,'SELECT DISTINCT TOP (100) ');
  } else if (!/^SELECT\s+TOP\s*\(?\d+/i.test(q)) q = q.replace(/^SELECT\s/i,'SELECT TOP (100) ');
  const top = q.match(/^SELECT\s+(?:DISTINCT\s+)?TOP\s*\(?(\d+)\)?/i);
  if (!top || +top[1] < 1 || +top[1] > 100) throw new Error('TOP must be 1..100');
  return q;
}
async function execute(query) {
  const safe = validateSql(query);
  const pool = await readOnlyPool();
  const request = pool.request();
  request.timeout = 8000;
  const result = await request.query(safe);
  return { queryUsed: safe, data: result.recordset || [] };
}
module.exports = { execute, validateSql };

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { z } from 'zod';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 10000);
const jwtSecret = process.env.JWT_SECRET;
const databaseUrl = process.env.DATABASE_URL;
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) throw new Error('CORS_ORIGINS deve listar a origem do frontend em produção.');

if (!databaseUrl) throw new Error('DATABASE_URL não configurada.');
if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres.');

const pool = new Pool({
  connectionString: databaseUrl,
  // Render internal Postgres URLs usam rede privada; TLS externo pode ser habilitado
  // pela própria DATABASE_URL/PGSSLMODE sem desativar validação de certificado.
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origem não autorizada pelo CORS.'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false });
const idSchema = z.string().trim().min(1).max(120);
const environmentSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(100),
  clientName: z.string().max(100).optional().default(''),
  unitName: z.string().max(100).optional().default(''),
  building: z.string().max(100).optional().default(''),
  floor: z.string().max(60).optional().default(''),
  sector: z.string().max(100).optional().default(''),
  planMetadata: z.record(z.unknown()).optional().default({})
});
const assetSchema = z.object({
  id: idSchema,
  environmentId: idSchema,
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(60).default('asset'),
  manufacturer: z.string().max(100).optional().default(''),
  model: z.string().max(100).optional().default(''),
  serialNumber: z.string().max(120).optional().default(''),
  qrSignature: z.string().max(120).optional().default(''),
  qrIdentifier: z.string().max(180).optional().default(''),
  x: z.number().finite().optional().nullable(),
  z: z.number().finite().optional().nullable(),
  positioned: z.boolean().optional().default(false),
  metadata: z.record(z.unknown()).optional().default({})
});

function auth(requiredRoles = []) {
  return (req, res, next) => {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    try {
      const payload = jwt.verify(token, jwtSecret);
      if (!payload.sub || !payload.org || !payload.role) return res.status(401).json({ error: 'Token inválido.' });
      if (requiredRoles.length && !requiredRoles.includes(payload.role)) return res.status(403).json({ error: 'Permissão insuficiente.' });
      req.user = { id: payload.sub, organizationId: payload.org, role: payload.role };
      next();
    } catch {
      return res.status(401).json({ error: 'Autenticação necessária.' });
    }
  };
}

async function audit(client, user, eventType, entityType, entityId, details = {}) {
  await client.query(
    'INSERT INTO audit_events (organization_id, actor_user_id, event_type, entity_type, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
    [user.organizationId, user.id, eventType, entityType, String(entityId), JSON.stringify(details)]
  );
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', api: 'smuploc', officialSmupApi: 'not-integrated' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
  try {
    const input = z.object({ email: z.string().email().max(200), password: z.string().min(1).max(200) }).parse(req.body);
    const result = await pool.query(
      'SELECT id, organization_id, email, password_hash, display_name, role, active FROM users WHERE lower(email)=lower($1) LIMIT 1',
      [input.email]
    );
    const user = result.rows[0];
    if (!user || !user.active || !(await bcrypt.compare(input.password, user.password_hash))) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }
    const token = jwt.sign({ org: user.organization_id, role: user.role }, jwtSecret, { subject: user.id, expiresIn: '8h', issuer: 'smuploc-api', audience: 'smuploc-client' });
    res.json({ token, expiresIn: 28800, user: { id: user.id, email: user.email, name: user.display_name, role: user.role } });
  } catch (error) { next(error); }
});

app.get('/api/me', auth(), (req, res) => res.json({ user: req.user }));

app.get('/api/environments', auth(), async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, client_name AS "clientName", unit_name AS "unitName", building, floor, sector, plan_metadata AS "planMetadata", updated_at AS "updatedAt" FROM environments WHERE organization_id=$1 ORDER BY name',
      [req.user.organizationId]
    );
    res.json({ items: result.rows });
  } catch (error) { next(error); }
});

app.post('/api/environments', auth(['admin', 'technician']), async (req, res, next) => {
  const parsed = environmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados de ambiente inválidos.', details: parsed.error.flatten() });
  const v = parsed.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO environments (id, organization_id, name, client_name, unit_name, building, floor, sector, plan_metadata, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (organization_id,id) DO UPDATE SET name=EXCLUDED.name, client_name=EXCLUDED.client_name,
       unit_name=EXCLUDED.unit_name, building=EXCLUDED.building, floor=EXCLUDED.floor, sector=EXCLUDED.sector,
       plan_metadata=EXCLUDED.plan_metadata, updated_at=NOW()`,
      [v.id, req.user.organizationId, v.name, v.clientName, v.unitName, v.building, v.floor, v.sector, JSON.stringify(v.planMetadata), req.user.id]
    );
    await audit(client, req.user, 'environment.upsert', 'environment', v.id);
    await client.query('COMMIT');
    res.status(201).json({ item: v });
  } catch (error) { await client.query('ROLLBACK'); next(error); }
  finally { client.release(); }
});

app.get('/api/environments/:environmentId/assets', auth(), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, environment_id AS "environmentId", name, category, manufacturer, model,
       serial_number AS "serialNumber", qr_signature AS "qrSignature", qr_identifier AS "qrIdentifier",
       x, z, positioned, metadata, updated_at AS "updatedAt"
       FROM assets WHERE organization_id=$1 AND environment_id=$2 ORDER BY name`,
      [req.user.organizationId, req.params.environmentId]
    );
    res.json({ items: result.rows });
  } catch (error) { next(error); }
});

app.post('/api/assets', auth(['admin', 'technician']), async (req, res, next) => {
  const parsed = assetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados do ativo inválidos.', details: parsed.error.flatten() });
  const v = parsed.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = await client.query('SELECT 1 FROM environments WHERE organization_id=$1 AND id=$2', [req.user.organizationId, v.environmentId]);
    if (!exists.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ambiente não encontrado nesta organização.' });
    }
    await client.query(
      `INSERT INTO assets (id, organization_id, environment_id, name, category, manufacturer, model,
       serial_number, qr_signature, qr_identifier, x, z, positioned, metadata, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [v.id, req.user.organizationId, v.environmentId, v.name, v.category, v.manufacturer, v.model,
       v.serialNumber, v.qrSignature, v.qrIdentifier, v.x, v.z, v.positioned, JSON.stringify(v.metadata), req.user.id]
    );
    await audit(client, req.user, 'asset.created', 'asset', v.id, { category: v.category, qrSignature: v.qrSignature });
    await client.query('COMMIT');
    res.status(201).json({ item: v });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') return res.status(409).json({ error: 'Ativo ou identificador QR já cadastrado neste ambiente.' });
    next(error);
  } finally { client.release(); }
});

app.patch('/api/assets/:assetId', auth(['admin', 'technician']), async (req, res, next) => {
  const parsed = assetSchema.partial().omit({ id: true, environmentId: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Atualização inválida.', details: parsed.error.flatten() });
  const fields = {
    name: 'name', category: 'category', manufacturer: 'manufacturer', model: 'model',
    serialNumber: 'serial_number', qrSignature: 'qr_signature', qrIdentifier: 'qr_identifier',
    x: 'x', z: 'z', positioned: 'positioned', metadata: 'metadata'
  };
  const entries = Object.entries(parsed.data).filter(([key]) => fields[key]);
  if (!entries.length) return res.status(400).json({ error: 'Nenhum campo válido informado.' });
  const values = [req.user.organizationId, req.params.assetId];
  const sets = entries.map(([key, value]) => {
    values.push(key === 'metadata' ? JSON.stringify(value) : value);
    return `${fields[key]}=$${values.length}`;
  });
  values.push(new Date().toISOString());
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE assets SET ${sets.join(', ')}, updated_at=$${values.length}
       WHERE organization_id=$1 AND id=$2 RETURNING id`, values
    );
    if (!updated.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Ativo não encontrado.' }); }
    await audit(client, req.user, 'asset.updated', 'asset', req.params.assetId, { fields: entries.map(([key]) => key) });
    await client.query('COMMIT');
    res.json({ updated: true });
  } catch (error) { await client.query('ROLLBACK'); next(error); }
  finally { client.release(); }
});

app.delete('/api/assets/:assetId', auth(['admin']), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const removed = await client.query('DELETE FROM assets WHERE organization_id=$1 AND id=$2 RETURNING id', [req.user.organizationId, req.params.assetId]);
    if (!removed.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Ativo não encontrado.' }); }
    await audit(client, req.user, 'asset.deleted', 'asset', req.params.assetId);
    await client.query('COMMIT');
    res.json({ deleted: true });
  } catch (error) { await client.query('ROLLBACK'); next(error); }
  finally { client.release(); }
});

app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Requisição inválida.', details: error.flatten() });
  if (error.message === 'Origem não autorizada pelo CORS.') return res.status(403).json({ error: error.message });
  console.error('SMUPLOC API error:', error);
  res.status(500).json({ error: 'Erro interno. Consulte os logs do servidor.' });
});

async function bootstrap() {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (email && password) {
    const exists = await pool.query('SELECT id FROM users LIMIT 1');
    if (!exists.rowCount) {
      const orgId = randomUUID();
      const userId = randomUUID();
      const hash = await bcrypt.hash(password, 12);
      await pool.query('BEGIN');
      try {
        await pool.query('INSERT INTO organizations (id,name) VALUES ($1,$2)', [orgId, process.env.BOOTSTRAP_ORG_NAME || 'Organização SMUPLOC']);
        await pool.query(
          'INSERT INTO users (id,organization_id,email,password_hash,display_name,role) VALUES ($1,$2,lower($3),$4,$5,$6)',
          [userId, orgId, email, hash, process.env.BOOTSTRAP_ADMIN_NAME || 'Administrador', 'admin']
        );
        await pool.query('COMMIT');
        console.log('Conta administrativa inicial criada.');
      } catch (error) { await pool.query('ROLLBACK'); throw error; }
    }
  }
  app.listen(port, '0.0.0.0', () => console.log(`SMUPLOC API ouvindo na porta ${port}`));
}

if (process.env.NODE_ENV !== 'test') bootstrap().catch(error => { console.error('Falha ao iniciar API:', error); process.exit(1); });

export { app, pool };

import express, { Request, Response, NextFunction } from 'express';
import pkg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Fix: Cast process to any to access cwd() when types are missing or conflicting
const envLocalPath = path.resolve((process as any).cwd(), '.env.local');
const envPath = path.resolve((process as any).cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else {
    dotenv.config();
}

const { Pool, Client } = pkg;
const app = express();
const port = 3002; 

(app as any).use(cors());
(app as any).use(express.json());

const DB_CONFIG_BASE = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
};

const MASTER_DB_NAME = process.env.MASTER_DB_NAME || 'niyojan_master'; 

const pools = new Map();
const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const formatDate = (dateVal: any) => {
    if (!dateVal) return '';
    try { return new Date(dateVal).toISOString().split('T')[0]; } catch (e) { return ''; }
};

// --- MAPPERS ---
const mapUser = (row: any) => ({
    id: String(row.emp_code),
    emp_code: row.emp_code,
    name: row.name,
    email: row.email,
    department: row.department,
    hod: row.hod,
    role: row.role,
    status: row.status
});

const mapHardware = (row: any) => ({
    id: String(row.id),
    name: row.name,
    serialNumber: row.serial_number,
    assetTag: row.asset_tag,
    manufacturer: row.manufacturer,
    model: row.model,
    category: row.category,
    status: row.status,
    assignedTo: row.assigned_to,
    department: row.department,
    hod: row.hod,
    location: row.location,
    previousOwner: row.previous_owner,
    purchaseDate: formatDate(row.purchase_date),
    purchaseCost: row.purchase_cost ? parseFloat(row.purchase_cost) : 0,
});

const mapLifecycle = (row: any) => ({
    id: String(row.id),
    assetId: row.asset_id,
    assetType: row.asset_type,
    eventType: row.event_type,
    description: row.description,
    previousValue: row.previous_value,
    newValue: row.new_value,
    timestamp: row.timestamp,
    actor: row.actor
});

const getPool = (dbName: string) => {
    if (pools.has(dbName)) return pools.get(dbName);
    const pool = new Pool({ ...DB_CONFIG_BASE, database: dbName });
    pool.on('connect', (client) => {
        client.query(`SET TIME ZONE '${systemTimeZone}'`).catch(() => {});
    });
    pool.on('error', (err) => {
        console.error(`Unexpected error on idle client for DB ${dbName}`, err);
    });
    pools.set(dbName, pool);
    return pool;
};

const queryDB = async (dbName: string, text: string, params: any[] = []) => {
    const pool = getPool(dbName);
    return pool.query(text, params);
};

// Middleware for Multi-Tenancy
app.use((req: any, res: any, next: NextFunction) => {
    const orgId = req.headers['x-organization-id'];
    if (!orgId || orgId === 'master') {
        req.targetDB = MASTER_DB_NAME; 
    } else {
        const cleanOrgId = orgId.toString().replace(/[^a-z0-9_]/g, '');
        req.targetDB = `niyojan_org_${cleanOrgId}`;
    }
    next();
});

/* ---------- ENDPOINTS ---------- */

app.get('/api/health', (req: any, res: any) => res.json({ status: 'ok', db: req.targetDB }));

app.post('/api/login', async (req: any, res: any) => {
    res.json({ user: { id: '1', username: req.body.username, role: 'Admin' }, token: 'tk-1', role: 'Admin', orgId: 'pcpl' });
});

app.post('/api/admin/initialize', async (req: any, res: any) => {
    try {
        const schema = `
            CREATE TABLE IF NOT EXISTS departments (id SERIAL PRIMARY KEY, name VARCHAR(255), hod_name VARCHAR(255));
            CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE);
            CREATE TABLE IF NOT EXISTS locations (id SERIAL PRIMARY KEY, type VARCHAR(10), name VARCHAR(255), code VARCHAR(100) UNIQUE, date_created DATE, spoc_name VARCHAR(255), spoc_email VARCHAR(255), spoc_phone VARCHAR(50), address TEXT, status VARCHAR(20));
            CREATE TABLE IF NOT EXISTS users (id SERIAL, emp_code VARCHAR(100) PRIMARY KEY, name VARCHAR(255), email VARCHAR(255), department VARCHAR(100), hod VARCHAR(255), role VARCHAR(100), status VARCHAR(20));
            CREATE TABLE IF NOT EXISTS hardware_inventory (id SERIAL PRIMARY KEY, name VARCHAR(255), serial_number VARCHAR(255), asset_tag VARCHAR(100), manufacturer VARCHAR(100), model VARCHAR(100), category VARCHAR(100), status VARCHAR(50), assigned_to VARCHAR(255), department VARCHAR(100), hod VARCHAR(255), location VARCHAR(100), purchase_cost DECIMAL(12,2), purchase_date DATE);
            CREATE TABLE IF NOT EXISTS software_licenses (id SERIAL PRIMARY KEY, name VARCHAR(255), version VARCHAR(50), license_key VARCHAR(255), type VARCHAR(50), seat_count INTEGER, cost_per_seat DECIMAL(10,2), expiry_date DATE, assigned_to TEXT);
            CREATE TABLE IF NOT EXISTS lifecycle_events (id SERIAL PRIMARY KEY, asset_id VARCHAR(50), asset_type VARCHAR(20), event_type VARCHAR(20), description TEXT, previous_value TEXT, new_value TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, actor VARCHAR(100));
        `;
        await queryDB(req.targetDB, schema);
        try {
            await queryDB(req.targetDB, 'ALTER TABLE users ADD COLUMN IF NOT EXISTS emp_code VARCHAR(100)');
                await queryDB(req.targetDB, 'UPDATE users SET emp_code = COALESCE(emp_code, id::text) WHERE emp_code IS NULL OR emp_code = \'\'');
            await queryDB(req.targetDB, 'ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey');
            await queryDB(req.targetDB, 'ALTER TABLE users ADD CONSTRAINT users_emp_code_pk PRIMARY KEY (emp_code)');
        } catch(e) {}
        res.json({ message: `Database ${req.targetDB} initialized successfully.` });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async (req: any, res: any) => {
    try {
        const result = await queryDB(req.targetDB, 'SELECT * FROM users ORDER BY name ASC');
        res.json(result.rows.map(mapUser));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async (req: any, res: any) => {
    try {
        const { emp_code, name, email, department, hod, role, status } = req.body;
        const result = await queryDB(
            req.targetDB,
            `INSERT INTO users (emp_code, name, email, department, hod, role, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (emp_code)
             DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, department = EXCLUDED.department,
                           hod = EXCLUDED.hod, role = EXCLUDED.role, status = EXCLUDED.status
             RETURNING *`,
            [emp_code, name, email, department, hod, role, status || 'Active']
        );
        res.status(201).json(mapUser(result.rows[0]));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put('/api/users/:id', async (req: any, res: any) => {
    try {
        const { emp_code, name, email, department, hod, role, status } = req.body;
        const result = await queryDB(req.targetDB, 'UPDATE users SET emp_code=$1, name=$2, email=$3, department=$4, hod=$5, role=$6, status=$7 WHERE emp_code=$8 RETURNING *', [emp_code, name, email, department, hod, role, status, req.params.id]);
        res.json(mapUser(result.rows[0]));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', async (req: any, res: any) => {
    try { await queryDB(req.targetDB, 'DELETE FROM users WHERE emp_code=$1', [req.params.id]); res.sendStatus(204); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/lifecycle', async (req: any, res: any) => {
    try {
        const r = await queryDB(req.targetDB, 'SELECT * FROM lifecycle_events ORDER BY timestamp DESC LIMIT 500');
        res.json(r.rows.map(mapLifecycle));
    } catch(e: any) { res.status(500).json({error:e.message}); }
});

app.post('/api/lifecycle', async (req: any, res: any) => {
    try {
        const { assetId, assetType, eventType, description, previousValue, newValue, actor } = req.body;
        const r = await queryDB(req.targetDB, 
            'INSERT INTO lifecycle_events (asset_id, asset_type, event_type, description, previous_value, new_value, actor) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [assetId, assetType, eventType, description, previousValue, newValue, actor]
        );
        res.status(201).json(mapLifecycle(r.rows[0]));
    } catch(e: any) { res.status(500).json({error:e.message}); }
});

app.get('/api/hardware', async (req: any, res: any) => { try { const r = await queryDB(req.targetDB, 'SELECT * FROM hardware_inventory ORDER BY id DESC'); res.json(r.rows.map(mapHardware)); } catch(e: any) { res.status(500).json({error:e.message}); } });
app.get('/api/software', async (req: any, res: any) => { try { const r = await queryDB(req.targetDB, 'SELECT * FROM software_licenses ORDER BY id DESC'); res.json(r.rows.map(s => ({...s, id: String(s.id)}))); } catch(e: any) { res.status(500).json({error:e.message}); } });
app.get('/api/departments', async (req: any, res: any) => { try { const r = await queryDB(req.targetDB, 'SELECT id, name, hod_name as "hodName" FROM departments ORDER BY name'); res.json(r.rows); } catch(e: any) { res.status(500).json({error:e.message}); } });
app.get('/api/categories', async (req: any, res: any) => { try { const r = await queryDB(req.targetDB, 'SELECT * FROM categories ORDER BY name'); res.json(r.rows); } catch(e: any) { res.status(500).json({error:e.message}); } });
app.get('/api/locations', async (req: any, res: any) => { try { const r = await queryDB(req.targetDB, 'SELECT * FROM locations ORDER BY name'); res.json(r.rows); } catch(e: any) { res.status(500).json({error:e.message}); } });
app.get('/api/alerts/definitions', async (req: any, res: any) => { try { const r = await queryDB(req.targetDB, 'SELECT * FROM alert_definitions'); res.json(r.rows); } catch(e: any) { res.status(500).json({error:e.message}); } });
app.get('/api/network', async (req: any, res: any) => { try { const r = await queryDB(req.targetDB, 'SELECT * FROM network_inventory ORDER BY id DESC'); res.json(r.rows); } catch(e: any) { res.status(500).json({error:e.message}); } });

const start = async () => {
    try {
        const rootClient = new Client({ ...DB_CONFIG_BASE, database: 'postgres' });
        await rootClient.connect();
        const dbCheck = await rootClient.query(`SELECT 1 FROM pg_database WHERE datname = '${MASTER_DB_NAME}'`);
        if (dbCheck.rows.length === 0) { await rootClient.query(`CREATE DATABASE ${MASTER_DB_NAME}`); }
        await rootClient.end();
        const masterPool = getPool(MASTER_DB_NAME);
        await masterPool.query(`
            CREATE TABLE IF NOT EXISTS organizations (id VARCHAR(50) PRIMARY KEY, name VARCHAR(255) NOT NULL, code VARCHAR(50) UNIQUE NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS super_admins (id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE, salt VARCHAR(255), password_hash VARCHAR(255));
        `);
        app.listen(port, '0.0.0.0', () => console.log(`🚀 Server listening on port ${port}`));
    } catch (err: any) { 
        console.error('❌ FATAL STARTUP ERROR:', err); 
        (process as any).exit(1); 
    }
};

start();
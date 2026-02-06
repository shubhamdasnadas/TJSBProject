
import express from 'express';
import pkg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else {
    dotenv.config();
}

const { Pool, Client } = pkg;
const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const DB_CONFIG_BASE = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
};

const MASTER_DB_NAME = 'niyojan_master';
const pools = new Map();
const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// --- UTILS ---
const getLocalTimestamp = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localDate = new Date(now.getTime() - offsetMs);
    return localDate.toISOString().slice(0, 19).replace('T', ' ');
};

const formatDate = (dateVal) => {
    if (!dateVal) return '';
    try {
        return new Date(dateVal).toISOString().split('T')[0];
    } catch (e) { return ''; }
};

const getPool = (dbName) => {
    if (pools.has(dbName)) return pools.get(dbName);
    const pool = new Pool({ ...DB_CONFIG_BASE, database: dbName });
    pool.on('connect', (client) => {
        client.query(`SET TIME ZONE '${systemTimeZone}'`).catch(err => console.error("Timezone Sync Error:", err.message));
    });
    pools.set(dbName, pool);
    return pool;
};

const queryDB = async (dbName, text, params) => {
    const pool = getPool(dbName);
    return pool.query(text, params);
};

// --- MAPPERS ---
const mapUser = (row) => ({
    id: String(row.id),
    name: row.name || row.full_name || '',
    email: row.email || '',
    department: row.department || '',
    hod: row.hod || '',
    role: row.role || '',
    status: row.status || 'Active',
    empCode: row.emp_code || row.employee_code || `EMP-${row.id}`
});

const mapHardware = (row) => ({
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
    purchaseDate: formatDate(row.purchase_date),
    purchaseCost: row.purchase_cost ? parseFloat(row.purchase_cost) : 0
});

const mapSoftware = (row) => ({
    id: String(row.id),
    name: row.name,
    version: row.version,
    licenseKey: row.license_key,
    type: row.type,
    seatCount: row.seat_count,
    costPerSeat: row.cost_per_seat ? parseFloat(row.cost_per_seat) : 0,
    assignedTo: typeof row.assigned_to === 'string' ? JSON.parse(row.assigned_to) : (row.assigned_to || [])
});

const mapNetwork = (row) => ({
    id: String(row.id),
    name: row.name,
    type: row.type,
    ipAddress: row.ip_address,
    macAddress: row.mac_address,
    manufacturer: row.manufacturer,
    model: row.model,
    firmwareVersion: row.firmware_version,
    status: row.status,
    location: row.location
});

// --- MIDDLEWARE ---
app.use((req, res, next) => {
    const orgId = req.headers['x-organization-id'];
    if (!orgId || orgId === 'null' || orgId === 'undefined' || orgId === 'pcpl') {
        req.targetDB = 'niyojan_org_pcpl';
    } else {
        const cleanOrgId = orgId.toString().replace(/[^a-z0-9_]/g, '');
        req.targetDB = `niyojan_org_${cleanOrgId}`;
    }
    next();
});

// --- ROUTES ---
app.get('/api/health', (req, res) => res.json({ status: 'ok', db: req.targetDB }));

// USERS
app.get('/api/users', async (req, res) => {
    try {
        const result = await queryDB(req.targetDB, 'SELECT * FROM users ORDER BY name ASC');
        res.json(result.rows.map(mapUser));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async (req, res) => {
    try {
        const { name, email, department, hod, role, status, empCode } = req.body;
        const result = await queryDB(req.targetDB, 'INSERT INTO users (name, email, department, hod, role, status, emp_code) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [name, email, department, hod, role, status || 'Active', empCode]);
        res.status(201).json(mapUser(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// HARDWARE
app.get('/api/hardware', async (req, res) => {
    try {
        const result = await queryDB(req.targetDB, 'SELECT * FROM hardware_inventory ORDER BY id DESC');
        res.json(result.rows.map(mapHardware));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/hardware', async (req, res) => {
    try {
        const { name, serialNumber, assetTag, manufacturer, model, category, status, assignedTo, department, hod, location, purchaseDate, purchaseCost } = req.body;
        const query = `INSERT INTO hardware_inventory (name, serial_number, asset_tag, manufacturer, model, category, status, assigned_to, department, hod, location, purchase_date, purchase_cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`;
        const result = await queryDB(req.targetDB, query, [name, serialNumber, assetTag, manufacturer, model, category, status, assignedTo, department, hod, location, purchaseDate || null, purchaseCost || 0]);
        res.status(201).json(mapHardware(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// SOFTWARE
app.get('/api/software', async (req, res) => {
    try {
        const result = await queryDB(req.targetDB, 'SELECT * FROM software_licenses ORDER BY name ASC');
        res.json(result.rows.map(mapSoftware));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/software', async (req, res) => {
    try {
        const { name, version, licenseKey, type, seatCount, costPerSeat, assignedTo } = req.body;
        const result = await queryDB(req.targetDB, 'INSERT INTO software_licenses (name, version, license_key, type, seat_count, cost_per_seat, assigned_to) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [name, version, licenseKey, type, seatCount, costPerSeat, JSON.stringify(assignedTo || [])]);
        res.status(201).json(mapSoftware(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// NETWORK
app.get('/api/network', async (req, res) => {
    try {
        const result = await queryDB(req.targetDB, 'SELECT * FROM network_inventory ORDER BY name ASC');
        res.json(result.rows.map(mapNetwork));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/network', async (req, res) => {
    try {
        const { name, type, ipAddress, macAddress, manufacturer, model, firmwareVersion, status, location } = req.body;
        const result = await queryDB(req.targetDB, 'INSERT INTO network_inventory (name, type, ip_address, mac_address, manufacturer, model, firmware_version, status, location) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', [name, type, ipAddress, macAddress, manufacturer, model, firmwareVersion, status, location]);
        res.status(201).json(mapNetwork(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DEPARTMENTS
app.get('/api/departments', async (req, res) => {
    try {
        const result = await queryDB(req.targetDB, 'SELECT id, name, hod_name as "hodName" FROM departments ORDER BY name ASC');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/departments', async (req, res) => {
    try {
        const result = await queryDB(req.targetDB, 'INSERT INTO departments (name, hod_name) VALUES ($1, $2) RETURNING id, name, hod_name as "hodName"', [req.body.name, req.body.hodName]);
        res.status(201).json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// CATEGORIES
app.get('/api/categories', async (req, res) => {
    try {
        const result = await queryDB(req.targetDB, 'SELECT * FROM categories ORDER BY name ASC');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/categories', async (req, res) => {
    try {
        const result = await queryDB(req.targetDB, 'INSERT INTO categories (name) VALUES ($1) RETURNING *', [req.body.name]);
        res.status(201).json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// LOCATIONS
app.get('/api/locations', async (req, res) => {
    try {
        const result = await queryDB(req.targetDB, 'SELECT * FROM locations ORDER BY name ASC');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/locations', async (req, res) => {
    try {
        const { type, name, code, subLocations } = req.body;
        const result = await queryDB(req.targetDB, 'INSERT INTO locations (type, name, code, sub_locations) VALUES ($1, $2, $3, $4) RETURNING *', [type || 'Site', name, code, subLocations || []]);
        res.status(201).json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// LIFECYCLE
app.get('/api/lifecycle', async (req, res) => {
    try {
        const result = await queryDB(req.targetDB, 'SELECT * FROM lifecycle_events ORDER BY timestamp DESC LIMIT 100');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/lifecycle', async (req, res) => {
    try {
        const { assetId, assetType, eventType, description, newValue } = req.body;
        const result = await queryDB(req.targetDB, 'INSERT INTO lifecycle_events (asset_id, asset_type, event_type, description, new_value) VALUES ($1, $2, $3, $4, $5) RETURNING *', [assetId, assetType, eventType, description, newValue]);
        res.status(201).json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ALERTS
app.get('/api/alerts/definitions', async (req, res) => {
    try {
        const result = await queryDB(req.targetDB, 'SELECT * FROM alert_definitions ORDER BY id ASC');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/alerts/definitions', async (req, res) => {
    try {
        const { name, module, type, field, threshold, severity, enabled } = req.body;
        const result = await queryDB(req.targetDB, 'INSERT INTO alert_definitions (name, module, type, field, threshold, severity, enabled) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [name, module, type, field, threshold, severity, enabled]);
        res.status(201).json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// AUTH PLACEHOLDER
app.post('/api/login', async (req, res) => {
    res.json({ 
        user: { id: '1', username: 'Admin', role: 'Super Admin' }, 
        token: 'dev-token', 
        role: 'Super Admin', 
        orgId: 'pcpl' 
    });
});

app.post('/api/admin/init', async (req, res) => {
    const schema = `
        CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT, emp_code TEXT UNIQUE, email TEXT, department TEXT, hod TEXT, role TEXT, status TEXT);
        CREATE TABLE IF NOT EXISTS hardware_inventory (id SERIAL PRIMARY KEY, name TEXT, serial_number TEXT UNIQUE, asset_tag TEXT, manufacturer TEXT, model TEXT, category TEXT, status TEXT, assigned_to TEXT, department TEXT, hod TEXT, location TEXT, purchase_date DATE, purchase_cost DECIMAL);
        CREATE TABLE IF NOT EXISTS software_licenses (id SERIAL PRIMARY KEY, name TEXT, version TEXT, license_key TEXT, type TEXT, seat_count INTEGER, cost_per_seat DECIMAL, assigned_to JSONB);
        CREATE TABLE IF NOT EXISTS network_inventory (id SERIAL PRIMARY KEY, name TEXT, type TEXT, ip_address TEXT, mac_address TEXT, manufacturer TEXT, model TEXT, firmware_version TEXT, status TEXT, location TEXT);
        CREATE TABLE IF NOT EXISTS departments (id SERIAL PRIMARY KEY, name TEXT UNIQUE, hod_name TEXT);
        CREATE TABLE IF NOT EXISTS categories (id SERIAL PRIMARY KEY, name TEXT UNIQUE);
        CREATE TABLE IF NOT EXISTS locations (id SERIAL PRIMARY KEY, name TEXT UNIQUE, code TEXT, type TEXT, sub_locations TEXT[]);
        CREATE TABLE IF NOT EXISTS lifecycle_events (id SERIAL PRIMARY KEY, asset_id TEXT, asset_type TEXT, event_type TEXT, description TEXT, new_value TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS alert_definitions (id SERIAL PRIMARY KEY, name TEXT, module TEXT, type TEXT, field TEXT, threshold TEXT, severity TEXT, enabled BOOLEAN);
    `;
    try {
        await queryDB(req.targetDB, schema);
        res.json({ message: "Success" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 Niyojan Full Server running on port ${port}`);
    console.log(`📡 Default DB: niyojan_org_pcpl`);
});

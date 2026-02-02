
import express from 'express';
import pkg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';

// Load Environment Variables
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

// --- MULTI-TENANCY ARCHITECTURE ---
const DB_CONFIG_BASE = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
};

const MASTER_DB_NAME = 'niyojan_master';

// Cache for connection pools
const pools = new Map();

// Helper: Get System Timezone
const systemTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Helper: Get Local SQL Timestamp
const getLocalTimestamp = () => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localDate = new Date(now.getTime() - offsetMs);
    return localDate.toISOString().slice(0, 19).replace('T', ' ');
};

// --- DATA MAPPERS (Snake Case -> Camel Case) ---
const formatDate = (dateVal) => {
    if (!dateVal) return '';
    try {
        return new Date(dateVal).toISOString().split('T')[0];
    } catch (e) { return ''; }
};

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
    previousOwner: row.previous_owner,
    
    purchaseDate: formatDate(row.purchase_date),
    invoiceDate: formatDate(row.invoice_date),
    poNumber: row.po_number,
    purchaseCost: row.purchase_cost ? parseFloat(row.purchase_cost) : 0,
    warrantyExpiry: formatDate(row.warranty_expiry),
    supportCoverage: row.support_coverage,
    fitnessYears: row.fitness_years,
    fitnessExpiry: formatDate(row.fitness_expiry),
    
    issuedDate: formatDate(row.issued_date),
    returnedDate: formatDate(row.returned_date),
    retirementDate: formatDate(row.retirement_date),

    vendorName: row.vendor_name,
    vendorSpoc: row.vendor_spoc,
    vendorContact: row.vendor_contact,
    
    maintenanceType: row.maintenance_type,
    maintenanceStartDate: formatDate(row.maintenance_start_date),
    maintenanceEndDate: formatDate(row.maintenance_end_date),
    
    ramConfig: row.ram_config,
    diskType: row.disk_type,
    storageCapacity: row.storage_capacity,
    processor: row.processor,
    connectionType: row.connection_type,
    
    resolution: row.resolution,
    smartOs: row.smart_os,
    screenDimension: row.screen_dimension,
    mountType: row.mount_type,
    inputType: row.input_type,
    powerSource: row.power_source,

    cctvType: row.cctv_type,
    dvrModel: row.dvr_model,
    fieldView: row.field_view,
    ipAddress: row.ip_address,
    maintenanceFrequency: row.maintenance_frequency,

    notes: row.notes
});

const mapSoftware = (row) => {
    let assignedTo = [];
    try {
        assignedTo = typeof row.assigned_to === 'string' ? JSON.parse(row.assigned_to) : row.assigned_to;
        if(!Array.isArray(assignedTo)) assignedTo = [];
    } catch (e) { assignedTo = []; }

    return {
        id: String(row.id),
        name: row.name,
        version: row.version,
        licenseKey: row.license_key,
        type: row.type,
        seatCount: row.seat_count,
        costPerSeat: row.cost_per_seat ? parseFloat(row.cost_per_seat) : 0,
        expiryDate: formatDate(row.expiry_date),
        assignedTo: assignedTo,
        
        department: row.department,
        hod: row.hod,
        
        purchaseDate: formatDate(row.purchase_date),
        invoiceDate: formatDate(row.invoice_date),
        poNumber: row.po_number,
        issuedDate: formatDate(row.issued_date),
        returnedDate: formatDate(row.returned_date),
        supportCoverage: row.support_coverage,

        vendorName: row.vendor_name,
        vendorSpoc: row.vendor_spoc,
        vendorContact: row.vendor_contact,

        amcEnabled: row.amc_enabled,
        amcCost: row.amc_cost ? parseFloat(row.amc_cost) : 0,
        cloudEnabled: row.cloud_enabled,
        cloudCost: row.cloud_cost ? parseFloat(row.cloud_cost) : 0,
        trainingEnabled: row.training_enabled,
        trainingCost: row.training_cost ? parseFloat(row.training_cost) : 0
    };
};

const mapNetwork = (row) => ({
    id: String(row.id),
    name: row.name,
    type: row.type,
    ipAddress: row.ip_address,
    macAddress: row.mac_address,
    manufacturer: row.manufacturer,
    model: row.model,
    firmwareVersion: row.firmware_version,
    assetTag: row.asset_tag,
    serialNumber: row.serial_number,
    ram: row.ram,
    cpu: row.cpu,
    status: row.status,
    location: row.location,
    notes: row.notes,

    purchaseDate: formatDate(row.purchase_date),
    invoiceDate: formatDate(row.invoice_date),
    poNumber: row.po_number,
    purchaseCost: row.purchase_cost ? parseFloat(row.purchase_cost) : 0,
    warrantyExpiry: formatDate(row.warranty_expiry),
    supportCoverage: row.support_coverage,
    retirementDate: formatDate(row.retirement_date),
    
    vendorName: row.vendor_name,
    vendorSpoc: row.vendor_spoc,
    vendorContact: row.vendor_contact,
    
    maintenanceType: row.maintenance_type,
    maintenanceStartDate: formatDate(row.maintenance_start_date),
    maintenanceEndDate: formatDate(row.maintenance_end_date)
});

const mapUser = (row) => ({
    id: String(row.id),
    name: row.name,
    email: row.email,
    department: row.department,
    hod: row.hod,
    role: row.role,
    status: row.status
});

const mapSecret = (row) => ({
    id: String(row.id),
    serviceName: row.service_name,
    username: row.username,
    encryptedPassword: row.encrypted_payload,
    url: row.url,
    category: row.category,
    lastUpdated: formatDate(row.last_updated)
});

const mapLifecycle = (row) => ({
    id: String(row.id),
    assetId: row.asset_id,
    assetType: row.asset_type,
    eventType: row.event_type,
    description: row.description,
    previousValue: row.previous_value,
    newValue: row.new_value,
    timestamp: row.timestamp,
    actor: row.actor // If stored
});

const mapOrg = (row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    registeredAddress: row.registered_address,
    legalEntityName: row.legal_entity_name,
    communicationAddress: row.communication_address,
    pan: row.pan,
    gstin: row.gstin,
    tan: row.tan,
    cin: row.cin,
    companyType: row.company_type,
    onboardingDate: formatDate(row.onboarding_date),
    createdAt: formatDate(row.created_at)
});

const mapLocation = (row) => ({
    id: String(row.id),
    type: row.type,
    name: row.name,
    code: row.code,
    dateCreated: formatDate(row.date_created),
    spocName: row.spoc_name,
    spocEmail: row.spoc_email,
    spocPhone: row.spoc_phone,
    address: row.address,
    status: row.status
});

// --- CONNECTION MANAGEMENT ---
const getPool = (dbName) => {
    if (pools.has(dbName)) return pools.get(dbName);
    console.log(`🔌 Connecting to DB: ${dbName}`);
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

// --- MIDDLEWARE ---
app.use((req, res, next) => {
    const orgId = req.headers['x-organization-id'];
    if (!orgId) {
        req.targetDB = MASTER_DB_NAME; 
    } else {
        const cleanOrgId = orgId.toString().replace(/[^a-z0-9_]/g, '');
        req.targetDB = `niyojan_org_${cleanOrgId}`;
    }
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} -> ${req.targetDB}`);
    next();
});

// --- AUTH HELPERS ---
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
};

const verifyPassword = (password, salt, originalHash) => {
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
};

// ================= API ENDPOINTS =================

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: req.targetDB }));

// --- LOGIN ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (username === 'Root') {
            const masterRes = await queryDB(MASTER_DB_NAME, 'SELECT * FROM super_admins WHERE username = $1', ['Root']);
            if (masterRes.rows.length === 0) return res.status(401).json({ error: 'Root user missing' });
            const rootUser = masterRes.rows[0];
            if (!verifyPassword(password, rootUser.salt, rootUser.password_hash)) return res.status(401).json({ error: 'Invalid Root credentials' });
            const orgsRes = await queryDB(MASTER_DB_NAME, 'SELECT id, name FROM organizations ORDER BY name');
            return res.json({ user: { id: rootUser.id, username: 'Root', role: 'Super Admin' }, token: 'super-session', role: 'Super Admin', availableOrgs: orgsRes.rows, isSuperAdmin: true });
        }
        const orgsRes = await queryDB(MASTER_DB_NAME, 'SELECT id FROM organizations');
        for (const org of orgsRes.rows) {
            const dbName = `niyojan_org_${org.id}`;
            try {
                const userRes = await queryDB(dbName, 'SELECT * FROM console_admins WHERE username = $1', [username]);
                if (userRes.rows.length > 0) {
                    const user = userRes.rows[0];
                    if (verifyPassword(password, user.salt, user.password_hash)) {
                        await queryDB(dbName, 'UPDATE console_admins SET last_login = $1 WHERE id = $2', [getLocalTimestamp(), user.id]);
                        return res.json({ user: { id: user.id, username: user.username, role: user.role }, token: `session-${org.id}-${user.id}`, role: user.role, orgId: org.id, isSuperAdmin: false });
                    } else {
                        return res.status(401).json({ error: 'Invalid credentials' });
                    }
                }
            } catch (err) {}
        }
        return res.status(401).json({ error: 'User not found in any organization' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- HARDWARE ---
app.get('/api/hardware', async (req, res) => {
    try {
        if (!req.targetDB) return res.status(400).json({ error: "No Organization Context" });
        const result = await queryDB(req.targetDB, 'SELECT * FROM hardware_inventory ORDER BY id DESC');
        res.json(result.rows.map(mapHardware));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/hardware', async (req, res) => {
    try {
        const { name, serialNumber, assetTag, manufacturer, model, category, status, assignedTo, department, hod, location, previousOwner, purchaseDate, invoiceDate, poNumber, purchaseCost, warrantyExpiry, supportCoverage, fitnessYears, fitnessExpiry, issuedDate, returnedDate, retirementDate, maintenanceType, maintenanceStartDate, maintenanceEndDate, ramConfig, diskType, storageCapacity, processor, connectionType, notes, vendorName, vendorSpoc, vendorContact, resolution, smartOs, screenDimension, mountType, inputType, powerSource, cctvType, dvrModel, fieldView, ipAddress, maintenanceFrequency } = req.body;
        const query = `INSERT INTO hardware_inventory (name, serial_number, asset_tag, manufacturer, model, category, status, assigned_to, department, hod, location, previous_owner, purchase_date, invoice_date, po_number, purchase_cost, warranty_expiry, support_coverage, fitness_years, fitness_expiry, issued_date, returned_date, retirement_date, maintenance_type, maintenance_start_date, maintenance_end_date, ram_config, disk_type, storage_capacity, processor, connection_type, notes, vendor_name, vendor_spoc, vendor_contact, resolution, smart_os, screen_dimension, mount_type, input_type, power_source, cctv_type, dvr_model, field_view, ip_address, maintenance_frequency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46) RETURNING *`;
        const values = [name, serialNumber, assetTag, manufacturer, model, category, status, assignedTo, department, hod, location, previousOwner, purchaseDate || null, invoiceDate || null, poNumber || null, purchaseCost || 0, warrantyExpiry || null, supportCoverage, fitnessYears || 0, fitnessExpiry || null, issuedDate || null, returnedDate || null, retirementDate || null, maintenanceType || null, maintenanceStartDate || null, maintenanceEndDate || null, ramConfig, diskType, storageCapacity, processor, connectionType, notes, vendorName, vendorSpoc, vendorContact, resolution, smartOs, screenDimension, mountType, inputType, powerSource, cctvType, dvrModel, fieldView, ipAddress, maintenanceFrequency];
        const result = await queryDB(req.targetDB, query, values);
        res.status(201).json(mapHardware(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/hardware/:id', async (req, res) => {
    try {
        const { name, serialNumber, assetTag, manufacturer, model, category, status, assignedTo, department, hod, location, previousOwner, purchaseDate, invoiceDate, poNumber, purchaseCost, warrantyExpiry, supportCoverage, fitnessYears, fitnessExpiry, issuedDate, returnedDate, retirementDate, maintenanceType, maintenanceStartDate, maintenanceEndDate, ramConfig, diskType, storageCapacity, processor, connectionType, notes, vendorName, vendorSpoc, vendorContact, resolution, smartOs, screenDimension, mountType, inputType, powerSource, cctvType, dvrModel, fieldView, ipAddress, maintenanceFrequency } = req.body;
        const query = `UPDATE hardware_inventory SET name=$1, serial_number=$2, asset_tag=$3, manufacturer=$4, model=$5, category=$6, status=$7, assigned_to=$8, department=$9, hod=$10, location=$11, previous_owner=$12, purchase_date=$13, invoice_date=$14, po_number=$15, purchase_cost=$16, warranty_expiry=$17, support_coverage=$18, fitness_years=$19, fitness_expiry=$20, issued_date=$21, returned_date=$22, retirement_date=$23, maintenance_type=$24, maintenance_start_date=$25, maintenance_end_date=$26, ram_config=$27, disk_type=$28, storage_capacity=$29, processor=$30, connection_type=$31, notes=$32, vendor_name=$33, vendor_spoc=$34, vendor_contact=$35, resolution=$36, smart_os=$37, screen_dimension=$38, mount_type=$39, input_type=$40, power_source=$41, cctv_type=$42, dvr_model=$43, field_view=$44, ip_address=$45, maintenance_frequency=$46 WHERE id=$47 RETURNING *`;
        const values = [name, serialNumber, assetTag, manufacturer, model, category, status, assignedTo, department, hod, location, previousOwner, purchaseDate || null, invoiceDate || null, poNumber || null, purchaseCost || 0, warrantyExpiry || null, supportCoverage, fitnessYears || 0, fitnessExpiry || null, issuedDate || null, returnedDate || null, retirementDate || null, maintenanceType || null, maintenanceStartDate || null, maintenanceEndDate || null, ramConfig, diskType, storageCapacity, processor, connectionType, notes, vendorName, vendorSpoc, vendorContact, resolution, smartOs, screenDimension, mountType, inputType, powerSource, cctvType, dvrModel, fieldView, ipAddress, maintenanceFrequency, req.params.id];
        const result = await queryDB(req.targetDB, query, values);
        res.json(mapHardware(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/hardware/:id', async (req, res) => {
    try { await queryDB(req.targetDB, 'DELETE FROM hardware_inventory WHERE id=$1', [req.params.id]); res.sendStatus(204); } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- NETWORK ---
app.get('/api/network', async (req, res) => {
    try {
        if (!req.targetDB) return res.status(400).json({ error: "No Organization Context" });
        const result = await queryDB(req.targetDB, 'SELECT * FROM network_inventory ORDER BY id DESC');
        res.json(result.rows.map(mapNetwork));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/network', async (req, res) => {
    try {
        const { name, type, ipAddress, macAddress, manufacturer, model, firmwareVersion, assetTag, serialNumber, ram, cpu, status, location, notes, purchaseDate, invoiceDate, poNumber, purchaseCost, warrantyExpiry, supportCoverage, vendorName, vendorSpoc, vendorContact, maintenanceType, maintenanceStartDate, maintenanceEndDate, retirementDate } = req.body;
        const query = `INSERT INTO network_inventory (name, type, ip_address, mac_address, manufacturer, model, firmware_version, asset_tag, serial_number, ram, cpu, status, location, notes, purchase_date, invoice_date, po_number, purchase_cost, warranty_expiry, support_coverage, vendor_name, vendor_spoc, vendor_contact, maintenance_type, maintenance_start_date, maintenance_end_date, retirement_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) RETURNING *`;
        const values = [name, type, ipAddress, macAddress, manufacturer, model, firmwareVersion, assetTag, serialNumber, ram, cpu, status, location, notes, purchaseDate || null, invoiceDate || null, poNumber || null, purchaseCost || 0, warrantyExpiry || null, supportCoverage, vendorName, vendorSpoc, vendorContact, maintenanceType || null, maintenanceStartDate || null, maintenanceEndDate || null, retirementDate || null];
        const result = await queryDB(req.targetDB, query, values);
        res.status(201).json(mapNetwork(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/network/:id', async (req, res) => {
    try {
        const { name, type, ipAddress, macAddress, manufacturer, model, firmwareVersion, assetTag, serialNumber, ram, cpu, status, location, notes, purchaseDate, invoiceDate, poNumber, purchaseCost, warrantyExpiry, supportCoverage, vendorName, vendorSpoc, vendorContact, maintenanceType, maintenanceStartDate, maintenanceEndDate, retirementDate } = req.body;
        const query = `UPDATE network_inventory SET name=$1, type=$2, ip_address=$3, mac_address=$4, manufacturer=$5, model=$6, firmware_version=$7, asset_tag=$8, serial_number=$9, ram=$10, cpu=$11, status=$12, location=$13, notes=$14, purchase_date=$15, invoice_date=$16, po_number=$17, purchase_cost=$18, warranty_expiry=$19, support_coverage=$20, vendor_name=$21, vendor_spoc=$22, vendor_contact=$23, maintenance_type=$24, maintenance_start_date=$25, maintenance_end_date=$26, retirement_date=$27 WHERE id=$28 RETURNING *`;
        const values = [name, type, ipAddress, macAddress, manufacturer, model, firmwareVersion, assetTag, serialNumber, ram, cpu, status, location, notes, purchaseDate || null, invoiceDate || null, poNumber || null, purchaseCost || 0, warrantyExpiry || null, supportCoverage, vendorName, vendorSpoc, vendorContact, maintenanceType || null, maintenanceStartDate || null, maintenanceEndDate || null, retirementDate || null, req.params.id];
        const result = await queryDB(req.targetDB, query, values);
        res.json(mapNetwork(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/network/:id', async (req, res) => {
    try { await queryDB(req.targetDB, 'DELETE FROM network_inventory WHERE id=$1', [req.params.id]); res.sendStatus(204); } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SOFTWARE ---
app.get('/api/software', async (req, res) => {
    try {
        if (!req.targetDB) return res.status(400).json({ error: "No Organization Context" });
        const result = await queryDB(req.targetDB, 'SELECT * FROM software_licenses ORDER BY id DESC');
        res.json(result.rows.map(mapSoftware));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/software', async (req, res) => {
    try {
        const { name, version, licenseKey, type, seatCount, costPerSeat, expiryDate, assignedTo, purchaseDate, invoiceDate, poNumber, issuedDate, supportCoverage, department, hod, vendorName, vendorSpoc, vendorContact, amcEnabled, amcCost, cloudEnabled, cloudCost, trainingEnabled, trainingCost } = req.body;
        const query = `INSERT INTO software_licenses (name, version, license_key, type, seat_count, cost_per_seat, expiry_date, assigned_to, purchase_date, invoice_date, po_number, issued_date, support_coverage, department, hod, vendor_name, vendor_spoc, vendor_contact, amc_enabled, amc_cost, cloud_enabled, cloud_cost, training_enabled, training_cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24) RETURNING *`;
        const values = [name, version, licenseKey, type, seatCount || 0, costPerSeat || 0, expiryDate || null, JSON.stringify(assignedTo || []), purchaseDate || null, invoiceDate || null, poNumber || null, issuedDate || null, supportCoverage, department, hod, vendorName, vendorSpoc, vendorContact, amcEnabled || false, amcCost || 0, cloudEnabled || false, cloudCost || 0, trainingEnabled || false, trainingCost || 0];
        const result = await queryDB(req.targetDB, query, values);
        res.status(201).json(mapSoftware(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/software/:id', async (req, res) => {
    try {
        const { name, version, licenseKey, type, seatCount, costPerSeat, expiryDate, assignedTo, purchaseDate, invoiceDate, poNumber, issuedDate, supportCoverage, department, hod, vendorName, vendorSpoc, vendorContact, amcEnabled, amcCost, cloudEnabled, cloudCost, trainingEnabled, trainingCost } = req.body;
        const query = `UPDATE software_licenses SET name=$1, version=$2, license_key=$3, type=$4, seat_count=$5, cost_per_seat=$6, expiry_date=$7, assigned_to=$8, purchase_date=$9, invoice_date=$10, po_number=$11, issued_date=$12, support_coverage=$13, department=$14, hod=$15, vendor_name=$16, vendor_spoc=$17, vendor_contact=$18, amc_enabled=$19, amc_cost=$20, cloud_enabled=$21, cloud_cost=$22, training_enabled=$23, training_cost=$24 WHERE id=$25 RETURNING *`;
        const values = [name, version, licenseKey, type, seatCount || 0, costPerSeat || 0, expiryDate || null, JSON.stringify(assignedTo || []), purchaseDate || null, invoiceDate || null, poNumber || null, issuedDate || null, supportCoverage, department, hod, vendorName, vendorSpoc, vendorContact, amcEnabled || false, amcCost || 0, cloudEnabled || false, cloudCost || 0, trainingEnabled || false, trainingCost || 0, req.params.id];
        const result = await queryDB(req.targetDB, query, values);
        res.json(mapSoftware(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/software/:id', async (req, res) => {
    try { await queryDB(req.targetDB, 'DELETE FROM software_licenses WHERE id=$1', [req.params.id]); res.sendStatus(204); } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- USERS ---
app.get('/api/users', async (req, res) => {
    try {
        if (!req.targetDB) return res.status(400).json({ error: "No Organization Context" });
        const result = await queryDB(req.targetDB, 'SELECT * FROM users ORDER BY name ASC');
        res.json(result.rows.map(mapUser));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async (req, res) => {
    try {
        const { name, email, department, hod, role, status } = req.body;
        const result = await queryDB(req.targetDB, 'INSERT INTO users (name, email, department, hod, role, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [name, email, department, hod, role, status || 'Active']);
        res.status(201).json(mapUser(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { name, email, department, hod, role, status } = req.body;
        // Cascade Update Logic
        const oldUserRes = await queryDB(req.targetDB, 'SELECT name FROM users WHERE id = $1', [req.params.id]);
        if (oldUserRes.rows.length > 0) {
            const oldName = oldUserRes.rows[0].name;
            if (oldName !== name) {
                await queryDB(req.targetDB, 'UPDATE hardware_inventory SET assigned_to = $1 WHERE assigned_to = $2', [name, oldName]);
                await queryDB(req.targetDB, 'UPDATE hardware_inventory SET previous_owner = $1 WHERE previous_owner = $2', [name, oldName]);
                await queryDB(req.targetDB, 'UPDATE users SET hod = $1 WHERE hod = $2', [name, oldName]);
                await queryDB(req.targetDB, 'UPDATE hardware_inventory SET hod = $1 WHERE hod = $2', [name, oldName]);
                await queryDB(req.targetDB, 'UPDATE software_licenses SET hod = $1 WHERE hod = $2', [name, oldName]);
                await queryDB(req.targetDB, 'UPDATE departments SET hod_name = $1 WHERE hod_name = $2', [name, oldName]);
                await queryDB(req.targetDB, `UPDATE software_licenses SET assigned_to = REPLACE(assigned_to, $1, $2)`, [oldName, name]);
            }
        }
        const result = await queryDB(req.targetDB, 'UPDATE users SET name=$1, email=$2, department=$3, hod=$4, role=$5, status=$6 WHERE id=$7 RETURNING *', [name, email, department, hod, role, status, req.params.id]);
        res.json(mapUser(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
    try { await queryDB(req.targetDB, 'DELETE FROM users WHERE id=$1', [req.params.id]); res.sendStatus(204); } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ADMINS ---
app.get('/api/admins', async (req, res) => {
    try {
        if (!req.targetDB) return res.status(400).json({ error: "No Organization Context" });
        const result = await queryDB(req.targetDB, 'SELECT id, username, role, last_login FROM console_admins ORDER BY username ASC');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admins', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        const { salt, hash } = hashPassword(password);
        const result = await queryDB(req.targetDB, 'INSERT INTO console_admins (username, salt, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, role, last_login', [username, salt, hash, role]);
        res.status(201).json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admins/:id', async (req, res) => {
    try { await queryDB(req.targetDB, 'DELETE FROM console_admins WHERE id=$1', [req.params.id]); res.sendStatus(204); } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- LOCATIONS ---
app.get('/api/locations', async (req, res) => {
    try {
        if (!req.targetDB) return res.status(400).json({ error: "No Context" });
        const result = await queryDB(req.targetDB, 'SELECT * FROM locations ORDER BY name ASC');
        res.json(result.rows.map(mapLocation));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/locations', async (req, res) => {
    try {
        const { type, name, code, spocName, spocEmail, spocPhone, address, status } = req.body;
        // Use server timestamp for creation date
        const query = `INSERT INTO locations (type, name, code, date_created, spoc_name, spoc_email, spoc_phone, address, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
        const values = [type, name, code, getLocalTimestamp(), spocName || '', spocEmail || '', spocPhone || '', address || '', status || 'Unlocked'];
        const result = await queryDB(req.targetDB, query, values);
        res.status(201).json(mapLocation(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/locations/:id', async (req, res) => {
    try {
        const { type, name, code, spocName, spocEmail, spocPhone, address, status } = req.body;
        const query = `UPDATE locations SET type=$1, name=$2, code=$3, spoc_name=$4, spoc_email=$5, spoc_phone=$6, address=$7, status=$8 WHERE id=$9 RETURNING *`;
        const values = [type, name, code, spocName, spocEmail, spocPhone, address, status, req.params.id];
        const result = await queryDB(req.targetDB, query, values);
        if (result.rows.length === 0) return res.status(404).json({ error: "Location not found" });
        res.json(mapLocation(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/locations/:id', async (req, res) => {
    try { await queryDB(req.targetDB, 'DELETE FROM locations WHERE id=$1', [req.params.id]); res.sendStatus(204); } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- OTHER ENTITIES (Departments, Categories, Lifecycle, Alerts, Secrets) ---
app.get('/api/departments', async (req, res) => {
    try {
        if (!req.targetDB) return res.status(400).json({ error: "No Context" });
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
app.delete('/api/departments/:id', async (req, res) => { try { await queryDB(req.targetDB, 'DELETE FROM departments WHERE id=$1', [req.params.id]); res.sendStatus(204); } catch (e) { res.status(500).json({ error: e.message }); }});

app.get('/api/categories', async (req, res) => { try { const result = await queryDB(req.targetDB, 'SELECT * FROM categories ORDER BY name ASC'); res.json(result.rows); } catch (e) { res.status(500).json({ error: e.message }); }});
app.post('/api/categories', async (req, res) => { try { const result = await queryDB(req.targetDB, 'INSERT INTO categories (name) VALUES ($1) RETURNING *', [req.body.name]); res.status(201).json(result.rows[0]); } catch (e) { res.status(500).json({ error: e.message }); }});
app.delete('/api/categories/:id', async (req, res) => { try { await queryDB(req.targetDB, 'DELETE FROM categories WHERE id=$1', [req.params.id]); res.sendStatus(204); } catch (e) { res.status(500).json({ error: e.message }); }});

app.get('/api/lifecycle', async (req, res) => {
    try {
        if (!req.targetDB) return res.status(400).json({ error: "No Context" });
        const result = await queryDB(req.targetDB, 'SELECT * FROM lifecycle_events ORDER BY timestamp DESC LIMIT 200');
        res.json(result.rows.map(mapLifecycle));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/lifecycle', async (req, res) => {
    try {
        const result = await queryDB(req.targetDB, 'INSERT INTO lifecycle_events (asset_id, asset_type, event_type, description, previous_value, new_value, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [req.body.assetId, req.body.assetType, req.body.eventType, req.body.description, req.body.previousValue, req.body.newValue, req.body.timestamp || getLocalTimestamp()]);
        res.status(201).json(mapLifecycle(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/alerts/definitions', async (req, res) => { try { const result = await queryDB(req.targetDB, 'SELECT * FROM alert_definitions ORDER BY id ASC'); res.json(result.rows); } catch (e) { res.status(500).json({ error: e.message }); }});
app.post('/api/alerts/definitions', async (req, res) => { try { const result = await queryDB(req.targetDB, 'INSERT INTO alert_definitions (name, module, type, field, threshold, severity, enabled) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [req.body.name, req.body.module, req.body.type, req.body.field, req.body.threshold, req.body.severity, req.body.enabled]); res.status(201).json(result.rows[0]); } catch (e) { res.status(500).json({ error: e.message }); }});
app.delete('/api/alerts/definitions/:id', async (req, res) => { try { await queryDB(req.targetDB, 'DELETE FROM alert_definitions WHERE id=$1', [req.params.id]); res.sendStatus(204); } catch (e) { res.status(500).json({ error: e.message }); }});

app.get('/api/secrets', async (req, res) => { try { const result = await queryDB(req.targetDB, 'SELECT * FROM secrets_vault ORDER BY id DESC'); res.json(result.rows.map(mapSecret)); } catch (e) { res.status(500).json({ error: e.message }); }});
app.post('/api/secrets', async (req, res) => { try { const result = await queryDB(req.targetDB, 'INSERT INTO secrets_vault (service_name, username, encrypted_payload, url, category, last_updated) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [req.body.serviceName, req.body.username, req.body.encryptedPassword, req.body.url, req.body.category, req.body.lastUpdated]); res.status(201).json(mapSecret(result.rows[0])); } catch (e) { res.status(500).json({ error: e.message }); }});
app.put('/api/secrets/:id', async (req, res) => { try { const result = await queryDB(req.targetDB, 'UPDATE secrets_vault SET service_name=$1, username=$2, encrypted_payload=$3, url=$4, category=$5, last_updated=$6 WHERE id=$7 RETURNING *', [req.body.serviceName, req.body.username, req.body.encryptedPassword, req.body.url, req.body.category, req.body.lastUpdated, req.params.id]); res.json(mapSecret(result.rows[0])); } catch (e) { res.status(500).json({ error: e.message }); }});
app.delete('/api/secrets/:id', async (req, res) => { try { await queryDB(req.targetDB, 'DELETE FROM secrets_vault WHERE id=$1', [req.params.id]); res.sendStatus(204); } catch (e) { res.status(500).json({ error: e.message }); }});

// --- SUPER ADMIN ORGS ---
app.get('/api/admin/organizations', async (req, res) => { try { const result = await queryDB(MASTER_DB_NAME, 'SELECT * FROM organizations ORDER BY created_at DESC'); res.json(result.rows.map(mapOrg)); } catch (e) { res.status(500).json({ error: e.message }); }});
app.post('/api/admin/organizations', async (req, res) => {
    const { name, code, registeredAddress, legalEntityName, communicationAddress, pan, gstin, tan, cin, companyType, onboardingDate } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and Company Code are required' });
    
    const cleanId = code.toString().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const newDbName = `niyojan_org_${cleanId}`;
    
    try {
        const query = `INSERT INTO organizations (id, name, code, registered_address, legal_entity_name, communication_address, pan, gstin, tan, cin, company_type, onboarding_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`;
        // Create org with Today as onboarding date if not provided, but enforce standard behavior logic in UI mainly
        // Here we default to current date if missing, but UI will force Today.
        const effectiveOnboardingDate = onboardingDate || getLocalTimestamp().split(' ')[0];
        const values = [cleanId, name, code, registeredAddress || '', legalEntityName || '', communicationAddress || '', pan || '', gstin || '', tan || '', cin || '', companyType || '', effectiveOnboardingDate];
        const result = await queryDB(MASTER_DB_NAME, query, values);
        
        // Provision Database
        const rootClient = new Client({ ...DB_CONFIG_BASE, database: 'postgres' });
        await rootClient.connect();
        // Check if DB exists
        const dbCheck = await rootClient.query(`SELECT 1 FROM pg_database WHERE datname = '${newDbName}'`);
        if (dbCheck.rows.length === 0) {
            await rootClient.query(`CREATE DATABASE ${newDbName}`);
        }
        await rootClient.end();
        
        res.status(201).json(mapOrg(result.rows[0]));
    } catch (e) { res.status(500).json({ error: `Failed to create Org: ${e.message}` }); }
});

app.put('/api/admin/organizations/:id', async (req, res) => {
    try {
        const { name, code, registeredAddress, legalEntityName, communicationAddress, pan, gstin, tan, cin, companyType, onboardingDate } = req.body;
        // onboardingDate ignored in update usually if we want it read-only, but strict enforcement can be done here.
        // Assuming UI sends the original date back or we ignore it.
        const query = `UPDATE organizations SET name=$1, code=$2, registered_address=$3, legal_entity_name=$4, communication_address=$5, pan=$6, gstin=$7, tan=$8, cin=$9, company_type=$10 WHERE id=$11 RETURNING *`;
        const values = [name, code, registeredAddress || '', legalEntityName || '', communicationAddress || '', pan || '', gstin || '', tan || '', cin || '', companyType || '', req.params.id];
        
        const result = await queryDB(MASTER_DB_NAME, query, values);
        res.json(mapOrg(result.rows[0]));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/backup', async (req, res) => {
    // Basic dump logic - placeholder
    res.send("-- Use pg_dump for reliable full backups. This feature is a placeholder.");
});

// Listen
if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH && fs.existsSync(process.env.SSL_KEY_PATH)) {
    const options = { key: fs.readFileSync(process.env.SSL_KEY_PATH), cert: fs.readFileSync(process.env.SSL_CERT_PATH) };
    https.createServer(options, app).listen(port, '0.0.0.0', () => console.log(`\n🚀 Niyojan Secure Server running on port ${port}`));
} else {
    app.listen(port, '0.0.0.0', () => console.log(`\n🚀 Niyojan Server running on port ${port}`));
}
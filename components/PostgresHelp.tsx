
import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, Download, Network, Code2, Save, FileDown } from 'lucide-react';
import { apiService } from '../services/api';

export const PostgresHelp: React.FC = () => {
  const [apiHost, setApiHost] = useState('');
  const [savedHost, setSavedHost] = useState(false);
  const [protocol, setProtocol] = useState('http');

  useEffect(() => {
    setApiHost(localStorage.getItem('niyojan_api_host') || window.location.hostname || 'localhost');
    setProtocol(localStorage.getItem('niyojan_api_protocol') || 'http');
  }, []);

  const saveApiHost = () => {
      localStorage.setItem('niyojan_api_host', apiHost);
      localStorage.setItem('niyojan_api_protocol', protocol);
      setSavedHost(true);
      setTimeout(() => setSavedHost(false), 2000);
      window.location.reload();
  };

  const handleBackupDownload = () => {
      const host = apiService.getApiBase().replace('/api', '');
      window.open(`${host}/api/admin/backup`, '_blank');
  };

  const masterSchemaSql = `
-- MASTER SCHEMA FOR NIYOJAN INVENTORY
-- Run this script to build the entire database from scratch.

-- 1. Organizations (Multi-Tenancy Master)
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(50) PRIMARY KEY, -- Slug used for DB Name
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    registered_address TEXT,
    legal_entity_name VARCHAR(255),
    communication_address TEXT,
    pan VARCHAR(50),
    gstin VARCHAR(50),
    tan VARCHAR(50),
    cin VARCHAR(50),
    company_type VARCHAR(50),
    onboarding_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Console Admins (Login Access)
CREATE TABLE IF NOT EXISTS console_admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    salt VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    last_login TIMESTAMP
);

-- 3. Departments Master
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY, 
    name VARCHAR(255) NOT NULL, 
    hod_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY, 
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 4. Location Master
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) NOT NULL, -- HO, SL, GD
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    date_created DATE NOT NULL,
    spoc_name VARCHAR(255),
    spoc_email VARCHAR(255),
    spoc_phone VARCHAR(50),
    address TEXT,
    status VARCHAR(20) DEFAULT 'Unlocked' -- Locked, Unlocked
);

-- 5. Users / Employees
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    department VARCHAR(100),
    hod VARCHAR(255),
    role VARCHAR(100),
    status VARCHAR(20) DEFAULT 'Active'
);

-- 6. Hardware Inventory
CREATE TABLE IF NOT EXISTS hardware_inventory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    serial_number VARCHAR(255),
    asset_tag VARCHAR(100),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    category VARCHAR(100),
    status VARCHAR(50),
    assigned_to VARCHAR(255),
    department VARCHAR(100),
    hod VARCHAR(255),
    location VARCHAR(100),
    previous_owner VARCHAR(255),
    
    purchase_date DATE,
    invoice_date DATE,
    po_number VARCHAR(100),
    purchase_cost DECIMAL(12, 2),
    warranty_expiry DATE,
    support_coverage VARCHAR(255),
    fitness_years INTEGER DEFAULT 0,
    fitness_expiry DATE,
    
    issued_date DATE,
    returned_date DATE,
    retirement_date DATE,

    vendor_name VARCHAR(255),
    vendor_spoc VARCHAR(255),
    vendor_contact VARCHAR(255),
    
    maintenance_type VARCHAR(50),
    maintenance_start_date DATE,
    maintenance_end_date DATE,
    
    ram_config VARCHAR(50),
    disk_type VARCHAR(20),
    storage_capacity VARCHAR(50),
    processor VARCHAR(100),
    connection_type VARCHAR(50),
    
    resolution VARCHAR(50),
    smart_os VARCHAR(50),
    screen_dimension VARCHAR(50),
    mount_type VARCHAR(50),
    input_type VARCHAR(100),
    power_source VARCHAR(100),

    cctv_type VARCHAR(50),
    dvr_model VARCHAR(100),
    field_view VARCHAR(50),
    ip_address VARCHAR(50),
    maintenance_frequency VARCHAR(50),

    notes TEXT
);

-- 7. Software Licenses
CREATE TABLE IF NOT EXISTS software_licenses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    version VARCHAR(50),
    license_key VARCHAR(255),
    type VARCHAR(50),
    seat_count INTEGER,
    cost_per_seat DECIMAL(10, 2),
    expiry_date DATE,
    assigned_to TEXT, -- Stored as JSON string
    
    department VARCHAR(100),
    hod VARCHAR(255),
    
    purchase_date DATE,
    invoice_date DATE,
    po_number VARCHAR(100),
    issued_date DATE,
    returned_date DATE,
    support_coverage VARCHAR(255),

    vendor_name VARCHAR(255),
    vendor_spoc VARCHAR(255),
    vendor_contact VARCHAR(255),

    amc_enabled BOOLEAN DEFAULT FALSE,
    amc_cost DECIMAL(10, 2),
    cloud_enabled BOOLEAN DEFAULT FALSE,
    cloud_cost DECIMAL(10, 2),
    training_enabled BOOLEAN DEFAULT FALSE,
    training_cost DECIMAL(10, 2)
);

-- 8. Network Inventory
CREATE TABLE IF NOT EXISTS network_inventory (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(50),
    ip_address VARCHAR(50),
    mac_address VARCHAR(50),
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    firmware_version VARCHAR(50),
    asset_tag VARCHAR(100),
    serial_number VARCHAR(100),
    ram VARCHAR(50),
    cpu VARCHAR(100),
    status VARCHAR(50),
    location VARCHAR(100),
    notes TEXT,

    purchase_date DATE,
    invoice_date DATE,
    po_number VARCHAR(100),
    purchase_cost DECIMAL(12, 2),
    warranty_expiry DATE,
    support_coverage VARCHAR(255),
    retirement_date DATE,
    
    vendor_name VARCHAR(255),
    vendor_spoc VARCHAR(255),
    vendor_contact VARCHAR(255),
    
    maintenance_type VARCHAR(50),
    maintenance_start_date DATE,
    maintenance_end_date DATE
);

-- 9. Secrets Vault
CREATE TABLE IF NOT EXISTS secrets_vault (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(255),
    username VARCHAR(255),
    encrypted_payload TEXT,
    url VARCHAR(255),
    category VARCHAR(100),
    last_updated DATE
);

-- 10. Lifecycle Events (Audit Log)
CREATE TABLE IF NOT EXISTS lifecycle_events (
    id SERIAL PRIMARY KEY,
    asset_id VARCHAR(50),
    asset_type VARCHAR(20),
    event_type VARCHAR(50),
    description TEXT,
    previous_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMP
);

-- 11. Custom Alerts
CREATE TABLE IF NOT EXISTS alert_definitions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    module VARCHAR(50),
    type VARCHAR(50),
    field VARCHAR(100),
    threshold VARCHAR(100),
    severity VARCHAR(20),
    enabled BOOLEAN DEFAULT TRUE
);
`;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Database className="text-blue-600" />
            Database & Schema
          </h2>
          <p className="text-slate-600 mt-2">Manage your PostgreSQL schema and connection.</p>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={handleBackupDownload}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm font-medium transition-colors"
             >
                <FileDown size={18} /> Download Full Database Backup
             </button>
        </div>
      </div>

       {/* QUICK FIX FOR connection_type */}
       <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 relative overflow-hidden">
        <div className="relative z-10">
            <h3 className="font-bold text-orange-900 text-lg flex items-center gap-2 mb-2">
            ⚠️ Quick Fix: Add Peripheral Fields
            </h3>
            <p className="text-sm text-orange-800 mb-4 max-w-2xl">
                Run this SQL in your tenant database to support wired/wireless connection types for mouse/keyboard.
            </p>
            <div className="flex items-start gap-2 bg-white border border-orange-100 p-3 rounded-lg font-mono text-xs text-orange-700 w-full md:w-fit mb-2 overflow-auto max-h-96">
                 <pre>
{`ALTER TABLE hardware_inventory ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50);`}
                 </pre>
                 <button onClick={() => navigator.clipboard.writeText(`ALTER TABLE hardware_inventory ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50);`)} className="p-2 hover:bg-orange-100 rounded text-orange-600 hover:text-orange-800 sticky top-0 bg-white"><Copy size={16}/></button>
            </div>
        </div>
      </div>

       <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 relative overflow-hidden">
        <div className="relative z-10">
            <h3 className="font-bold text-indigo-900 text-lg flex items-center gap-2 mb-2">
            <Code2 size={20} />
            Master Database Schema
            </h3>
            <p className="text-sm text-indigo-800 mb-4 max-w-2xl">
                Use this SQL script to create all tables from scratch on a new database server.
            </p>
            <div className="flex items-start gap-2 bg-white border border-indigo-100 p-3 rounded-lg font-mono text-xs text-indigo-700 w-full md:w-fit mb-2 overflow-auto max-h-96">
                 <pre>{masterSchemaSql.trim()}</pre>
                 <button onClick={() => navigator.clipboard.writeText(masterSchemaSql)} className="p-2 hover:bg-indigo-50 rounded text-indigo-400 hover:text-indigo-600 sticky top-0 bg-white"><Copy size={16}/></button>
            </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Network size={20} className="text-blue-600" /> API Connection</h3>
        <div className="flex items-end gap-3 max-w-md">
            <div className="w-32 space-y-1">
                 <label className="text-xs font-bold text-slate-500 uppercase">Protocol</label>
                 <select value={protocol} onChange={(e) => setProtocol(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                     <option value="http">HTTP</option>
                     <option value="https">HTTPS</option>
                 </select>
            </div>
            <div className="flex-1 space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Server Hostname / IP</label>
                <input type="text" value={apiHost} onChange={(e) => setApiHost(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-sm" />
            </div>
            <button onClick={saveApiHost} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 h-[38px]">{savedHost ? <Check size={18} /> : <Save size={18} />}</button>
        </div>
      </div>
    </div>
  );
};
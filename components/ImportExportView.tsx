import React, { useState } from 'react';
import { HardwareItem, SoftwareItem, NetworkItem, ItemStatus, SoftwareType, UserItem, DepartmentItem, LocationItem, CategoryItem } from '../types';
import { Download, Upload, Check, AlertTriangle, Monitor, Disc, Wifi, Table, FileInput } from 'lucide-react';

interface ImportExportViewProps {
  onImportHardware: (items: HardwareItem[]) => Promise<void>;
  onImportSoftware: (items: SoftwareItem[]) => Promise<void>;
  onImportNetwork: (items: NetworkItem[]) => Promise<void>;
  users: UserItem[];
  departments: DepartmentItem[];
  locations: LocationItem[];
  categories: CategoryItem[];
  hardware?: HardwareItem[];
  software?: SoftwareItem[];
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({ 
  onImportHardware, onImportSoftware, onImportNetwork,
  users, departments, locations, categories
}) => {
  const [logs, setLogs] = useState<{type: 'success'|'error', msg: string}[]>([]);

  const addLog = (type: 'success'|'error', msg: string) => {
      setLogs(prev => [{type, msg}, ...prev]);
  };

  const getFields = (type: 'hardware' | 'software' | 'network') => {
      // Build dynamic option lists
      const activeUsers = users.filter(u => u.status === 'Active').map(u => u.name);
      const departmentNames = departments.map(d => d.name);
      const locationNames = locations.map(l => l.name);
      
      const defaultCategories = [
        "Laptop", "Desktop (CPU)", "Monitor", "Mobile", "Tablet", "Server", "Server Rack", "Printer", 
        "Scanner", "Keyboard", "Mouse", "External HDD", "TV", "Camera", "AC", "CCTV"
      ];
      const allCategories = Array.from(new Set([...defaultCategories, ...categories.map(c => c.name)])).sort();

      if (type === 'hardware') return [
          // Basics
          { key: 'name', label: 'Device Name *', type: 'text', placeholder: 'e.g. MacBook Pro' },
          { key: 'category', label: 'Category *', type: 'select', options: allCategories },
          { key: 'serialNumber', label: 'Serial Number', type: 'text' },
          { key: 'assetTag', label: 'Asset Tag', type: 'text' },
          { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
          { key: 'model', label: 'Model', type: 'text' },
          
          // Status & Assignment
          { key: 'status', label: 'Status', type: 'select', options: ['Active', 'In Storage', 'Maintenance', 'Retired', 'Broken'] },
          { key: 'assignedTo', label: 'Assigned User', type: 'select', options: activeUsers },
          { key: 'previousOwner', label: 'Previous Owner', type: 'select', options: activeUsers },
          { key: 'department', label: 'Department', type: 'select', options: departmentNames },
          { key: 'location', label: 'Location', type: 'select', options: locationNames },
          
          // Dates & Financials
          { key: 'purchaseDate', label: 'Purchase Date', type: 'date' },
          { key: 'purchaseCost', label: 'Purchase Cost', type: 'number' },
          { key: 'invoiceDate', label: 'Invoice Date', type: 'date' },
          { key: 'poNumber', label: 'PO Number', type: 'text' },
          { key: 'warrantyExpiry', label: 'Warranty Expiry', type: 'date' },
          { key: 'issuedDate', label: 'Issued Date', type: 'date' },
          { key: 'returnedDate', label: 'Returned Date', type: 'date' },
          { key: 'retirementDate', label: 'Retirement Date', type: 'date' },
          { key: 'fitnessYears', label: 'Fitness (Years)', type: 'number' },
          
          // Vendor
          { key: 'vendorName', label: 'Vendor Name', type: 'text' },
          { key: 'vendorSpoc', label: 'Vendor SPOC', type: 'text' },
          { key: 'vendorContact', label: 'Vendor Contact', type: 'text' },
          { key: 'supportCoverage', label: 'Support Coverage', type: 'text' },

          // Maintenance
          { key: 'maintenanceType', label: 'Maint. Type', type: 'select', options: ['Internal', 'External'] },
          { key: 'maintenanceStartDate', label: 'Maint. Start', type: 'date' },
          { key: 'maintenanceEndDate', label: 'Maint. End', type: 'date' },

          // Technical Specs
          { key: 'processor', label: 'Processor', type: 'text' },
          { key: 'ramConfig', label: 'RAM Config', type: 'text' },
          { key: 'diskType', label: 'Disk Type', type: 'select', options: ['SSD', 'HDD', 'NVMe'] },
          { key: 'storageCapacity', label: 'Storage Capacity', type: 'text' },
          { key: 'connectionType', label: 'Connection (Peri)', type: 'select', options: ['Wired', 'Wireless'] },

          // TV / Display Specs
          { key: 'resolution', label: 'Resolution', type: 'text' },
          { key: 'screenDimension', label: 'Screen Size', type: 'text' },
          { key: 'smartOs', label: 'Smart OS', type: 'text' },
          { key: 'mountType', label: 'Mount Type', type: 'text' },
          { key: 'inputType', label: 'Input Type', type: 'text' },
          { key: 'powerSource', label: 'Power Source', type: 'text' },
          
          // CCTV Specs
          { key: 'cctvType', label: 'CCTV Type', type: 'select', options: ['DVR', 'NVR'] },
          { key: 'ipAddress', label: 'IP Address', type: 'text' },
          { key: 'dvrModel', label: 'DVR Model', type: 'text' },
          { key: 'fieldView', label: 'Field View', type: 'select', options: ['90°', '180°', '360°'] },
          { key: 'maintenanceFrequency', label: 'Maint. Freq', type: 'select', options: ['Weekly', 'Monthly', 'Quarterly'] },

          { key: 'notes', label: 'Notes', type: 'text' }
      ];

      if (type === 'software') return [
          // Basics
          { key: 'name', label: 'Software Name *', type: 'text' },
          { key: 'version', label: 'Version', type: 'text' },
          { key: 'type', label: 'Type', type: 'select', options: ['Subscription', 'Perpetual', 'Open Source'] },
          
          // Licensing
          { key: 'licenseKey', label: 'License Key', type: 'text' },
          { key: 'seatCount', label: 'Seat Count', type: 'number' },
          { key: 'costPerSeat', label: 'Cost Per Seat', type: 'number' },
          { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
          
          // Org
          { key: 'department', label: 'Department', type: 'select', options: departmentNames },
          { key: 'supportCoverage', label: 'Support Coverage', type: 'text' },

          // Dates
          { key: 'purchaseDate', label: 'Purchase Date', type: 'date' },
          { key: 'invoiceDate', label: 'Invoice Date', type: 'date' },
          { key: 'issuedDate', label: 'Issued Date', type: 'date' },
          { key: 'poNumber', label: 'PO Number', type: 'text' },

          // Vendor
          { key: 'vendorName', label: 'Vendor', type: 'text' },
          { key: 'vendorSpoc', label: 'Vendor SPOC', type: 'text' },
          { key: 'vendorContact', label: 'Vendor Contact', type: 'text' },

          // Additional Costs (Booleans as Selects for ease)
          { key: 'amcEnabled', label: 'AMC Enabled?', type: 'select', options: ['Yes', 'No'] },
          { key: 'amcCost', label: 'AMC Cost', type: 'number' },
          { key: 'cloudEnabled', label: 'Cloud Hosted?', type: 'select', options: ['Yes', 'No'] },
          { key: 'cloudCost', label: 'Cloud Cost', type: 'number' },
          { key: 'trainingEnabled', label: 'Training?', type: 'select', options: ['Yes', 'No'] },
          { key: 'trainingCost', label: 'Training Cost', type: 'number' }
      ];

      return [
          // Basics
          { key: 'name', label: 'Device Name *', type: 'text' },
          { key: 'type', label: 'Type', type: 'select', options: ['Firewall', 'Switch', 'Access Point', 'Router', 'Modem', 'Other'] },
          { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
          { key: 'model', label: 'Model', type: 'text' },
          { key: 'firmwareVersion', label: 'Firmware Ver.', type: 'text' },
          
          // Networking
          { key: 'ipAddress', label: 'IP Address', type: 'text' },
          { key: 'macAddress', label: 'MAC Address', type: 'text' },
          
          // Specs
          { key: 'ram', label: 'RAM', type: 'text' },
          { key: 'cpu', label: 'CPU', type: 'text' },

          // Tracking
          { key: 'assetTag', label: 'Asset Tag', type: 'text' },
          { key: 'serialNumber', label: 'Serial Number', type: 'text' },
          { key: 'status', label: 'Status', type: 'select', options: ['Active', 'In Storage', 'Maintenance', 'Retired', 'Broken'] },
          { key: 'location', label: 'Location', type: 'select', options: locationNames },
          
          // Financials
          { key: 'purchaseDate', label: 'Purchase Date', type: 'date' },
          { key: 'purchaseCost', label: 'Cost', type: 'number' },
          { key: 'invoiceDate', label: 'Invoice Date', type: 'date' },
          { key: 'poNumber', label: 'PO Number', type: 'text' },
          { key: 'warrantyExpiry', label: 'Warranty Expiry', type: 'date' },
          { key: 'supportCoverage', label: 'Support Coverage', type: 'text' },
          { key: 'retirementDate', label: 'Retirement Date', type: 'date' },

          // Vendor
          { key: 'vendorName', label: 'Vendor Name', type: 'text' },
          { key: 'vendorSpoc', label: 'Vendor SPOC', type: 'text' },
          { key: 'vendorContact', label: 'Vendor Contact', type: 'text' },

          // Maintenance
          { key: 'maintenanceType', label: 'Maint. Type', type: 'select', options: ['Internal', 'External'] },
          { key: 'maintenanceStartDate', label: 'Maint. Start', type: 'date' },
          { key: 'maintenanceEndDate', label: 'Maint. End', type: 'date' },

          { key: 'notes', label: 'Notes', type: 'text' }
      ];
  };

  const generateOfflineForm = (type: 'hardware' | 'software' | 'network') => {
      const fields = getFields(type);
      
      let dynamicLogic = '';
      if (type === 'hardware') {
          dynamicLogic = `
            function updateRow(tr) {
                const getVal = (name) => {
                    const el = tr.querySelector('[name="' + name + '"]');
                    return el ? (el.value || '').toLowerCase() : '';
                };
                const setState = (names, enabled) => {
                    names.forEach(name => {
                        const el = tr.querySelector('[name="' + name + '"]');
                        if (el) {
                            el.disabled = !enabled;
                            if (!enabled) {
                                el.style.opacity = '0.3';
                                el.style.backgroundColor = '#f1f5f9';
                                el.title = 'Not applicable for this category/status';
                            } else {
                                el.style.opacity = '1';
                                el.style.backgroundColor = 'transparent';
                                el.title = '';
                            }
                        }
                    });
                };

                const cat = getVal('category');
                const status = getVal('status'); // Values: 'active', 'maintenance' lowercased

                // 1. Specs (Computers)
                const isCompute = ['laptop', 'desktop', 'server', 'workstation', 'cpu', 'mac'].some(k => cat.includes(k));
                setState(['processor', 'ramConfig', 'diskType', 'storageCapacity'], isCompute);

                // 2. Peripheral
                const isPeripheral = ['mouse', 'keyboard', 'headset', 'mic', 'webcam'].some(k => cat.includes(k));
                setState(['connectionType'], isPeripheral);

                // 3. TV
                const isTV = cat.includes('tv') || cat.includes('television') || cat.includes('display');
                setState(['resolution', 'smartOs', 'screenDimension', 'mountType', 'inputType', 'powerSource'], isTV);

                // 4. CCTV
                const isCCTV = cat.includes('cctv') || cat.includes('camera') || cat.includes('dvr') || cat.includes('nvr');
                setState(['cctvType', 'dvrModel', 'fieldView', 'ipAddress', 'maintenanceFrequency'], isCCTV);

                // 5. Maintenance
                const isMaint = status === 'maintenance';
                setState(['maintenanceType', 'maintenanceStartDate', 'maintenanceEndDate'], isMaint);

                // 6. Retirement
                const isRetired = status === 'retired';
                setState(['retirementDate'], isRetired);
                setState(['returnedDate'], isRetired || status === 'in storage');
                setState(['issuedDate'], status === 'active');
            }
          `;
      } else if (type === 'software') {
          dynamicLogic = `
            function updateRow(tr) {
                const getVal = (name) => {
                    const el = tr.querySelector('[name="' + name + '"]');
                    return el ? (el.value || '') : '';
                };
                const setState = (names, enabled) => {
                    names.forEach(name => {
                        const el = tr.querySelector('[name="' + name + '"]');
                        if (el) {
                            el.disabled = !enabled;
                            el.style.opacity = enabled ? '1' : '0.3';
                            el.style.backgroundColor = enabled ? 'transparent' : '#f1f5f9';
                        }
                    });
                };

                const type = getVal('type');
                const isPerpetual = type === 'Perpetual';
                
                // Perpetual -> No Expiry, No Recurring Costs usually
                setState(['expiryDate', 'amcEnabled', 'amcCost', 'cloudEnabled', 'cloudCost', 'trainingEnabled', 'trainingCost'], !isPerpetual);
            }
          `;
      } else {
          dynamicLogic = `
            function updateRow(tr) {
                const getVal = (name) => {
                    const el = tr.querySelector('[name="' + name + '"]');
                    return el ? (el.value || '').toLowerCase() : '';
                };
                const setState = (names, enabled) => {
                    names.forEach(name => {
                        const el = tr.querySelector('[name="' + name + '"]');
                        if (el) {
                            el.disabled = !enabled;
                            el.style.opacity = enabled ? '1' : '0.3';
                            el.style.backgroundColor = enabled ? 'transparent' : '#f1f5f9';
                        }
                    });
                };

                const status = getVal('status');
                
                setState(['maintenanceType', 'maintenanceStartDate', 'maintenanceEndDate'], status === 'maintenance');
                setState(['retirementDate'], status === 'retired');
            }
          `;
      }

      return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Niyojan Offline Entry: ${type.toUpperCase()}</title>
    <style>
        :root { --primary: #2563eb; --bg: #f1f5f9; --border: #cbd5e1; }
        body { font-family: -apple-system, system-ui, sans-serif; background: var(--bg); padding: 40px; color: #0f172a; }
        .container { max-width: 95vw; margin: 0 auto; background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); display: flex; flex-direction: column; height: 85vh; }
        h2 { margin-top: 0; color: #1e293b; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .badge { background: #dbeafe; color: #1e40af; font-size: 0.8rem; padding: 4px 8px; border-radius: 4px; }
        
        .table-wrapper { 
            flex: 1; 
            overflow: auto; 
            border: 1px solid var(--border); 
            border-radius: 8px; 
            background: #fff;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
        }
        
        table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; min-width: max-content; }
        
        th { 
            text-align: left; 
            padding: 12px 16px; 
            background: #f8fafc; 
            color: #475569; 
            font-weight: 700; 
            border-bottom: 1px solid var(--border); 
            border-right: 1px solid #e2e8f0;
            white-space: nowrap; 
            text-transform: uppercase; 
            letter-spacing: 0.05em; 
            position: sticky; 
            top: 0; 
            z-index: 10;
            box-shadow: 0 1px 0 var(--border);
        }
        
        td { 
            border-bottom: 1px solid #e2e8f0; 
            border-right: 1px solid #f1f5f9;
            padding: 8px; 
            background: white; 
            vertical-align: middle;
        }
        
        /* Inputs inside table */
        input, select { 
            width: 100%; 
            padding: 8px 12px; 
            font-size: 13px; 
            border: 1px solid transparent; 
            border-radius: 4px; 
            box-sizing: border-box; 
            transition: all 0.2s; 
            min-width: 160px; 
            background: transparent;
        }
        input:hover:not(:disabled), select:hover:not(:disabled) { background: #f8fafc; border-color: #cbd5e1; }
        input:focus, select:focus { outline: none; border-color: var(--primary); background: white; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1); }
        select { cursor: pointer; }
        input:disabled, select:disabled { cursor: not-allowed; color: #94a3b8; }
        
        /* Row Hover */
        tr:hover td { background: #f8fafc; }
        tr:hover input:not(:disabled), tr:hover select:not(:disabled) { background: white; border-color: #cbd5e1; }

        .actions { margin-top: 20px; display: flex; gap: 10px; padding-top: 10px; border-top: 1px solid var(--border); }
        button { cursor: pointer; padding: 10px 20px; border-radius: 6px; border: 1px solid #cbd5e1; background: white; font-weight: 600; color: #475569; transition: all 0.2s; font-size: 13px; }
        button:hover { background: #f8fafc; transform: translateY(-1px); }
        button.primary { background: var(--primary); color: white; border-color: var(--primary); box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); }
        button.primary:hover { background: #1d4ed8; }
        .del-btn { color: #ef4444; border-color: transparent; background: transparent; padding: 6px; font-size: 18px; line-height: 1; }
        .del-btn:hover { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }
        .help-text { color: #64748b; font-size: 0.9rem; margin-bottom: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div>
            <h2>${type.toUpperCase()} Bulk Entry <span class="badge">Offline Form</span></h2>
            <p class="help-text">
                1. Fill the table below. Fields automatically disable if not relevant to the selected Category/Status.<br/>
                2. Click <b>"Save File for Upload"</b> when finished.<br/>
            </p>
        </div>
        
        <form id="entryForm" class="table-wrapper">
            <table id="dataTable">
                <thead>
                    <tr>
                        ${fields.map(f => `<th>${f.label}</th>`).join('')}
                        <th style="width: 50px; text-align: center;">Actions</th>
                    </tr>
                </thead>
                <tbody id="tableBody"></tbody>
            </table>
        </form>

        <div class="actions">
            <button type="button" onclick="addRow()">+ Add Row</button>
            <div style="flex:1"></div>
            <button type="button" class="primary" onclick="saveFile()">Save File for Upload</button>
        </div>
    </div>

    <script>
        const fields = ${JSON.stringify(fields)};

        // Dynamic Logic Block
        ${dynamicLogic}

        function addRow(data = {}) {
            const tr = document.createElement('tr');
            tr.className = 'data-row';
            
            fields.forEach(field => {
                const td = document.createElement('td');
                
                if (field.type === 'select' && field.options) {
                    const select = document.createElement('select');
                    select.name = field.key;
                    
                    const defOpt = document.createElement('option');
                    defOpt.text = '';
                    defOpt.value = '';
                    select.appendChild(defOpt);

                    field.options.forEach(opt => {
                        const option = document.createElement('option');
                        option.value = opt;
                        option.text = opt;
                        if (data[field.key] === opt) option.selected = true;
                        select.appendChild(option);
                    });
                    
                    // Attach change listener for logic
                    select.addEventListener('change', () => updateRow(tr));
                    
                    td.appendChild(select);
                } else {
                    const input = document.createElement('input');
                    input.type = field.type;
                    input.name = field.key;
                    input.value = data[field.key] || '';
                    input.placeholder = field.placeholder || '';
                    td.appendChild(input);
                }
                
                tr.appendChild(td);
            });

            const tdAction = document.createElement('td');
            tdAction.style.textAlign = 'center';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.innerHTML = '&times;';
            btn.title = 'Remove Row';
            btn.className = 'del-btn';
            btn.onclick = () => tr.remove();
            tdAction.appendChild(btn);
            tr.appendChild(tdAction);

            document.getElementById('tableBody').appendChild(tr);
            
            // Initialize row state
            updateRow(tr);
        }

        window.onload = () => {
            if (document.querySelectorAll('.data-row').length === 0) {
                for(let i=0; i<3; i++) addRow();
            }
        };

        function saveFile() {
            // Preserving Input State
            document.querySelectorAll('input').forEach(input => {
                input.setAttribute('value', input.value);
            });
            
            // Preserving Select State
            document.querySelectorAll('select').forEach(select => {
                const val = select.value;
                Array.from(select.options).forEach(opt => {
                    if (opt.value === val) {
                        opt.setAttribute('selected', 'selected');
                    } else {
                        opt.removeAttribute('selected');
                    }
                });
            });

            const htmlContent = document.documentElement.outerHTML;
            const blob = new Blob([htmlContent], {type: 'text/html'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'filled_${type}_form.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    </script>
</body>
</html>`;
  };

  const downloadTemplate = (type: 'hardware' | 'software' | 'network') => {
    const htmlContent = generateOfflineForm(type);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `offline_form_${type}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseHTMLFile = (content: string): any[] => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      
      // Try to find the table rows
      const rows = Array.from(doc.querySelectorAll('tr.data-row'));
      if (rows.length === 0) {
          // Fallback to standard table parsing if not our smart form
          const table = doc.querySelector('table');
          if (!table) throw new Error("No table found in file.");
          const allRows = Array.from(table.querySelectorAll('tr'));
          if(allRows.length < 2) return [];
          
          // Header mapping
          const headers = Array.from(allRows[0].querySelectorAll('th, td')).map(c => c.textContent?.trim());
          const result = [];
          for(let i=1; i<allRows.length; i++) {
              const cells = allRows[i].querySelectorAll('td');
              const obj: any = {};
              headers.forEach((h, idx) => {
                  if(h && h !== 'Actions') obj[h] = cells[idx]?.textContent?.trim() || '';
              });
              result.push(obj);
          }
          return result;
      }

      // Parse Smart Form
      const result: any[] = [];
      rows.forEach(tr => {
          // Get both inputs and selects
          const inputs = Array.from(tr.querySelectorAll('input, select'));
          const obj: any = {};
          let hasData = false;
          inputs.forEach((input: any) => {
              const name = input.getAttribute('name');
              
              let value = '';
              if (input.tagName === 'SELECT') {
                  const selectedOpt = input.querySelector('option[selected]');
                  if (selectedOpt) value = selectedOpt.getAttribute('value') || '';
              } else {
                  value = input.getAttribute('value') || '';
              }

              if (name && value) {
                  obj[name] = value;
                  hasData = true;
              }
          });
          if (hasData) result.push(obj);
      });
      return result;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'hardware' | 'software' | 'network') => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const reader = new FileReader();
          
          reader.onload = async (event) => {
              try {
                  const html = event.target?.result as string;
                  const data = parseHTMLFile(html);
                  
                  if (data.length === 0) {
                      addLog('error', `No data found in ${file.name}`);
                      return;
                  }
                  
                  if (type === 'hardware') {
                      const items: HardwareItem[] = data.map((item: any) => ({
                          ...item,
                          id: Date.now().toString() + Math.random().toString().slice(2, 5),
                          status: Object.values(ItemStatus).includes(item.status) ? item.status : ItemStatus.IN_STORAGE,
                          purchaseCost: Number(item.purchaseCost) || 0,
                          fitnessYears: Number(item.fitnessYears) || 0
                      }));
                      await onImportHardware(items);
                      addLog('success', `Imported ${items.length} items from ${file.name}`);
                  } else if (type === 'software') {
                      const items: SoftwareItem[] = data.map((item: any) => ({
                          ...item,
                          id: Date.now().toString() + Math.random().toString().slice(2, 5),
                          type: Object.values(SoftwareType).includes(item.type) ? item.type : SoftwareType.PERPETUAL,
                          seatCount: Number(item.seatCount) || 1,
                          costPerSeat: Number(item.costPerSeat) || 0,
                          amcEnabled: item.amcEnabled === 'Yes',
                          amcCost: Number(item.amcCost) || 0,
                          cloudEnabled: item.cloudEnabled === 'Yes',
                          cloudCost: Number(item.cloudCost) || 0,
                          trainingEnabled: item.trainingEnabled === 'Yes',
                          trainingCost: Number(item.trainingCost) || 0
                      }));
                      await onImportSoftware(items);
                      addLog('success', `Imported ${items.length} licenses from ${file.name}`);
                  } else {
                      const items: NetworkItem[] = data.map((item: any) => ({
                          ...item,
                          id: Date.now().toString() + Math.random().toString().slice(2, 5),
                          status: Object.values(ItemStatus).includes(item.status) ? item.status : ItemStatus.IN_STORAGE,
                          purchaseCost: Number(item.purchaseCost) || 0
                      }));
                      await onImportNetwork(items);
                      addLog('success', `Imported ${items.length} devices from ${file.name}`);
                  }
              } catch (err: any) {
                  addLog('error', `Failed to parse ${file.name}: ${err.message}`);
              }
          };
          reader.readAsText(file);
      }
      // Reset input
      e.target.value = '';
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Offline Form Import</h2>
        <p className="text-slate-500">
            1. Download the offline form. <br/>
            2. Open it in your browser, fill in the data using the input fields, and save it.<br/>
            3. Upload the filled HTML file here.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* HARDWARE CARD */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Monitor size={28} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Hardware</h3>
              <p className="text-sm text-slate-500 mt-2 mb-6">Laptops, Desktops, etc.</p>
              
              <div className="w-full space-y-3">
                  <button 
                    onClick={() => downloadTemplate('hardware')}
                    className="w-full py-2 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium flex items-center justify-center gap-2"
                  >
                      <Download size={16} /> Get Form
                  </button>
                  <label className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg cursor-pointer flex items-center justify-center gap-2 text-sm font-medium transition-colors">
                      <Upload size={16} /> Upload Filled Form
                      <input 
                        type="file" 
                        accept=".html,.htm" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, 'hardware')} 
                      />
                  </label>
              </div>
          </div>

          {/* SOFTWARE CARD */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <Disc size={28} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Software</h3>
              <p className="text-sm text-slate-500 mt-2 mb-6">Licenses & Subscriptions.</p>
              
              <div className="w-full space-y-3">
                  <button 
                    onClick={() => downloadTemplate('software')}
                    className="w-full py-2 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium flex items-center justify-center gap-2"
                  >
                      <Download size={16} /> Get Form
                  </button>
                  <label className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-lg cursor-pointer flex items-center justify-center gap-2 text-sm font-medium transition-colors">
                      <Upload size={16} /> Upload Filled Form
                      <input 
                        type="file" 
                        accept=".html,.htm" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, 'software')} 
                      />
                  </label>
              </div>
          </div>

          {/* NETWORK CARD */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-all">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4">
                  <Wifi size={28} />
              </div>
              <h3 className="font-bold text-slate-900 text-lg">Network</h3>
              <p className="text-sm text-slate-500 mt-2 mb-6">Switches, Routers, etc.</p>
              
              <div className="w-full space-y-3">
                  <button 
                    onClick={() => downloadTemplate('network')}
                    className="w-full py-2 px-4 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium flex items-center justify-center gap-2"
                  >
                      <Download size={16} /> Get Form
                  </button>
                  <label className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg cursor-pointer flex items-center justify-center gap-2 text-sm font-medium transition-colors">
                      <Upload size={16} /> Upload Filled Form
                      <input 
                        type="file" 
                        accept=".html,.htm" 
                        multiple 
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, 'network')} 
                      />
                  </label>
              </div>
          </div>
      </div>

      {/* Logs Section */}
      {logs.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mt-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <FileInput className="text-slate-500" /> Activity Log
                  </h3>
                  <button onClick={() => setLogs([])} className="text-xs text-slate-500 hover:text-red-600 hover:underline">Clear Logs</button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                  {logs.map((log, i) => (
                      <div key={i} className={`flex items-start gap-2 text-sm p-2 rounded ${log.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                          {log.type === 'success' ? <Check size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
                          <span>{log.msg}</span>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

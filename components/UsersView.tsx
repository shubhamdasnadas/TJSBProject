
import React, { useState, useRef } from 'react';
import { UserItem, DepartmentItem, HardwareItem, SoftwareItem } from '../types';
import { Plus, Trash2, Edit2, Mail, Briefcase, Building, Monitor, Disc, AlertTriangle, ArrowRight, Eye, CheckCircle2, List, LayoutGrid, User, Search, X, Upload, Download, Loader2, Fingerprint, IdCard, FileSpreadsheet, Info, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface UsersViewProps {
  items: UserItem[];
  departments: DepartmentItem[];
  hardware: HardwareItem[];
  software: SoftwareItem[];
  onSave: (item: UserItem) => void;
  onDelete: (id: string) => void;
  onSaveHardware: (item: HardwareItem) => Promise<void>;
  onSaveSoftware: (item: SoftwareItem) => Promise<void>;
}

interface ImportReport {
    successes: string[];
    updates: string[];
    failures: { row: number; name: string; reason: string; raw: string }[];
}

export const UsersView: React.FC<UsersViewProps> = ({ 
    items, departments, hardware, software, 
    onSave, onDelete, onSaveHardware, onSaveSoftware 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UserItem | null>(null);
  const [formData, setFormData] = useState<Partial<UserItem>>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const [viewingUser, setViewingUser] = useState<UserItem | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showSampleData, setShowSampleData] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({ status: 'Active', name: '', empCode: '', email: '', department: '', role: '', hod: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (item: UserItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const sampleCsvText = `"id","name","email","department","hod","role","status","emp_code"
"3001","Khushboo Malviya","khushboo.m@pranavconstructions.com","Finance & Accounts","Dilkhush Malesha","Executive","Active","EMP-3001"
"3002","Aarav Sharma","aarav.s@pranavconstructions.com","Construction Management","Suneet Desai","Site Supervisor","Active","EMP-3002"
"3003","Ishita Gupta","ishita.g@pranavconstructions.com","Information Technology","Saiprasad Iyer","IT Specialist","Active","EMP-3003"
"3004","Vikram Malhotra","vikram.m@pranavconstructions.com","Sales, CRM & Marketing","Puja Malhotra","Senior Associate","Active","EMP-3004"
"3005","Sonal Varma","sonal.v@pranavconstructions.com","Architecture","Mangesh","Interior Designer","Active","EMP-3005"`;

  const copySampleToClipboard = () => {
    navigator.clipboard.writeText(sampleCsvText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsvText], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'niyojan_bulk_users_unique.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setBulkStatus('Syncing with database...');
    setImportReport(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
            setBulkStatus('Error: CSV file is empty.');
            setIsImporting(false);
            return;
        }

        const dataLines = lines.slice(1);
        const report: ImportReport = { successes: [], updates: [], failures: [] };

        for (let i = 0; i < dataLines.length; i++) {
            const rowNum = i + 2;
            const line = dataLines[i];
            
            const delimiter = line.includes('\t') ? '\t' : ',';
            const regex = new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`);
            let cols = line.split(regex).map(c => c.trim().replace(/^"|"$/g, ''));
            
            if (cols.length < 2) continue;

            let name = "";
            let email = "";
            let empCode = "";
            let dept = "";
            let status: 'Active' | 'Inactive' = 'Active';
            let role = "";
            let hod = "";

            if (cols.length >= 8) {
                name = cols[1];
                email = cols[2];
                dept = cols[3];
                hod = cols[4];
                role = cols[5];
                status = cols[6].toLowerCase().includes('inactive') ? 'Inactive' : 'Active';
                empCode = cols[7];
            } else {
                name = cols[0];
                cols.forEach((val, idx) => {
                    const low = val.toLowerCase();
                    if (val.includes('@')) email = val;
                    else if (low === 'active' || low === 'inactive') status = low === 'inactive' ? 'Inactive' : 'Active';
                    else if (val.includes('-') && idx > 1) empCode = val;
                });
            }

            if (!empCode) empCode = `EMP-TEMP-${rowNum}`;
            const cleanEmpCode = empCode.toUpperCase();

            // UPSERT LOGIC: Check if this emp_code already exists
            const existingUser = items.find(u => u.empCode === cleanEmpCode);

            const user: UserItem = {
                // If it exists, use the existing ID (triggers Update in API)
                // If new, use a temporary unique string (triggers Insert in API)
                id: existingUser ? existingUser.id : (Date.now().toString() + Math.random().toString().slice(2, 5)),
                name: name || (existingUser?.name) || 'Imported User',
                empCode: cleanEmpCode,
                email: email || (existingUser?.email) || '',
                department: dept || (existingUser?.department) || '',
                role: role || (existingUser?.role) || '',
                hod: hod || (existingUser?.hod) || '',
                status: status
            };

            try {
                await onSave(user);
                if (existingUser) report.updates.push(name);
                else report.successes.push(name);
            } catch (err: any) {
                report.failures.push({ row: rowNum, name: name, reason: err.message || 'Server Reject', raw: line });
            }
        }

        setImportReport(report);
        setBulkStatus(`Success: ${report.successes.length} New, ${report.updates.length} Updated, ${report.failures.length} Failed.`);
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: UserItem = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      name: (formData.name || '').trim(),
      empCode: (formData.empCode || '').toUpperCase(),
      email: (formData.email || '').trim(),
      department: formData.department || '',
      hod: formData.hod || '',
      role: (formData.role || '').trim(),
      status: (formData.status as 'Active' | 'Inactive') || 'Active'
    };
    onSave(newItem);
    setIsModalOpen(false);
  };

  const filteredUsers = items.filter(user => {
    const term = searchTerm.toLowerCase();
    return user.name.toLowerCase().includes(term) || user.empCode.toLowerCase().includes(term) || (user.department || '').toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Building size={24} className="text-blue-600" /> Employee Console
            </h2>
            <p className="text-sm text-slate-500 mt-1">Intelligent registry with auto-update for duplicate employee codes.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto flex-wrap">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search name or ID..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-blue-100 transition-all">
                <Plus size={18} /> New Entry
            </button>

            <div className="flex bg-slate-900 rounded-lg overflow-hidden shadow-lg shadow-slate-200">
                <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleCsvImport} />
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isImporting}
                    className="hover:bg-black text-white px-4 py-2 flex items-center gap-2 font-medium border-r border-slate-700"
                >
                    {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} 
                    Import CSV
                </button>
                <button 
                    onClick={() => setShowSampleData(!showSampleData)}
                    className="hover:bg-black text-white px-3 py-2"
                    title="View Template"
                >
                    <Info size={18} />
                </button>
            </div>
        </div>
      </div>

      {showSampleData && (
          <div className="bg-slate-800 rounded-xl p-6 text-white animate-in zoom-in-95 duration-200 shadow-xl border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-blue-400 flex items-center gap-2 uppercase text-xs tracking-widest">
                      <FileSpreadsheet size={16}/> Correct CSV Structure
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={copySampleToClipboard} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy CSV Text'}
                    </button>
                    <button onClick={downloadSampleCsv} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
                        <Download size={14} /> Download File
                    </button>
                  </div>
              </div>
              <pre className="bg-black/40 p-4 rounded-lg font-mono text-[11px] overflow-x-auto text-blue-100/80 border border-white/5 whitespace-pre-wrap leading-relaxed">
                  {sampleCsvText}
              </pre>
              <div className="text-[10px] text-slate-400 mt-3 flex items-center gap-4 italic">
                  <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-green-500"/> "Upsert" Active: Existing codes will update details automatically.</span>
              </div>
          </div>
      )}

      {bulkStatus && (
          <div className={`p-4 rounded-xl border flex items-center justify-between shadow-sm animate-in slide-in-from-top-2 ${bulkStatus.includes('Failed') && !bulkStatus.includes('0 Failed') ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
              <div className="flex items-center gap-3 font-bold text-sm">
                  {bulkStatus.includes('Failed') && !bulkStatus.includes('0 Failed') ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                  {bulkStatus}
                  {importReport && importReport.failures.length > 0 && (
                      <button onClick={() => setShowFullReport(!showFullReport)} className="underline ml-4 text-xs font-bold">Show Error Log</button>
                  )}
              </div>
              <button onClick={() => { setBulkStatus(''); setImportReport(null); }} className="p-1 hover:bg-black/5 rounded"><X size={18} /></button>
          </div>
      )}

      {showFullReport && importReport && (
          <div className="bg-white border border-red-100 rounded-xl p-4 max-h-60 overflow-y-auto shadow-inner">
              <h4 className="font-bold text-red-600 mb-3 uppercase text-[10px] tracking-widest">Diagnostic Logs</h4>
              <ul className="text-xs space-y-3">
                  {importReport.failures.map((f, idx) => (
                    <li key={idx} className="bg-red-50/50 p-3 rounded-lg border border-red-100">
                      <div className="flex justify-between font-bold text-red-700 mb-1">
                          <span>Row {f.row}: {f.name}</span>
                          <span className="uppercase text-[9px] bg-red-100 px-1 rounded">{f.reason}</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 truncate bg-white/50 p-1.5 rounded">{f.raw}</div>
                    </li>
                  ))}
              </ul>
          </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 border-b">
                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Employee</th>
                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Emp Code</th>
                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest">Role & Dept</th>
                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest text-center">Status</th>
                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-12 text-center text-slate-400 italic bg-slate-50/30">No results found in organization database.</td>
                        </tr>
                    ) : filteredUsers.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-black text-sm border-2 border-white shadow-sm">
                                        {item.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-900 leading-tight">{item.name}</div>
                                        <div className="text-[11px] text-slate-500">{item.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <span className="font-mono text-xs font-black bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">{item.empCode}</span>
                            </td>
                            <td className="p-4">
                                <div className="font-bold text-slate-800 text-sm leading-tight">{item.role || '—'}</div>
                                <div className="text-[10px] font-black text-blue-600 uppercase tracking-tighter mt-0.5">{item.department || 'Unassigned'}</div>
                            </td>
                            <td className="p-4 text-center">
                                <span className={`px-2.5 py-0.5 text-[10px] uppercase rounded-full font-black border shadow-sm ${item.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {item.status}
                                </span>
                            </td>
                            <td className="p-4 text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setViewingUser(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Eye size={16}/></button>
                                    <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16}/></button>
                                    <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">{editingItem ? 'Edit Profile' : 'Manual Entry'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <IdCard size={10} /> Emp Code
                      </label>
                      <input placeholder="PCPL-000" required className="w-full border border-blue-100 bg-blue-50 focus:bg-white p-3 rounded-xl uppercase font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={formData.empCode || ''} onChange={e => setFormData({...formData, empCode: e.target.value.toUpperCase()})} />
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Account Status</label>
                      <select className={`w-full border p-3 rounded-xl font-bold outline-none focus:ring-2 ${formData.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`} value={formData.status || 'Active'} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                      </select>
                  </div>
              </div>
              <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Name</label>
                  <input placeholder="Legal Employee Name" required className="w-full border border-slate-200 p-3 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Work Email</label>
                  <input placeholder="name@pranavconstructions.com" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Department</label>
                      <select className="w-full border border-slate-200 p-3 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={formData.department || ''} onChange={e => {
                            const d = departments.find(x => x.name === e.target.value);
                            setFormData({...formData, department: e.target.value, hod: d?.hodName || ''});
                      }}>
                          <option value="">Select Dept...</option>
                          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                  </div>
                  <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reporting HOD</label>
                      <input placeholder="Linked via Dept" readOnly className="w-full border border-slate-100 p-3 rounded-xl bg-slate-50 text-slate-400 text-sm outline-none" value={formData.hod || ''} />
                  </div>
              </div>
              <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Designation</label>
                  <input placeholder="Current Role" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all mt-2">Save Record</button>
            </form>
          </div>
        </div>
      )}

      {/* Viewing User Assets Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b bg-indigo-600 text-white flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center font-black text-2xl backdrop-blur-md">
                            {viewingUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tight">{viewingUser.name}</h3>
                            <p className="text-indigo-100 font-mono text-sm uppercase">ID: {viewingUser.empCode}</p>
                        </div>
                    </div>
                    <button onClick={() => setViewingUser(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                </div>
                
                <div className="p-8 overflow-y-auto space-y-8">
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Monitor size={14} className="text-blue-500"/> Allocated Hardware
                        </h4>
                        {hardware.filter(h => h.assignedTo === viewingUser.name).length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {hardware.filter(h => h.assignedTo === viewingUser.name).map(h => (
                                    <div key={h.id} className="p-4 bg-slate-50 border rounded-xl flex justify-between items-center group hover:bg-white hover:border-blue-200 transition-all">
                                        <div>
                                            <div className="font-bold text-slate-800">{h.name}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{h.manufacturer} • {h.model}</div>
                                        </div>
                                        <div className="text-[10px] font-mono bg-white border px-2 py-1 rounded-lg shadow-sm">SN: {h.serialNumber}</div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-slate-400 text-sm italic">No hardware units found for this user.</p>}
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Disc size={14} className="text-emerald-500"/> Software Seat Access
                        </h4>
                        {software.filter(s => s.assignedTo?.some(a => a.username === viewingUser.name)).length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                                {software.filter(s => s.assignedTo?.some(a => a.username === viewingUser.name)).map(s => (
                                    <div key={s.id} className="p-4 bg-slate-50 border rounded-xl flex justify-between items-center group hover:bg-white hover:border-emerald-200 transition-all">
                                        <div className="font-bold text-slate-800">{s.name} <span className="text-xs font-medium text-slate-400">v{s.version}</span></div>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${s.type === 'Subscription' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{s.type}</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-slate-400 text-sm italic">No software seat assignments recorded.</p>}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t flex justify-end">
                    <button onClick={() => setViewingUser(null)} className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all shadow-lg">Done</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

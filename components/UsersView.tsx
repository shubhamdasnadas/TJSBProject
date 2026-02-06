
import React, { useState, useRef } from 'react';
import { UserItem, DepartmentItem, HardwareItem, SoftwareItem } from '../types';
import { Plus, Trash2, Edit2, Mail, Briefcase, Building, Monitor, Disc, AlertTriangle, ArrowRight, Eye, CheckCircle2, List, LayoutGrid, User, Search, X, Upload, Download, Loader2, Fingerprint, IdCard } from 'lucide-react';

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

interface ConflictItem {
    id: string;
    name: string;
    type: 'Hardware' | 'Software';
    details: string; 
    originalItem: HardwareItem | SoftwareItem;
}

export const UsersView: React.FC<UsersViewProps> = ({ 
    items, departments, hardware, software, 
    onSave, onDelete, onSaveHardware, onSaveSoftware 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UserItem | null>(null);
  const [formData, setFormData] = useState<Partial<UserItem>>({});
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [viewingUser, setViewingUser] = useState<UserItem | null>(null);
  const [warningData, setWarningData] = useState<ConflictItem[] | null>(null);
  const [actionType, setActionType] = useState<'deactivate' | 'delete'>('deactivate');
  const [reassignmentMap, setReassignmentMap] = useState<Record<string, string>>({});

  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
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

  const checkConflicts = (user: UserItem, type: 'deactivate' | 'delete'): boolean => {
      const userHw = hardware.filter(h => h.assignedTo === user.name);
      const userSw = software.filter(s => s.assignedTo?.some(a => a.username === user.name));
      if (userHw.length > 0 || userSw.length > 0) {
          const conflicts: ConflictItem[] = [
              ...userHw.map(h => ({ id: h.id, name: h.name, type: 'Hardware' as const, details: h.assetTag || h.serialNumber, originalItem: h })),
              ...userSw.map(s => ({ id: s.id, name: s.name, type: 'Software' as const, details: `v${s.version}`, originalItem: s }))
          ];
          setWarningData(conflicts);
          setReassignmentMap({});
          setActionType(type);
          setEditingItem(user);
          return true;
      }
      return false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final check for mandatory empCode before submission to prevent null errors
    const cleanEmpCode = (formData.empCode || '').toString().trim();
    if (!cleanEmpCode) {
        alert("CRITICAL ERROR: Employee Code is required for database integrity. Please enter a valid code.");
        return;
    }

    const newItem: UserItem = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      name: (formData.name || '').trim(),
      empCode: cleanEmpCode,
      email: (formData.email || '').trim(),
      department: formData.department || '',
      hod: formData.hod || '',
      role: (formData.role || '').trim(),
      status: (formData.status as 'Active' | 'Inactive') || 'Active'
    };

    if (editingItem && newItem.status === 'Inactive' && editingItem.status === 'Active') {
        if (checkConflicts(editingItem, 'deactivate')) return;
    }

    onSave(newItem);
    setIsModalOpen(false);
  };

  const handleDeleteClick = (user: UserItem) => {
      if (checkConflicts(user, 'delete')) return;
      if (confirm(`Are you sure you want to delete ${user.name} (${user.empCode})?`)) {
          onDelete(user.id);
      }
  };

  const confirmConflictResolution = async () => {
      if (!editingItem || !warningData) return;
      for (const conflict of warningData) {
          const newOwner = reassignmentMap[conflict.id];
          if (conflict.type === 'Hardware') {
              await onSaveHardware({ ...(conflict.originalItem as HardwareItem), assignedTo: newOwner || '', previousOwner: newOwner ? editingItem.name : (conflict.originalItem as HardwareItem).previousOwner });
          } else {
              const swItem = conflict.originalItem as SoftwareItem;
              const newAssignments = (swItem.assignedTo || []).filter(u => u.username !== editingItem.name);
              if (newOwner && !newAssignments.some(u => u.username === newOwner)) {
                  newAssignments.push({ username: newOwner, assignedDate: new Date().toISOString().split('T')[0] });
              }
              await onSaveSoftware({ ...swItem, assignedTo: newAssignments });
          }
      }
      if (actionType === 'delete') onDelete(editingItem.id);
      else onSave({ ...editingItem, status: 'Inactive' });
      setWarningData(null);
      setReassignmentMap({});
      setIsModalOpen(false);
      setEditingItem(null);
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setBulkStatus('Processing CSV file...');
    const reader = new FileReader();
    reader.onload = async (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
            setBulkStatus('Error: CSV file is empty or missing headers.');
            setIsImporting(false);
            return;
        }

        const dataLines = lines.slice(1);
        let successCount = 0;
        let errorCount = 0;

        for (const line of dataLines) {
            const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 2) continue;

            const user: UserItem = {
                id: Date.now().toString() + Math.random().toString().slice(2, 5),
                name: cols[0] || 'Unknown',
                empCode: cols[1] || `EMP-${Date.now().toString().slice(-4)}`,
                email: cols[2] || '',
                department: cols[3] || '',
                role: cols[4] || '',
                hod: cols[5] || '',
                status: (cols[6] === 'Inactive' ? 'Inactive' : 'Active') as 'Active' | 'Inactive'
            };

            try {
                await onSave(user);
                successCount++;
            } catch (err) {
                errorCount++;
            }
        }

        setBulkStatus(`Import Complete: ${successCount} added. ${errorCount > 0 ? `Errors: ${errorCount}` : ''}`);
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const filteredUsers = items.filter(user => {
    const term = searchTerm.toLowerCase();
    return (
      user.name.toLowerCase().includes(term) ||
      (user.empCode || '').toLowerCase().includes(term) ||
      (user.role || '').toLowerCase().includes(term) ||
      (user.department || '').toLowerCase().includes(term)
    );
  });

  const allDepts = Array.from(new Set(items.map(u => u.department || 'Unassigned')));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Building size={24} className="text-blue-600" /> Organization Users
            </h2>
            <p className="text-sm text-slate-500 mt-1">Manage employee records and manual asset assignments.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto flex-wrap">
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search by name or emp code..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg shadow-blue-100">
                <Plus size={18} /> Add User Manually
            </button>

            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleCsvImport} />
            <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isImporting}
                className="bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all"
            >
                {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} 
                Bulk CSV
            </button>
        </div>
      </div>

      {bulkStatus && (
          <div className={`p-4 rounded-xl border flex items-center justify-between animate-in slide-in-from-top-2 duration-300 ${bulkStatus.includes('Error') ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
              <div className="flex items-center gap-2">
                  {bulkStatus.includes('Error') ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  <span className="font-bold text-sm">{bulkStatus}</span>
              </div>
              <button onClick={() => setBulkStatus('')} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
      )}

      {viewMode === 'list' ? (
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
                    <tbody className="divide-y">
                        {filteredUsers.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-black text-sm">
                                            {item.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{item.name}</div>
                                            <div className="text-xs text-slate-500">{item.email || 'No email'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-1.5">
                                        <IdCard size={14} className="text-blue-500" />
                                        <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{item.empCode}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="font-medium text-slate-800">{item.role || '—'}</div>
                                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{item.department || 'Unassigned'}</div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-2 py-0.5 text-[9px] uppercase rounded-full font-black border ${item.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setViewingUser(item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Eye size={16}/></button>
                                        <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16}/></button>
                                        <button onClick={() => handleDeleteClick(item)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
      ) : (
          <div className="flex overflow-x-auto pb-4 gap-6">
              {allDepts.map(dept => {
                  const usersInDept = filteredUsers.filter(u => (u.department || 'Unassigned') === dept);
                  return (
                      <div key={dept} className="flex-none w-80 flex flex-col">
                          <div className="p-4 rounded-t-2xl border-t border-x bg-white font-black text-slate-800 flex justify-between items-center text-xs tracking-widest uppercase">
                              {dept}
                              <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">{usersInDept.length}</span>
                          </div>
                          <div className="bg-slate-50/50 p-2 rounded-b-2xl border-x border-b space-y-2 min-h-[300px]">
                              {usersInDept.map(user => (
                                  <div key={user.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group" onClick={() => handleEdit(user)}>
                                      <div className="flex justify-between items-start mb-1">
                                          <div className="font-bold text-slate-900 truncate">{user.name}</div>
                                          <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1 rounded">{user.empCode}</span>
                                      </div>
                                      <div className="text-xs text-slate-500 mb-3">{user.role}</div>
                                      <div className="flex items-center gap-2 text-[10px] text-slate-400 border-t pt-2">
                                          <Mail size={12}/> {user.email || 'No email'}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">{editingItem ? 'Edit Profile' : 'Add New Employee'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <IdCard size={10} /> Emp Code <span className="text-red-500 font-bold">* Mandatory</span>
                    </label>
                    <input 
                      type="text" 
                      required 
                      className="w-full border border-blue-200 bg-blue-50 rounded-xl p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-bold" 
                      value={formData.empCode || ''} 
                      onChange={e => setFormData({...formData, empCode: e.target.value.toUpperCase()})} 
                      placeholder="e.g. PCPL-007"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Account Status</label>
                    <select 
                      className={`w-full border border-slate-200 rounded-xl p-3 font-bold focus:ring-2 outline-none ${formData.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                      value={formData.status || 'Active'}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                  </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required 
                  className="w-full border border-slate-200 rounded-xl p-3 font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.name || ''} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Employee Full Name"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Work Email</label>
                <input 
                  type="email" 
                  className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                  value={formData.email || ''} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                  placeholder="name@pcpl.com"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Department</label>
                   <select 
                    className="w-full border border-slate-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    value={formData.department || ''}
                    onChange={e => {
                        const dept = departments.find(d => d.name === e.target.value);
                        setFormData({...formData, department: e.target.value, hod: dept?.hodName || ''});
                    }}
                   >
                       <option value="">Select Dept...</option>
                       {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                   </select>
                </div>
                 <div className="space-y-1">
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Reporting HOD</label>
                   <input 
                    type="text" 
                    className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 text-slate-500 outline-none" 
                    value={formData.hod || ''} 
                    onChange={e => setFormData({...formData, hod: e.target.value})}
                    placeholder="Assigned HOD"
                   />
                </div>
              </div>

              <div className="space-y-1">
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Designation / Role</label>
                   <input 
                    type="text" 
                    className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                    value={formData.role || ''} 
                    onChange={e => setFormData({...formData, role: e.target.value})} 
                    placeholder="e.g. Senior Developer"
                   />
              </div>
              
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 mt-2">
                {editingItem ? 'Save Profile Changes' : 'Confirm Manual Entry'}
              </button>
            </form>
          </div>
        </div>
      )}

      {warningData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                  <div className={`${actionType === 'delete' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'} p-8 flex gap-6 items-start border-b shrink-0`}>
                      <div className={`p-4 rounded-2xl shrink-0 ${actionType === 'delete' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                          <AlertTriangle size={32} />
                      </div>
                      <div>
                          <h3 className={`text-2xl font-black uppercase tracking-tight ${actionType === 'delete' ? 'text-red-900' : 'text-orange-900'}`}>
                              Conflict Detected
                          </h3>
                          <p className={`${actionType === 'delete' ? 'text-red-800' : 'text-orange-800'} font-medium mt-2`}>
                              <b>{editingItem?.name}</b> ({editingItem?.empCode}) still has assets assigned. 
                              Reassign them before proceeding.
                          </p>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-0">
                      <table className="w-full text-left">
                          <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 sticky top-0 z-10 border-b">
                              <tr>
                                  <th className="px-8 py-4">Asset</th>
                                  <th className="px-8 py-4">New Owner</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y">
                              {warningData.map((item) => (
                                  <tr key={item.id} className="hover:bg-slate-50">
                                      <td className="px-8 py-4">
                                          <div className="font-bold text-slate-800">{item.name}</div>
                                          <div className="text-[10px] text-slate-400 font-mono">{item.details}</div>
                                      </td>
                                      <td className="px-8 py-4">
                                            <select
                                                className={`w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium ${reassignmentMap[item.id] ? 'bg-green-50 border-green-300 text-green-800' : ''}`}
                                                value={reassignmentMap[item.id] || ''}
                                                onChange={(e) => setReassignmentMap(prev => ({...prev, [item.id]: e.target.value}))}
                                            >
                                                <option value="">-- Unassign --</option>
                                                {items.filter(u => u.status === 'Active' && u.name !== editingItem?.name).map(u => (
                                                    <option key={u.id} value={u.name}>{u.name}</option>
                                                ))}
                                            </select>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 shrink-0">
                        <button 
                            onClick={() => { setWarningData(null); setReassignmentMap({}); setIsModalOpen(false); setEditingItem(null); }}
                            className="px-6 py-3 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-slate-800 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmConflictResolution}
                            className={`px-10 py-3 text-white rounded-2xl shadow-xl font-black uppercase text-xs tracking-widest transition-all ${actionType === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'}`}
                        >
                            Process & {actionType}
                        </button>
                  </div>
              </div>
          </div>
      )}

      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="p-8 border-b bg-indigo-600 text-white flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center font-black text-2xl backdrop-blur-md">
                            {viewingUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tight">{viewingUser.name}</h3>
                            <p className="text-indigo-100 font-mono text-sm">ID: {viewingUser.empCode}</p>
                        </div>
                    </div>
                    <button onClick={() => setViewingUser(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                </div>
                
                <div className="p-8 overflow-y-auto space-y-8">
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Monitor size={14} className="text-blue-500"/> Current Hardware
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
                        ) : <p className="text-slate-400 text-sm italic">No hardware assigned.</p>}
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Disc size={14} className="text-emerald-500"/> Licensed Software
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
                        ) : <p className="text-slate-400 text-sm italic">No software assigned.</p>}
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t flex justify-end">
                    <button onClick={() => setViewingUser(null)} className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all">Done</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

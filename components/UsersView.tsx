import React, { useState, useRef } from 'react';
import { UserItem, DepartmentItem, HardwareItem, SoftwareItem } from '../types';
import { Plus, Trash2, Edit2, Mail, Briefcase, Building, Monitor, Disc, AlertTriangle, ArrowRight, Eye, CheckCircle2, List, LayoutGrid, Search, X, Upload, Download, Loader2 } from 'lucide-react';

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
        setFormData({ status: 'Active', name: '', empCode: '', email: '', department: '', role: '' });
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
                ...userHw.map(h => ({ id: h.id, name: h.name, type: 'Hardware' as const, details: h.assetTag || h.serialNumber || 'No SN', originalItem: h })),
                ...userSw.map(s => ({ id: s.id, name: s.name, type: 'Software' as const, details: `v${s.version || 'N/A'}`, originalItem: s }))
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
        const itemToSave: UserItem = {
            id: editingItem ? editingItem.id : '',
            name: (formData.name || '').trim(),
            empCode: (formData.empCode || '').trim(),
            email: (formData.email || '').trim(),
            department: formData.department || '',
            hod: formData.hod || '',
            role: (formData.role || '').trim(),
            status: (formData.status as 'Active' | 'Inactive') || 'Active',
        };

        if (editingItem && itemToSave.status === 'Inactive' && editingItem.status === 'Active') {
            if (checkConflicts(editingItem, 'deactivate')) return;
        }

        onSave(itemToSave);
        setIsModalOpen(false);
    };

    const handleDeleteClick = (user: UserItem) => {
        if (checkConflicts(user, 'delete')) return;
        if (confirm(`Are you sure you want to delete ${user.name}?`)) {
            onDelete(user.id);
        }
    };

    const handleReassignmentChange = (assetId: string, newUserId: string) => {
        setReassignmentMap(prev => ({ ...prev, [assetId]: newUserId }));
    };

    const confirmConflictResolution = async () => {
        if (!editingItem || !warningData) return;

        for (const conflict of warningData) {
            const newOwner = reassignmentMap[conflict.id] || '';

            if (conflict.type === 'Hardware') {
                const hwItem = conflict.originalItem as HardwareItem;
                await onSaveHardware({
                    ...hwItem,
                    assignedTo: newOwner,
                    previousOwner: newOwner ? editingItem.name : hwItem.previousOwner
                });
            } else {
                const swItem = conflict.originalItem as SoftwareItem;
                let currentUsers = swItem.assignedTo || [];
                currentUsers = currentUsers.filter(u => u.username !== editingItem.name);
                if (newOwner) {
                    currentUsers.push({
                        username: newOwner,
                        assignedDate: new Date().toISOString().split('T')[0]
                    });
                }
                await onSaveSoftware({ ...swItem, assignedTo: currentUsers });
            }
        }

        if (actionType === 'delete') {
            onDelete(editingItem.id);
        } else {
            const newItem: UserItem = {
                ...editingItem,
                ...formData,
                status: 'Inactive' as const
            };
            onSave(newItem);
        }

        setWarningData(null);
        setReassignmentMap({});
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const handleDepartmentChange = (deptName: string) => {
        const dept = departments.find(d => d.name === deptName);
        setFormData(prev => ({
            ...prev,
            department: deptName,
            hod: dept?.hodName || ''
        }));
    };

    const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setBulkStatus('Reading file...');
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) {
                setBulkStatus('CSV has no data rows.');
                setIsImporting(false);
                return;
            }

            const dataLines = lines.slice(1);
            let successCount = 0;

            for (const line of dataLines) {
                const cols = line.split(',').map(col => col.trim());
                if (cols.length < 4) continue;

                const dept = departments.find(d => d.name.toLowerCase() === cols[3].toLowerCase());

                const user: UserItem = {
                    id: '',
                    name: cols[0],
                    status: (cols[1] === 'Active' || cols[1] === 'Inactive') ? cols[1] : 'Active',
                    email: cols[2] || '',
                    department: cols[3] || '',
                    hod: cols[4] || dept?.hodName || '',
                    role: cols[5] || '',
                    empCode: cols[6] || ''
                };

                try {
                    await onSave(user);
                    successCount++;
                } catch (err) {
                    console.error("Failed to import user:", user.name, err);
                }
            }

            setBulkStatus(`Successfully imported ${successCount} users.`);
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
                <h2 className="text-2xl font-bold text-slate-800">Users & Employees</h2>
                <div className="flex gap-3 w-full md:w-auto flex-wrap">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search name, emp code, role, dept..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex bg-white rounded-lg border border-slate-200 p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>

                    <button
                        onClick={handleAddNew}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                    >
                        <Plus size={18} /> Add User
                    </button>

                    <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleCsvImport} />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all"
                    >
                        {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                        Bulk Import
                    </button>
                </div>
            </div>

            {bulkStatus && (
                <div className={`p-4 rounded-xl border flex items-center justify-between ${bulkStatus.includes('Success') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} />
                        <span className="font-bold text-sm">{bulkStatus}</span>
                    </div>
                    <button onClick={() => setBulkStatus('')} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>
            )}

            {viewMode === 'list' ? (
                <div className="bg-white rounded-xl shadow border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b">
                                    <th className="p-4 font-semibold text-slate-600">Employee</th>
                                    <th className="p-4 font-semibold text-slate-600">Emp Code</th>
                                    <th className="p-4 font-semibold text-slate-600">Role & Department</th>
                                    <th className="p-4 font-semibold text-slate-600">Status</th>
                                    <th className="p-4 font-semibold text-slate-600 text-center">Assets</th>
                                    <th className="p-4 font-semibold text-slate-600 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredUsers.length === 0 ? (
                                    <tr><td colSpan={6} className="p-12 text-center text-slate-400">No users found</td></tr>
                                ) : (
                                    filteredUsers.map(item => {
                                        const hwCount = hardware.filter(h => h.assignedTo === item.name).length;
                                        const swCount = software.filter(s => s.assignedTo?.some(a => a.username === item.name)).length;

                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                                                            {item.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium">{item.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-mono text-xs text-slate-600">{item.empCode || '—'}</td>
                                                <td className="p-4">
                                                    <div className="font-medium">{item.role || '—'}</div>
                                                    <div className="text-xs text-slate-500">{item.department || 'No Dept'} {item.hod ? `(HOD: ${item.hod})` : ''}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 text-[10px] uppercase rounded-full font-black ${item.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {hwCount + swCount > 0 ? (
                                                        <div className="flex justify-center gap-2">
                                                            {hwCount > 0 && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 text-xs font-bold">{hwCount} HW</span>}
                                                            {swCount > 0 && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 text-xs font-bold">{swCount} SW</span>}
                                                        </div>
                                                    ) : '—'}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button onClick={() => setViewingUser(item)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Eye size={16} /></button>
                                                        <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16} /></button>
                                                        <button onClick={() => handleDeleteClick(item)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex overflow-x-auto gap-6 pb-4">
                    {allDepts.map(dept => (
                        <div key={dept} className="flex-none w-80">
                            <div className="bg-white border rounded-t-xl p-3 font-bold flex justify-between items-center shadow-sm">
                                {dept}
                                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{filteredUsers.filter(u => (u.department || 'Unassigned') === dept).length}</span>
                            </div>
                            <div className="bg-slate-50/50 p-2 min-h-[200px] border-x border-b rounded-b-xl space-y-2">
                                {filteredUsers.filter(u => (u.department || 'Unassigned') === dept).map(u => (
                                    <div key={u.id} className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md cursor-pointer" onClick={() => handleEdit(u)}>
                                        <div className="font-bold text-slate-800">{u.name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-1">{u.empCode || 'NO CODE'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-900">{editingItem ? 'Edit User' : 'New User'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase">Employee Code</label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg p-2.5 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.empCode || ''}
                                        onChange={e => setFormData({ ...formData, empCode: e.target.value })}
                                        placeholder="e.g. PCPL-001"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase">Status</label>
                                    <select
                                        className={`w-full border rounded-lg p-2.5 font-bold focus:ring-2 outline-none ${formData.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                                        value={formData.status || 'Active'}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase">Email Address</label>
                                <input
                                    type="email"
                                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase">Department</label>
                                    <select
                                        className="w-full border rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.department || ''}
                                        onChange={e => handleDepartmentChange(e.target.value)}
                                    >
                                        <option value="">Select...</option>
                                        {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase">HOD (Auto)</label>
                                    <input
                                        type="text"
                                        readOnly
                                        className="w-full border rounded-lg p-2.5 bg-slate-50 text-slate-500"
                                        value={formData.hod || ''}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[10px] font-black text-slate-500 uppercase">Role / Job Title</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.role || ''}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                />
                            </div>

                            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 mt-2">
                                Save User Profile
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* REASSIGNMENT WARNING MODAL */}
            {warningData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className={`${actionType === 'delete' ? 'bg-red-50' : 'bg-amber-50'} p-6 flex gap-4 border-b`}>
                            <div className={`p-3 rounded-full shrink-0 ${actionType === 'delete' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}><AlertTriangle size={24} /></div>
                            <div>
                                <h3 className={`text-xl font-bold ${actionType === 'delete' ? 'text-red-900' : 'text-amber-900'}`}>{actionType === 'delete' ? 'Delete' : 'Deactivate'} User With Assets</h3>
                                <p className="text-sm text-slate-600 mt-1"><b>{editingItem?.name}</b> has {warningData.length} assigned items. Reassign them below or they will be unassigned automatically.</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                                    <tr><th className="px-6 py-3">Asset</th><th className="px-6 py-3 w-[40%]">New Owner</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {warningData.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3"><div className="font-bold">{item.name}</div><div className="text-[10px] text-slate-400 uppercase">{item.type} • {item.details}</div></td>
                                            <td className="px-6 py-3">
                                                <select
                                                    className="w-full border rounded-lg p-2 text-xs"
                                                    value={reassignmentMap[item.id] || ''}
                                                    onChange={e => handleReassignmentChange(item.id, e.target.value)}
                                                >
                                                    <option value="">-- Unassign --</option>
                                                    {items.filter(u => u.status === 'Active' && u.name !== editingItem?.name).map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                            <button onClick={() => setWarningData(null)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                            <button onClick={confirmConflictResolution} className={`px-6 py-2 rounded-xl text-white font-bold shadow-lg transition-all ${actionType === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}>Confirm Action</button>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW ASSETS MODAL */}
            {viewingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">{viewingUser.name.charAt(0).toUpperCase()}</div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">{viewingUser.name}</h3>
                                    <p className="text-xs text-slate-500 uppercase font-black">{viewingUser.role} • {viewingUser.department}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingUser(null)}><X size={24} className="text-slate-400" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Monitor size={14} /> Hardware</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {hardware.filter(h => h.assignedTo === viewingUser.name).map(h => (
                                        <div key={h.id} className="p-3 border rounded-lg flex justify-between items-center">
                                            <div><div className="font-bold text-sm">{h.name}</div><div className="text-[10px] text-slate-400">{h.manufacturer} {h.model}</div></div>
                                            <div className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded uppercase">{h.assetTag || h.serialNumber}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t flex justify-end">
                            <button onClick={() => setViewingUser(null)} className="px-6 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl font-bold transition-all">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
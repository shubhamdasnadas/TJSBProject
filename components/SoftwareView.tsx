import React, { useState, useEffect } from 'react';
import { SoftwareItem, SoftwareType, UserItem, LifecycleEvent, DepartmentItem, SoftwareAssignment } from '../types';
import { Plus, Trash2, Edit2, Calendar, Users, X, History, IndianRupee, Layout, List, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { LifecycleView } from './LifecycleView';

interface SoftwareViewProps {
  items: SoftwareItem[];
  users: UserItem[];
  departments: DepartmentItem[];
  lifecycle: LifecycleEvent[];
  onSave: (item: SoftwareItem) => void;
  onDelete: (id: string) => void;
}

export const SoftwareView: React.FC<SoftwareViewProps> = ({ items, users, departments, lifecycle, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SoftwareItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [formData, setFormData] = useState<Partial<SoftwareItem>>({});
  
  // Assignment UI State
  const [selectedDeptForAssignment, setSelectedDeptForAssignment] = useState('');
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [selectedDateToAdd, setSelectedDateToAdd] = useState(new Date().toISOString().split('T')[0]);
  
  const [assignmentPage, setAssignmentPage] = useState(1);
  const ASSIGNMENT_PAGE_SIZE = 20;
  const [showLifecycle, setShowLifecycle] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isModalOpen) {
      setAssignmentPage(1);
      setSelectedDeptForAssignment('');
      setSelectedUserToAdd('');
    }
  }, [isModalOpen, editingItem]);

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({ 
      type: SoftwareType.SUBSCRIPTION, seatCount: 1, assignedTo: [], purchaseDate: today, issuedDate: today, amcCost: 0, cloudCost: 0, trainingCost: 0, costPerSeat: 0
    });
    setIsModalOpen(true);
    setShowLifecycle(false);
  };

  const handleEdit = (item: SoftwareItem) => {
    setEditingItem(item);
    setFormData({ ...item, assignedTo: item.assignedTo || [] });
    setIsModalOpen(true);
    setShowLifecycle(true);
  };

  const handleTypeChange = (val: SoftwareType) => {
      setFormData({ ...formData, type: val, expiryDate: val === SoftwareType.PERPETUAL ? '' : formData.expiryDate });
  };

  const handleCostChange = (field: keyof SoftwareItem, value: string) => {
      const numValue = parseFloat(value.replace(/,/g, ''));
      if (!isNaN(numValue) || value === '') setFormData({ ...formData, [field]: value === '' ? undefined : numValue });
  };

  const formatCostDisplay = (val: number | undefined): string => val !== undefined && val !== null ? val.toLocaleString('en-IN') : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: SoftwareItem = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      name: formData.name || 'Unknown Software',
      version: formData.version || '1.0',
      licenseKey: formData.licenseKey || '',
      type: formData.type as SoftwareType,
      seatCount: Number(formData.seatCount) || 0,
      costPerSeat: Number(formData.costPerSeat) || 0,
      expiryDate: formData.type === SoftwareType.PERPETUAL ? '' : formData.expiryDate, 
      purchaseDate: formData.purchaseDate,
      issuedDate: formData.issuedDate,
      assignedTo: formData.assignedTo || [],
      amcEnabled: formData.amcEnabled,
      amcCost: formData.amcEnabled ? (formData.amcCost || 0) : 0,
      cloudEnabled: formData.cloudEnabled,
      cloudCost: formData.cloudEnabled ? (formData.cloudCost || 0) : 0,
      trainingEnabled: formData.trainingEnabled,
      trainingCost: formData.trainingEnabled ? (formData.trainingCost || 0) : 0,
    };
    onSave(newItem);
    setIsModalOpen(false);
  };

  const handleAddUser = () => {
    if (!selectedUserToAdd) return;
    const currentAssignments = formData.assignedTo || [];
    if (!currentAssignments.some(a => a.username === selectedUserToAdd)) {
        setFormData({ ...formData, assignedTo: [...currentAssignments, { username: selectedUserToAdd, assignedDate: selectedDateToAdd || today }] });
    }
    setSelectedUserToAdd('');
  };

  const handleRemoveUser = (userName: string) => {
    setFormData({ ...formData, assignedTo: (formData.assignedTo || []).filter(u => u.username !== userName) });
  };

  const isPerpetual = formData.type === SoftwareType.PERPETUAL;
  const formTotalCost = ((formData.seatCount || 0) * (formData.costPerSeat || 0)) +
    (!isPerpetual && formData.amcEnabled ? (formData.amcCost || 0) : 0) +
    (!isPerpetual && formData.cloudEnabled ? (formData.cloudCost || 0) : 0) +
    (!isPerpetual && formData.trainingEnabled ? (formData.trainingCost || 0) : 0);

  const filteredUsersForAssignment = users.filter(u => u.status === 'Active' && (!selectedDeptForAssignment || u.department === selectedDeptForAssignment));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Software Inventory</h2>
        <div className="flex gap-3">
            <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-400'}`}><List size={18} /></button>
                <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-md ${viewMode === 'kanban' ? 'bg-blue-100 text-blue-600' : 'text-slate-400'}`}><LayoutGrid size={18} /></button>
            </div>
            <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm"><Plus size={18} />Add License</button>
        </div>
      </div>

      {viewMode === 'list' ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b">
                            <th className="p-4 font-semibold text-slate-600 text-sm">Software</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm text-center">Seats</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm text-right">Total Cost</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {items.map(item => {
                            const totalVal = ((item.seatCount || 0) * (item.costPerSeat || 0)) + (item.amcCost || 0) + (item.cloudCost || 0) + (item.trainingCost || 0);
                            return (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-bold text-slate-900">{item.name} <span className="text-xs text-slate-400 font-normal ml-2">v{item.version}</span></td>
                                    <td className="p-4 text-center text-sm">{(item.assignedTo?.length || 0)} / {item.seatCount}</td>
                                    <td className="p-4 text-right font-bold">₹{totalVal.toLocaleString('en-IN')}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                                            <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
          </div>
      ) : (
          <div className="flex gap-6 overflow-x-auto pb-4">
              {Object.values(SoftwareType).map(type => (
                  <div key={type} className="w-80 shrink-0">
                      <div className="p-3 bg-white border border-b-0 rounded-t-xl font-bold flex justify-between">
                          {type} <span className="bg-slate-100 px-2 rounded-full text-xs">{items.filter(i => i.type === type).length}</span>
                      </div>
                      <div className="bg-slate-50/50 p-2 border rounded-b-xl min-h-[200px] space-y-2">
                          {items.filter(i => i.type === type).map(item => (
                              <div key={item.id} onClick={() => handleEdit(item)} className="bg-white p-3 rounded-lg border shadow-sm cursor-pointer hover:shadow-md">
                                  <div className="font-bold text-sm">{item.name}</div>
                                  <div className="text-xs text-slate-400">Seats: {item.assignedTo?.length || 0}/{item.seatCount}</div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
             <div className="p-6 border-b flex justify-between items-center bg-white shrink-0">
                <h3 className="text-xl font-bold">{editingItem ? 'Edit License' : 'New License'}</h3>
                <div className="flex items-center gap-3">
                    {editingItem && (
                        <button onClick={() => setShowLifecycle(!showLifecycle)} className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
                            {showLifecycle ? <Layout size={16} /> : <History size={16} />} {showLifecycle ? 'Hide History' : 'Show History'}
                        </button>
                    )}
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                </div>
             </div>

             <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 h-full min-h-0">
                    <div className={`${showLifecycle && editingItem ? 'lg:col-span-2' : 'lg:col-span-3'} flex flex-col h-full min-h-0 border-r`}>
                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="software-form" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Software Name</label><input required className="w-full border p-2.5 rounded-lg" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Version</label><input className="w-full border p-2.5 rounded-lg" value={formData.version || ''} onChange={e => setFormData({...formData, version: e.target.value})} /></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Type</label><select className="w-full border p-2.5 rounded-lg bg-white" value={formData.type} onChange={e => handleTypeChange(e.target.value as SoftwareType)}><option value={SoftwareType.SUBSCRIPTION}>Subscription</option><option value={SoftwareType.PERPETUAL}>Perpetual</option><option value={SoftwareType.OPEN_SOURCE}>Open Source</option></select></div>
                                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Seats</label><input type="number" className="w-full border p-2.5 rounded-lg" value={formData.seatCount || 0} onChange={e => setFormData({...formData, seatCount: parseInt(e.target.value)})} /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-black text-slate-500 uppercase">Cost / Seat</label><input type="text" className="w-full border p-2.5 rounded-lg" value={formatCostDisplay(formData.costPerSeat)} onChange={e => handleCostChange('costPerSeat', e.target.value)} /></div>
                                </div>

                                {/* ADDITIONAL COSTS SECTION */}
                                <div className={`space-y-4 pt-4 border-t ${isPerpetual ? 'opacity-40 pointer-events-none' : ''}`}>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Additional Costs</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-sm mb-3">
                                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={formData.amcEnabled || false} onChange={e => setFormData({...formData, amcEnabled: e.target.checked})} /> AMC
                                            </label>
                                            {formData.amcEnabled && <input type="text" placeholder="Cost" className="w-full border p-2 rounded text-sm bg-white" value={formatCostDisplay(formData.amcCost)} onChange={e => handleCostChange('amcCost', e.target.value)} />}
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-sm mb-3">
                                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={formData.cloudEnabled || false} onChange={e => setFormData({...formData, cloudEnabled: e.target.checked})} /> Cloud
                                            </label>
                                            {formData.cloudEnabled && <input type="text" placeholder="Cost" className="w-full border p-2 rounded text-sm bg-white" value={formatCostDisplay(formData.cloudCost)} onChange={e => handleCostChange('cloudCost', e.target.value)} />}
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-sm mb-3">
                                                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={formData.trainingEnabled || false} onChange={e => setFormData({...formData, trainingEnabled: e.target.checked})} /> Training
                                            </label>
                                            {formData.trainingEnabled && <input type="text" placeholder="Cost" className="w-full border p-2 rounded text-sm bg-white" value={formatCostDisplay(formData.trainingCost)} onChange={e => handleCostChange('trainingCost', e.target.value)} />}
                                        </div>
                                    </div>
                                </div>

                                {/* ASSIGNMENT SECTION */}
                                <div className="pt-6 border-t">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><Users size={14}/> License Assignments</h4>
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase">1. Dept</label><select className="w-full border p-2 rounded-lg bg-white" value={selectedDeptForAssignment} onChange={e => setSelectedDeptForAssignment(e.target.value)}><option value="">All</option>{departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}</select></div>
                                        <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase">2. Employee</label><select className="w-full border p-2 rounded-lg bg-white" value={selectedUserToAdd} onChange={e => setSelectedUserToAdd(e.target.value)}><option value="">Select...</option>{filteredUsersForAssignment.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
                                        <div className="flex items-end gap-2"><input type="date" className="flex-1 border p-2 rounded-lg bg-white" value={selectedDateToAdd} onChange={e => setSelectedDateToAdd(e.target.value)} /><button type="button" onClick={handleAddUser} disabled={!selectedUserToAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50">Assign</button></div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t bg-white flex justify-between items-center shrink-0">
                            <div><div className="text-[10px] font-black text-slate-400 uppercase">Asset Value</div><div className="text-xl font-black text-blue-600">₹{formTotalCost.toLocaleString('en-IN')}</div></div>
                            <div className="flex gap-3"><button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-bold text-slate-600">Cancel</button><button type="submit" form="software-form" className="px-8 py-2 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-100">Save License</button></div>
                        </div>
                    </div>
                    {editingItem && showLifecycle && (
                        <div className="bg-slate-50 border-l flex flex-col lg:col-span-1 min-h-0">
                            <div className="p-4 border-b bg-slate-50 flex items-center gap-2 font-bold text-slate-800"><History size={18} className="text-blue-600"/> History</div>
                            <div className="overflow-y-auto flex-1 p-4"><LifecycleView events={lifecycle.filter(e => e.assetId === editingItem.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())} compact={true} /></div>
                        </div>
                    )}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
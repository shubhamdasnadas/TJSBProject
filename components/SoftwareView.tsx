 
// Complete SoftwareView component to manage software licenses and assignments
import React, { useState, useEffect } from 'react';
import { SoftwareItem, SoftwareType, UserItem, LifecycleEvent, DepartmentItem, SoftwareAssignment } from '../types';
import { Plus, Trash2, Edit2, Calendar, User, Users, X, History, IndianRupee, AlertCircle, Building, Briefcase, Calculator, Cloud, GraduationCap, Wrench, ChevronLeft, ChevronRight, Eye, EyeOff, Layout, List, LayoutGrid, Tag } from 'lucide-react';
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  
  const [formData, setFormData] = useState<Partial<SoftwareItem>>({});
  
  // Assignment UI State
  const [selectedDeptForAssignment, setSelectedDeptForAssignment] = useState('');
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [selectedDateToAdd, setSelectedDateToAdd] = useState(new Date().toISOString().split('T')[0]);
  
  // Pagination State for Assignments
  const [assignmentPage, setAssignmentPage] = useState(1);
  const ASSIGNMENT_PAGE_SIZE = 20;

  // Lifecycle Visibility State
  const [showLifecycle, setShowLifecycle] = useState(true);

  // Date Limits
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Reset page when modal opens or item changes
    if (isModalOpen) {
      setAssignmentPage(1);
      setSelectedDeptForAssignment('');
      setSelectedUserToAdd('');
    }
  }, [isModalOpen, editingItem]);

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({ 
      type: SoftwareType.SUBSCRIPTION, 
      seatCount: 1, 
      assignedTo: [], 
      purchaseDate: today,
      issuedDate: today,
      amcEnabled: false,
      cloudEnabled: false,
      trainingEnabled: false,
      amcCost: 0,
      cloudCost: 0,
      trainingCost: 0,
      costPerSeat: 0
    });
    // Trigger auto-calc for default today
    const exp = calculateExpiry(today);
    setFormData(prev => ({ ...prev, expiryDate: exp }));
    
    setValidationError(null);
    setIsModalOpen(true);
    setShowLifecycle(false); // No lifecycle for new items
  };

  const handleEdit = (item: SoftwareItem) => {
    setEditingItem(item);
    setFormData({
      ...item,
      assignedTo: item.assignedTo || []
    });
    setValidationError(null);
    setIsModalOpen(true);
    setShowLifecycle(true);
  };

  const handleDepartmentChange = (deptName: string) => {
    const dept = departments.find(d => d.name === deptName);
    setFormData({
        ...formData,
        department: deptName,
        hod: dept?.hodName || ''
    });
  };

  // Helper to calculate expiry: (Issue Date + 1 Year) - 1 Day
  const calculateExpiry = (issueDateStr: string): string => {
      if (!issueDateStr) return '';
      const date = new Date(issueDateStr);
      // Add 1 Year
      date.setFullYear(date.getFullYear() + 1);
      // Subtract 1 Day
      date.setDate(date.getDate() - 1);
      return date.toISOString().split('T')[0];
  };

  const handleIssuedDateChange = (val: string) => {
      let updates: Partial<SoftwareItem> = { issuedDate: val };
      
      // Auto-calculate expiry if Subscription
      if (formData.type === SoftwareType.SUBSCRIPTION && val) {
          updates.expiryDate = calculateExpiry(val);
      }
      setFormData({ ...formData, ...updates });
  };

  const handleTypeChange = (val: SoftwareType) => {
      let updates: Partial<SoftwareItem> = { type: val };
      
      // Recalculate if switching TO Subscription
      if (val === SoftwareType.SUBSCRIPTION && formData.issuedDate) {
          updates.expiryDate = calculateExpiry(formData.issuedDate);
      } else if (val === SoftwareType.PERPETUAL) {
          updates.expiryDate = '';
      }
      setFormData({ ...formData, ...updates });
  };

  // Helper for thousands separator input
  const handleCostChange = (field: keyof SoftwareItem, value: string) => {
      // Remove existing commas to get raw number
      const rawValue = value.replace(/,/g, '');
      const numValue = parseFloat(rawValue);
      
      if (isNaN(numValue) && rawValue !== '') return; // Invalid input
      
      setFormData({
          ...formData,
          [field]: rawValue === '' ? undefined : numValue
      });
  };

  const formatCostDisplay = (val: number | undefined): string => {
      if (val === undefined || val === null) return '';
      return val.toLocaleString('en-IN');
  };

  const validateDates = (): boolean => {
    const { purchaseDate, invoiceDate, expiryDate } = formData;
    if (!purchaseDate) return true; 
    if (invoiceDate && invoiceDate < purchaseDate) {
        const msg = "Invoice Date cannot be earlier than Purchase Date.";
        setValidationError(msg);
        alert(msg);
        return false;
    }
    if (expiryDate && expiryDate < purchaseDate) {
        const msg = "Expiry Date cannot be earlier than Purchase Date.";
        setValidationError(msg);
        alert(msg);
        return false;
    }
    if (expiryDate && invoiceDate && expiryDate < invoiceDate) {
        const msg = "Expiry Date cannot be earlier than Invoice Date.";
        setValidationError(msg);
        alert(msg);
        return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDates()) return;

    const newItem: SoftwareItem = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      name: formData.name || 'Unknown Software',
      version: formData.version || '1.0',
      licenseKey: formData.licenseKey || '',
      type: formData.type as SoftwareType,
      seatCount: formData.seatCount !== undefined ? Number(formData.seatCount) : 0,
      costPerSeat: formData.costPerSeat !== undefined ? Number(formData.costPerSeat) : 0,
      expiryDate: formData.type === SoftwareType.PERPETUAL ? '' : formData.expiryDate, 
      purchaseDate: formData.purchaseDate,
      invoiceDate: formData.invoiceDate,
      poNumber: formData.poNumber,
      issuedDate: formData.issuedDate,
      supportCoverage: formData.supportCoverage,
      department: formData.department,
      hod: formData.hod,
      assignedTo: formData.assignedTo || [],
      vendorName: formData.vendorName,
      vendorSpoc: formData.vendorSpoc,
      vendorContact: formData.vendorContact,
      amcEnabled: formData.type === SoftwareType.PERPETUAL ? false : formData.amcEnabled,
      amcCost: (formData.type !== SoftwareType.PERPETUAL && formData.amcEnabled) ? (formData.amcCost || 0) : 0,
      cloudEnabled: formData.type === SoftwareType.PERPETUAL ? false : formData.cloudEnabled,
      cloudCost: (formData.type !== SoftwareType.PERPETUAL && formData.cloudEnabled) ? (formData.cloudCost || 0) : 0,
      trainingEnabled: formData.type === SoftwareType.PERPETUAL ? false : formData.trainingEnabled,
      trainingCost: (formData.type !== SoftwareType.PERPETUAL && formData.trainingEnabled) ? (formData.trainingCost || 0) : 0,
    };
    onSave(newItem);
    setIsModalOpen(false);
  };

  const handleAddUser = () => {
    if (!selectedUserToAdd) return;
    if (selectedDateToAdd > today) {
        alert("Assignment date cannot be in the future.");
        return;
    }
    const currentAssignments = formData.assignedTo || [];
    if (!currentAssignments.some(a => a.username === selectedUserToAdd)) {
        const newAssignment: SoftwareAssignment = {
            username: selectedUserToAdd,
            assignedDate: selectedDateToAdd || today
        };
        setFormData({ ...formData, assignedTo: [...currentAssignments, newAssignment] });
    }
    setSelectedUserToAdd('');
  };

  const handleRemoveUser = (userName: string) => {
    const currentAssignments = formData.assignedTo || [];
    setFormData({ ...formData, assignedTo: currentAssignments.filter(u => u.username !== userName) });
  };

  const itemEvents = editingItem 
  ? lifecycle.filter(e => e.assetId === editingItem.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  : [];

  const isPerpetual = formData.type === SoftwareType.PERPETUAL;

  // Real-time calculation logic including optional costs
  const formTotalCost = 
    ((formData.seatCount || 0) * (formData.costPerSeat || 0)) +
    (!isPerpetual && formData.amcEnabled ? (formData.amcCost || 0) : 0) +
    (!isPerpetual && formData.cloudEnabled ? (formData.cloudCost || 0) : 0) +
    (!isPerpetual && formData.trainingEnabled ? (formData.trainingCost || 0) : 0);

  // Pagination Logic
  const allAssignments = formData.assignedTo || [];
  const totalPages = Math.ceil(allAssignments.length / ASSIGNMENT_PAGE_SIZE);
  const currentAssignments = allAssignments.slice((assignmentPage - 1) * ASSIGNMENT_PAGE_SIZE, assignmentPage * ASSIGNMENT_PAGE_SIZE);

  const kanbanGroups = {
      [SoftwareType.SUBSCRIPTION]: items.filter(i => i.type === SoftwareType.SUBSCRIPTION),
      [SoftwareType.PERPETUAL]: items.filter(i => i.type === SoftwareType.PERPETUAL),
      [SoftwareType.OPEN_SOURCE]: items.filter(i => i.type === SoftwareType.OPEN_SOURCE)
  };

  // Filtered users based on selected department for assignment
  const filteredUsersForAssignment = users.filter(u => 
    u.status === 'Active' && 
    (!selectedDeptForAssignment || u.department === selectedDeptForAssignment)
  );

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Software Inventory</h2>
        <div className="flex gap-3">
            <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                    title="List View"
                >
                    <List size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('kanban')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                    title="Kanban Board"
                >
                    <LayoutGrid size={18} />
                </button>
            </div>
            <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm font-medium">
                <Plus size={18} />
                Add License
            </button>
        </div>
      </div>

      {/* View Content Renderer */}
      {viewMode === 'list' ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 font-semibold text-slate-600 text-sm">Software</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Type & Expiry</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm text-center">Seats</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm text-right">Cost</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-slate-900">{item.name}</div>
                                    <div className="text-xs text-slate-500">v{item.version}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${item.type === SoftwareType.SUBSCRIPTION ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                        {item.type}
                                    </span>
                                    {item.expiryDate && (
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <Calendar size={12}/> {item.expiryDate}
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    <div className="text-sm font-bold text-slate-700">{(item.assignedTo?.length || 0)} / {item.seatCount}</div>
                                    <div className="text-[10px] text-slate-400 uppercase font-black">Seats Used</div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="text-sm font-bold text-slate-700">₹{(item.seatCount * item.costPerSeat).toLocaleString('en-IN')}</div>
                                    <div className="text-[10px] text-slate-400">Total License Cost</div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
      ) : (
          <div className="flex overflow-x-auto pb-4 gap-6 animate-in fade-in duration-300">
              {Object.values(SoftwareType).map(type => {
                  const itemsInGroup = kanbanGroups[type] || [];
                  return (
                      <div key={type} className="flex-none w-80 flex flex-col">
                          <div className={`p-3 rounded-t-xl border-t border-x bg-white border-slate-200 font-bold text-slate-700 flex justify-between items-center shadow-sm`}>
                              {type}
                              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{itemsInGroup.length}</span>
                          </div>
                          <div className={`bg-slate-50/50 p-2 rounded-b-xl border-x border-b border-slate-200 min-h-[200px] space-y-2`}>
                              {itemsInGroup.map(item => (
                                  <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-pointer group relative" onClick={() => handleEdit(item)}>
                                      <div className="font-bold text-sm text-slate-800">{item.name}</div>
                                      <div className="text-xs text-slate-500 mb-2">v{item.version}</div>
                                      <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-slate-100">
                                          <span className="text-slate-400">Seats: {item.assignedTo?.length || 0}/{item.seatCount}</span>
                                          {item.expiryDate && <span className="text-blue-600 font-medium">{item.expiryDate}</span>}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
                <h3 className="text-xl font-bold text-slate-900">{editingItem ? 'Edit License' : 'New License'}</h3>
                <div className="flex items-center gap-3">
                    {editingItem && (
                        <button 
                            onClick={() => setShowLifecycle(!showLifecycle)}
                            className="text-sm font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            {showLifecycle ? <Layout size={16} /> : <History size={16} />}
                            {showLifecycle ? 'Hide History' : 'Show History'}
                        </button>
                    )}
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                </div>
             </div>

             <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 h-full min-h-0">
                    <div className={`${showLifecycle && editingItem ? 'lg:col-span-2' : 'lg:col-span-3'} flex flex-col h-full min-h-0 border-r border-slate-100`}>
                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="software-form" onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Software Name</label>
                                        <input required className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Version</label>
                                        <input className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.version || ''} onChange={e => setFormData({...formData, version: e.target.value})} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">License Key</label>
                                        <input className="w-full border p-2.5 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.licenseKey || ''} onChange={e => setFormData({...formData, licenseKey: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                                        <select className="w-full border p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.type} onChange={e => handleTypeChange(e.target.value as SoftwareType)}>
                                            <option value={SoftwareType.SUBSCRIPTION}>Subscription</option>
                                            <option value={SoftwareType.PERPETUAL}>Perpetual</option>
                                            <option value={SoftwareType.OPEN_SOURCE}>Open Source</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Seat Count</label>
                                        <input type="number" className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.seatCount || 0} onChange={e => setFormData({...formData, seatCount: parseInt(e.target.value)})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Cost Per Seat</label>
                                        <input type="text" className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formatCostDisplay(formData.costPerSeat)} onChange={e => handleCostChange('costPerSeat', e.target.value)} />
                                    </div>
                                    {formData.type !== SoftwareType.PERPETUAL && (
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Expiry Date</label>
                                            <input type="date" className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" value={formData.expiryDate || ''} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wider text-slate-400"><Users size={18}/> License Assignments</h4>
                                    
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">1. Select Department</label>
                                                <select 
                                                    className="w-full border p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium"
                                                    value={selectedDeptForAssignment}
                                                    onChange={e => {
                                                        setSelectedDeptForAssignment(e.target.value);
                                                        setSelectedUserToAdd(''); // Reset user when dept changes
                                                    }}
                                                >
                                                    <option value="">All Departments</option>
                                                    {departments.map(d => (
                                                        <option key={d.id} value={d.name}>{d.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase">2. Select User to Assign</label>
                                                <select 
                                                    className="w-full border p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-medium disabled:bg-slate-100 disabled:cursor-not-allowed"
                                                    value={selectedUserToAdd}
                                                    onChange={e => setSelectedUserToAdd(e.target.value)}
                                                >
                                                    <option value="">Choose Employee...</option>
                                                    {filteredUsersForAssignment.map(u => (
                                                        <option key={u.id} value={u.name}>{u.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2">
                                            <div className="flex gap-4">
                                                <div className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded border">
                                                    DEPARTMENTS: {departments.length}
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded border">
                                                    USERS FOUND: {filteredUsersForAssignment.length}
                                                </div>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={handleAddUser} 
                                                disabled={!selectedUserToAdd}
                                                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                                            >
                                                Assign
                                            </button>
                                        </div>
                                    </div>

                                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-50">
                                                <tr className="text-[10px] font-black uppercase text-slate-400 border-b">
                                                    <th className="px-6 py-3 text-left">Employee</th>
                                                    <th className="px-6 py-3 text-left">Assigned On</th>
                                                    <th className="px-6 py-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {currentAssignments.map(a => (
                                                    <tr key={a.username} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-slate-700">{a.username}</td>
                                                        <td className="px-6 py-4 text-slate-500 text-xs">{a.assignedDate}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button type="button" onClick={() => handleRemoveUser(a.username)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16}/></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {allAssignments.length === 0 && (
                                                    <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">No users currently assigned to this license.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                        {totalPages > 1 && (
                                            <div className="p-3 bg-slate-50 border-t flex items-center justify-between text-xs">
                                                <span className="text-slate-500">Page {assignmentPage} of {totalPages}</span>
                                                <div className="flex gap-1">
                                                    <button onClick={() => setAssignmentPage(p => Math.max(1, p-1))} className="p-1 border rounded bg-white"><ChevronLeft size={14}/></button>
                                                    <button onClick={() => setAssignmentPage(p => Math.min(totalPages, p+1))} className="p-1 border rounded bg-white"><ChevronRight size={14}/></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
                            <div className="text-sm font-bold text-blue-600">Total Value: ₹{formTotalCost.toLocaleString('en-IN')}</div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" form="software-form" className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100">Save License</button>
                            </div>
                        </div>
                    </div>
                    {editingItem && showLifecycle && (
                        <div className="bg-slate-50 border-l border-slate-200 flex flex-col h-full min-h-0 lg:col-span-1 animate-in slide-in-from-right-4 duration-300">
                             <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <History size={18} className="text-blue-600"/>
                                    License Lifecycle
                                </h4>
                            </div>
                            <div className="overflow-y-auto flex-1 p-4 min-h-0">
                                <LifecycleView events={itemEvents} compact={true} />
                            </div>
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

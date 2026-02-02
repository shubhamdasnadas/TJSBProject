
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
    if (isModalOpen) setAssignmentPage(1);
  }, [isModalOpen, editingItem]);

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({ 
      type: SoftwareType.SUBSCRIPTION, 
      seatCount: 1, 
      assignedTo: [], 
      purchaseDate: today,
      issuedDate: today
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
          // Also disable additional costs logically if needed, but we handle UI disable
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
    
    // Only logical date checks, no mandatory field existence checks

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

    if (!validateDates()) {
        return;
    }

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
    
    // Future Date Check for Assignment
    if (selectedDateToAdd > today) {
        alert("Assignment date cannot be in the future.");
        return;
    }

    const currentAssignments = formData.assignedTo || [];
    
    // Check if user already assigned
    if (!currentAssignments.some(a => a.username === selectedUserToAdd)) {
        const newAssignment: SoftwareAssignment = {
            username: selectedUserToAdd,
            assignedDate: selectedDateToAdd || today
        };
        setFormData({
            ...formData,
            assignedTo: [...currentAssignments, newAssignment]
        });
    }
    setSelectedUserToAdd('');
  };

  const handleRemoveUser = (userName: string) => {
    const currentAssignments = formData.assignedTo || [];
    setFormData({
      ...formData,
      assignedTo: currentAssignments.filter(u => u.username !== userName)
    });
  };

  const itemEvents = editingItem 
  ? lifecycle.filter(e => e.assetId === editingItem.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  : [];

  const formTotalCost = (formData.seatCount || 0) * (formData.costPerSeat || 0);

  // Pagination Logic
  const allAssignments = formData.assignedTo || [];
  const totalPages = Math.ceil(allAssignments.length / ASSIGNMENT_PAGE_SIZE);
  const currentAssignments = allAssignments.slice(
      (assignmentPage - 1) * ASSIGNMENT_PAGE_SIZE, 
      assignmentPage * ASSIGNMENT_PAGE_SIZE
  );

  const isPerpetual = formData.type === SoftwareType.PERPETUAL;

  // Grouping for Kanban
  const kanbanGroups = {
      [SoftwareType.SUBSCRIPTION]: items.filter(i => i.type === SoftwareType.SUBSCRIPTION),
      [SoftwareType.PERPETUAL]: items.filter(i => i.type === SoftwareType.PERPETUAL),
      [SoftwareType.OPEN_SOURCE]: items.filter(i => i.type === SoftwareType.OPEN_SOURCE),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Software Licenses</h2>
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
            <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
            <Plus size={18} /> Add Software
            </button>
        </div>
      </div>

      {viewMode === 'list' ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 font-semibold text-slate-600 text-sm">Software</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">License Type</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Seats (Used / Total)</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Cost & Expiry</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Vendor</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map(item => {
                            const usedSeats = item.assignedTo?.length || 0;
                            const totalCost = (item.seatCount || 0) * (item.costPerSeat || 0);
                            return (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900">{item.name}</div>
                                        <div className="text-xs text-slate-500">v{item.version}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wider border ${
                                            item.type === SoftwareType.SUBSCRIPTION ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                            item.type === SoftwareType.PERPETUAL ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${usedSeats > item.seatCount ? 'bg-red-500' : 'bg-blue-500'}`} 
                                                    style={{ width: `${Math.min((usedSeats / item.seatCount) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-mono text-slate-600">{usedSeats} / {item.seatCount}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm">
                                        <div className="font-medium text-slate-800">₹{totalCost.toLocaleString('en-IN')}</div>
                                        {item.type !== SoftwareType.PERPETUAL && (
                                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                <Calendar size={10}/> Exp: {item.expiryDate || 'N/A'}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        {item.vendorName || '-'}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash2 size={16} />
                                            </button>
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
          <div className="flex overflow-x-auto pb-4 gap-6 animate-in fade-in duration-300">
              {Object.values(SoftwareType).map(type => {
                  const itemsInType = kanbanGroups[type] || [];
                  const colorClass = type === SoftwareType.SUBSCRIPTION ? 'border-blue-200 bg-blue-50' : 
                                     type === SoftwareType.PERPETUAL ? 'border-emerald-200 bg-emerald-50' :
                                     'border-slate-200 bg-slate-50';
                  
                  return (
                      <div key={type} className="flex-none w-80 flex flex-col">
                          <div className={`p-3 rounded-t-xl border-t border-x ${colorClass} font-bold text-slate-700 flex justify-between items-center`}>
                              {type}
                              <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full">{itemsInType.length}</span>
                          </div>
                          <div className={`bg-slate-50/50 p-2 rounded-b-xl border-x border-b border-slate-200 min-h-[200px] space-y-2`}>
                              {itemsInType.map(item => (
                                  <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-pointer group" onClick={() => handleEdit(item)}>
                                      <div className="flex justify-between items-start mb-1">
                                          <div className="font-bold text-sm text-slate-800 line-clamp-1">{item.name}</div>
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Edit2 size={12} className="text-slate-400"/>
                                          </div>
                                      </div>
                                      <div className="text-xs text-slate-500 mb-2">v{item.version}</div>
                                      <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2 mt-2">
                                          <div className="flex items-center gap-1 text-slate-600">
                                              <Users size={12}/> {item.assignedTo?.length || 0}/{item.seatCount}
                                          </div>
                                          {item.type !== SoftwareType.PERPETUAL && (
                                              <div className="text-slate-400 text-[10px]">{item.expiryDate}</div>
                                          )}
                                      </div>
                                  </div>
                              ))}
                              {itemsInType.length === 0 && (
                                  <div className="text-center py-4 text-slate-400 text-xs italic">No licenses</div>
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
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
                
                {/* LEFT COLUMN: FORM */}
                <div className={`${showLifecycle && editingItem ? 'lg:col-span-2' : 'lg:col-span-3'} flex flex-col h-full min-h-0 transition-all duration-300 border-r border-slate-100`}>
                    
                    {/* Scrollable Form Content */}
                    <div className="flex-1 overflow-y-auto p-6 min-h-0">
                        <form id="software-form" onSubmit={handleSubmit} className="space-y-6">
                            
                            {validationError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 text-sm">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>{validationError}</span>
                                </div>
                            )}

                            {/* BASIC INFO */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">Software Name</label>
                                    <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">Version</label>
                                    <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.version || ''} onChange={e => setFormData({...formData, version: e.target.value})} />
                                </div>
                            </div>

                            {/* LICENSE DETAILS */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">License Type</label>
                                <select className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.type} onChange={e => handleTypeChange(e.target.value as SoftwareType)}>
                                {Object.values(SoftwareType).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Seat Count / Users</label>
                                <input type="number" min="1" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.seatCount ?? ''} onChange={e => setFormData({...formData, seatCount: e.target.value ? parseInt(e.target.value) : undefined})} />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Cost per Seat (INR)</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-slate-300 rounded-lg p-2.5" 
                                    value={formatCostDisplay(formData.costPerSeat)} 
                                    onChange={e => handleCostChange('costPerSeat', e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            </div>

                            {/* TOTAL COST & EXPIRY (Calculated) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase">Total License Cost</label>
                                    <div className="text-xl font-bold text-slate-800 flex items-center gap-1">
                                        <IndianRupee size={18}/> {formTotalCost.toLocaleString('en-IN')}
                                    </div>
                                </div>
                                {formData.type === SoftwareType.SUBSCRIPTION && (
                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-blue-600 uppercase">Auto-Calculated Expiry</label>
                                        <input 
                                            type="date" 
                                            readOnly 
                                            className="w-full border border-blue-200 bg-blue-50 text-blue-900 rounded-lg p-2 font-medium"
                                            value={formData.expiryDate || ''}
                                        />
                                        <p className="text-[10px] text-blue-500">Expiry = (Issue Date + 1 Year) - 1 Day</p>
                                    </div>
                                )}
                            </div>

                            {/* ADDITIONAL COSTS */}
                            <div className={`space-y-4 pt-2 border-t border-slate-100 ${isPerpetual ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex justify-between">
                                    Additional Costs
                                    {isPerpetual && <span className="text-xs font-normal text-slate-500 normal-case">(Not applicable for Perpetual)</span>}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Checkboxes for AMC, Cloud, Training */}
                                    <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" disabled={isPerpetual} className="w-4 h-4 text-blue-600 rounded" checked={!isPerpetual && (formData.amcEnabled || false)} onChange={e => setFormData({...formData, amcEnabled: e.target.checked})}/>
                                            <span className="font-medium text-slate-700 text-sm">AMC</span>
                                        </label>
                                        {formData.amcEnabled && !isPerpetual && (
                                            <input 
                                                type="text" 
                                                placeholder="Cost" 
                                                className="w-full border p-2 text-sm rounded" 
                                                value={formatCostDisplay(formData.amcCost)} 
                                                onChange={e => handleCostChange('amcCost', e.target.value)}
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" disabled={isPerpetual} className="w-4 h-4 text-blue-600 rounded" checked={!isPerpetual && (formData.cloudEnabled || false)} onChange={e => setFormData({...formData, cloudEnabled: e.target.checked})}/>
                                            <span className="font-medium text-slate-700 text-sm">Cloud</span>
                                        </label>
                                        {formData.cloudEnabled && !isPerpetual && (
                                            <input 
                                                type="text" 
                                                placeholder="Cost" 
                                                className="w-full border p-2 text-sm rounded" 
                                                value={formatCostDisplay(formData.cloudCost)} 
                                                onChange={e => handleCostChange('cloudCost', e.target.value)}
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" disabled={isPerpetual} className="w-4 h-4 text-blue-600 rounded" checked={!isPerpetual && (formData.trainingEnabled || false)} onChange={e => setFormData({...formData, trainingEnabled: e.target.checked})}/>
                                            <span className="font-medium text-slate-700 text-sm">Training</span>
                                        </label>
                                        {formData.trainingEnabled && !isPerpetual && (
                                            <input 
                                                type="text" 
                                                placeholder="Cost" 
                                                className="w-full border p-2 text-sm rounded" 
                                                value={formatCostDisplay(formData.trainingCost)} 
                                                onChange={e => handleCostChange('trainingCost', e.target.value)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* VENDOR & DATES */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">Vendor Name</label>
                                    <input type="text" className="w-full border p-2.5 rounded-lg" value={formData.vendorName || ''} onChange={e => setFormData({...formData, vendorName: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">Vendor SPOC</label>
                                    <input type="text" className="w-full border p-2.5 rounded-lg" value={formData.vendorSpoc || ''} onChange={e => setFormData({...formData, vendorSpoc: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">SPOC Contact/Email</label>
                                    <input type="text" className="w-full border p-2.5 rounded-lg" value={formData.vendorContact || ''} onChange={e => setFormData({...formData, vendorContact: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">Purchase Date</label>
                                    <input type="date" max={today} className="w-full border p-2.5 rounded-lg" value={formData.purchaseDate || ''} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">Invoice Date</label>
                                    <input type="date" max={today} className="w-full border p-2.5 rounded-lg" value={formData.invoiceDate || ''} onChange={e => setFormData({...formData, invoiceDate: e.target.value})} />
                                </div>
                                {/* Expiry Date (Hidden for Subscription as it's auto-calculated, Visible for Perpetual if needed manually) */}
                                {formData.type === SoftwareType.PERPETUAL && (
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">Expiry (Optional)</label>
                                        <input type="date" className="w-full border p-2.5 rounded-lg" value={formData.expiryDate || ''} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Issued Dates for License */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">Issued Date (License)</label>
                                    <input 
                                        type="date" 
                                        max={today}
                                        className="w-full border p-2.5 rounded-lg" 
                                        value={formData.issuedDate || ''} 
                                        onChange={e => handleIssuedDateChange(e.target.value)} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">PO Number</label>
                                    <input 
                                        type="text" 
                                        className="w-full border p-2.5 rounded-lg" 
                                        value={formData.poNumber || ''} 
                                        onChange={e => setFormData({...formData, poNumber: e.target.value})} 
                                        placeholder="PO-2023-001"
                                    />
                                </div>
                            </div>

                            {/* ASSIGNMENT WITH DATES & PAGINATION */}
                            <div className="space-y-4 pt-2 border-t border-slate-100">
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">User Assignment</h4>
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="flex gap-2 mb-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">User</label>
                                            <select 
                                                className="w-full border p-2 rounded-lg"
                                                value={selectedUserToAdd}
                                                onChange={e => setSelectedUserToAdd(e.target.value)}
                                            >
                                                <option value="">Select User</option>
                                                {users.filter(u => u.status === 'Active').map(u => (
                                                    <option key={u.id} value={u.name}>{u.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Assigned Date</label>
                                            <input 
                                                type="date" 
                                                max={today}
                                                className="border p-2 rounded-lg w-40"
                                                value={selectedDateToAdd}
                                                onChange={e => setSelectedDateToAdd(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button type="button" onClick={handleAddUser} disabled={!selectedUserToAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">Add</button>
                                        </div>
                                    </div>

                                    <div className={`space-y-2 ${currentAssignments.length > 10 ? 'max-h-60 overflow-y-auto pr-2 custom-scrollbar' : ''}`}>
                                        {currentAssignments.length > 0 ? (
                                            currentAssignments.map((assign, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                                                            {assign.username.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-sm text-slate-700">{assign.username}</div>
                                                            <div className="text-xs text-slate-500">Since: {assign.assignedDate}</div>
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveUser(assign.username)} className="text-slate-400 hover:text-red-600">
                                                        <X size={16}/>
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-400 italic text-center">No users assigned yet.</p>
                                        )}
                                    </div>
                                    
                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200 text-sm">
                                            <button 
                                                type="button"
                                                disabled={assignmentPage === 1}
                                                onClick={() => setAssignmentPage(p => p - 1)}
                                                className="flex items-center gap-1 text-slate-600 hover:text-blue-600 disabled:text-slate-300"
                                            >
                                                <ChevronLeft size={16} /> Prev
                                            </button>
                                            <span className="text-slate-500 font-medium">
                                                Page {assignmentPage} of {totalPages}
                                            </span>
                                            <button 
                                                type="button"
                                                disabled={assignmentPage === totalPages}
                                                onClick={() => setAssignmentPage(p => p + 1)}
                                                className="flex items-center gap-1 text-slate-600 hover:text-blue-600 disabled:text-slate-300"
                                            >
                                                Next <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Fixed Footer Buttons */}
                    <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-3 z-10">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" form="software-form" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Save License</button>
                    </div>
                </div>

                {/* RIGHT COLUMN: LIFECYCLE */}
                {editingItem && showLifecycle && (
                    <div className="bg-slate-50 border-l border-slate-200 flex flex-col h-full min-h-0 overflow-hidden lg:col-span-1 animate-in slide-in-from-right-4 duration-300">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                <History size={18} className="text-blue-600"/>
                                License Lifecycle
                            </h4>
                        </div>
                        <div className="overflow-y-auto pr-2 flex-1 p-4 min-h-0">
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

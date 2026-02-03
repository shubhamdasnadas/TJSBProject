import React, { useState } from 'react';
import { HardwareItem, ItemStatus, UserItem, LifecycleEvent, DepartmentItem, CategoryItem, LocationItem } from '../types';
import { Plus, Search, Trash2, Edit2, Wand2, MapPin, User, History, AlertCircle, Wrench, Building2, Calendar, Layout, Tv, Eye, Keyboard, Cable, LayoutGrid, List, QrCode as QrIcon } from 'lucide-react';
import { categorizeHardware } from '../services/gemini';
import { LifecycleView } from './LifecycleView';
import { Qrcode } from './Qrcode';

interface HardwareViewProps {
  items: HardwareItem[];
  users: UserItem[];
  departments: DepartmentItem[];
  locations: LocationItem[];
  lifecycle: LifecycleEvent[];
  customCategories: CategoryItem[];
  onSave: (item: HardwareItem) => void;
  onDelete: (id: string) => void;
}

export const HardwareView: React.FC<HardwareViewProps> = ({ 
    items, users, departments, locations, lifecycle, customCategories,
    onSave, onDelete 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<HardwareItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Form State
  const [formData, setFormData] = useState<Partial<HardwareItem>>({});
  
  // Lifecycle Visibility
  const [showLifecycle, setShowLifecycle] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  // CATEGORY LOGIC
  const defaultCategories = [
      "Laptop", "Desktop (CPU)", "Monitor", "Mobile", "Tablet", "Server", "Server Rack", "Printer", 
      "Scanner", "Keyboard", "Mouse", "External HDD", "TV", "Camera", "AC", "CCTV"
  ];
  const allCategories = Array.from(new Set([...defaultCategories, ...customCategories.map(c => c.name)]));

  // STATUS MAPPING (UI Label -> DB Value)
  const statusOptions = [
      { label: 'In Use', value: ItemStatus.ACTIVE },
      { label: 'In Stock', value: ItemStatus.IN_STORAGE },
      { label: 'Under Maintenance', value: ItemStatus.MAINTENANCE },
      { label: 'Retired', value: ItemStatus.RETIRED }
  ];

  const getStatusLabel = (val: ItemStatus) => {
      const found = statusOptions.find(o => o.value === val);
      return found ? found.label : val;
  };

  const handleEdit = (item: HardwareItem) => {
    setEditingItem(item);
    setFormData(item);
    setValidationError(null);
    setIsModalOpen(true);
    setShowLifecycle(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({
      status: ItemStatus.ACTIVE,
      purchaseDate: today,
      serialNumber: ''
    });
    setValidationError(null);
    setIsModalOpen(true);
    setShowLifecycle(false); // Default hide for new items
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({});
    setValidationError(null);
  };

  const handleUserChange = (userName: string) => {
    const user = users.find(u => u.name === userName);
    const newPrevOwner = formData.previousOwner === userName ? '' : formData.previousOwner;

    if (user) {
        setFormData({
            ...formData,
            assignedTo: userName,
            previousOwner: newPrevOwner,
            department: user.department,
            hod: user.hod,
            issuedDate: today
        });
    } else {
        setFormData({ ...formData, assignedTo: userName, previousOwner: newPrevOwner });
    }
  };

  const handleStatusChange = (newStatus: ItemStatus) => {
      const updates: Partial<HardwareItem> = { status: newStatus };
      if (newStatus === ItemStatus.ACTIVE) {
          updates.returnedDate = '';
      }
      setFormData({ ...formData, ...updates });
  };

  const handleDepartmentChange = (deptName: string) => {
    const dept = departments.find(d => d.name === deptName);
    setFormData({
        ...formData,
        department: deptName,
        hod: dept?.hodName || ''
    });
  };

  const handleCostChange = (value: string) => {
      const rawValue = value.replace(/,/g, '');
      const numValue = parseFloat(rawValue);
      if (isNaN(numValue) && rawValue !== '') return;
      setFormData({ ...formData, purchaseCost: rawValue === '' ? undefined : numValue });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: HardwareItem = {
      ...formData,
      id: editingItem ? editingItem.id : Date.now().toString(),
      name: formData.name || 'Untitled',
      serialNumber: formData.serialNumber || '',
      status: formData.status as ItemStatus,
      purchaseCost: Number(formData.purchaseCost) || 0,
    } as HardwareItem;
    onSave(newItem);
    handleClose();
  };

  const handleAIAutoFill = async () => {
    if (!formData.name) return;
    setIsAnalyzing(true);
    const result = await categorizeHardware(formData.name, formData.notes || '');
    if (result.manufacturer) {
      setFormData(prev => ({
        ...prev,
        manufacturer: result.manufacturer,
        category: result.category,
        model: prev.model || result.model_guess
      }));
    }
    setIsAnalyzing(false);
  };

  const activeItems = items.filter(item => item.status !== ItemStatus.RETIRED);

  const filteredItems = activeItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.assetTag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const itemEvents = editingItem 
    ? lifecycle.filter(e => e.assetId === editingItem.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  const kanbanGroups = {
      [ItemStatus.ACTIVE]: filteredItems.filter(i => i.status === ItemStatus.ACTIVE),
      [ItemStatus.IN_STORAGE]: filteredItems.filter(i => i.status === ItemStatus.IN_STORAGE),
      [ItemStatus.MAINTENANCE]: filteredItems.filter(i => i.status === ItemStatus.MAINTENANCE),
      [ItemStatus.RETIRED]: filteredItems.filter(i => i.status === ItemStatus.RETIRED),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Hardware Inventory</h2>
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
            Add Device
            </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search by name, tag, serial, or user..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {viewMode === 'list' ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 font-semibold text-slate-600 text-sm">Asset / Name</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm">Identifiers</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm">QR Label</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm">Assignment</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm text-right">Cost</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                        <div className="font-bold text-slate-900 leading-tight mb-0.5">{item.name}</div>
                        <div className="text-[11px] text-slate-500 font-medium">{item.manufacturer} {item.model}</div>
                        <div className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded border border-slate-200 mt-1.5 tracking-tighter">
                        {item.category}
                        </div>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">
                        {item.assetTag && <div className="font-mono text-[10px] bg-blue-50 text-blue-700 px-1 rounded w-fit mb-1 border border-blue-100">TAG: {item.assetTag}</div>}
                        <div className="font-mono text-[11px] text-slate-400">SN: {item.serialNumber}</div>
                    </td>
                    <td className="p-4">
                        <Qrcode value={item.serialNumber} label={item.name} subLabel={item.assignedTo} />
                    </td>
                    <td className="p-4 text-sm">
                        <div className="flex items-center gap-1.5 text-slate-900 font-medium">
                            <User size={14} className="text-slate-400"/> {item.assignedTo || 'Unassigned'}
                        </div>
                        {item.department && <div className="text-xs text-slate-500 ml-5">{item.department}</div>}
                        {item.location && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                                <MapPin size={12}/> {item.location}
                            </div>
                        )}
                    </td>
                    <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest
                        ${item.status === ItemStatus.ACTIVE ? 'bg-green-100 text-green-800 border border-green-200' : 
                            item.status === ItemStatus.MAINTENANCE ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                            'bg-yellow-100 text-yellow-800 border border-yellow-200'}`}>
                        {getStatusLabel(item.status)}
                        </span>
                    </td>
                    <td className="p-4 text-right text-sm font-bold text-slate-700">
                        {item.purchaseCost ? `₹${item.purchaseCost.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
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
              {[ItemStatus.ACTIVE, ItemStatus.IN_STORAGE, ItemStatus.MAINTENANCE].map(status => {
                  const itemsInStatus = kanbanGroups[status] || [];
                  const colorClass = status === ItemStatus.ACTIVE ? 'border-green-200 bg-green-50' : 
                                     status === ItemStatus.IN_STORAGE ? 'border-yellow-200 bg-yellow-50' :
                                     'border-orange-200 bg-orange-50';
                  
                  return (
                      <div key={status} className="flex-none w-80 flex flex-col">
                          <div className={`p-3 rounded-t-xl border-t border-x ${colorClass} font-bold text-slate-700 flex justify-between items-center`}>
                              {status}
                              <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full">{itemsInStatus.length}</span>
                          </div>
                          <div className={`bg-slate-50/50 p-2 rounded-b-xl border-x border-b border-slate-200 min-h-[200px] space-y-2`}>
                              {itemsInStatus.map(item => (
                                  <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-pointer group relative" onClick={() => handleEdit(item)}>
                                      <div className="flex justify-between items-start mb-1">
                                          <div className="font-bold text-sm text-slate-800 line-clamp-1">{item.name}</div>
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Edit2 size={12} className="text-slate-400"/>
                                          </div>
                                      </div>
                                      <div className="text-xs text-slate-500 mb-2">{item.manufacturer} {item.model}</div>
                                      <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2 mt-2">
                                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.category}</span>
                                          <span className="text-slate-400 font-mono">{item.assignedTo || 'Unassigned'}</span>
                                      </div>
                                  </div>
                              ))}
                              {itemsInStatus.length === 0 && (
                                  <div className="text-center py-4 text-slate-400 text-xs italic">No items</div>
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">{editingItem ? 'Edit Asset' : 'New Asset'}</h3>
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
                  <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="grid grid-cols-1 lg:grid-cols-4 h-full min-h-0">
                    
                    {/* LEFT COLUMN: FORM (3/4 Width) */}
                    <div className={`${showLifecycle && editingItem ? 'lg:col-span-2' : 'lg:col-span-3'} flex flex-col h-full min-h-0 transition-all duration-300 border-r border-slate-100`}>
                        
                        {/* Scrollable Form Content */}
                        <div className="flex-1 overflow-y-auto p-6 min-h-0">
                            <form id="hardware-form" onSubmit={handleSubmit} className="space-y-8">
                                {validationError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 text-sm">
                                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                        <span>{validationError}</span>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">General Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                        <label className="block text-sm font-medium text-slate-700">Device Name / Hostname</label>
                                        <div className="flex gap-2">
                                            <input 
                                            type="text" 
                                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                                            value={formData.name || ''}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            placeholder="e.g. MacBook Pro 16"
                                            />
                                            <button 
                                            type="button"
                                            onClick={handleAIAutoFill}
                                            disabled={!formData.name || isAnalyzing}
                                            className="bg-purple-100 hover:bg-purple-200 text-purple-700 p-2.5 rounded-lg transition-colors tooltip disabled:opacity-50"
                                            >
                                            {isAnalyzing ? <div className="animate-spin w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full"/> : <Wand2 size={20} />}
                                            </button>
                                        </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Category</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={formData.category || ''}
                                                onChange={e => setFormData({...formData, category: e.target.value})}
                                                list="categories"
                                            />
                                            <datalist id="categories">
                                                {allCategories.map(c => (
                                                    <option key={c} value={c} />
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Manufacturer</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={formData.manufacturer || ''}
                                                onChange={e => setFormData({...formData, manufacturer: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Model</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={formData.model || ''}
                                                onChange={e => setFormData({...formData, model: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Status</label>
                                            <select 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                                value={formData.status}
                                                onChange={e => handleStatusChange(e.target.value as ItemStatus)}
                                            >
                                                {statusOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Serial Number</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                                                value={formData.serialNumber || ''}
                                                onChange={e => setFormData({...formData, serialNumber: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Asset Tag</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={formData.assetTag || ''}
                                                onChange={e => setFormData({...formData, assetTag: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    {/* LIVE QR PREVIEW SECTION */}
                                    <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                                        <div className="flex-1 space-y-4">
                                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Location & Assignment</h4>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="space-y-2">
                                                    <label className="block text-sm font-medium text-slate-700">Current Owner (User)</label>
                                                    <select
                                                        className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-bold"
                                                        value={formData.assignedTo || ''}
                                                        onChange={e => handleUserChange(e.target.value)}
                                                    >
                                                        <option value="">-- Unassigned --</option>
                                                        {users.filter(u => u.status === 'Active' || u.name === formData.assignedTo).map(u => (
                                                            <option key={u.id} value={u.name}>
                                                                {u.name} {u.status === 'Inactive' ? '(Inactive)' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="shrink-0">
                                            <Qrcode 
                                              variant="preview" 
                                              value={formData.serialNumber || 'PENDING'} 
                                              label={formData.name || 'Untitled'} 
                                              subLabel={formData.assignedTo} 
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* Rest of form fields can follow... */}
                            </form>
                        </div>
                        
                        {/* Fixed Footer Buttons */}
                        <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-3 z-10">
                            <button type="button" onClick={handleClose} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-bold">Cancel</button>
                            <button type="submit" form="hardware-form" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-100">Save Asset</button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: LIFECYCLE (Optional 1/4 or 2/4 based on toggle) */}
                    {editingItem && showLifecycle && (
                        <div className="bg-slate-50 border-l border-slate-200 flex flex-col h-full min-h-0 overflow-hidden lg:col-span-2 animate-in slide-in-from-right-4 duration-300">
                            <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2 uppercase text-xs tracking-widest">
                                    <History size={18} className="text-blue-600"/>
                                    Asset History
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
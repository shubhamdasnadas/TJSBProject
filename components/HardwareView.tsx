
import React, { useState } from 'react';
import { HardwareItem, ItemStatus, UserItem, LifecycleEvent, DepartmentItem, CategoryItem, LocationItem } from '../types';
import { Plus, Search, Trash2, Edit2, Wand2, MapPin, User, History, AlertCircle, Wrench, Building2, Calendar, Layout, Tv, Eye, Keyboard, Cable, LayoutGrid, List } from 'lucide-react';
import { categorizeHardware } from '../services/gemini';
import { LifecycleView } from './LifecycleView';

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
      purchaseDate: today
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
            // Default issued date to today when assigning (optional)
            issuedDate: today
        });
    } else {
        setFormData({ ...formData, assignedTo: userName, previousOwner: newPrevOwner });
    }
  };

  const handleStatusChange = (newStatus: ItemStatus) => {
      const updates: Partial<HardwareItem> = { status: newStatus };
      
      // If status is "In Use", Returned Date must be blank/read-only
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

  // Helper: Fitness Expiry Calculation
  const calculateFitnessExpiry = (purchaseDate: string, years: number): string => {
      if (!purchaseDate || !years) return '';
      const date = new Date(purchaseDate);
      date.setFullYear(date.getFullYear() + years);
      date.setDate(date.getDate() - 1); // Subtract 1 day
      return date.toISOString().split('T')[0];
  };

  const handlePurchaseDateChange = (val: string) => {
      let updates: Partial<HardwareItem> = { purchaseDate: val };
      if (val && formData.fitnessYears) {
          updates.fitnessExpiry = calculateFitnessExpiry(val, formData.fitnessYears);
      }
      setFormData({ ...formData, ...updates });
  };

  const handleFitnessChange = (val: number | undefined) => {
      let updates: Partial<HardwareItem> = { fitnessYears: val };
      if (val && formData.purchaseDate) {
          updates.fitnessExpiry = calculateFitnessExpiry(formData.purchaseDate, val);
      } else {
          updates.fitnessExpiry = '';
      }
      setFormData({ ...formData, ...updates });
  };

  // Cost Input Handler
  const handleCostChange = (value: string) => {
      const rawValue = value.replace(/,/g, '');
      const numValue = parseFloat(rawValue);
      if (isNaN(numValue) && rawValue !== '') return;
      setFormData({ ...formData, purchaseCost: rawValue === '' ? undefined : numValue });
  };

  const validateForm = (): boolean => {
    const { purchaseDate, invoiceDate, warrantyExpiry, issuedDate, returnedDate, maintenanceType, maintenanceStartDate, maintenanceEndDate } = formData;
    
    // Logic Checks only (No Mandatory Fields)
    
    // Maintenance Dates Logic
    if (maintenanceType && maintenanceStartDate && maintenanceEndDate) {
        if (maintenanceStartDate > maintenanceEndDate) {
            const msg = "Likely Completion Date cannot be before Start Date.";
            setValidationError(msg);
            alert(msg);
            return false;
        }
    }

    if (!purchaseDate) return true; 

    if (invoiceDate && invoiceDate < purchaseDate) {
        const msg = "Invoice Date cannot be earlier than Purchase Date.";
        setValidationError(msg);
        alert(msg);
        return false;
    }

    if (warrantyExpiry && warrantyExpiry < purchaseDate) {
        const msg = "Warranty Expiry cannot be earlier than Purchase Date.";
        setValidationError(msg);
        alert(msg);
        return false;
    }

    if (warrantyExpiry && invoiceDate && warrantyExpiry < invoiceDate) {
        const msg = "Warranty Expiry cannot be earlier than Invoice Date.";
        setValidationError(msg);
        alert(msg);
        return false;
    }

    // Issue/Return Logic
    if (issuedDate && returnedDate && returnedDate < issuedDate) {
        const msg = "Returned Date cannot be earlier than Issued Date.";
        setValidationError(msg);
        alert(msg);
        return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
        return;
    }

    // Clean up maintenance fields if not in maintenance mode
    const isMaintenance = formData.status === ItemStatus.MAINTENANCE;
    const cleanMaintenanceType = isMaintenance ? formData.maintenanceType : undefined;
    const cleanMaintStart = isMaintenance && cleanMaintenanceType ? formData.maintenanceStartDate : undefined;
    const cleanMaintEnd = isMaintenance && cleanMaintenanceType ? formData.maintenanceEndDate : undefined;

    // Clean up retirement date if not retired
    const isRetired = formData.status === ItemStatus.RETIRED;
    const cleanRetirementDate = isRetired ? formData.retirementDate : undefined;

    const newItem: HardwareItem = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      name: formData.name || 'Untitled',
      serialNumber: formData.serialNumber || '',
      assetTag: formData.assetTag,
      manufacturer: formData.manufacturer || '',
      model: formData.model || '',
      category: formData.category || 'Uncategorized',
      
      // Assignment
      status: formData.status as ItemStatus,
      assignedTo: formData.assignedTo,
      previousOwner: formData.previousOwner,
      department: formData.department,
      hod: formData.hod,
      location: formData.location,

      // Dates
      purchaseDate: formData.purchaseDate || '',
      invoiceDate: formData.invoiceDate || '',
      poNumber: formData.poNumber || '',
      purchaseCost: Number(formData.purchaseCost) || 0,
      warrantyExpiry: formData.warrantyExpiry || '',
      issuedDate: formData.issuedDate || '',
      returnedDate: formData.returnedDate || '',
      retirementDate: cleanRetirementDate || '',
      
      supportCoverage: formData.supportCoverage,
      fitnessYears: formData.fitnessYears !== undefined ? Number(formData.fitnessYears) : 0,
      fitnessExpiry: formData.fitnessExpiry,
      
      // Vendor
      vendorName: formData.vendorName,
      vendorSpoc: formData.vendorSpoc,
      vendorContact: formData.vendorContact,

      // Maintenance
      maintenanceType: cleanMaintenanceType,
      maintenanceStartDate: cleanMaintStart,
      maintenanceEndDate: cleanMaintEnd,

      // Specs
      ramConfig: formData.ramConfig,
      diskType: formData.diskType,
      storageCapacity: formData.storageCapacity,
      processor: formData.processor,
      
      // Peripheral
      connectionType: formData.connectionType,

      // TV Specific
      resolution: formData.resolution,
      smartOs: formData.smartOs,
      screenDimension: formData.screenDimension,
      mountType: formData.mountType,
      inputType: formData.inputType,
      powerSource: formData.powerSource,

      // CCTV Specific
      cctvType: formData.cctvType,
      dvrModel: formData.dvrModel,
      fieldView: formData.fieldView,
      ipAddress: formData.ipAddress,
      maintenanceFrequency: formData.maintenanceFrequency,

      notes: formData.notes
    };
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

  // Filter out retired items from the main view
  const activeItems = items.filter(item => item.status !== ItemStatus.RETIRED);

  const filteredItems = activeItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.assetTag?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.assignedTo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const shouldShowSpecs = (category: string | undefined) => {
      if (!category) return false;
      const c = category.toLowerCase();
      return c.includes('laptop') || c.includes('cpu') || c.includes('desktop') || c.includes('mobile') || c.includes('workstation') || c.includes('tablet');
  };

  const isPeripheral = (category: string | undefined) => {
      if (!category) return false;
      const c = category.toLowerCase();
      return c.includes('mouse') || c.includes('keyboard');
  }

  const isTvCategory = (category: string | undefined) => {
      return category?.toLowerCase() === 'tv';
  }

  const isCctvCategory = (category: string | undefined) => {
      return category?.toLowerCase() === 'cctv';
  }

  const itemEvents = editingItem 
    ? lifecycle.filter(e => e.assetId === editingItem.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  // Grouping for Kanban
  const kanbanGroups = {
      [ItemStatus.ACTIVE]: filteredItems.filter(i => i.status === ItemStatus.ACTIVE),
      [ItemStatus.IN_STORAGE]: filteredItems.filter(i => i.status === ItemStatus.IN_STORAGE),
      [ItemStatus.MAINTENANCE]: filteredItems.filter(i => i.status === ItemStatus.MAINTENANCE),
      [ItemStatus.RETIRED]: filteredItems.filter(i => i.status === ItemStatus.RETIRED), // Though usually filtered out
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
            <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
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

      {/* VIEW RENDERER */}
      {viewMode === 'list' ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 font-semibold text-slate-600 text-sm">Asset / Name</th>
                    <th className="p-4 font-semibold text-slate-600 text-sm">Identifiers</th>
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
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.manufacturer} {item.model}</div>
                        <div className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md border border-slate-200 mt-1">
                        {item.category}
                        </div>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">
                        {item.assetTag && <div className="font-mono text-xs bg-blue-50 text-blue-700 px-1 rounded w-fit mb-1">Tag: {item.assetTag}</div>}
                        <div className="font-mono text-xs">SN: {item.serialNumber}</div>
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${item.status === ItemStatus.ACTIVE ? 'bg-green-100 text-green-800' : 
                            item.status === ItemStatus.MAINTENANCE ? 'bg-orange-100 text-orange-800' :
                            item.status === ItemStatus.RETIRED ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'}`}>
                        {getStatusLabel(item.status)}
                        </span>
                    </td>
                    <td className="p-4 text-right text-sm font-medium text-slate-700">
                        {item.purchaseCost ? `₹${item.purchaseCost.toLocaleString('en-IN')}` : '-'}
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
                <div className="grid grid-cols-1 lg:grid-cols-3 h-full min-h-0">
                    
                    {/* LEFT COLUMN: FORM */}
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
                                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                                </div>

                                {shouldShowSpecs(formData.category) && (
                                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <h4 className="text-sm font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
                                            <Wand2 size={16}/> Technical Specifications
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Processor (CPU)</label>
                                                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.processor || ''} onChange={e => setFormData({...formData, processor: e.target.value})} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">RAM Config</label>
                                                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.ramConfig || ''} onChange={e => setFormData({...formData, ramConfig: e.target.value})} placeholder="e.g. 16GB DDR4" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Disk Type</label>
                                                <select className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.diskType || ''} onChange={e => setFormData({...formData, diskType: e.target.value})}>
                                                    <option value="">Select Type</option>
                                                    <option value="SSD">SSD</option>
                                                    <option value="HDD">HDD</option>
                                                    <option value="NVMe">NVMe SSD</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Storage Capacity</label>
                                                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.storageCapacity || ''} onChange={e => setFormData({...formData, storageCapacity: e.target.value})} placeholder="e.g. 512GB" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Mouse / Keyboard Details */}
                                {isPeripheral(formData.category) && (
                                    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                                            {formData.category?.toLowerCase().includes('keyboard') ? <Keyboard size={16}/> : <Cable size={16}/>} Peripheral Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Connection Type</label>
                                                <select 
                                                    className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
                                                    value={formData.connectionType || ''}
                                                    onChange={e => setFormData({...formData, connectionType: e.target.value as 'Wired' | 'Wireless'})}
                                                >
                                                    <option value="">Select Type</option>
                                                    <option value="Wired">Wired (USB)</option>
                                                    <option value="Wireless">Wireless (Bluetooth/2.4GHz)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TV Specific Fields */}
                                {isTvCategory(formData.category) && (
                                    <div className="space-y-4 bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                                        <h4 className="text-sm font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
                                            <Tv size={16}/> Television Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Resolution</label>
                                                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="e.g. 4K, 1080p" value={formData.resolution || ''} onChange={e => setFormData({...formData, resolution: e.target.value})} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">OS (Smart TV)</label>
                                                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="e.g. Android TV, Tizen" value={formData.smartOs || ''} onChange={e => setFormData({...formData, smartOs: e.target.value})} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Dimensions</label>
                                                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="e.g. 55 Inch" value={formData.screenDimension || ''} onChange={e => setFormData({...formData, screenDimension: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Mount Type</label>
                                                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="e.g. Wall, Stand" value={formData.mountType || ''} onChange={e => setFormData({...formData, mountType: e.target.value})} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Input Type</label>
                                                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="e.g. HDMI, VGA" value={formData.inputType || ''} onChange={e => setFormData({...formData, inputType: e.target.value})} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Storage Capacity</label>
                                                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="e.g. 8GB" value={formData.storageCapacity || ''} onChange={e => setFormData({...formData, storageCapacity: e.target.value})} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Power Source</label>
                                                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="e.g. AC 220V" value={formData.powerSource || ''} onChange={e => setFormData({...formData, powerSource: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CCTV Specific Fields */}
                                {isCctvCategory(formData.category) && (
                                    <div className="space-y-4 bg-teal-50 p-4 rounded-xl border border-teal-200 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <h4 className="text-sm font-bold text-teal-700 uppercase tracking-wider flex items-center gap-2">
                                            <Eye size={16}/> CCTV Surveillance
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Category Type</label>
                                                <select 
                                                    className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
                                                    value={formData.cctvType || ''}
                                                    onChange={e => setFormData({...formData, cctvType: e.target.value as 'DVR' | 'NVR'})}
                                                >
                                                    <option value="">Select Type</option>
                                                    <option value="DVR">DVR</option>
                                                    <option value="NVR">NVR</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">DVR/NVR Model</label>
                                                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="e.g. Hikvision 8CH" value={formData.dvrModel || ''} onChange={e => setFormData({...formData, dvrModel: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Field of View</label>
                                                <select 
                                                    className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
                                                    value={formData.fieldView || ''}
                                                    onChange={e => setFormData({...formData, fieldView: e.target.value})}
                                                >
                                                    <option value="">Select Angle</option>
                                                    <option value="90°">90°</option>
                                                    <option value="180°">180°</option>
                                                    <option value="360°">360°</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">IP Address</label>
                                                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5 font-mono" placeholder="192.168.x.x" value={formData.ipAddress || ''} onChange={e => setFormData({...formData, ipAddress: e.target.value})} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Maintenance Required</label>
                                                <select 
                                                    className="w-full border border-slate-300 rounded-lg p-2.5 bg-white"
                                                    value={formData.maintenanceFrequency || ''}
                                                    onChange={e => setFormData({...formData, maintenanceFrequency: e.target.value as 'Weekly' | 'Monthly' | 'Quarterly'})}
                                                >
                                                    <option value="">Select Frequency</option>
                                                    <option value="Weekly">Weekly</option>
                                                    <option value="Monthly">Monthly</option>
                                                    <option value="Quarterly">Quarterly</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Retirement Section - Conditional */}
                                {formData.status === ItemStatus.RETIRED && (
                                    <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <h4 className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
                                            <Trash2 size={16}/> Retirement Details
                                        </h4>
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Retirement Date</label>
                                                <input 
                                                    type="date" 
                                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                                    value={formData.retirementDate || ''}
                                                    onChange={e => setFormData({...formData, retirementDate: e.target.value})}
                                                />
                                                <p className="text-xs text-red-700 mt-1">Note: Saving as "Retired" will move this asset to the Scrap Inventory module.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Maintenance Section - Conditional */}
                                {formData.status === ItemStatus.MAINTENANCE && (
                                    <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <h4 className="text-sm font-bold text-orange-600 uppercase tracking-wider flex items-center gap-2">
                                            <Wrench size={16}/> Maintenance Details
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-orange-50 p-4 rounded-xl border border-orange-200">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Maintenance Type</label>
                                                <select 
                                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                                    value={formData.maintenanceType || ''}
                                                    onChange={e => setFormData({...formData, maintenanceType: e.target.value as 'Internal' | 'External' | undefined})}
                                                >
                                                    <option value="">Select Type</option>
                                                    <option value="Internal">Internal</option>
                                                    <option value="External">External</option>
                                                </select>
                                            </div>
                                            {/* Show dates for both Internal and External */}
                                            {formData.maintenanceType && (
                                                <>
                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-medium text-slate-700">Start Date</label>
                                                        <input 
                                                            type="date" 
                                                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                            value={formData.maintenanceStartDate || ''}
                                                            onChange={e => setFormData({...formData, maintenanceStartDate: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-sm font-medium text-slate-700">Likely Completion Date</label>
                                                        <input 
                                                            type="date" 
                                                            min={formData.maintenanceStartDate}
                                                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                            value={formData.maintenanceEndDate || ''}
                                                            onChange={e => setFormData({...formData, maintenanceEndDate: e.target.value})}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Location & Assignment</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Current Owner (User)</label>
                                            <select
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
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
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Previous Owner</label>
                                            <select
                                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                                    value={formData.previousOwner || ''}
                                                    onChange={e => setFormData({...formData, previousOwner: e.target.value})}
                                                >
                                                    <option value="">-- None --</option>
                                                    {users.filter(u => 
                                                        (u.status === 'Active' || u.name === formData.previousOwner) && 
                                                        u.name !== formData.assignedTo
                                                    ).map(u => (
                                                        <option key={u.id} value={u.name}>{u.name}</option>
                                                    ))}
                                                </select>
                                        </div>
                                    </div>
                                    {/* Issue and Return Dates */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">
                                                Issued Date
                                            </label>
                                            <input 
                                                type="date" 
                                                max={today}
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={formData.issuedDate || ''}
                                                onChange={e => setFormData({...formData, issuedDate: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">
                                                Returned Date
                                            </label>
                                            <input 
                                                type="date" 
                                                min={formData.issuedDate}
                                                disabled={formData.status === ItemStatus.ACTIVE}
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-200 disabled:text-slate-400"
                                                value={formData.returnedDate || ''}
                                                onChange={e => setFormData({...formData, returnedDate: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Department</label>
                                            <select 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                                value={formData.department || ''}
                                                onChange={e => handleDepartmentChange(e.target.value)}
                                            >
                                                <option value="">Select Department</option>
                                                {departments.map(d => (
                                                    <option key={d.id} value={d.name}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">HOD (Auto)</label>
                                            <input 
                                                type="text" 
                                                readOnly
                                                className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-slate-500 focus:outline-none"
                                                value={formData.hod || ''}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Location</label>
                                            <select
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                                value={formData.location || ''}
                                                onChange={e => setFormData({...formData, location: e.target.value})}
                                            >
                                                <option value="">Select Location</option>
                                                {locations.filter(l => l.status === 'Unlocked' || l.name === formData.location).map(l => (
                                                    <option key={l.id} value={l.name}>{l.name} ({l.code})</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Financial & Warranty</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Purchase Date</label>
                                            <input 
                                                type="date" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={formData.purchaseDate || ''}
                                                onChange={e => handlePurchaseDateChange(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Invoice Date</label>
                                            <input 
                                                type="date" 
                                                min={formData.purchaseDate}
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                                                value={formData.invoiceDate || ''}
                                                disabled={!formData.purchaseDate}
                                                onChange={e => setFormData({...formData, invoiceDate: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Warranty Expiry</label>
                                            <input 
                                                type="date" 
                                                min={formData.invoiceDate || formData.purchaseDate}
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
                                                value={formData.warrantyExpiry || ''}
                                                disabled={!formData.purchaseDate}
                                                onChange={e => setFormData({...formData, warrantyExpiry: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Support Coverage</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={formData.supportCoverage || ''}
                                                onChange={e => setFormData({...formData, supportCoverage: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">PO Number</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={formData.poNumber || ''}
                                                onChange={e => setFormData({...formData, poNumber: e.target.value})}
                                                placeholder="PO-2023-001"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Purchase Cost (INR)</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={formData.purchaseCost ? formData.purchaseCost.toLocaleString('en-IN') : ''}
                                                onChange={e => handleCostChange(e.target.value)}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Fitness (Years)</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={formData.fitnessYears ?? ''}
                                                onChange={e => handleFitnessChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
                                                placeholder="e.g. 5"
                                            />
                                        </div>
                                         <div className="space-y-2">
                                            <label className="block text-sm font-bold text-slate-500">Fitness Expiry (Auto)</label>
                                            <input 
                                                type="date" 
                                                readOnly
                                                className="w-full border border-slate-200 bg-slate-100 rounded-lg p-2.5 text-slate-600 focus:outline-none"
                                                value={formData.fitnessExpiry || ''}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* VENDOR DETAILS */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Vendor Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Vendor Name</label>
                                            <div className="relative">
                                                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                                <input 
                                                    type="text" 
                                                    className="w-full border border-slate-300 rounded-lg pl-9 pr-2.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    value={formData.vendorName || ''}
                                                    onChange={e => setFormData({...formData, vendorName: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Vendor SPOC</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={formData.vendorSpoc || ''}
                                                onChange={e => setFormData({...formData, vendorSpoc: e.target.value})}
                                                placeholder="Sales Person Name"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">SPOC Contact/Email</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                value={formData.vendorContact || ''}
                                                onChange={e => setFormData({...formData, vendorContact: e.target.value})}
                                                placeholder="Phone or Email"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">Notes</label>
                                    <textarea 
                                    className="w-full border border-slate-300 rounded-lg p-2.5 h-24 resize-none"
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({...formData, notes: e.target.value})}
                                    ></textarea>
                                </div>
                            </form>
                        </div>
                        
                        {/* Fixed Footer Buttons */}
                        <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-3 z-10">
                            <button type="button" onClick={handleClose} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                            <button type="submit" form="hardware-form" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Save Asset</button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: LIFECYCLE */}
                    {editingItem && showLifecycle && (
                        <div className="bg-slate-50 border-l border-slate-200 flex flex-col h-full min-h-0 overflow-hidden lg:col-span-1 animate-in slide-in-from-right-4 duration-300">
                            <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <History size={18} className="text-blue-600"/>
                                    Asset Lifecycle
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


import React, { useState } from 'react';
import { NetworkItem, ItemStatus, LifecycleEvent, LocationItem } from '../types';
import { Plus, Search, Trash2, Edit2, History, AlertCircle, Wifi, Layout, Building2, Wrench, Trash, LayoutGrid, List, MapPin } from 'lucide-react';
import { LifecycleView } from './LifecycleView';

interface NetworkViewProps {
  items: NetworkItem[];
  locations: LocationItem[];
  lifecycle: LifecycleEvent[];
  onSave: (item: NetworkItem) => void;
  onDelete: (id: string) => void;
}

export const NetworkView: React.FC<NetworkViewProps> = ({ items, locations, lifecycle, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NetworkItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLifecycle, setShowLifecycle] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const [formData, setFormData] = useState<Partial<NetworkItem>>({});
  const today = new Date().toISOString().split('T')[0];

  // Status mapping to match HardwareView
  const statusOptions = [
      { label: 'In Use', value: ItemStatus.ACTIVE },
      { label: 'In Stock', value: ItemStatus.IN_STORAGE },
      { label: 'Under Maintenance', value: ItemStatus.MAINTENANCE },
      { label: 'Retired', value: ItemStatus.RETIRED }
  ];

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({ status: ItemStatus.ACTIVE, type: 'Firewall', purchaseDate: today });
    setIsModalOpen(true);
    setShowLifecycle(false);
    setValidationError(null);
  };

  const handleEdit = (item: NetworkItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
    setShowLifecycle(true);
    setValidationError(null);
  };

  const handleCostChange = (value: string) => {
      const rawValue = value.replace(/,/g, '');
      const numValue = parseFloat(rawValue);
      if (isNaN(numValue) && rawValue !== '') return;
      setFormData({ ...formData, purchaseCost: rawValue === '' ? undefined : numValue });
  };

  const validateForm = (): boolean => {
      const { status, retirementDate, maintenanceType, maintenanceStartDate, maintenanceEndDate, purchaseDate, invoiceDate, warrantyExpiry } = formData;
      
      // Retirement Validation
      if (status === ItemStatus.RETIRED && !retirementDate) {
          const msg = "Retirement Date is required when status is Retired.";
          setValidationError(msg);
          alert(msg);
          return false;
      }
      
      // Maintenance Dates Validation
      if (status === ItemStatus.MAINTENANCE && maintenanceType) {
          if (!maintenanceStartDate || !maintenanceEndDate) {
              const msg = "Start Date and Likely Completion Date are required for Maintenance.";
              setValidationError(msg);
              alert(msg);
              return false;
          }
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

      setValidationError(null);
      return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Clean up conditional fields
    const isMaintenance = formData.status === ItemStatus.MAINTENANCE;
    const isRetired = formData.status === ItemStatus.RETIRED;

    const newItem: NetworkItem = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      name: formData.name || 'Unknown Device',
      type: formData.type || 'Other',
      ipAddress: formData.ipAddress || '',
      macAddress: formData.macAddress || '',
      manufacturer: formData.manufacturer || '',
      model: formData.model || '',
      firmwareVersion: formData.firmwareVersion || '',
      assetTag: formData.assetTag || '',
      serialNumber: formData.serialNumber || '',
      ram: formData.ram || '',
      cpu: formData.cpu || '',
      status: formData.status as ItemStatus,
      location: formData.location || '',
      notes: formData.notes || '',
      
      purchaseDate: formData.purchaseDate || '',
      invoiceDate: formData.invoiceDate || '',
      poNumber: formData.poNumber || '',
      purchaseCost: Number(formData.purchaseCost) || 0,
      warrantyExpiry: formData.warrantyExpiry || '',
      supportCoverage: formData.supportCoverage,
      retirementDate: isRetired ? formData.retirementDate : undefined,

      vendorName: formData.vendorName,
      vendorSpoc: formData.vendorSpoc,
      vendorContact: formData.vendorContact,

      maintenanceType: isMaintenance ? formData.maintenanceType : undefined,
      maintenanceStartDate: isMaintenance ? formData.maintenanceStartDate : undefined,
      maintenanceEndDate: isMaintenance ? formData.maintenanceEndDate : undefined,
    };
    onSave(newItem);
    setIsModalOpen(false);
  };

  // Filter out Retired Items from the main view
  const activeItems = items.filter(item => item.status !== ItemStatus.RETIRED);

  const filteredItems = activeItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.ipAddress.includes(searchTerm) ||
    item.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.assetTag?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const itemEvents = editingItem 
  ? lifecycle.filter(e => e.assetId === editingItem.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  : [];

  // Grouping for Kanban
  const kanbanGroups = {
      [ItemStatus.ACTIVE]: filteredItems.filter(i => i.status === ItemStatus.ACTIVE),
      [ItemStatus.IN_STORAGE]: filteredItems.filter(i => i.status === ItemStatus.IN_STORAGE),
      [ItemStatus.MAINTENANCE]: filteredItems.filter(i => i.status === ItemStatus.MAINTENANCE),
      [ItemStatus.RETIRED]: filteredItems.filter(i => i.status === ItemStatus.RETIRED),
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Network Inventory</h2>
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
                <Plus size={18} /> Add Device
            </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search by IP, MAC, Name or Tag..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        <th className="p-4 font-semibold text-slate-600 text-sm">Device</th>
                        <th className="p-4 font-semibold text-slate-600 text-sm">Network Details</th>
                        <th className="p-4 font-semibold text-slate-600 text-sm">Specs & FW</th>
                        <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                        <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-4">
                                <div className="font-bold text-slate-900">{item.name}</div>
                                <div className="text-xs text-slate-500">{item.manufacturer} {item.model}</div>
                                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 mt-1 inline-block">
                                    {item.type}
                                </span>
                            </td>
                            <td className="p-4 text-sm font-mono text-slate-600">
                                <div>IP: {item.ipAddress}</div>
                                <div className="text-xs text-slate-500">MAC: {item.macAddress}</div>
                            </td>
                            <td className="p-4 text-sm">
                                <div className="text-slate-800">v{item.firmwareVersion}</div>
                                <div className="text-xs text-slate-500">
                                    {item.ram && `RAM: ${item.ram} `}
                                    {item.cpu && `• CPU: ${item.cpu}`}
                                </div>
                            </td>
                            <td className="p-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                    ${item.status === ItemStatus.ACTIVE ? 'bg-green-100 text-green-800' : 
                                    item.status === ItemStatus.MAINTENANCE ? 'bg-orange-100 text-orange-800' :
                                    item.status === ItemStatus.RETIRED ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'}`}>
                                    {statusOptions.find(o => o.value === item.status)?.label || item.status}
                                </span>
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
                                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.type}</span>
                                          <span className="text-slate-400 font-mono">{item.ipAddress}</span>
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
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">{editingItem ? 'Edit Network Device' : 'New Network Device'}</h3>
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
                         
                         <div className="flex-1 overflow-y-auto p-6 min-h-0">
                             <form id="network-form" onSubmit={handleSubmit} className="space-y-6">
                                 {validationError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2 text-sm">
                                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                        <span>{validationError}</span>
                                    </div>
                                )}
                                 
                                 <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Device Info</h4>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                         <label className="block text-sm font-medium text-slate-700">Hostname / Name</label>
                                         <input required type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                                     </div>
                                     <div className="space-y-2">
                                         <label className="block text-sm font-medium text-slate-700">Type</label>
                                         <select className="w-full border border-slate-300 rounded-lg p-2.5 bg-white" value={formData.type || 'Other'} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                             <option value="Firewall">Firewall</option>
                                             <option value="Switch">Switch</option>
                                             <option value="Access Point">Access Point</option>
                                             <option value="Router">Router</option>
                                             <option value="Modem">Modem</option>
                                             <option value="Other">Other</option>
                                         </select>
                                     </div>
                                 </div>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                         <label className="block text-sm font-medium text-slate-700">IP Address</label>
                                         <input required type="text" className="w-full border border-slate-300 rounded-lg p-2.5 font-mono" value={formData.ipAddress || ''} onChange={e => setFormData({...formData, ipAddress: e.target.value})} placeholder="192.168.1.1" />
                                     </div>
                                     <div className="space-y-2">
                                         <label className="block text-sm font-medium text-slate-700">MAC Address</label>
                                         <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5 font-mono" value={formData.macAddress || ''} onChange={e => setFormData({...formData, macAddress: e.target.value})} placeholder="00:1A:2B:3C:4D:5E" />
                                     </div>
                                 </div>

                                 <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 pt-4">Hardware Details</h4>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                     <div className="space-y-2">
                                         <label className="block text-sm font-medium text-slate-700">Manufacturer</label>
                                         <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.manufacturer || ''} onChange={e => setFormData({...formData, manufacturer: e.target.value})} />
                                     </div>
                                     <div className="space-y-2">
                                         <label className="block text-sm font-medium text-slate-700">Model</label>
                                         <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})} />
                                     </div>
                                     <div className="space-y-2">
                                         <label className="block text-sm font-medium text-slate-700">Firmware Version</label>
                                         <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.firmwareVersion || ''} onChange={e => setFormData({...formData, firmwareVersion: e.target.value})} />
                                     </div>
                                 </div>
                                 
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                         <label className="block text-sm font-medium text-slate-700">CPU</label>
                                         <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.cpu || ''} onChange={e => setFormData({...formData, cpu: e.target.value})} />
                                     </div>
                                     <div className="space-y-2">
                                         <label className="block text-sm font-medium text-slate-700">RAM</label>
                                         <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.ram || ''} onChange={e => setFormData({...formData, ram: e.target.value})} />
                                     </div>
                                 </div>

                                 {/* TRACKING & STATUS */}
                                 <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 pt-4">Tracking</h4>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="space-y-2">
                                         <label className="block text-sm font-medium text-slate-700">Asset Tag</label>
                                         <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.assetTag || ''} onChange={e => setFormData({...formData, assetTag: e.target.value})} />
                                     </div>
                                      <div className="space-y-2">
                                         <label className="block text-sm font-medium text-slate-700">Serial Number</label>
                                         <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={formData.serialNumber || ''} onChange={e => setFormData({...formData, serialNumber: e.target.value})} />
                                     </div>
                                     <div className="space-y-2">
                                         <label className="block text-sm font-medium text-slate-700">Status</label>
                                         <select className="w-full border border-slate-300 rounded-lg p-2.5 bg-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as ItemStatus})}>
                                             {statusOptions.map(opt => (
                                                 <option key={opt.value} value={opt.value}>{opt.label}</option>
                                             ))}
                                         </select>
                                     </div>
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

                                  {/* Retirement Section - Conditional */}
                                {formData.status === ItemStatus.RETIRED && (
                                    <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <h4 className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
                                            <Trash size={16}/> Retirement Details
                                        </h4>
                                        <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-slate-700">Retirement Date <span className="text-red-600">*</span></label>
                                                <input 
                                                    type="date" 
                                                    required
                                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500 focus:outline-none"
                                                    value={formData.retirementDate || ''}
                                                    onChange={e => setFormData({...formData, retirementDate: e.target.value})}
                                                />
                                                <p className="text-xs text-red-700 mt-1">Note: This will move this asset to the Scrap Inventory module.</p>
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

                                {/* Financials */}
                                <div className="space-y-4 pt-2 border-t border-slate-100">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Financial & Warranty</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Purchase Date</label>
                                            <input 
                                                type="date" 
                                                max={today}
                                                className="w-full border border-slate-300 rounded-lg p-2.5" 
                                                value={formData.purchaseDate || ''} 
                                                onChange={e => setFormData({...formData, purchaseDate: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Invoice Date</label>
                                            <input 
                                                type="date" 
                                                max={today}
                                                min={formData.purchaseDate}
                                                className="w-full border border-slate-300 rounded-lg p-2.5 disabled:bg-slate-100" 
                                                value={formData.invoiceDate || ''} 
                                                disabled={!formData.purchaseDate}
                                                onChange={e => setFormData({...formData, invoiceDate: e.target.value})}
                                            />
                                        </div>
                                         <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Warranty Expiry</label>
                                            <input 
                                                type="date" 
                                                min={formData.purchaseDate}
                                                className="w-full border border-slate-300 rounded-lg p-2.5 disabled:bg-slate-100" 
                                                value={formData.warrantyExpiry || ''} 
                                                disabled={!formData.purchaseDate}
                                                onChange={e => setFormData({...formData, warrantyExpiry: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Support Coverage</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5"
                                                value={formData.supportCoverage || ''}
                                                onChange={e => setFormData({...formData, supportCoverage: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">PO Number</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5" 
                                                value={formData.poNumber || ''} 
                                                onChange={e => setFormData({...formData, poNumber: e.target.value})}
                                                placeholder="PO-2023-001"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Purchase Cost (INR)</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5" 
                                                value={formData.purchaseCost ? formData.purchaseCost.toLocaleString('en-IN') : ''}
                                                onChange={e => handleCostChange(e.target.value)}
                                                placeholder="0"
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
                                                    className="w-full border border-slate-300 rounded-lg pl-9 pr-2.5 py-2.5"
                                                    value={formData.vendorName || ''}
                                                    onChange={e => setFormData({...formData, vendorName: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">Vendor SPOC</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5"
                                                value={formData.vendorSpoc || ''}
                                                onChange={e => setFormData({...formData, vendorSpoc: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">SPOC Contact/Email</label>
                                            <input 
                                                type="text" 
                                                className="w-full border border-slate-300 rounded-lg p-2.5"
                                                value={formData.vendorContact || ''}
                                                onChange={e => setFormData({...formData, vendorContact: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                                 
                                 <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">Notes</label>
                                    <textarea className="w-full border border-slate-300 rounded-lg p-2.5 h-20" value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
                                </div>
                             </form>
                         </div>

                         {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-3 z-10">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                            <button type="submit" form="network-form" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Save Device</button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: LIFECYCLE */}
                    {editingItem && showLifecycle && (
                        <div className="bg-slate-50 border-l border-slate-200 flex flex-col h-full min-h-0 overflow-hidden lg:col-span-1 animate-in slide-in-from-right-4 duration-300">
                            <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                    <History size={18} className="text-blue-600"/>
                                    Device History
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

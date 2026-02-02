import React, { useState, useEffect } from 'react';
import { HardwareItem, SoftwareItem, NetworkItem, ItemStatus } from '../types';
import { Archive, Monitor, Disc, Search, MapPin, Building, ChevronDown, ChevronRight, Layers, Wifi } from 'lucide-react';

interface SpareViewProps {
  hardware: HardwareItem[];
  software: SoftwareItem[];
  network: NetworkItem[];
}

export const SpareView: React.FC<SpareViewProps> = ({ hardware, software, network }) => {
  const [activeTab, setActiveTab] = useState<'hardware' | 'software' | 'network'>('hardware');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedNetworkTypes, setExpandedNetworkTypes] = useState<string[]>([]);

  // 1. FILTER: Only show items 'In Stock' (IN_STORAGE)
  const spareHardware = hardware.filter(h => h.status === ItemStatus.IN_STORAGE);
  const spareNetwork = network.filter(n => n.status === ItemStatus.IN_STORAGE);
  
  // 2. FILTER SOFTWARE
  const spareSoftware = software
    .map(s => {
      const used = s.assignedTo?.length || 0;
      const available = (s.seatCount || 0) - used;
      return { ...s, available, used };
    })
    .filter(s => s.available > 0);

  // 3. APPLY SEARCH FILTER
  const filteredHardware = spareHardware.filter(h => 
    h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    h.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNetwork = spareNetwork.filter(n => 
    n.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.ipAddress.includes(searchTerm)
  );

  const filteredSoftware = spareSoftware.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 4. GROUPING
  const groupedHardware = filteredHardware.reduce((acc, item) => {
      const cat = item.category || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
  }, {} as Record<string, HardwareItem[]>);

  const groupedNetwork = filteredNetwork.reduce((acc, item) => {
      const type = item.type || 'Other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
  }, {} as Record<string, NetworkItem[]>);

  useEffect(() => {
      if (searchTerm) {
          setExpandedCategories(Object.keys(groupedHardware));
          setExpandedNetworkTypes(Object.keys(groupedNetwork));
      }
  }, [searchTerm, hardware, network]);

  const toggleCategory = (category: string) => {
      setExpandedCategories(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  const toggleNetworkType = (type: string) => {
      setExpandedNetworkTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const totalSpareValue = 
    spareHardware.reduce((acc, h) => acc + (h.purchaseCost || 0), 0) +
    spareNetwork.reduce((acc, n) => acc + (n.purchaseCost || 0), 0) +
    spareSoftware.reduce((acc, s) => acc + (s.available * (s.costPerSeat || 0)), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Archive className="text-blue-600" /> Spare Inventory
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Overview of unassigned assets, network devices, and available license seats.
          </p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-100 font-medium text-sm flex items-center gap-2">
           <span className="text-xs uppercase font-bold text-emerald-500">Free Value</span>
           ₹{totalSpareValue.toLocaleString('en-IN')}
        </div>
      </div>

      <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex">
        <button onClick={() => setActiveTab('hardware')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'hardware' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Monitor size={16} /> Hardware <span className="bg-white/20 px-1.5 rounded text-xs">{spareHardware.length}</span>
        </button>
        <button onClick={() => setActiveTab('network')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'network' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Wifi size={16} /> Network <span className="bg-white/20 px-1.5 rounded text-xs">{spareNetwork.length}</span>
        </button>
        <button onClick={() => setActiveTab('software')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${activeTab === 'software' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
          <Disc size={16} /> Licenses <span className="bg-white/20 px-1.5 rounded text-xs">{spareSoftware.reduce((acc, s) => acc + s.available, 0)}</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search inventory..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* HARDWARE VIEW */}
      {activeTab === 'hardware' && (
        <div className="space-y-4">
          {Object.keys(groupedHardware).length === 0 ? (
             <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                <Archive size={48} className="mx-auto mb-3 opacity-20" />
                <p>No hardware currently in stock.</p>
             </div>
          ) : (
            Object.entries(groupedHardware).sort().map(([category, items]: [string, HardwareItem[]]) => {
                const isExpanded = expandedCategories.includes(category);
                const categoryValue = items.reduce((sum, item) => sum + (item.purchaseCost || 0), 0);
                return (
                    <div key={category} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <button onClick={() => toggleCategory(category)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                {isExpanded ? <ChevronDown size={20} className="text-blue-600"/> : <ChevronRight size={20} className="text-slate-400"/>}
                                <div className="flex items-center gap-2">
                                    <Layers size={18} className="text-slate-500"/>
                                    <span className="font-bold text-slate-800 text-lg">{category}</span>
                                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">{items.length}</span>
                                </div>
                            </div>
                            <div className="text-sm font-medium text-slate-500">Value: ₹{categoryValue.toLocaleString('en-IN')}</div>
                        </button>
                        {isExpanded && (
                            <div className="p-4 bg-slate-50/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {items.map(item => (
                                        <div key={item.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-slate-300 group-hover:bg-blue-400 transition-colors"></div>
                                            <div className="mb-2 pl-2">
                                                <h3 className="font-bold text-slate-900 truncate" title={item.name}>{item.name}</h3>
                                                <div className="text-xs text-slate-500 truncate">{item.manufacturer} {item.model}</div>
                                            </div>
                                            <div className="space-y-1.5 pl-2 mt-3 text-xs">
                                                <div className="flex items-center gap-2 text-slate-600"><Building size={12} className="text-slate-400" /><span className="truncate">{item.department || 'No Dept'}</span></div>
                                                <div className="flex items-center gap-2 text-slate-600"><MapPin size={12} className="text-slate-400" /><span className="truncate">{item.location || 'Unknown Loc'}</span></div>
                                                <div className="flex items-center gap-2 text-slate-600 font-mono bg-slate-50 px-1.5 py-0.5 rounded border w-fit">SN: {item.serialNumber}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })
          )}
        </div>
      )}

      {/* NETWORK VIEW */}
      {activeTab === 'network' && (
        <div className="space-y-4">
          {Object.keys(groupedNetwork).length === 0 ? (
             <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                <Wifi size={48} className="mx-auto mb-3 opacity-20" />
                <p>No network devices currently in stock.</p>
             </div>
          ) : (
            Object.entries(groupedNetwork).sort().map(([type, items]: [string, NetworkItem[]]) => {
                const isExpanded = expandedNetworkTypes.includes(type);
                const typeValue = items.reduce((sum, item) => sum + (item.purchaseCost || 0), 0);
                return (
                    <div key={type} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <button onClick={() => toggleNetworkType(type)} className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                {isExpanded ? <ChevronDown size={20} className="text-blue-600"/> : <ChevronRight size={20} className="text-slate-400"/>}
                                <div className="flex items-center gap-2">
                                    <Wifi size={18} className="text-slate-500"/>
                                    <span className="font-bold text-slate-800 text-lg">{type}</span>
                                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">{items.length}</span>
                                </div>
                            </div>
                            <div className="text-sm font-medium text-slate-500">Value: ₹{typeValue.toLocaleString('en-IN')}</div>
                        </button>
                        {isExpanded && (
                            <div className="p-4 bg-slate-50/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {items.map(item => (
                                        <div key={item.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-purple-300 group-hover:bg-purple-500 transition-colors"></div>
                                            <div className="mb-2 pl-2">
                                                <h3 className="font-bold text-slate-900 truncate" title={item.name}>{item.name}</h3>
                                                <div className="text-xs text-slate-500 truncate">{item.manufacturer} {item.model}</div>
                                            </div>
                                            <div className="space-y-1.5 pl-2 mt-3 text-xs">
                                                <div className="flex items-center gap-2 text-slate-600 font-mono">IP: {item.ipAddress}</div>
                                                <div className="flex items-center gap-2 text-slate-600 font-mono text-[10px]">MAC: {item.macAddress}</div>
                                                <div className="flex items-center gap-2 text-slate-600 font-mono bg-slate-50 px-1.5 py-0.5 rounded border w-fit">Tag: {item.assetTag || 'N/A'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })
          )}
        </div>
      )}

      {/* SOFTWARE VIEW */}
      {activeTab === 'software' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {filteredSoftware.length === 0 ? (
             <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                <Disc size={48} className="mx-auto mb-3 opacity-20" />
                <p>No spare license seats available.</p>
             </div>
          ) : (
            filteredSoftware.map(item => (
              <div key={item.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400"></div>
                 <div className="flex justify-between items-start mb-3 pl-2">
                   <div>
                      <h3 className="font-bold text-slate-900">{item.name}</h3>
                      <div className="text-xs text-slate-500">v{item.version} • {item.type}</div>
                   </div>
                   <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-600">{item.available}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Free Seats</div>
                   </div>
                </div>
                <div className="pl-2 mt-2">
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(item.used / (item.seatCount || 1)) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mb-4">
                        <span>{item.used} Used</span>
                        <span>{item.seatCount} Total</span>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                         <span className="text-xs text-slate-400">Unused Value</span>
                         <span className="font-bold text-slate-800">₹{(item.available * (item.costPerSeat || 0)).toLocaleString('en-IN')}</span>
                    </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
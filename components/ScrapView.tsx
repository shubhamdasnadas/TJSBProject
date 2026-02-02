
import React, { useState } from 'react';
import { HardwareItem, NetworkItem, ItemStatus } from '../types';
import { Trash2, Search, Calendar, RefreshCcw, Monitor, Wifi } from 'lucide-react';

interface ScrapViewProps {
  items: (HardwareItem | NetworkItem)[];
  onSaveHardware: (item: HardwareItem) => void;
  onSaveNetwork: (item: NetworkItem) => void;
  onDeleteHardware: (id: string) => void;
  onDeleteNetwork: (id: string) => void;
}

export const ScrapView: React.FC<ScrapViewProps> = ({ 
    items, onSaveHardware, onSaveNetwork, onDeleteHardware, onDeleteNetwork 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter only retired items
  const scrapItems = items.filter(item => item.status === ItemStatus.RETIRED);

  const filteredItems = scrapItems.filter(item => {
      const term = searchTerm.toLowerCase();
      // Type Guard check for specific fields
      const isNetwork = 'ipAddress' in item;
      
      return item.name.toLowerCase().includes(term) ||
             item.serialNumber?.toLowerCase().includes(term) ||
             item.assetTag?.toLowerCase().includes(term) ||
             (isNetwork && (item as NetworkItem).ipAddress.includes(term));
  });

  const totalScrapValue = scrapItems.reduce((acc, item) => acc + (item.purchaseCost || 0), 0);

  const handleRestore = (item: HardwareItem | NetworkItem) => {
      if(confirm(`Are you sure you want to restore ${item.name} to active inventory?`)) {
          if ('ipAddress' in item) {
              onSaveNetwork({
                  ...(item as NetworkItem),
                  status: ItemStatus.IN_STORAGE,
                  retirementDate: undefined
              });
          } else {
              onSaveHardware({
                  ...(item as HardwareItem),
                  status: ItemStatus.IN_STORAGE,
                  retirementDate: undefined
              });
          }
      }
  };

  const handleDelete = (item: HardwareItem | NetworkItem) => {
      if(confirm('Are you sure? This will permanently remove the record.')) {
          if ('ipAddress' in item) {
              onDeleteNetwork(item.id);
          } else {
              onDeleteHardware(item.id);
          }
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Trash2 className="text-red-600" /> Scrap Inventory
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage retired and disposed Hardware and Network assets.
          </p>
        </div>
        <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100 font-medium text-sm flex items-center gap-2">
           <span className="text-xs uppercase font-bold text-red-500">Original Value</span>
           ₹{totalScrapValue.toLocaleString('en-IN')}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search scrap inventory..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600 text-sm">Asset Details</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Identifiers</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Dates</th>
                <th className="p-4 font-semibold text-slate-600 text-sm">Cost / Value</th>
                <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                  <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">No items in scrap inventory.</td>
                  </tr>
              ) : (
                filteredItems.map(item => {
                    const isNetwork = 'ipAddress' in item;
                    return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                            <div className="flex items-center gap-2 mb-1">
                                {isNetwork ? <Wifi size={14} className="text-purple-500"/> : <Monitor size={14} className="text-blue-500"/>}
                                <div className="font-bold text-slate-900">{item.name}</div>
                            </div>
                            <div className="text-xs text-slate-500 ml-5">{item.manufacturer} {item.model}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-600 font-mono text-xs">
                             <div>SN: {item.serialNumber}</div>
                             {item.assetTag && <div>Tag: {item.assetTag}</div>}
                             {isNetwork && <div>MAC: {(item as NetworkItem).macAddress}</div>}
                        </td>
                        <td className="p-4 text-sm">
                            <div className="flex items-center gap-2 text-red-600 font-medium">
                                <Trash2 size={14}/> Retired: {item.retirementDate || 'N/A'}
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
                                <Calendar size={12}/> Purchased: {item.purchaseDate || 'N/A'}
                            </div>
                        </td>
                        <td className="p-4 text-sm font-medium text-slate-700">
                            Original: ₹{item.purchaseCost?.toLocaleString('en-IN') || '0'}
                        </td>
                        <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                                <button 
                                    onClick={() => handleRestore(item)}
                                    title="Restore to Inventory"
                                    className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                >
                                    <RefreshCcw size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(item)} 
                                    title="Permanently Delete"
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
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
    </div>
  );
};

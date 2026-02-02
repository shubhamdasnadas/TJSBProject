
import React from 'react';
import { LayoutDashboard, Monitor, Disc, KeyRound, Database, LogOut, Users, Activity, ArrowRightLeft, Settings, Archive, Trash2, Wifi, Bell, Building } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, userRole }) => {
  const currentOrg = localStorage.getItem('niyojan_org_id') || 'Master Context';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'alerts', label: 'Custom Alerts', icon: Bell },
    { id: 'hardware', label: 'Hardware', icon: Monitor },
    { id: 'network', label: 'Network Devices', icon: Wifi },
    { id: 'software', label: 'Software', icon: Disc },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'spare', label: 'Spare Inventory', icon: Archive },
    { id: 'scrap', label: 'Scrap / Retired', icon: Trash2 },
    { id: 'passwords', label: 'Secrets', icon: KeyRound, restricted: true }, // Restricted Item
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'import-export', label: 'Data Transfer', icon: ArrowRightLeft },
    { id: 'postgres', label: 'DB Schema', icon: Database },
  ];

  const filteredItems = menuItems.filter(item => {
    if (item.restricted && userRole !== 'Super Admin') return false;
    return true;
  });

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 shadow-xl z-20 hidden md:flex overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">N</div>
            <h1 className="text-xl font-bold tracking-tight">Niyojan</h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700 mt-2 truncate">
            <Building size={10} /> {currentOrg}
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 shrink-0">
        <div className="flex items-center gap-3 text-slate-500 px-3 py-2 w-full rounded-lg mb-2 text-xs uppercase font-bold tracking-wider">
             <span>Role: {userRole || 'Viewer'}</span>
        </div>
      </div>
    </div>
  );
};

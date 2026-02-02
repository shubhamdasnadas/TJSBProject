
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { HardwareItem, SoftwareItem, NetworkItem, LifecycleEvent, AlertDefinition } from '../types';
import { Monitor, Disc, AlertTriangle, Wifi, Activity, Bell, IndianRupee, Building, Clock } from 'lucide-react';

interface DashboardProps {
  hardware: HardwareItem[];
  software: SoftwareItem[];
  network: NetworkItem[];
  passwords: any[];
  lifecycle: LifecycleEvent[];
  alertDefinitions?: AlertDefinition[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const Dashboard: React.FC<DashboardProps> = ({ hardware, software, network = [], lifecycle, alertDefinitions = [] }) => {
  
  // Hardware Total Value
  const hwValue = useMemo(() => {
    return hardware.reduce((acc, h) => acc + (h.purchaseCost || 0), 0);
  }, [hardware]);

  // Software Total Value (Including AMC, Cloud, and Training)
  const swValue = useMemo(() => {
    return software.reduce((acc, s) => {
        const baseCost = (s.seatCount || 0) * (s.costPerSeat || 0);
        const extraCosts = (s.amcCost || 0) + (s.cloudCost || 0) + (s.trainingCost || 0);
        return acc + baseCost + extraCosts;
    }, 0);
  }, [software]);

  // Assets by Department (Aggregated for Horizontal Bar)
  const deptData = useMemo(() => {
    const counts: Record<string, number> = {};
    hardware.forEach(h => {
      const d = h.department || 'Unassigned';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [hardware]);

  // Cost by Category (Top 5)
  const categoryCostData = useMemo(() => {
    const costs: Record<string, number> = {};
    hardware.forEach(h => {
      const c = h.category || 'Other';
      costs[c] = (costs[c] || 0) + (h.purchaseCost || 0);
    });
    return Object.entries(costs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [hardware]);

  // Recent Activity Table Data
  const recentAssets = useMemo(() => {
    return [...hardware]
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
      .slice(0, 5);
  }, [hardware]);

  // Evaluation for General Alerts
  const activeAlerts = useMemo(() => {
      const alerts: { def: AlertDefinition, count: number }[] = [];
      alertDefinitions.forEach(def => {
          if (!def.enabled) return;
          const dataPool = def.module === 'Hardware' ? hardware : def.module === 'Software' ? software : network;
          const matching = dataPool.filter((item: any) => {
              let val = item[def.field];
              if (def.type === 'EQUALS') return String(val) === String(def.threshold);
              return false;
          });
          if (matching.length > 0) alerts.push({ def, count: matching.length });
      });
      return alerts;
  }, [alertDefinitions, hardware, software, network]);

  return (
    <div className="space-y-6">
      <div className="flex bg-white rounded-xl border border-slate-200 p-1 w-fit shadow-sm">
          <div className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white shadow-md flex items-center gap-2">
              <Activity size={18} /> Enterprise Asset Overview
          </div>
      </div>

      <div className="space-y-8 animate-in fade-in duration-500">
         {/* Top Level Stats - 5 Card Layout matching Screenshot */}
         <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard title="HARDWARE" value={hardware.length} icon={<Monitor size={20}/>} color="bg-blue-50 text-blue-600" />
            <StatCard title="HW VALUE" value={`₹${hwValue.toLocaleString('en-IN')}`} icon={<IndianRupee size={20}/>} color="bg-indigo-50 text-indigo-600" />
            <StatCard title="LICENSES" value={software.length} icon={<Disc size={20}/>} color="bg-emerald-50 text-emerald-600" />
            <StatCard title="SW VALUE" value={`₹${swValue.toLocaleString('en-IN')}`} icon={<IndianRupee size={20}/>} color="bg-teal-50 text-teal-600" />
            <StatCard title="NETWORK" value={network.length} icon={<Wifi size={20}/>} color="bg-purple-50 text-purple-600" />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Breakdown - HORIZONTAL BAR CHART */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Building size={18} className="text-blue-500"/> Assets by Department</h3>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={deptData} margin={{ left: 40, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                fontSize={10} 
                                axisLine={false} 
                                tickLine={false} 
                                width={80}
                            />
                            <Tooltip cursor={{fill: '#f8fafc'}} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {deptData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Category Cost Analysis - VERTICAL BAR CHART */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><IndianRupee size={18} className="text-orange-500"/> Top Category Investments</h3>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryCostData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} fontSize={10} />
                            <Tooltip cursor={{fill: '#f8fafc'}} />
                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Inventory Table */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock size={18} className="text-slate-400"/> Recent Asset Additions</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
                            <tr>
                                <th className="px-6 py-3">Asset</th>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Category</th>
                                <th className="px-6 py-3 text-right">Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {recentAssets.map(asset => (
                                <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900 text-sm">{asset.name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono">{asset.serialNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{asset.purchaseDate}</td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold">{asset.category}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-700 text-sm">
                                        ₹{asset.purchaseCost?.toLocaleString('en-IN')}
                                    </td>
                                </tr>
                            ))}
                            {recentAssets.length === 0 && (
                                <tr><td colSpan={4} className="py-12 text-center text-slate-400 text-sm italic">No recent assets recorded.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Alerts & Critical Notifications */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Bell size={18} className="text-red-500"/> System Monitoring</h3>
                <div className="space-y-3">
                    {activeAlerts.length > 0 ? activeAlerts.map((a, i) => (
                        <div key={i} className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between group cursor-default">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className="text-red-600" />
                                <span className="font-medium text-red-900 text-xs">{a.def.name}</span>
                            </div>
                            <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black">{a.count}</span>
                        </div>
                    )) : (
                        <div className="text-center py-20 text-slate-300">
                            <Activity size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">All Assets Compliant</p>
                        </div>
                    )}
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow cursor-default group">
        <div className={`p-3 rounded-lg ${color} transition-transform group-hover:scale-110 duration-200`}>{icon}</div>
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{title}</p>
            <h3 className="text-lg font-bold text-slate-900 truncate">{value}</h3>
        </div>
    </div>
);

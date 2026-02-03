import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { HardwareItem, SoftwareItem, PasswordItem, NetworkItem, LifecycleEvent, AlertDefinition, ItemStatus } from '../types';
import { Monitor, Disc, AlertTriangle, Activity, Bell, IndianRupee, Wifi, TrendingUp, Building2, Wrench, Clock, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  hardware: HardwareItem[];
  software: SoftwareItem[];
  network: NetworkItem[];
  passwords: PasswordItem[];
  lifecycle: LifecycleEvent[];
  alertDefinitions?: AlertDefinition[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const Dashboard: React.FC<DashboardProps> = ({ hardware, software, network = [], passwords, lifecycle, alertDefinitions = [] }) => {
  
  const today = new Date();

  // --- EVALUATE ALERTS (Advanced Logic) ---
  const activeAlerts = useMemo(() => {
      const alerts: { def: AlertDefinition, count: number, items: string[] }[] = [];

      alertDefinitions.forEach(def => {
          if (!def.enabled) return;
          let matchingItems: any[] = [];
          const dataPool = def.module === 'Hardware' ? hardware : def.module === 'Software' ? software : network;

          matchingItems = dataPool.filter((item: any) => {
              let itemVal: any = item[def.field];
              let thresholdVal: any = def.threshold;

              // Handle "Available Seats" Calculation dynamically
              if (def.module === 'Software' && def.field === 'seatCount') {
                  const used = (item as SoftwareItem).assignedTo?.length || 0;
                  itemVal = (item.seatCount || 0) - used;
              }

              // Data Type Normalization
              if (!isNaN(parseFloat(itemVal)) && !isNaN(parseFloat(thresholdVal)) && !def.field.toLowerCase().includes('date')) {
                  itemVal = parseFloat(itemVal);
                  thresholdVal = parseFloat(thresholdVal);
              } else if (def.type !== 'DATE_BEFORE') {
                  itemVal = String(itemVal).toLowerCase();
                  thresholdVal = String(thresholdVal).toLowerCase();
              }

              switch (def.type) {
                  case 'DATE_BEFORE': {
                      if (!item[def.field]) return false;
                      const targetDate = new Date();
                      targetDate.setDate(today.getDate() + parseInt(def.threshold));
                      const itemDate = new Date(item[def.field]);
                      return itemDate > today && itemDate <= targetDate;
                  }
                  case 'EQUALS': return itemVal == thresholdVal;
                  case 'NOT_EQUALS': return itemVal != thresholdVal;
                  case 'GREATER_THAN': return itemVal > thresholdVal;
                  case 'LESS_THAN': return itemVal < thresholdVal;
                  case 'GTE': return itemVal >= thresholdVal;
                  case 'LTE': return itemVal <= thresholdVal;
                  case 'VALUE_EQUALS': return itemVal == thresholdVal;
                  case 'NUMBER_BELOW': return itemVal < thresholdVal;
                  default: return false;
              }
          });

          if (matchingItems.length > 0) {
              alerts.push({
                  def,
                  count: matchingItems.length,
                  items: matchingItems.slice(0, 3).map((i: any) => i.name || i.serviceName)
              });
          }
      });
      return alerts;
  }, [alertDefinitions, hardware, software, network]);

  // --- MAINTENANCE MONITOR ---
  const maintenanceItems = useMemo(() => {
      const hwMaint = hardware.filter(h => h.status === ItemStatus.MAINTENANCE);
      const nwMaint = network.filter(n => n.status === ItemStatus.MAINTENANCE);
      
      const allMaint = [...hwMaint, ...nwMaint].map(item => {
          const returnDate = item.maintenanceEndDate ? new Date(item.maintenanceEndDate) : null;
          const isOverdue = returnDate && returnDate < today;
          return { ...item, returnDate, isOverdue };
      });
      return allMaint.sort((a, b) => (a.returnDate?.getTime() || 0) - (b.returnDate?.getTime() || 0));
  }, [hardware, network]);

  // --- CHART DATA PREPARATION ---

  // 1. Asset Value Over Time
  const timelineData = useMemo(() => {
      const points: Record<string, { date: string, Hardware: number, Software: number, Network: number }> = {};
      const processItem = (date: string | undefined, cost: number, type: 'Hardware'|'Software'|'Network') => {
          if (!date) return;
          const monthKey = date.substring(0, 7); 
          if (!points[monthKey]) points[monthKey] = { date: monthKey, Hardware: 0, Software: 0, Network: 0 };
          points[monthKey][type] += cost;
      };
      
      hardware.forEach(h => processItem(h.purchaseDate, h.purchaseCost || 0, 'Hardware'));
      network.forEach(n => processItem(n.purchaseDate, n.purchaseCost || 0, 'Network'));
      
      // Reflect Software Changes (AMC, Cloud, Training) in growth chart
      software.forEach(s => {
          const base = (s.seatCount || 0) * (s.costPerSeat || 0);
          const addOns = (s.amcEnabled ? (s.amcCost || 0) : 0) + 
                         (s.cloudEnabled ? (s.cloudCost || 0) : 0) + 
                         (s.trainingEnabled ? (s.trainingCost || 0) : 0);
          processItem(s.purchaseDate, base + addOns, 'Software');
      });
      
      let sorted = Object.values(points).sort((a, b) => a.date.localeCompare(b.date));
      let cumHw = 0, cumSw = 0, cumNw = 0;
      
      if (sorted.length === 0) return [{ date: '2024-01', Hardware: 0, Software: 0, Network: 0 }];

      return sorted.map(p => {
          cumHw += p.Hardware; cumSw += p.Software; cumNw += p.Network;
          return { ...p, Hardware: cumHw, Software: cumSw, Network: cumNw };
      });
  }, [hardware, software, network]);

  // 2. Summary Values
  const totalHardwareCost = hardware.reduce((acc, item) => acc + (item.purchaseCost || 0), 0);
  const totalSoftwareCost = software.reduce((acc, s) => {
    const base = (s.seatCount || 0) * (s.costPerSeat || 0);
    const addOns = (s.amcEnabled ? (s.amcCost || 0) : 0) + 
                   (s.cloudEnabled ? (s.cloudCost || 0) : 0) + 
                   (s.trainingEnabled ? (s.trainingCost || 0) : 0);
    return acc + base + addOns;
  }, 0);

  const formatCurrency = (val: number) => {
      if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
      return `₹${val.toLocaleString('en-IN')}`;
  };

  const categoryStats = hardware.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const categoryData = Object.keys(categoryStats).map(key => ({ name: key, value: categoryStats[key] }));

  const deptData = useMemo(() => {
      const depts: Record<string, { name: string, Hardware: number, Software: number }> = {};
      hardware.forEach(h => { 
        if (h.department) {
          if (!depts[h.department]) depts[h.department] = { name: h.department, Hardware: 0, Software: 0 };
          depts[h.department].Hardware++;
        }
      });
      software.forEach(s => { 
        if (s.department) {
          if (!depts[s.department]) depts[s.department] = { name: s.department, Hardware: 0, Software: 0 };
          depts[s.department].Software += (s.seatCount || 0);
        }
      });
      return Object.values(depts).filter(d => d.Hardware + d.Software > 0);
  }, [hardware, software]);
  
  return (
    <div className="space-y-8 pb-10">
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="HARDWARE" value={hardware.length} icon={<Monitor size={20}/>} color="bg-blue-50 text-blue-600" />
        <StatCard title="HW VALUE" value={`₹${totalHardwareCost.toLocaleString('en-IN', { notation: 'compact' })}`} icon={<IndianRupee size={20}/>} color="bg-indigo-50 text-indigo-600" />
        <StatCard title="LICENSES" value={software.length} icon={<Disc size={20}/>} color="bg-emerald-50 text-emerald-600" />
        <StatCard title="SW VALUE" value={formatCurrency(totalSoftwareCost)} icon={<IndianRupee size={20}/>} color="bg-teal-50 text-teal-600" />
        <StatCard title="NETWORK" value={network.length} icon={<Wifi size={20}/>} color="bg-purple-50 text-purple-600" />
      </div>

      {/* ALERT & MONITOR WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Custom Alerts */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-64 flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2 shrink-0">
                <Bell className="text-blue-600" size={20} />
                <h3 className="font-bold text-slate-800">Active Custom Alerts</h3>
            </div>
            <div className="overflow-y-auto p-4 space-y-3 flex-1">
                {activeAlerts.length > 0 ? activeAlerts.map((alert, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border flex gap-3 items-center ${alert.def.severity === 'High' ? 'bg-red-50 border-red-100' : alert.def.severity === 'Medium' ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
                        <AlertTriangle size={18} className={`shrink-0 ${alert.def.severity === 'High' ? 'text-red-600' : alert.def.severity === 'Medium' ? 'text-orange-600' : 'text-blue-600'}`} />
                        <div className="flex-1 min-w-0">
                            <h4 className={`font-bold text-sm truncate ${alert.def.severity === 'High' ? 'text-red-900' : alert.def.severity === 'Medium' ? 'text-orange-900' : 'text-blue-900'}`}>
                                {alert.def.name} ({alert.count})
                            </h4>
                        </div>
                    </div>
                )) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <CheckCircle2 size={32} className="text-green-500 mb-2 opacity-50" />
                        <p className="text-sm font-medium">System Healthy. No active alerts.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Maintenance Monitor */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-64 flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Wrench className="text-orange-600" size={20} />
                    <h3 className="font-bold text-slate-800">Maintenance Monitor</h3>
                </div>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">{maintenanceItems.length} Active</span>
            </div>
            <div className="overflow-y-auto p-0 flex-1">
                {maintenanceItems.length > 0 ? (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase sticky top-0 border-b">
                            <tr>
                                <th className="px-4 py-2">Device</th>
                                <th className="px-4 py-2">Vendor</th>
                                <th className="px-4 py-2 text-right">Expected Return</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {maintenanceItems.map((item: any) => (
                                <tr key={item.id} className={item.isOverdue ? 'bg-red-50' : ''}>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-800">{item.name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase">{item.manufacturer}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-xs">
                                        {item.vendorName || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className={`font-mono text-xs font-bold ${item.isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                                            {item.maintenanceEndDate || 'No Date'}
                                        </div>
                                        {item.isOverdue && <div className="text-[10px] text-red-500 font-bold uppercase">Overdue</div>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 opacity-40">
                        <Wrench size={40} className="mb-2" />
                        <p className="text-sm font-medium">No items currently under maintenance.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* ASSET VALUE GROWTH */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500"/>
            Cumulative Asset Value Growth
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `₹${(v/100000).toFixed(1)}L`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']} />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="Software" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Hardware" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Network" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
                </LineChart>
            </ResponsiveContainer>
          </div>
      </div>

      {/* ADDITIONAL CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Activity size={20} className="text-slate-400"/> Hardware Distribution
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                    {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px'}} />
                </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Building2 size={20} className="text-orange-500"/> Allocation by Department
            </h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptData} layout="vertical" margin={{left: 20}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}} />
                        <Legend iconType="circle" wrapperStyle={{fontSize: '10px'}} />
                        <Bar dataKey="Hardware" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                        <Bar dataKey="Software" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* RECENT ACTIVITY FEED */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <h3 className="font-bold text-lg text-slate-800">Recent Lifecycle Activity</h3>
             <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">Live Feed</span>
         </div>
         <div className="divide-y divide-slate-100">
            {lifecycle.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic bg-white flex flex-col items-center gap-2">
                    <Activity size={32} className="opacity-20" />
                    <p className="text-sm">No activity recorded yet.</p>
                </div>
            ) : (
                lifecycle.slice(0, 5).map(event => (
                    <div key={event.id} className="p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${event.eventType === 'CREATED' ? 'bg-green-500' : event.eventType === 'DELETED' ? 'bg-red-500' : event.eventType === 'ASSIGNED' ? 'bg-purple-500' : 'bg-blue-500'}`}/>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-slate-900">
                                {event.description} <span className="text-slate-400 font-normal mx-2">•</span> <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-tight">{event.assetType}</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Clock size={12}/> {new Date(event.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{event.eventType}</div>
                    </div>
                ))
            )}
         </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all group">
        <div className={`p-3 rounded-xl ${color} transition-transform group-hover:scale-110 duration-200`}>{icon}</div>
        <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-1 truncate">{title}</p>
            <h3 className="text-lg font-bold text-slate-900 truncate">{value}</h3>
        </div>
    </div>
);
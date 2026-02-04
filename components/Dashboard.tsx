import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { HardwareItem, SoftwareItem, PasswordItem, NetworkItem, LifecycleEvent, AlertDefinition, ItemStatus } from '../types';
import { Monitor, Disc, AlertTriangle, Activity, Bell, IndianRupee, Wifi, TrendingUp, Building2, Wrench, Clock, CheckCircle2, ChevronRight, Hash, ShieldAlert } from 'lucide-react';

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
  today.setHours(0, 0, 0, 0); // Normalized for date-only comparisons

  // --- EVALUATE ALERTS ---
  const activeAlerts = useMemo(() => {
      const alerts: { def: AlertDefinition, count: number, items: string[] }[] = [];

      alertDefinitions.forEach(def => {
          if (!def.enabled) return;
          let matchingItems: any[] = [];
          const dataPool = def.module === 'Hardware' ? hardware : def.module === 'Software' ? software : network;

          matchingItems = dataPool.filter((item: any) => {
              let itemVal: any = item[def.field];
              let thresholdVal: any = def.threshold;

              // Handle seat count logic for software specifically
              if (def.module === 'Software' && def.field === 'seatCount') {
                  const used = (item as SoftwareItem).assignedTo?.length || 0;
                  itemVal = (item.seatCount || 0) - used;
              }

              // Normalizing types for robust comparison
              const isNumericField = ['purchaseCost', 'costPerSeat', 'seatCount', 'fitnessYears'].includes(def.field);
              const isDateField = def.field.toLowerCase().includes('date') || def.field.toLowerCase().includes('expiry');

              if (def.type === 'DATE_BEFORE') {
                  if (!itemVal) return false;
                  const itemDate = new Date(itemVal);
                  itemDate.setHours(0, 0, 0, 0);
                  const diffTime = itemDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays <= parseInt(def.threshold);
              }

              // Standard Comparisons
              const valA = isNumericField ? parseFloat(itemVal) : String(itemVal).toLowerCase();
              const valB = isNumericField ? parseFloat(thresholdVal) : String(thresholdVal).toLowerCase();

              switch (def.type) {
                  case 'EQUALS': 
                  case 'VALUE_EQUALS':
                      return valA === valB;
                  case 'NOT_EQUALS': 
                      return valA !== valB;
                  case 'GREATER_THAN': 
                      return valA > valB;
                  case 'LESS_THAN': 
                      return valA < valB;
                  case 'GTE': 
                      return valA >= valB;
                  case 'LTE': 
                      return valA <= valB;
                  default: 
                      return false;
              }
          });

          if (matchingItems.length > 0) {
              alerts.push({
                  def,
                  count: matchingItems.length,
                  items: matchingItems.map((i: any) => i.name || i.serviceName || i.ipAddress || 'Unnamed Asset')
              });
          }
      });

      // Sort by high severity first
      return alerts.sort((a, b) => {
        const priorityMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return priorityMap[b.def.severity] - priorityMap[a.def.severity];
      });
  }, [alertDefinitions, hardware, software, network, today]);

  // --- CHART DATA PREPARATION ---
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
        {/* Active Custom Alerts Widget - REFINED LIST FORMAT */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[400px] flex flex-col">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="text-blue-600" size={20} />
                    <h3 className="font-bold text-slate-800">Active Custom Alerts</h3>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-all ${activeAlerts.length > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
                  {activeAlerts.length} Active
                </span>
            </div>
            <div className="overflow-y-auto flex-1">
                {activeAlerts.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {activeAlerts.map((alert, idx) => (
                            <div key={idx} className="p-4 hover:bg-slate-50 transition-all group relative border-l-4 border-l-transparent">
                                {/* Color stripe for severity */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${alert.def.severity === 'High' ? 'bg-red-500' : alert.def.severity === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                
                                <div className="flex items-start gap-4">
                                    <div className={`p-2 rounded-lg shrink-0 mt-1 ${alert.def.severity === 'High' ? 'bg-red-50 text-red-600' : alert.def.severity === 'Medium' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {alert.def.module === 'Hardware' ? <Monitor size={20} /> : alert.def.module === 'Software' ? <Disc size={20}/> : <Wifi size={20}/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-slate-900 truncate leading-none">{alert.def.name}</h4>
                                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${alert.def.module === 'Hardware' ? 'bg-blue-50 text-blue-700 border-blue-100' : alert.def.module === 'Software' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                                                {alert.def.module}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mb-2 uppercase tracking-tight">
                                            Logic: <span className="font-mono text-blue-600 bg-blue-50/50 px-1 rounded">{alert.def.field} {alert.def.type === 'DATE_BEFORE' ? 'Due ≤' : alert.def.type === 'EQUALS' ? '==' : alert.def.type} {alert.def.threshold}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {alert.items.slice(0, 3).map((item, i) => (
                                                <span key={i} className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-medium truncate max-w-[120px]">
                                                    {item}
                                                </span>
                                            ))}
                                            {alert.items.length > 3 && (
                                                <span className="text-[10px] text-slate-400 font-bold px-1">+ {alert.items.length - 3} more</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-xl font-black text-slate-900 leading-none">{alert.count}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Matches</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 size={32} className="text-green-500 opacity-60" />
                        </div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No Alerts Active</p>
                        <p className="text-xs mt-1 text-center">Your infrastructure is currently within all defined rule thresholds.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Maintenance Monitor */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[400px] flex flex-col">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Wrench className="text-orange-600" size={20} />
                    <h3 className="font-bold text-slate-800">Maintenance Monitor</h3>
                </div>
            </div>
            <div className="overflow-y-auto p-0 flex-1">
                {hardware.filter(h => h.status === ItemStatus.MAINTENANCE).length > 0 ? (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase sticky top-0 border-b">
                            <tr>
                                <th className="px-5 py-3">Device</th>
                                <th className="px-5 py-3">Vendor</th>
                                <th className="px-5 py-3 text-right">Target Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {hardware.filter(h => h.status === ItemStatus.MAINTENANCE).map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-800">{item.name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase font-medium">{item.category}</div>
                                    </td>
                                    <td className="px-5 py-4 text-slate-600 text-xs font-medium">
                                        {item.vendorName || 'Internal'}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="font-mono text-xs font-black text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">
                                            {item.maintenanceEndDate || 'N/A'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 opacity-40">
                        <Wrench size={48} className="mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest">No Maintenance Pending</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* ASSET VALUE GROWTH */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500"/>
            Cumulative Asset Value Growth (Incl. Software Add-ons)
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
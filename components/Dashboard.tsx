import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { HardwareItem, SoftwareItem, PasswordItem, NetworkItem, LifecycleEvent, AlertDefinition, ItemStatus } from '../types';
import { Monitor, Disc, Key, AlertTriangle, CalendarClock, Activity, Bell, IndianRupee, Wifi, TrendingUp, Archive, Trash2, Building2, Wrench, Clock, CheckCircle2 } from 'lucide-react';

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
                  // Numeric Comparison
                  itemVal = parseFloat(itemVal);
                  thresholdVal = parseFloat(thresholdVal);
              } else if (def.type !== 'DATE_BEFORE') {
                  // String Comparison
                  itemVal = String(itemVal).toLowerCase();
                  thresholdVal = String(thresholdVal).toLowerCase();
              }

              // --- LOGIC SWITCH ---
              switch (def.type) {
                  case 'DATE_BEFORE': {
                      // Custom "Due Within" logic
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
                  case 'VALUE_EQUALS': return itemVal == thresholdVal; // Legacy Support
                  case 'NUMBER_BELOW': return itemVal < thresholdVal; // Legacy Support
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

  // --- STANDARD ALERT LOGIC ---
  const expiredSoftware = software.filter(s => s.expiryDate && new Date(s.expiryDate) < today);

  // --- CHART DATA PREPARATION ---

  // 1. Status Distribution
  const hardwareStats = hardware.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const hardwareData = Object.keys(hardwareStats).map(key => ({ name: key, value: hardwareStats[key] }));

  // 2. Category Distribution
  const categoryStats = hardware.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const categoryData = Object.keys(categoryStats).map(key => ({ name: key, value: categoryStats[key] }));

  // 3. Asset Value Over Time
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
      software.forEach(s => processItem(s.purchaseDate, (s.costPerSeat || 0) * (s.seatCount || 0), 'Software'));
      let sorted = Object.values(points).sort((a, b) => a.date.localeCompare(b.date));
      let cumHw = 0, cumSw = 0, cumNw = 0;
      return sorted.map(p => {
          cumHw += p.Hardware; cumSw += p.Software; cumNw += p.Network;
          return { ...p, Hardware: cumHw, Software: cumSw, Network: cumNw };
      });
  }, [hardware, software, network]);

  // 4. Spare & Scrap Inventory Breakdown
  const spareData = useMemo(() => {
      const counts: Record<string, number> = {};
      hardware.filter(h => h.status === ItemStatus.IN_STORAGE).forEach(h => { const cat = h.category || 'Other'; counts[cat] = (counts[cat] || 0) + 1; });
      network.filter(n => n.status === ItemStatus.IN_STORAGE).forEach(n => { const type = n.type || 'Network'; counts[type] = (counts[type] || 0) + 1; });
      return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [hardware, network]);

  const scrapData = useMemo(() => {
      const counts: Record<string, number> = {};
      hardware.filter(h => h.status === ItemStatus.RETIRED).forEach(h => { const cat = h.category || 'Other'; counts[cat] = (counts[cat] || 0) + 1; });
      network.filter(n => n.status === ItemStatus.RETIRED).forEach(n => { const type = n.type || 'Network'; counts[type] = (counts[type] || 0) + 1; });
      return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [hardware, network]);

  // 5. Department Allocation
  const deptData = useMemo(() => {
      const depts: Record<string, { name: string, Hardware: number, Software: number, Network: number }> = {};
      const allDepts = new Set([...hardware.map(h => h.department), ...software.map(s => s.department)]);
      allDepts.forEach(d => { if(d) depts[d] = { name: d, Hardware: 0, Software: 0, Network: 0 }; });
      hardware.forEach(h => { if (h.department && depts[h.department]) depts[h.department].Hardware++; });
      software.forEach(s => { if (s.department && depts[s.department]) depts[s.department].Software += (s.seatCount || 0); });
      return Object.values(depts).filter(d => d.Hardware + d.Software > 0);
  }, [hardware, software]);

  const totalHardwareCost = hardware.reduce((acc, item) => acc + (item.purchaseCost || 0), 0);
  const totalSoftwareCost = software.reduce((acc, item) => acc + ((item.seatCount || 0) * (item.costPerSeat || 0)), 0);
  
  return (
    <div className="space-y-8 pb-10">
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl"><Monitor size={24} /></div>
          <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Hardware</p><h3 className="text-2xl font-bold text-slate-900">{hardware.length}</h3></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl"><IndianRupee size={24} /></div>
          <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">HW Value</p><h3 className="text-xl font-bold text-slate-900">₹{totalHardwareCost.toLocaleString('en-IN', { notation: "compact" })}</h3></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><Disc size={24} /></div>
          <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Licenses</p><h3 className="text-2xl font-bold text-slate-900">{software.length}</h3></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-teal-100 text-teal-600 rounded-xl"><IndianRupee size={24} /></div>
          <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">SW Value</p><h3 className="text-xl font-bold text-slate-900">₹{totalSoftwareCost.toLocaleString('en-IN', { notation: "compact" })}</h3></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-xl"><Wifi size={24} /></div>
          <div><p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Network</p><h3 className="text-2xl font-bold text-slate-900">{network.length}</h3></div>
        </div>
      </div>

      {/* ALERT WIDGETS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Custom Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-64 flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2 shrink-0">
                <Bell className="text-blue-600" size={20} />
                <h3 className="font-bold text-slate-800">Active Custom Alerts</h3>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
                {activeAlerts.length > 0 ? activeAlerts.map((alert, idx) => (
                    <div key={idx} className={`p-3 rounded-lg border flex gap-3 items-center ${alert.def.severity === 'High' ? 'bg-red-50 border-red-100' : alert.def.severity === 'Medium' ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
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
                        <p className="text-sm">System Healthy. No active alerts.</p>
                    </div>
                )}
            </div>
        </div>

        {/* Maintenance Monitor - NEW WIDGET */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-64 flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Wrench className="text-orange-600" size={20} />
                    <h3 className="font-bold text-slate-800">Maintenance Monitor</h3>
                </div>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold">{maintenanceItems.length} Active</span>
            </div>
            <div className="overflow-y-auto p-0">
                {maintenanceItems.length > 0 ? (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0">
                            <tr>
                                <th className="px-4 py-2">Device</th>
                                <th className="px-4 py-2">Vendor</th>
                                <th className="px-4 py-2 text-right">Expected Return</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {maintenanceItems.map(item => (
                                <tr key={item.id} className={item.isOverdue ? 'bg-red-50' : ''}>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-slate-800">{item.name}</div>
                                        <div className="text-xs text-slate-500">{item.manufacturer}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-xs">
                                        {item.vendorName || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className={`font-mono text-xs font-bold ${item.isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                                            {item.maintenanceEndDate || 'No Date'}
                                        </div>
                                        {item.isOverdue && <div className="text-[10px] text-red-500 font-bold">OVERDUE</div>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6">
                        <Wrench size={32} className="mb-2 opacity-20" />
                        <p className="text-sm">No items currently under maintenance.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* ASSET VALUE GROWTH (Line Chart) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-600"/>
            Cumulative Asset Value Growth
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `₹${(value/100000).toFixed(1)}L`} />
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Legend verticalAlign="top" height={36}/>
              <Line type="monotone" dataKey="Hardware" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{r: 6}} />
              <Line type="monotone" dataKey="Software" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{r: 6}} />
              <Line type="monotone" dataKey="Network" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EXISTING CHART: Categories */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Activity size={20} className="text-slate-400"/> Asset Categories
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{borderRadius: '8px'}} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department Allocation */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Building2 size={20} className="text-orange-500"/> Assets by Department
            </h3>
            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={deptData} layout="vertical" margin={{left: 20}}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px'}} />
                    <Legend />
                    <Bar dataKey="Hardware" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    <Bar dataKey="Software" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* RECENT ACTIVITY FEED */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex justify-between items-center">
             <h3 className="font-bold text-lg text-slate-800">Recent Lifecycle Activity</h3>
             <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Live Feed</span>
         </div>
         <div className="divide-y divide-slate-100">
            {lifecycle.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic">No activity recorded yet.</div>
            ) : (
                lifecycle.slice(0, 5).map(event => (
                    <div key={event.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${event.eventType === 'CREATED' ? 'bg-green-500' : event.eventType === 'DELETED' ? 'bg-red-500' : event.eventType === 'ASSIGNED' ? 'bg-purple-500' : 'bg-blue-500'}`}/>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">
                                {event.description} <span className="text-slate-400 font-normal mx-2">•</span> <span className="text-slate-500 font-normal text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{event.assetType}</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">{new Date(event.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{event.eventType}</div>
                    </div>
                ))
            )}
         </div>
      </div>
    </div>
  );
};
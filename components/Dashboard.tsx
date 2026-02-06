
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { HardwareItem, SoftwareItem, PasswordItem, NetworkItem, LifecycleEvent, AlertDefinition, ItemStatus } from '../types';
import { Monitor, Disc, AlertTriangle, Activity, Bell, IndianRupee, Wifi, TrendingUp, Building2, Wrench, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

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
  today.setHours(0, 0, 0, 0);

  const activeAlerts = useMemo(() => {
      const alerts: { def: AlertDefinition, count: number, items: string[] }[] = [];

      alertDefinitions.forEach(def => {
          if (!def.enabled) return;
          const dataPool = def.module === 'Hardware' ? hardware : def.module === 'Software' ? software : network;

          const matchingItems = dataPool.filter((item: any) => {
              let itemVal: any = item[def.field];
              let thresholdVal: any = def.threshold;

              if (def.module === 'Software' && def.field === 'seatCount') {
                  const used = (item as SoftwareItem).assignedTo?.length || 0;
                  itemVal = (item.seatCount || 0) - used;
              }

              const isNumericField = ['purchaseCost', 'costPerSeat', 'seatCount', 'fitnessYears', 'amcCost', 'cloudCost', 'trainingCost'].includes(def.field);

              if (def.type === 'DATE_BEFORE') {
                  if (!itemVal) return false;
                  const itemDate = new Date(itemVal);
                  itemDate.setHours(0, 0, 0, 0);
                  const diffTime = itemDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays <= parseInt(def.threshold);
              }

              const valA = isNumericField ? parseFloat(itemVal) : String(itemVal).toLowerCase();
              const valB = isNumericField ? parseFloat(thresholdVal) : String(thresholdVal).toLowerCase();

              switch (def.type) {
                  case 'EQUALS': 
                  case 'VALUE_EQUALS': return valA === valB;
                  case 'NOT_EQUALS': return valA !== valB;
                  case 'GREATER_THAN': return (valA as any) > (valB as any);
                  case 'LESS_THAN': return (valA as any) < (valB as any);
                  case 'GTE': return (valA as any) >= (valB as any);
                  case 'LTE': return (valA as any) <= (valB as any);
                  default: return false;
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

      return alerts.sort((a, b) => {
        const priorityMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return priorityMap[b.def.severity] - priorityMap[a.def.severity];
      });
  }, [alertDefinitions, hardware, software, network, today]);

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
          const additional = (s.amcCost || 0) + (s.cloudCost || 0) + (s.trainingCost || 0);
          processItem(s.purchaseDate, base + additional, 'Software');
      });
      let sorted = Object.values(points).sort((a, b) => a.date.localeCompare(b.date));
      let cumHw = 0, cumSw = 0, cumNw = 0;
      return sorted.map(p => {
          cumHw += p.Hardware; cumSw += p.Software; cumNw += p.Network;
          return { ...p, Hardware: cumHw, Software: cumSw, Network: cumNw };
      });
  }, [hardware, software, network]);

  const totalHardwareCost = hardware.reduce((acc, item) => acc + (item.purchaseCost || 0), 0);
  const totalSoftwareCost = software.reduce((acc, s) => {
    const base = (s.seatCount || 0) * (s.costPerSeat || 0);
    const additional = (s.amcCost || 0) + (s.cloudCost || 0) + (s.trainingCost || 0);
    return acc + base + additional;
  }, 0);

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="HARDWARE" value={hardware.length} icon={<Monitor size={20}/>} color="bg-blue-50 text-blue-600" />
        <StatCard title="HW VALUE" value={`₹${totalHardwareCost.toLocaleString('en-IN', { notation: 'compact' })}`} icon={<IndianRupee size={20}/>} color="bg-indigo-50 text-indigo-600" />
        <StatCard title="LICENSES" value={software.length} icon={<Disc size={20}/>} color="bg-emerald-50 text-emerald-600" />
        <StatCard title="SW VALUE" value={`₹${totalSoftwareCost.toLocaleString('en-IN', { notation: 'compact' })}`} icon={<IndianRupee size={20}/>} color="bg-teal-50 text-teal-600" />
        <StatCard title="NETWORK" value={network.length} icon={<Wifi size={20}/>} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[400px] flex flex-col">
            <div className="p-5 bg-slate-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="text-blue-600" size={20} />
                    <h3 className="font-bold text-slate-800">Active Custom Alerts</h3>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeAlerts.length > 0 ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
                  {activeAlerts.length} Active
                </span>
            </div>
            <div className="overflow-y-auto flex-1">
                {activeAlerts.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {activeAlerts.map((alert, idx) => (
                            <div key={idx} className="p-4 hover:bg-slate-50 relative border-l-4" style={{ borderLeftColor: alert.def.severity === 'High' ? '#ef4444' : alert.def.severity === 'Medium' ? '#f59e0b' : '#3b82f6' }}>
                                <div className="flex items-start gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-slate-900 truncate">{alert.def.name}</h4>
                                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded border bg-slate-100">{alert.def.module}</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-bold uppercase">
                                            Field: <span className="font-mono text-blue-600">{alert.def.field}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {alert.items.slice(0, 2).map((item, i) => (
                                                <span key={i} className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[120px]">{item}</span>
                                            ))}
                                            {alert.items.length > 2 && <span className="text-[10px] text-slate-400 font-bold">+ {alert.items.length - 2} more</span>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-slate-900">{alert.count}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Matches</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
                        <CheckCircle2 size={32} className="text-green-500 opacity-60 mb-2" />
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No Alerts Active</p>
                    </div>
                )}
            </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-[400px] flex flex-col">
            <div className="p-5 bg-slate-50 border-b">
                <div className="flex items-center gap-2">
                    <Wrench className="text-orange-600" size={20} />
                    <h3 className="font-bold text-slate-800">Maintenance Monitor</h3>
                </div>
            </div>
            <div className="overflow-y-auto flex-1">
                {hardware.filter(h => h.status === ItemStatus.MAINTENANCE).length > 0 ? (
                    <table className="w-full text-left text-sm">
                        <tbody className="divide-y divide-slate-100">
                            {hardware.filter(h => h.status === ItemStatus.MAINTENANCE).map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-5 py-4">
                                        <div className="font-bold text-slate-800">{item.name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase font-medium">{item.category}</div>
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
                        <Wrench size={32} className="mb-2" />
                        <p className="text-sm font-bold uppercase tracking-widest">No Maintenance Pending</p>
                    </div>
                )}
            </div>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-[400px]">
          <h3 className="text-lg font-bold text-slate-800 mb-8 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-500"/>
            Cumulative Asset Value Growth
          </h3>
          <ResponsiveContainer width="100%" height="80%">
              <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" hide />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="Software" stroke="#10b981" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="Hardware" stroke="#3b82f6" strokeWidth={3} dot={false} />
              </LineChart>
          </ResponsiveContainer>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: any) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
        <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight mb-1">{title}</p>
            <h3 className="text-lg font-bold text-slate-900 truncate">{value}</h3>
        </div>
    </div>
);

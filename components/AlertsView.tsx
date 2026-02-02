import React, { useState } from 'react';
import { AlertDefinition, ItemStatus } from '../types';
import { Plus, Trash2, Bell, AlertTriangle, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

interface AlertsViewProps {
  definitions: AlertDefinition[];
  onSave: (def: Omit<AlertDefinition, 'id'>) => void;
  onDelete: (id: string) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ definitions, onSave, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<AlertDefinition>>({
      module: 'Hardware',
      type: 'EQUALS',
      severity: 'Medium',
      enabled: true
  });

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData as Omit<AlertDefinition, 'id'>);
      setIsModalOpen(false);
      setFormData({ module: 'Hardware', type: 'EQUALS', severity: 'Medium', enabled: true });
  };

  const getFieldOptions = () => {
      if (formData.module === 'Hardware') return [
          { value: 'status', label: 'Status' },
          { value: 'warrantyExpiry', label: 'Warranty Expiry' },
          { value: 'fitnessExpiry', label: 'Fitness Expiry' },
          { value: 'purchaseCost', label: 'Purchase Cost' }
      ];
      if (formData.module === 'Software') return [
          { value: 'expiryDate', label: 'License Expiry' },
          { value: 'seatCount', label: 'Available Seats' }, // Special logic handling
          { value: 'costPerSeat', label: 'Cost Per Seat' }
      ];
      if (formData.module === 'Network') return [
          { value: 'status', label: 'Status' },
          { value: 'warrantyExpiry', label: 'Warranty Expiry' }
      ];
      return [];
  };

  const getTypeOptions = () => {
      const field = formData.field || '';
      
      // Date fields mainly support Days Before (Custom logic) or standard comparisons if comparing raw dates
      if (field.toLowerCase().includes('date') || field.includes('Expiry')) {
          return [
              { value: 'DATE_BEFORE', label: 'Days Before (Due Within)' },
              // Standard comparisons for dates aren't very UX friendly without a date picker value, 
              // but we can support them if user enters YYYY-MM-DD
              { value: 'EQUALS', label: '== (Exact Date)' },
              { value: 'GREATER_THAN', label: '> (After Date)' },
              { value: 'LESS_THAN', label: '< (Before Date)' },
          ];
      }

      // Numeric Fields
      if (['seatCount', 'purchaseCost', 'costPerSeat'].includes(field)) {
          return [
              { value: 'EQUALS', label: '== (Equals)' },
              { value: 'NOT_EQUALS', label: '!= (Not Equals)' },
              { value: 'GREATER_THAN', label: '> (Greater Than)' },
              { value: 'LESS_THAN', label: '< (Less Than)' },
              { value: 'GTE', label: '>= (Greater or Equal)' },
              { value: 'LTE', label: '<= (Less or Equal)' },
          ];
      }

      // String/Enum Fields (Status)
      return [
          { value: 'EQUALS', label: '== (Equals)' },
          { value: 'NOT_EQUALS', label: '!= (Not Equals)' }
      ];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Bell className="text-blue-600" /> Custom Alerts
            </h2>
            <p className="text-slate-500 text-sm mt-1">Define rules to automatically trigger warnings on the dashboard.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
          <Plus size={18} /> Create Alert Rule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {definitions.length === 0 ? (
              <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                  <Bell size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No alert rules defined yet.</p>
              </div>
          ) : (
              definitions.map(def => (
                  <div key={def.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden group">
                      <div className={`absolute top-0 left-0 w-1 h-full ${def.severity === 'High' ? 'bg-red-500' : def.severity === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                      
                      <div>
                          <div className="flex justify-between items-start mb-2 pl-2">
                              <h3 className="font-bold text-slate-900">{def.name}</h3>
                              <button onClick={() => onDelete(def.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                          </div>
                          
                          <div className="pl-2 text-sm text-slate-600 space-y-1">
                              <p><span className="font-medium text-slate-500">Module:</span> {def.module}</p>
                              <div className="font-mono text-xs bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                                  {def.field} 
                                  <span className="text-blue-600 font-bold mx-1">
                                      {def.type === 'EQUALS' ? '==' : 
                                       def.type === 'NOT_EQUALS' ? '!=' :
                                       def.type === 'GREATER_THAN' ? '>' :
                                       def.type === 'LESS_THAN' ? '<' :
                                       def.type === 'GTE' ? '>=' :
                                       def.type === 'LTE' ? '<=' :
                                       def.type === 'DATE_BEFORE' ? 'Due In (Days)' : def.type}
                                  </span> 
                                  {def.threshold}
                              </div>
                          </div>
                      </div>

                      <div className="pl-2 mt-4 flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${def.severity === 'High' ? 'bg-red-50 text-red-700 border-red-100' : def.severity === 'Medium' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                              {def.severity} Priority
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${def.enabled ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                              {def.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                      </div>
                  </div>
              ))
          )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">New Alert Rule</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Rule Name</label>
                  <input required type="text" className="w-full border p-2.5 rounded-lg" placeholder="e.g. Critical Warranty Warning" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})}/>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Target Module</label>
                      <select className="w-full border p-2.5 rounded-lg bg-white" value={formData.module} onChange={e => setFormData({...formData, module: e.target.value as any, field: '', threshold: ''})}>
                          <option value="Hardware">Hardware</option>
                          <option value="Software">Software</option>
                          <option value="Network">Network</option>
                      </select>
                  </div>
                  <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Severity</label>
                      <select className="w-full border p-2.5 rounded-lg bg-white" value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value as any})}>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                      </select>
                  </div>
              </div>

              <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Field to Check</label>
                  <select required className="w-full border p-2.5 rounded-lg bg-white" value={formData.field || ''} onChange={e => setFormData({...formData, field: e.target.value, type: 'EQUALS', threshold: ''})}>
                      <option value="">-- Select Field --</option>
                      {getFieldOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
              </div>

              {formData.field && (
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">Condition</label>
                          <select className="w-full border p-2.5 rounded-lg bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                              {getTypeOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                      </div>
                      <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">
                              {formData.type === 'DATE_BEFORE' ? 'Days Before' : 'Value'}
                          </label>
                          
                          {/* Special Handling for Status: Show Dropdown */}
                          {formData.field === 'status' ? (
                              <select 
                                required 
                                className="w-full border p-2.5 rounded-lg bg-white" 
                                value={formData.threshold || ''} 
                                onChange={e => setFormData({...formData, threshold: e.target.value})}
                              >
                                  <option value="">-- Select Status --</option>
                                  {Object.values(ItemStatus).map(s => (
                                      <option key={s} value={s}>{s}</option>
                                  ))}
                              </select>
                          ) : (
                              <input 
                                required 
                                type="text" 
                                className="w-full border p-2.5 rounded-lg" 
                                placeholder={formData.type === 'DATE_BEFORE' ? 'e.g. 30' : 'Value'} 
                                value={formData.threshold || ''} 
                                onChange={e => setFormData({...formData, threshold: e.target.value})}
                              />
                          )}
                      </div>
                  </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

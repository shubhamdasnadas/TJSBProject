
import React, { useState } from 'react';
import { UserItem, DepartmentItem, HardwareItem, SoftwareItem } from '../types';
import { Plus, Trash2, Edit2, Mail, Briefcase, Building, Monitor, Disc, AlertTriangle, ArrowRight, Eye, CheckCircle2, List, LayoutGrid, User } from 'lucide-react';

interface UsersViewProps {
  items: UserItem[];
  departments: DepartmentItem[];
  hardware: HardwareItem[];
  software: SoftwareItem[];
  onSave: (item: UserItem) => void;
  onDelete: (id: string) => void;
  onSaveHardware: (item: HardwareItem) => Promise<void>;
  onSaveSoftware: (item: SoftwareItem) => Promise<void>;
}

// Helper interface for the warning modal
interface ConflictItem {
    id: string;
    name: string;
    type: 'Hardware' | 'Software';
    details: string; 
    originalItem: HardwareItem | SoftwareItem;
}

export const UsersView: React.FC<UsersViewProps> = ({ 
    items, departments, hardware, software, 
    onSave, onDelete, onSaveHardware, onSaveSoftware 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UserItem | null>(null);
  const [formData, setFormData] = useState<Partial<UserItem>>({});
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  
  // View Assets Modal State
  const [viewingUser, setViewingUser] = useState<UserItem | null>(null);

  // Warning/Reassignment Modal State
  const [warningData, setWarningData] = useState<ConflictItem[] | null>(null);
  const [actionType, setActionType] = useState<'deactivate' | 'delete'>('deactivate');
  // Map of AssetID -> NewUserID (empty string means unassign/remove)
  const [reassignmentMap, setReassignmentMap] = useState<Record<string, string>>({});

  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({ status: 'Active' });
    setIsModalOpen(true);
  };

  const handleEdit = (item: UserItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  // Check for assets and setup warning if needed
  const checkConflicts = (user: UserItem, type: 'deactivate' | 'delete'): boolean => {
      const userHw = hardware.filter(h => h.assignedTo === user.name);
      const userSw = software.filter(s => s.assignedTo?.some(a => a.username === user.name));
      
      if (userHw.length > 0 || userSw.length > 0) {
          const conflicts: ConflictItem[] = [
              ...userHw.map(h => ({ id: h.id, name: h.name, type: 'Hardware' as const, details: h.assetTag || h.serialNumber, originalItem: h })),
              ...userSw.map(s => ({ id: s.id, name: s.name, type: 'Software' as const, details: `v${s.version}`, originalItem: s }))
          ];
          setWarningData(conflicts);
          setReassignmentMap({}); // Reset map
          setActionType(type);
          setEditingItem(user); // Ensure we know who we are acting on
          return true; // Conflict found
      }
      return false; // No conflict
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: UserItem = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      name: formData.name || 'New User',
      email: formData.email || '',
      department: formData.department || '',
      hod: formData.hod || '',
      role: formData.role || '',
      status: formData.status as 'Active' | 'Inactive' || 'Active'
    };

    // Safety Check: If changing to Inactive, check assignments
    if (editingItem && newItem.status === 'Inactive' && editingItem.status === 'Active') {
        if (checkConflicts(editingItem, 'deactivate')) {
            return; // Stop Submission, show modal
        }
    }

    onSave(newItem);
    setIsModalOpen(false);
  };

  const handleDeleteClick = (user: UserItem) => {
      if (checkConflicts(user, 'delete')) {
          return; // Stop, show modal
      }
      if (confirm(`Are you sure you want to delete ${user.name}?`)) {
          onDelete(user.id);
      }
  };

  const handleReassignmentChange = (assetId: string, newUserId: string) => {
      setReassignmentMap(prev => ({
          ...prev,
          [assetId]: newUserId
      }));
  };

  const confirmConflictResolution = async () => {
      if (!editingItem || !warningData) return;

      // Process Reassignments or Unassignments
      for (const conflict of warningData) {
          const newOwner = reassignmentMap[conflict.id]; // Can be undefined/empty
          
          if (conflict.type === 'Hardware') {
              const hwItem = conflict.originalItem as HardwareItem;
              // If newOwner selected -> Reassign
              // If NO newOwner -> Unassign (assignedTo = '')
              await onSaveHardware({
                  ...hwItem,
                  assignedTo: newOwner || '', 
                  previousOwner: newOwner ? editingItem.name : hwItem.previousOwner
              });
          } else {
              const swItem = conflict.originalItem as SoftwareItem;
              const currentUsers = swItem.assignedTo || [];
              
              // Remove old user
              const newAssignments = currentUsers.filter(u => u.username !== editingItem.name);
              
              // If newOwner selected, Add them
              if (newOwner && !newAssignments.some(u => u.username === newOwner)) {
                  newAssignments.push({
                    username: newOwner,
                    assignedDate: new Date().toISOString().split('T')[0]
                  });
              }
              // If no newOwner, we simply leave them removed from the list (automatic unassign)

              await onSaveSoftware({
                  ...swItem,
                  assignedTo: newAssignments
              });
          }
      }

      // Perform final action
      if (actionType === 'delete') {
          onDelete(editingItem.id);
      } else {
          // Deactivate
          const newItem: UserItem = {
            ...editingItem,
            ...formData, // Preserve any form edits
            id: editingItem.id,
            name: editingItem.name, // Ensure name is consistent
            status: 'Inactive' as const
          };
          onSave(newItem);
      }

      setWarningData(null);
      setReassignmentMap({});
      setIsModalOpen(false);
      setEditingItem(null);
  };

  const handleDepartmentChange = (deptName: string) => {
    const dept = departments.find(d => d.name === deptName);
    setFormData({
        ...formData,
        department: deptName,
        hod: dept?.hodName || ''
    });
  };

  const allDepts = Array.from(new Set(items.map(u => u.department || 'Unassigned')));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Users & Employees</h2>
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
                    title="Kanban Board (By Dept)"
                >
                    <LayoutGrid size={18} />
                </button>
            </div>
            <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
            <Plus size={18} /> Add User
            </button>
        </div>
      </div>

      {viewMode === 'list' ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 font-semibold text-slate-600 text-sm">Employee</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Role & Department</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Contact</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm">Status</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm text-center">Assets</th>
                            <th className="p-4 font-semibold text-slate-600 text-sm text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map(item => {
                            const userHwCount = hardware.filter(h => h.assignedTo === item.name).length;
                            const userSwCount = software.filter(s => s.assignedTo?.some(a => a.username === item.name)).length;
                            return (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {item.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="font-bold text-slate-900">{item.name}</div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm font-medium text-slate-800">{item.role || 'Unspecified'}</div>
                                        <div className="text-xs text-slate-500">{item.department || 'No Dept'} {item.hod ? `(HOD: ${item.hod})` : ''}</div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                        {item.email || '-'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${item.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex justify-center gap-2">
                                            {userHwCount > 0 && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs border border-blue-100 flex items-center gap-1" title="Devices"><Monitor size={10}/> {userHwCount}</span>}
                                            {userSwCount > 0 && <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-xs border border-emerald-100 flex items-center gap-1" title="Licenses"><Disc size={10}/> {userSwCount}</span>}
                                            {userHwCount === 0 && userSwCount === 0 && <span className="text-slate-300">-</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button 
                                                onClick={() => setViewingUser(item)}
                                                title="View Assets"
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-50"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-50"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDeleteClick(item)} className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-50"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
          </div>
      ) : (
          <div className="flex overflow-x-auto pb-4 gap-6 animate-in fade-in duration-300">
              {allDepts.map(dept => {
                  const usersInDept = items.filter(u => (u.department || 'Unassigned') === dept);
                  
                  return (
                      <div key={dept} className="flex-none w-80 flex flex-col">
                          <div className={`p-3 rounded-t-xl border-t border-x bg-white border-slate-200 font-bold text-slate-700 flex justify-between items-center shadow-sm`}>
                              {dept}
                              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{usersInDept.length}</span>
                          </div>
                          <div className={`bg-slate-50/50 p-2 rounded-b-xl border-x border-b border-slate-200 min-h-[200px] space-y-2`}>
                              {usersInDept.map(user => (
                                  <div key={user.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md cursor-pointer group relative overflow-hidden" onClick={() => handleEdit(user)}>
                                      <div className={`absolute top-0 left-0 w-1 h-full ${user.status === 'Active' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                      <div className="flex justify-between items-start mb-1 pl-2">
                                          <div className="font-bold text-sm text-slate-800">{user.name}</div>
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Edit2 size={12} className="text-slate-400"/>
                                          </div>
                                      </div>
                                      <div className="text-xs text-slate-500 pl-2 mb-2">{user.role}</div>
                                      <div className="flex items-center gap-2 text-xs border-t border-slate-100 pt-2 mt-2 pl-2">
                                          <Mail size={10} className="text-slate-400"/>
                                          <span className="truncate text-slate-600">{user.email || 'No Email'}</span>
                                      </div>
                                  </div>
                              ))}
                              {usersInDept.length === 0 && (
                                  <div className="text-center py-4 text-slate-400 text-xs italic">No users</div>
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">{editingItem ? 'Edit User' : 'New User'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex justify-between items-start gap-4">
                  <div className="space-y-2 flex-1">
                    <label className="block text-sm font-medium text-slate-700">Full Name</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2 w-1/3">
                    <label className="block text-sm font-medium text-slate-700">Status</label>
                    <select 
                      disabled={!editingItem}
                      className={`w-full border rounded-lg p-2.5 focus:ring-2 focus:outline-none font-medium ${formData.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} ${!editingItem ? 'opacity-60 cursor-not-allowed' : ''}`}
                      value={formData.status || 'Active'}
                      onChange={e => setFormData({...formData, status: e.target.value as 'Active'|'Inactive'})}
                    >
                        <option value="Active" className="text-green-700">Active</option>
                        <option value="Inactive" className="text-red-700">Inactive</option>
                    </select>
                  </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Email Address</label>
                <input 
                  type="email" 
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  value={formData.email || ''} 
                  onChange={e => setFormData({...formData, email: e.target.value})} 
                />
              </div>
               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="block text-sm font-medium text-slate-700">Department</label>
                   <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    value={formData.department || ''}
                    onChange={e => handleDepartmentChange(e.target.value)}
                   >
                       <option value="">Select Department</option>
                       {departments.map(d => (
                           <option key={d.id} value={d.name}>{d.name}</option>
                       ))}
                       {formData.department && !departments.find(d => d.name === formData.department) && (
                           <option value={formData.department}>{formData.department} (Legacy)</option>
                       )}
                   </select>
                </div>
                 <div className="space-y-2">
                   <label className="block text-sm font-medium text-slate-700">HOD (Auto)</label>
                   <input 
                    type="text" 
                    readOnly
                    className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-slate-500 focus:outline-none" 
                    value={formData.hod || ''} 
                   />
                </div>
              </div>
              <div className="space-y-2">
                   <label className="block text-sm font-medium text-slate-700">Role / Job Title</label>
                   <input 
                    type="text" 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                    value={formData.role || ''} 
                    onChange={e => setFormData({...formData, role: e.target.value})} 
                   />
              </div>
              
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg mt-4 hover:bg-blue-700 font-medium">Save User</button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW ASSETS MODAL */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                            {viewingUser.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{viewingUser.name}</h3>
                            <p className="text-sm text-slate-500">{viewingUser.role} • {viewingUser.department}</p>
                        </div>
                    </div>
                    <button onClick={() => setViewingUser(null)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-8">
                    {/* Hardware Section */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Monitor size={16}/> Assigned Hardware
                        </h4>
                        {hardware.filter(h => h.assignedTo === viewingUser.name).length > 0 ? (
                            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                                {hardware.filter(h => h.assignedTo === viewingUser.name).map(h => (
                                    <div key={h.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                        <div>
                                            <div className="font-bold text-slate-800">{h.name}</div>
                                            <div className="text-xs text-slate-500">{h.manufacturer} {h.model} • SN: {h.serialNumber}</div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 font-mono">{h.assetTag || 'No Tag'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm italic p-4 bg-slate-50 rounded-lg text-center">No hardware assigned.</p>
                        )}
                    </div>

                    {/* Software Section */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Disc size={16}/> Assigned Software
                        </h4>
                        {software.filter(s => s.assignedTo?.some(a => a.username === viewingUser.name)).length > 0 ? (
                            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                                {software.filter(s => s.assignedTo?.some(a => a.username === viewingUser.name)).map(s => (
                                    <div key={s.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                                        <div>
                                            <div className="font-bold text-slate-800">{s.name}</div>
                                            <div className="text-xs text-slate-500">Version: {s.version}</div>
                                        </div>
                                        <div className="text-right">
                                             <span className={`text-xs px-2 py-1 rounded font-bold ${s.type === 'Subscription' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                                 {s.type}
                                             </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm italic p-4 bg-slate-50 rounded-lg text-center">No software assigned.</p>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button onClick={() => setViewingUser(null)} className="px-4 py-2 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-lg font-medium transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Warning/Reassignment Modal for Inactive with Assets */}
      {warningData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                  <div className={`${actionType === 'delete' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'} p-6 flex gap-4 items-start border-b shrink-0`}>
                      <div className={`p-3 rounded-full shrink-0 ${actionType === 'delete' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                          <AlertTriangle size={24} />
                      </div>
                      <div>
                          <h3 className={`text-xl font-bold ${actionType === 'delete' ? 'text-red-900' : 'text-orange-900'}`}>
                              {actionType === 'delete' ? 'Delete' : 'Deactivate'} User With Assets
                          </h3>
                          <p className={`${actionType === 'delete' ? 'text-red-800' : 'text-orange-800'} text-sm mt-1`}>
                              <b>{editingItem?.name}</b> has {warningData.length} assigned items. 
                              Reassign them below or leave blank to <b>automatically unassign</b> them.
                          </p>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-0">
                      <table className="w-full text-sm text-left">
                          <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                              <tr>
                                  <th className="px-6 py-3 font-semibold">Asset Name</th>
                                  <th className="px-6 py-3 font-semibold">Type</th>
                                  <th className="px-6 py-3 font-semibold w-[40%]">New Owner</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {warningData.map((item) => (
                                  <tr key={item.id} className="hover:bg-slate-50">
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-slate-800">{item.name}</div>
                                          <div className="text-xs text-slate-500 font-mono">{item.details}</div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className={`text-xs px-2 py-1 rounded border ${item.type === 'Hardware' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                              {item.type}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="relative">
                                            <ArrowRight size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                                            <select
                                                className={`w-full border rounded-lg pl-8 pr-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${reassignmentMap[item.id] ? 'bg-green-50 border-green-300 text-green-800 font-medium' : 'bg-white border-slate-300'}`}
                                                value={reassignmentMap[item.id] || ''}
                                                onChange={(e) => handleReassignmentChange(item.id, e.target.value)}
                                            >
                                                <option value="">-- Unassign (Remove) --</option>
                                                {items.filter(u => u.status === 'Active' && u.name !== editingItem?.name).map(u => (
                                                    <option key={u.id} value={u.name}>{u.name}</option>
                                                ))}
                                            </select>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
                      <div className="text-xs text-slate-500 italic">
                          {Object.keys(reassignmentMap).length} items reassigned. {warningData.length - Object.keys(reassignmentMap).length} will be unassigned.
                      </div>
                      <div className="flex gap-3">
                        <button 
                            onClick={() => { setWarningData(null); setReassignmentMap({}); setIsModalOpen(false); setEditingItem(null); }}
                            className="px-4 py-2 text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-300 rounded-lg transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmConflictResolution}
                            className={`px-6 py-2 text-white rounded-lg shadow-sm font-medium flex items-center gap-2 ${actionType === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                        >
                            {Object.keys(reassignmentMap).length > 0 ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
                            Confirm & {actionType === 'delete' ? 'Delete' : 'Deactivate'}
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

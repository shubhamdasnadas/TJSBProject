
import React, { useState, useEffect } from 'react';
import { DepartmentItem, UserItem, CategoryItem, ConsoleAdmin, Organization, LocationItem } from '../types';
import { Plus, Trash2, Edit2, Building2, User, Settings as SettingsIcon, Tag, Shield, Lock, Download, Upload, ArrowRightLeft, FileText, Check, AlertTriangle, ArrowRight, MapPin, Unlock, Info } from 'lucide-react';
import { apiService } from '../services/api';

interface SettingsViewProps {
  departments: DepartmentItem[];
  users: UserItem[];
  categories: CategoryItem[];
  onSaveDepartment: (item: DepartmentItem) => void;
  onDeleteDepartment: (id: string) => void;
  onSaveCategory: (name: string) => void;
  onDeleteCategory: (id: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
    departments, users, categories, 
    onSaveDepartment, onDeleteDepartment, onSaveCategory, onDeleteCategory 
}) => {
  const currentUserRole = localStorage.getItem('niyojan_role') || 'Viewer';
  const currentOrgId = localStorage.getItem('niyojan_org_id');

  const [activeSection, setActiveSection] = useState('departments');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DepartmentItem | null>(null);
  const [formData, setFormData] = useState<Partial<DepartmentItem>>({});
  
  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');

  // Admin Management State
  const [admins, setAdmins] = useState<ConsoleAdmin[]>([]);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', role: 'Admin' });

  // Organization Management State (Super Admin)
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [orgFormData, setOrgFormData] = useState<Partial<Organization>>({});
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgImportData, setOrgImportData] = useState<any[]>([]);
  const [isImportingOrgs, setIsImportingOrgs] = useState(false);

  // Location Master State
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<LocationItem | null>(null);
  const [locFormData, setLocFormData] = useState<Partial<LocationItem>>({});

  // SYSTEM DEFAULTS (Mirrors HardwareView defaults for duplicate check)
  const DEFAULT_CATEGORIES = [
      "Laptop", "Desktop (CPU)", "Monitor", "Mobile", "Tablet", "Server", "Server Rack", "Printer", 
      "Scanner", "Keyboard", "Mouse", "External HDD", "TV", "Camera", "AC", "CCTV"
  ];

  // --- DUPLICATE CHECK HELPER ---
  const getMatches = (items: any[], key: string, value: string | undefined, currentId?: string) => {
      if (!value || value.length < 2) return [];
      const term = value.toLowerCase().trim();
      
      // Handle simple string array (like DEFAULT_CATEGORIES) if key is empty
      if (!key) {
          return items.filter(i => String(i).toLowerCase().includes(term)).slice(0, 5);
      }

      return items.filter(i => 
          i[key] && i[key].toString().toLowerCase().includes(term) && 
          i.id !== currentId
      ).slice(0, 5); 
  };

  const isExactMatch = (items: any[], key: string, value: string | undefined, currentId?: string) => {
      if (!value) return false;
      const term = value.toLowerCase().trim();
      
      // Handle string array
      if (!key) {
          return items.some(i => String(i).toLowerCase() === term);
      }

      return items.some(i => 
          i[key] && i[key].toString().toLowerCase() === term && 
          i.id !== currentId
      );
  };

  const renderMatches = (matches: any[], key?: string) => {
      if (matches.length === 0) return null;
      return (
          <div className="text-xs text-orange-600 mt-1 flex items-start gap-1 bg-orange-50 p-1.5 rounded border border-orange-100">
              <Info size={12} className="mt-0.5 shrink-0" />
              <span>
                  <span className="font-semibold">Similar existing entries:</span> {matches.map(m => key ? m[key] : m).join(', ')}
              </span>
          </div>
      );
  };

  useEffect(() => {
      if (activeSection === 'admins') {
          apiService.getAdmins().then(setAdmins).catch(console.error);
      }
      if (activeSection === 'organizations' && currentUserRole === 'Super Admin') {
          loadOrgs();
      }
      if (activeSection === 'locations') {
          apiService.getLocations().then(setLocations).catch(console.error);
      }
  }, [activeSection]);

  const loadOrgs = async () => {
      setOrgLoading(true);
      try {
          const data = await apiService.getOrganizations();
          setOrgs(data);
      } catch (e) { console.error(e); } 
      finally { setOrgLoading(false); }
  };

  // --- Department Logic ---
  const handleAddNew = () => {
    setEditingItem(null);
    setFormData({});
    setIsModalOpen(true);
  };

  const handleEdit = (item: DepartmentItem) => {
    setEditingItem(item);
    setFormData(item);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Duplicate Check
    if (isExactMatch(departments, 'name', formData.name, editingItem?.id)) {
        alert(`Department "${formData.name}" already exists.`);
        return;
    }

    const newItem: DepartmentItem = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      name: formData.name || 'New Department',
      hodName: formData.hodName || '',
    };
    onSaveDepartment(newItem);
    setIsModalOpen(false);
  };

  // --- Category Logic ---
  const handleAddCategory = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCategoryName.trim()) return;
      
      // Duplicate Check (Custom + Default)
      if (isExactMatch(categories, 'name', newCategoryName)) {
          alert(`Category "${newCategoryName}" already exists (Custom).`);
          return;
      }
      if (isExactMatch(DEFAULT_CATEGORIES, '', newCategoryName)) {
          alert(`Category "${newCategoryName}" is a system default and already exists.`);
          return;
      }

      onSaveCategory(newCategoryName.trim());
      setNewCategoryName('');
  };

  // --- Admin Logic ---
  const handleCreateAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (isExactMatch(admins, 'username', newAdmin.username)) {
          alert(`Username "${newAdmin.username}" is already taken.`);
          return;
      }

      try {
          await apiService.createAdmin(newAdmin as any);
          const updated = await apiService.getAdmins();
          setAdmins(updated);
          setIsAdminModalOpen(false);
          setNewAdmin({ username: '', password: '', role: 'Admin' });
      } catch (e:any) {
          alert(e.message);
      }
  };

  const handleDeleteAdmin = async (id: string) => {
      if(!confirm("Are you sure? This action cannot be undone.")) return;
      try {
          await apiService.deleteAdmin(id);
          setAdmins(admins.filter(a => a.id !== id));
      } catch (e:any) {
          alert(e.message);
      }
  };

  // --- Organization Logic ---
  const handleEditOrg = (org: Organization) => {
      setEditingOrg(org);
      setOrgFormData(org);
      setIsOrgModalOpen(true);
  };

  const handleCreateOrgModal = () => {
      setEditingOrg(null);
      // Onboarding Date defaults to Today
      const today = new Date().toISOString().split('T')[0];
      setOrgFormData({ onboardingDate: today });
      setIsOrgModalOpen(true);
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!orgFormData.name || !orgFormData.code) return;
      
      if (isExactMatch(orgs, 'name', orgFormData.name, editingOrg?.id)) {
          alert(`Organization Name "${orgFormData.name}" already exists.`);
          return;
      }
      if (isExactMatch(orgs, 'code', orgFormData.code, editingOrg?.id)) {
          alert(`Organization Code "${orgFormData.code}" already exists.`);
          return;
      }

      setOrgLoading(true);
      try {
          if (editingOrg) {
              await apiService.updateOrganization(editingOrg.id, orgFormData);
          } else {
              const token = localStorage.getItem('niyojan_token');
              await fetch(`${apiService.getApiBase()}/admin/organizations`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify(orgFormData)
              });
          }
          await loadOrgs();
          setIsOrgModalOpen(false);
          setOrgFormData({});
          setEditingOrg(null);
      } catch (e: any) {
          alert(`Failed to save organization: ${e.message}`);
      } finally {
          setOrgLoading(false);
      }
  };

  const switchOrg = (id: string) => {
      localStorage.setItem('niyojan_org_id', id);
      window.location.reload();
  };

  const downloadOrgCSV = () => {
      if (orgs.length === 0) return alert("No organizations to export");
      const headers = ['code', 'name', 'registeredAddress', 'legalEntityName', 'communicationAddress', 'pan', 'gstin', 'tan', 'cin', 'companyType', 'onboardingDate'];
      const csvContent = [
          headers.join(','),
          ...orgs.map(org => headers.map(h => `"${String((org as any)[h] || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'organizations_export.csv';
      link.click();
  };

  const handleOrgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          const text = evt.target?.result as string;
          const lines = text.split('\n').filter(l => l.trim());
          if (lines.length < 2) return alert("Invalid CSV");
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          const rows = lines.slice(1).map(line => {
              const vals = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
              const obj: any = {};
              headers.forEach((h, i) => obj[h] = vals[i] ? vals[i].replace(/^"|"$/g, '') : '');
              return obj;
          });
          setOrgImportData(rows);
      };
      reader.readAsText(file);
  };

  const confirmOrgImport = async () => {
      setIsImportingOrgs(true);
      for (const row of orgImportData) {
          try {
              const token = localStorage.getItem('niyojan_token');
              await fetch(`${apiService.getApiBase()}/admin/organizations`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({
                      name: row.name,
                      code: row.code,
                      registeredAddress: row.registeredAddress,
                      legalEntityName: row.legalEntityName,
                      communicationAddress: row.communicationAddress,
                      pan: row.pan,
                      gstin: row.gstin,
                      tan: row.tan,
                      cin: row.cin,
                      companyType: row.companyType,
                      onboardingDate: row.onboardingDate
                  })
              });
          } catch (e) { console.error("Import failed for row", row, e); }
      }
      setIsImportingOrgs(false);
      setOrgImportData([]);
      loadOrgs();
  };

  // --- Location Logic ---
  const handleEditLoc = (loc: LocationItem) => {
      setEditingLoc(loc);
      setLocFormData(loc);
      setIsLocModalOpen(true);
  };

  const handleCreateLoc = () => {
      setEditingLoc(null);
      setLocFormData({ status: 'Unlocked', type: 'HO', dateCreated: new Date().toISOString().split('T')[0] });
      setIsLocModalOpen(true);
  };

  const handleSaveLoc = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (isExactMatch(locations, 'name', locFormData.name, editingLoc?.id)) {
          alert(`Location Name "${locFormData.name}" already exists.`);
          return;
      }
      if (isExactMatch(locations, 'code', locFormData.code, editingLoc?.id)) {
          alert(`Location Code "${locFormData.code}" already exists.`);
          return;
      }

      try {
          const newItem: LocationItem = {
              // Assign temporary ID if new to ensure API treats as POST
              id: editingLoc ? editingLoc.id : Date.now().toString(),
              name: locFormData.name || '',
              code: locFormData.code || '',
              type: locFormData.type as 'HO'|'SL'|'GD',
              spocName: locFormData.spocName || '',
              spocEmail: locFormData.spocEmail || '',
              spocPhone: locFormData.spocPhone || '',
              address: locFormData.address || '',
              status: locFormData.status || 'Unlocked',
              dateCreated: locFormData.dateCreated || new Date().toISOString().split('T')[0]
          };
          await apiService.saveLocation(newItem);
          const updated = await apiService.getLocations();
          setLocations(updated);
          setIsLocModalOpen(false);
      } catch (e: any) { alert(`Failed to save location: ${e.message}`); }
  };

  const handleDeleteLoc = async (id: string) => {
      if(!confirm("Delete this location?")) return;
      try {
          await apiService.deleteLocation(id);
          setLocations(locations.filter(l => l.id !== id));
      } catch (e:any) { alert(e.message); }
  };

  const toggleLocLock = (loc: LocationItem) => {
      const newStatus = loc.status === 'Locked' ? 'Unlocked' : 'Locked';
      apiService.saveLocation({ ...loc, status: newStatus }).then(() => {
          setLocations(locations.map(l => l.id === loc.id ? { ...l, status: newStatus } : l));
      });
  };

  // --- Dynamic Matches for UI ---
  const categoryMatches = [...getMatches(categories, 'name', newCategoryName), ...getMatches(DEFAULT_CATEGORIES, '', newCategoryName)];
  const deptMatches = getMatches(departments, 'name', formData.name, editingItem?.id);
  const locNameMatches = getMatches(locations, 'name', locFormData.name, editingLoc?.id);
  const locCodeMatches = getMatches(locations, 'code', locFormData.code, editingLoc?.id);
  const adminMatches = getMatches(admins, 'username', newAdmin.username);
  const orgNameMatches = getMatches(orgs, 'name', orgFormData.name, editingOrg?.id);
  const orgCodeMatches = getMatches(orgs, 'code', orgFormData.code, editingOrg?.id);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Settings Sidebar - Sticky */}
      <div className="w-full lg:w-64 bg-white rounded-xl shadow-sm border border-slate-200 p-4 sticky top-20">
         <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 px-2">
            <SettingsIcon size={20} className="text-blue-600"/> Settings
         </h3>
         <nav className="flex lg:block gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 space-x-2 lg:space-x-0 lg:space-y-1">
             <button 
                onClick={() => setActiveSection('departments')}
                className={`whitespace-nowrap lg:w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${activeSection === 'departments' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
             >
                <Building2 size={18} /> Department Master
             </button>
             <button 
                onClick={() => setActiveSection('categories')}
                className={`whitespace-nowrap lg:w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${activeSection === 'categories' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
             >
                <Tag size={18} /> Asset Categories
             </button>
             <button 
                onClick={() => setActiveSection('locations')}
                className={`whitespace-nowrap lg:w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${activeSection === 'locations' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
             >
                <MapPin size={18} /> Location Master
             </button>
             {currentUserRole === 'Super Admin' && (
                <>
                    <button 
                        onClick={() => setActiveSection('admins')}
                        className={`whitespace-nowrap lg:w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${activeSection === 'admins' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Shield size={18} /> Console Admins
                    </button>
                    <button 
                        onClick={() => setActiveSection('organizations')}
                        className={`whitespace-nowrap lg:w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${activeSection === 'organizations' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Building2 size={18} /> Organizations
                    </button>
                </>
             )}
         </nav>
      </div>

      {/* Settings Content */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 w-full min-h-[500px]">
         {/* DEPARTMENTS */}
         {activeSection === 'departments' && (
             <div className="space-y-6">
                 <div className="flex flex-wrap justify-between items-center pb-4 border-b border-slate-100 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Department Master</h2>
                        <p className="text-sm text-slate-500">Manage organizational departments and Heads of Department (HOD).</p>
                    </div>
                    <button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
                        <Plus size={18} /> Add Department
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {departments.map(dept => (
                        <div key={dept.id} className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-2">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Building2 size={20} />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(dept)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                    <button onClick={() => onDeleteDepartment(dept.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <h3 className="font-bold text-slate-900 text-lg">{dept.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-2 bg-slate-50 p-2 rounded border border-slate-100">
                                <User size={14} />
                                <span className="font-medium">HOD:</span> {dept.hodName || 'Not Assigned'}
                            </div>
                        </div>
                    ))}
                 </div>
             </div>
         )}

         {/* CATEGORIES */}
         {activeSection === 'categories' && (
             <div className="space-y-6">
                 <div className="pb-4 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800">Custom Asset Categories</h2>
                    <p className="text-sm text-slate-500">Add new categories to the Hardware dropdown list.</p>
                 </div>

                 <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-4 items-start bg-slate-50 p-4 rounded-xl border border-slate-200">
                     <div className="flex-1 space-y-2 w-full">
                         <label className="text-sm font-medium text-slate-700">New Category Name</label>
                         <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                            placeholder="e.g. Projector, Router"
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                         />
                         {renderMatches(categoryMatches, 'name')}
                     </div>
                     <button 
                        type="submit" 
                        disabled={!newCategoryName || isExactMatch(categories, 'name', newCategoryName) || isExactMatch(DEFAULT_CATEGORIES, '', newCategoryName)}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg flex items-center gap-2 w-full sm:w-auto justify-center mt-7"
                     >
                         <Plus size={18}/> Add Category
                     </button>
                 </form>

                 <div>
                     <h3 className="font-bold text-slate-800 mb-3">Custom Categories</h3>
                     <div className="flex flex-wrap gap-3">
                         {categories.map(cat => (
                             <div key={cat.id} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg shadow-sm">
                                 <Tag size={14} className="text-slate-400"/>
                                 <span className="font-medium text-slate-700">{cat.name}</span>
                                 <button onClick={() => onDeleteCategory(cat.id)} className="text-slate-400 hover:text-red-500 ml-1">
                                     <Trash2 size={14}/>
                                 </button>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>
         )}

         {/* LOCATION MASTER */}
         {activeSection === 'locations' && (
             <div className="space-y-6">
                 <div className="flex flex-wrap justify-between items-center pb-4 border-b border-slate-100 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Location Master</h2>
                        <p className="text-sm text-slate-500">Manage sites, offices, and godowns.</p>
                    </div>
                    <button onClick={handleCreateLoc} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
                        <Plus size={18} /> Add Location
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {locations.map(loc => (
                         <div key={loc.id} className="p-5 rounded-xl border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all relative">
                             <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg text-white font-bold text-xs ${loc.type === 'HO' ? 'bg-purple-500' : loc.type === 'SL' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                                        {loc.type}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{loc.name}</h3>
                                        <div className="text-xs text-slate-500 font-mono">{loc.code}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => toggleLocLock(loc)} className={`p-1.5 rounded transition-colors ${loc.status === 'Locked' ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`} title={loc.status === 'Locked' ? 'Unlock Location' : 'Lock Location'}>
                                        {loc.status === 'Locked' ? <Lock size={16}/> : <Unlock size={16}/>}
                                    </button>
                                    <button onClick={() => handleEditLoc(loc)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDeleteLoc(loc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                </div>
                             </div>
                             
                             <div className="space-y-2 mt-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                 <div className="flex gap-2"><User size={14} className="mt-0.5 text-slate-400" /> <span className="font-medium">SPOC:</span> {loc.spocName} ({loc.spocPhone})</div>
                                 <div className="flex gap-2"><MapPin size={14} className="mt-0.5 text-slate-400" /> <span className="truncate max-w-[250px]">{loc.address}</span></div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         )}

         {/* ADMINS */}
         {activeSection === 'admins' && (
             <div className="space-y-6">
                 <div className="flex flex-wrap justify-between items-center pb-4 border-b border-slate-100 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Console Admins</h2>
                        <p className="text-sm text-slate-500">Manage who can log into the Nexus Console.</p>
                    </div>
                    <button onClick={() => setIsAdminModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
                        <Plus size={18} /> Add Admin
                    </button>
                 </div>
                 
                 <div className="grid grid-cols-1 gap-4">
                     {admins.map(admin => (
                         <div key={admin.id} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                             <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                                     <Shield size={20} className={admin.role === 'Super Admin' ? 'text-red-600' : 'text-blue-600'} />
                                 </div>
                                 <div>
                                     <div className="font-bold text-slate-900">{admin.username}</div>
                                     <div className="text-xs text-slate-500">{admin.role} • Last Login: {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Never'}</div>
                                 </div>
                             </div>
                             {admin.username !== 'Root' && (
                                 <button onClick={() => handleDeleteAdmin(admin.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                     <Trash2 size={18} />
                                 </button>
                             )}
                         </div>
                     ))}
                 </div>
             </div>
         )}

         {/* ORGANIZATIONS (SUPER ADMIN) */}
         {activeSection === 'organizations' && currentUserRole === 'Super Admin' && (
             <div className="space-y-6">
                 <div className="flex flex-wrap justify-between items-center pb-4 border-b border-slate-100 gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Organizations</h2>
                        <p className="text-sm text-slate-500">Manage multi-tenant entities and databases.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleCreateOrgModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
                            <Plus size={18} /> Create Organization
                        </button>
                    </div>
                 </div>

                 {/* Org Stats */}
                 <div className="bg-slate-900 text-white p-6 rounded-xl flex items-center justify-between shadow-lg">
                    <div>
                        <h3 className="font-bold text-lg">Current Session</h3>
                        <p className="text-slate-400 text-sm">
                            You are managing: <span className="text-white font-bold bg-slate-700 px-2 py-0.5 rounded ml-1">{currentOrgId || 'No Organization Selected'}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={downloadOrgCSV} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded flex items-center gap-2 border border-slate-600">
                            <Download size={14}/> Export List
                        </button>
                        <label className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded flex items-center gap-2 border border-slate-600 cursor-pointer">
                            <Upload size={14}/> Import CSV
                            <input type="file" accept=".csv" className="hidden" onChange={handleOrgFileUpload} />
                        </label>
                    </div>
                </div>

                {orgImportData.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex justify-between items-center">
                        <span className="text-blue-800 font-medium text-sm flex items-center gap-2">
                            <Check size={16}/> {orgImportData.length} Organizations ready to import
                        </span>
                        <button onClick={confirmOrgImport} disabled={isImportingOrgs} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
                            {isImportingOrgs ? 'Importing...' : 'Confirm Import'}
                        </button>
                    </div>
                )}

                 <div className="grid grid-cols-1 gap-4">
                     {orgs.map(org => (
                         <div key={org.id} className={`p-5 rounded-xl border shadow-sm transition-all hover:shadow-md flex flex-col md:flex-row justify-between items-start md:items-center ${currentOrgId === org.id ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white'}`}>
                             <div className="flex items-center gap-4 mb-4 md:mb-0">
                                 <div className="p-3 bg-slate-100 rounded-lg text-slate-600 shrink-0">
                                     <Building2 size={24} />
                                 </div>
                                 <div>
                                     <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                         {org.name}
                                         {currentOrgId === org.id && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>}
                                     </h3>
                                     <div className="text-xs text-slate-500 font-mono mt-1">Code: {org.code} • DB: niyojan_org_{org.id}</div>
                                     <div className="text-xs text-slate-400 mt-1">{org.companyType} • Onboarded: {org.onboardingDate || 'N/A'}</div>
                                 </div>
                             </div>
                             
                             <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                 <button onClick={() => handleEditOrg(org)} className="text-xs bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-1 transition-colors font-medium shadow-sm">
                                     <Edit2 size={14} /> Edit
                                 </button>
                                 {currentOrgId !== org.id && (
                                     <button 
                                         onClick={() => switchOrg(org.id)}
                                         className="text-xs bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-600 px-4 py-2 rounded-lg flex items-center gap-1 transition-colors font-medium shadow-sm"
                                     >
                                         <ArrowRightLeft size={14} /> Switch
                                     </button>
                                 )}
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         )}
      </div>

      {/* Add Department Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">{editingItem ? 'Edit Department' : 'New Department'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Department Name</label>
                <input 
                  type="text" 
                  required 
                  className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                  value={formData.name || ''} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                />
                {renderMatches(deptMatches, 'name')}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Head of Department (HOD)</label>
                <select 
                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    value={formData.hodName || ''}
                    onChange={e => setFormData({...formData, hodName: e.target.value})}
                >
                    <option value="">-- Select Employee --</option>
                    {users.filter(u => u.status === 'Active').map(u => (
                        <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      {isLocModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-xl font-bold text-slate-900">{editingLoc ? 'Edit Location' : 'New Location'}</h3>
                      <button onClick={() => setIsLocModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                      <form id="loc-form" onSubmit={handleSaveLoc} className="space-y-6">
                          
                          {/* Organization & Date (Read Only) */}
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Organization (Current)</label>
                                  <input type="text" readOnly className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg p-2.5 font-bold" value={currentOrgId || 'Unknown'} />
                              </div>
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Date</label>
                                  <input type="date" readOnly className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg p-2.5" value={locFormData.dateCreated || new Date().toISOString().split('T')[0]} />
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Location Name</label>
                                  <input required type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={locFormData.name || ''} onChange={e => setLocFormData({...locFormData, name: e.target.value})} />
                                  {renderMatches(locNameMatches, 'name')}
                              </div>
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Location Code</label>
                                  <input required type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={locFormData.code || ''} onChange={e => setLocFormData({...locFormData, code: e.target.value})} />
                                  {renderMatches(locCodeMatches, 'code')}
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Location Type</label>
                                  <select className="w-full border border-slate-300 rounded-lg p-2.5 bg-white" value={locFormData.type || 'HO'} onChange={e => setLocFormData({...locFormData, type: e.target.value as any})}>
                                      <option value="HO">Head Office (HO)</option>
                                      <option value="SL">Site Location (SL)</option>
                                      <option value="GD">Godown (GD)</option>
                                  </select>
                              </div>
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Status</label>
                                  <select className="w-full border border-slate-300 rounded-lg p-2.5 bg-white" value={locFormData.status || 'Unlocked'} onChange={e => setLocFormData({...locFormData, status: e.target.value as any})}>
                                      <option value="Unlocked">Unlocked (Selectable)</option>
                                      <option value="Locked">Locked (Hidden)</option>
                                  </select>
                              </div>
                          </div>

                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">SPOC Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Name</label>
                                  <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={locFormData.spocName || ''} onChange={e => setLocFormData({...locFormData, spocName: e.target.value})} />
                              </div>
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Email</label>
                                  <input type="email" className="w-full border border-slate-300 rounded-lg p-2.5" value={locFormData.spocEmail || ''} onChange={e => setLocFormData({...locFormData, spocEmail: e.target.value})} />
                              </div>
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Contact No.</label>
                                  <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5" value={locFormData.spocPhone || ''} onChange={e => setLocFormData({...locFormData, spocPhone: e.target.value})} />
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="block text-sm font-medium text-slate-700">Location Address</label>
                              <textarea className="w-full border border-slate-300 rounded-lg p-2.5 h-24" value={locFormData.address || ''} onChange={e => setLocFormData({...locFormData, address: e.target.value})}></textarea>
                          </div>
                      </form>
                  </div>
                  <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                      <button onClick={() => setIsLocModalOpen(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
                      <button type="submit" form="loc-form" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Save Location</button>
                  </div>
              </div>
          </div>
      )}

      {/* Admin Modal */}
      {isAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-slate-900">New Console Admin</h3>
                      <button onClick={() => setIsAdminModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                  </div>
                  <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
                      <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">Username</label>
                          <input required type="text" className="w-full border p-2.5 rounded-lg" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})}/>
                          {renderMatches(adminMatches, 'username')}
                      </div>
                      <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">Password</label>
                          <input required type="password" className="w-full border p-2.5 rounded-lg" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}/>
                      </div>
                      <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">Role</label>
                          <select className="w-full border p-2.5 rounded-lg bg-white" value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})}>
                              <option value="Admin">Admin (Full Access)</option>
                              <option value="Viewer">Viewer (Read Only)</option>
                              <option value="Super Admin">Super Admin</option>
                          </select>
                      </div>
                      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg mt-2 hover:bg-blue-700">Create Admin</button>
                  </form>
              </div>
          </div>
      )}

      {/* Create/Edit Organization Modal */}
      {isOrgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl h-[85vh] overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="text-xl font-bold text-slate-900">{editingOrg ? 'Edit Organization' : 'Create New Organization'}</h3>
                      <button onClick={() => setIsOrgModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                      <form id="org-form" onSubmit={handleSaveOrg} className="space-y-6">
                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">Basic Identity</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Organization Name <span className="text-red-500">*</span></label>
                                  <input required type="text" className="w-full border p-2.5 rounded-lg" value={orgFormData.name || ''} onChange={e => setOrgFormData({...orgFormData, name: e.target.value})}/>
                                  {renderMatches(orgNameMatches, 'name')}
                              </div>
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Company Code (Unique) <span className="text-red-500">*</span></label>
                                  <input 
                                    required 
                                    type="text" 
                                    className="w-full border p-2.5 rounded-lg disabled:bg-slate-100" 
                                    value={orgFormData.code || ''} 
                                    onChange={e => setOrgFormData({...orgFormData, code: e.target.value.toUpperCase()})}
                                  />
                                  {renderMatches(orgCodeMatches, 'code')}
                              </div>
                          </div>

                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 pt-2">Address & Location</h4>
                          <div className="grid grid-cols-1 gap-4">
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Registered Address</label>
                                  <input type="text" className="w-full border p-2.5 rounded-lg" value={orgFormData.registeredAddress || ''} onChange={e => setOrgFormData({...orgFormData, registeredAddress: e.target.value})}/>
                              </div>
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Communication Address</label>
                                  <input type="text" className="w-full border p-2.5 rounded-lg" value={orgFormData.communicationAddress || ''} onChange={e => setOrgFormData({...orgFormData, communicationAddress: e.target.value})}/>
                              </div>
                          </div>

                          <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2 pt-2">Legal & Statutory</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Legal Entity Name</label>
                                  <input type="text" className="w-full border p-2.5 rounded-lg" value={orgFormData.legalEntityName || ''} onChange={e => setOrgFormData({...orgFormData, legalEntityName: e.target.value})}/>
                              </div>
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">Company Type</label>
                                  <select className="w-full border p-2.5 rounded-lg bg-white" value={orgFormData.companyType || ''} onChange={e => setOrgFormData({...orgFormData, companyType: e.target.value as any})}>
                                      <option value="">-- Select Type --</option>
                                      <option value="PVT LTD">PVT LTD</option>
                                      <option value="LIMITED">LIMITED</option>
                                      <option value="LLP/Partnership">LLP/Partnership</option>
                                      <option value="Prop/HUF/AOP/BOI">Prop/HUF/AOP/BOI</option>
                                  </select>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">PAN</label>
                                  <input type="text" className="w-full border p-2.5 rounded-lg" value={orgFormData.pan || ''} onChange={e => setOrgFormData({...orgFormData, pan: e.target.value})}/>
                              </div>
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">GSTIN</label>
                                  <input type="text" className="w-full border p-2.5 rounded-lg" value={orgFormData.gstin || ''} onChange={e => setOrgFormData({...orgFormData, gstin: e.target.value})}/>
                              </div>
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">TAN</label>
                                  <input type="text" className="w-full border p-2.5 rounded-lg" value={orgFormData.tan || ''} onChange={e => setOrgFormData({...orgFormData, tan: e.target.value})}/>
                              </div>
                              <div className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">CIN</label>
                                  <input type="text" className="w-full border p-2.5 rounded-lg" value={orgFormData.cin || ''} onChange={e => setOrgFormData({...orgFormData, cin: e.target.value})}/>
                              </div>
                          </div>

                          <div className="space-y-2">
                              <label className="block text-sm font-medium text-slate-700">Date of Onboarding (Today - Read Only)</label>
                              <input 
                                type="date" 
                                readOnly 
                                className="w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-lg p-2.5 max-w-xs cursor-not-allowed" 
                                value={orgFormData.onboardingDate || new Date().toISOString().split('T')[0]} 
                              />
                          </div>
                      </form>
                  </div>
                  <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                      <button onClick={() => setIsOrgModalOpen(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg">Cancel</button>
                      <button type="submit" form="org-form" disabled={orgLoading} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                          {orgLoading ? 'Saving...' : (editingOrg ? 'Update Organization' : 'Create Organization')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

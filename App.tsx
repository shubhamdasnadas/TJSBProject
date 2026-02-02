import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { HardwareView } from './components/HardwareView';
import { SoftwareView } from './components/SoftwareView';
import { PasswordView } from './components/PasswordView';
import { UsersView } from './components/UsersView';
import { SettingsView } from './components/SettingsView';
import { PostgresHelp } from './components/PostgresHelp';
import { ImportExportView } from './components/ImportExportView';
import { LoginView } from './components/LoginView';
import { SpareView } from './components/SpareView';
import { ScrapView } from './components/ScrapView';
import { NetworkView } from './components/NetworkView';
import { AlertsView } from './components/AlertsView';
import { apiService } from './services/api';
import { HardwareItem, SoftwareItem, PasswordItem, UserItem, LifecycleEvent, DepartmentItem, CategoryItem, ConsoleAdmin, NetworkItem, AlertDefinition, LoginResponse, LocationItem } from './types';
import { Menu, X, WifiOff, AlertTriangle, Database, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{username: string, role: string} | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Data State
  const [hardware, setHardware] = useState<HardwareItem[]>([]);
  const [software, setSoftware] = useState<SoftwareItem[]>([]);
  const [networkDevices, setNetworkDevices] = useState<NetworkItem[]>([]);
  const [passwords, setPasswords] = useState<PasswordItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [lifecycle, setLifecycle] = useState<LifecycleEvent[]>([]);
  const [alertDefinitions, setAlertDefinitions] = useState<AlertDefinition[]>([]);

  useEffect(() => {
      // Check for session
      const token = localStorage.getItem('niyojan_token');
      const user = localStorage.getItem('niyojan_user');
      const role = localStorage.getItem('niyojan_role');
      const org = localStorage.getItem('niyojan_org_id');

      if (token && user && role) {
          setIsAuthenticated(true);
          setCurrentUser({ username: user, role });
          setCurrentOrgId(org);
          
          if (role === 'Super Admin' && !org) {
              setActiveTab('settings'); // Force Super Admin to settings to select org
          } else {
              loadData();
          }
      }
  }, []);

  const handleLogin = (data: LoginResponse) => {
      localStorage.setItem('niyojan_token', data.token);
      
      const displayName = 'username' in data.user ? data.user.username : data.user.name;
      localStorage.setItem('niyojan_user', displayName);
      
      localStorage.setItem('niyojan_role', data.role);
      
      const storedOrg = localStorage.getItem('niyojan_org_id');
      
      setIsAuthenticated(true);
      setCurrentUser({ username: displayName, role: data.role });
      setCurrentOrgId(storedOrg);

      if (data.role === 'Super Admin' && !storedOrg) {
          setActiveTab('settings');
      } else {
          loadData();
      }
  };

  const handleLogout = () => {
      localStorage.removeItem('niyojan_token');
      localStorage.removeItem('niyojan_user');
      localStorage.removeItem('niyojan_role');
      localStorage.removeItem('niyojan_org_id');
      
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentOrgId(null);
      setHardware([]);
      setSoftware([]);
      setNetworkDevices([]);
  };

  // Load Data with 'silent' option to prevent UI flickering/resetting
  const loadData = async (silent = false) => {
    if (!localStorage.getItem('niyojan_org_id') && currentUser?.role !== 'Super Admin') return;

    if (!silent) setLoading(true);
    setApiError(null);
    const host = window.location.hostname || 'localhost';
    try {
        const isHealthy = await apiService.checkHealth();
        if (!isHealthy) {
            setApiError(`Could not connect to Niyojan API at ${host}:3001. Ensure the server is running.`);
            setLoading(false);
            return;
        }
        
        // Parallel Fetch
        const promises: Promise<any>[] = [
          apiService.getHardware(),
          apiService.getSoftware(),
          apiService.getUsers(),
          apiService.getDepartments(),
          apiService.getCategories(),
          apiService.getLocations(),
          apiService.getLifecycle(),
          apiService.getNetworkDevices(),
          apiService.getAlertDefinitions()
        ];

        // Only fetch passwords if Super Admin
        const role = localStorage.getItem('niyojan_role');
        if (role === 'Super Admin') {
            promises.push(apiService.getPasswords());
        }

        const results = await Promise.all(promises);
        
        setHardware(results[0] as HardwareItem[]);
        setSoftware(results[1] as SoftwareItem[]);
        setUsers(results[2] as UserItem[]);
        setDepartments(results[3] as DepartmentItem[]);
        setCategories(results[4] as CategoryItem[]);
        setLocations(results[5] as LocationItem[]);
        setLifecycle(results[6] as LifecycleEvent[]);
        setNetworkDevices(results[7] as NetworkItem[]);
        setAlertDefinitions(results[8] as AlertDefinition[]);
        
        if (role === 'Super Admin') {
            setPasswords(results[9] as PasswordItem[]);
        } else {
            setPasswords([]);
        }

    } catch (err: any) {
        setApiError(`Database Error: ${err.message}`);
    } finally {
        if (!silent) setLoading(false);
    }
  };

  // Logging
  const logEvent = async (event: Partial<LifecycleEvent>) => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localISOTime = new Date(now.getTime() - offsetMs).toISOString().slice(0, 19).replace('T', ' ');

    const fullEvent: LifecycleEvent = {
      id: Date.now().toString(),
      timestamp: localISOTime,
      assetId: event.assetId || 'unknown',
      assetType: event.assetType || 'Hardware',
      eventType: event.eventType || 'UPDATED',
      description: event.description || 'Action performed',
      previousValue: event.previousValue,
      newValue: event.newValue,
      actor: currentUser?.username
    };
    try {
        await apiService.addLifecycleEvent(fullEvent);
        const l = await apiService.getLifecycle();
        setLifecycle(l);
    } catch (e) { console.error("Failed to log event", e); }
  };

  const calculateChanges = (oldObj: any, newObj: any, ignoredKeys: string[] = []) => {
      const changes: {field: string, old: any, new: any}[] = [];
      const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
      
      allKeys.forEach(key => {
          if (ignoredKeys.includes(key)) return;
          let valOld = oldObj[key];
          let valNew = newObj[key];
          if (valOld === null || valOld === undefined) valOld = '';
          if (valNew === null || valNew === undefined) valNew = '';

          if (JSON.stringify(valOld) !== JSON.stringify(valNew)) {
              const fieldLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              changes.push({ field: fieldLabel, old: valOld, new: valNew });
          }
      });
      return changes;
  };

  // --- HARDWARE ---
  const saveHardware = async (item: HardwareItem) => {
    const existing = hardware.find(h => h.id === item.id);
    let logType: LifecycleEvent['eventType'] = 'UPDATED';
    let description = '';
    let newValStr: string | undefined = undefined;

    if (!existing) {
        logType = 'CREATED';
        description = `Registered new device: ${item.name}`;
    } else {
        const changes = calculateChanges(existing, item, ['id', 'assignedTo', 'status']);
        if (existing.assignedTo !== item.assignedTo) {
            logType = 'ASSIGNED';
            description = item.assignedTo ? `Assigned to ${item.assignedTo}` : `Unassigned from ${existing.assignedTo}`;
            newValStr = JSON.stringify([{ field: 'Owner', old: existing.assignedTo || 'Unassigned', new: item.assignedTo || 'Unassigned' }]);
        } else if (existing.status !== item.status) {
            logType = 'STATUS_CHANGE';
            description = `Status changed to ${item.status}`;
            newValStr = JSON.stringify([{ field: 'Status', old: existing.status, new: item.status }]);
        } else if (changes.length > 0) {
            logType = 'UPDATED';
            description = `Updated ${changes.length} field(s)`;
            newValStr = JSON.stringify(changes);
        } else {
            description = 'Updated details';
        }
    }

    try {
      const saved = await apiService.saveHardware(item);
      if (!existing || description !== 'Updated details' || newValStr) {
          logEvent({ assetId: saved.id, assetType: 'Hardware', eventType: logType, description, newValue: newValStr });
      }
      loadData(true); 
    } catch (e: any) { alert(`Failed to save hardware: ${e.message}`); }
  };

  const deleteHardware = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      await apiService.deleteHardware(id);
      logEvent({ assetId: id, assetType: 'Hardware', eventType: 'DELETED', description: 'Asset deleted permanently' });
      loadData(true);
    } catch (e: any) { alert(`Failed to delete: ${e.message}`); }
  };

  // --- NETWORK ---
  const saveNetworkDevice = async (item: NetworkItem) => {
      const existing = networkDevices.find(n => n.id === item.id);
      let logType: LifecycleEvent['eventType'] = 'UPDATED';
      let description = '';
      let newValStr: string | undefined = undefined;
      
      if (!existing) {
          logType = 'CREATED';
          description = `Added Network Device: ${item.name}`;
      } else {
          const changes = calculateChanges(existing, item, ['id', 'status']);
          if (existing.status !== item.status) {
             logType = 'STATUS_CHANGE';
             description = `Status changed to ${item.status}`;
             newValStr = JSON.stringify([{ field: 'Status', old: existing.status, new: item.status }]);
          } else if (changes.length > 0) {
              logType = 'UPDATED';
              description = `Updated ${changes.length} field(s)`;
              newValStr = JSON.stringify(changes);
          } else {
              description = 'Updated details';
          }
      }

      try {
          const saved = await apiService.saveNetworkDevice(item);
          if (!existing || description !== 'Updated details' || newValStr) {
             logEvent({ assetId: saved.id, assetType: 'Network', eventType: logType, description, newValue: newValStr });
          }
          loadData(true);
      } catch (e: any) { alert(`Failed to save network device: ${e.message}`); }
  };

  const deleteNetworkDevice = async (id: string) => {
      if (!confirm('Are you sure you want to delete this network device?')) return;
      try {
          await apiService.deleteNetworkDevice(id);
          logEvent({ assetId: id, assetType: 'Network', eventType: 'DELETED', description: 'Device deleted' });
          loadData(true);
      } catch (e: any) { alert(`Failed to delete: ${e.message}`); }
  };

  // --- SOFTWARE ---
  const saveSoftware = async (item: SoftwareItem) => {
    const existing = software.find(s => s.id === item.id);
    let logType: LifecycleEvent['eventType'] = 'UPDATED';
    let description = '';
    
    if (!existing) {
        logType = 'CREATED';
        description = `Added License: ${item.name}`;
    } else {
        const changes = calculateChanges(existing, item, ['id', 'assignedTo']);
        // Check assignments manually since they are arrays
        if (JSON.stringify(existing.assignedTo) !== JSON.stringify(item.assignedTo)) {
             logType = 'ASSIGNED';
             const diff = (item.assignedTo?.length || 0) - (existing.assignedTo?.length || 0);
             description = diff > 0 ? `Assigned to ${diff} new user(s)` : `Removed assignment(s)`;
        } else if (changes.length > 0) {
            description = `Updated ${changes.length} field(s)`;
        } else {
            description = 'Updated details';
        }
    }

    try {
      const saved = await apiService.saveSoftware(item);
      logEvent({ assetId: saved.id, assetType: 'Software', eventType: logType, description });
      loadData(true);
    } catch (e: any) { alert(`Failed to save software: ${e.message}`); }
  };

  const deleteSoftware = async (id: string) => {
    if (!confirm('Are you sure you want to delete this license?')) return;
    try {
      await apiService.deleteSoftware(id);
      logEvent({ assetId: id, assetType: 'Software', eventType: 'DELETED', description: 'License deleted' });
      loadData(true);
    } catch (e: any) { alert(`Failed to delete: ${e.message}`); }
  };

  // --- USERS ---
  const saveUser = async (item: UserItem) => {
    try {
      await apiService.saveUser(item);
      loadData(true);
    } catch (e: any) { alert(`Failed to save user: ${e.message}`); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await apiService.deleteUser(id);
      loadData(true);
    } catch (e: any) { alert(`Failed to delete: ${e.message}`); }
  };

  // --- PASSWORDS ---
  const savePassword = async (item: PasswordItem) => {
    try {
      await apiService.savePassword(item);
      loadData(true);
    } catch (e: any) { alert(`Failed to save secret: ${e.message}`); }
  };

  const deletePassword = async (id: string) => {
    if (!confirm('Delete this secret?')) return;
    try {
      await apiService.deletePassword(id);
      loadData(true);
    } catch (e: any) { alert(`Failed to delete: ${e.message}`); }
  };

  // --- ALERTS ---
  const saveAlert = async (def: Omit<AlertDefinition, 'id'>) => {
      try {
          await apiService.createAlertDefinition(def);
          loadData(true);
      } catch (e: any) { alert(`Failed to save alert: ${e.message}`); }
  };
  const deleteAlert = async (id: string) => {
      if(!confirm('Delete Alert Rule?')) return;
      try {
          await apiService.deleteAlertDefinition(id);
          loadData(true);
      } catch (e: any) { alert(`Failed to delete: ${e.message}`); }
  };

  // --- SETTINGS ---
  const saveDepartment = async (item: DepartmentItem) => {
      try {
          await apiService.saveDepartment(item);
          loadData(true); // Silent reload
      } catch (e: any) { alert(`Failed to save department: ${e.message}`); }
  };
  const deleteDepartment = async (id: string) => {
      if(!confirm('Delete Department?')) return;
      try {
          await apiService.deleteDepartment(id);
          loadData(true); // Silent reload
      } catch (e: any) { alert(`Failed to delete: ${e.message}`); }
  };
  const saveCategory = async (name: string) => {
      try {
          await apiService.saveCategory(name);
          loadData(true); // Silent reload to keep tab active
      } catch (e: any) { alert(`Failed to save category: ${e.message}`); }
  };
  const deleteCategory = async (id: string) => {
      if(!confirm('Delete Category?')) return;
      try {
          await apiService.deleteCategory(id);
          loadData(true); // Silent reload
      } catch (e: any) { alert(`Failed to delete: ${e.message}`); }
  };

  // --- IMPORT ---
  const handleImportHardware = async (items: HardwareItem[]) => {
      for (const item of items) { await apiService.saveHardware(item); }
      loadData(true);
  };

  const handleImportSoftware = async (items: SoftwareItem[]) => {
      for (const item of items) { await apiService.saveSoftware(item); }
      loadData(true);
  };

  const handleImportNetwork = async (items: NetworkItem[]) => {
      for (const item of items) { await apiService.saveNetworkDevice(item); }
      loadData(true);
  };

  // --- RENDER ---
  if (!isAuthenticated) {
      return <LoginView onLoginSuccess={handleLogin} />;
  }

  const renderContent = () => {
    // Guard: Normal views need an Organization Context
    if (!currentOrgId && activeTab !== 'settings') {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] text-center">
                <Database size={64} className="text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">No Organization Selected</h2>
                <p className="text-slate-500 max-w-sm mt-2">
                    Please go to Settings to select or create an Organization.
                </p>
                <button onClick={() => setActiveTab('settings')} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                    Go to Settings
                </button>
            </div>
        );
    }

    if (activeTab === 'dashboard') return <Dashboard hardware={hardware} software={software} network={networkDevices} passwords={passwords} lifecycle={lifecycle} alertDefinitions={alertDefinitions} />;
    if (activeTab === 'hardware') return <HardwareView items={hardware} users={users} departments={departments} locations={locations} lifecycle={lifecycle} customCategories={categories} onSave={saveHardware} onDelete={deleteHardware} />;
    if (activeTab === 'network') return <NetworkView items={networkDevices} locations={locations} lifecycle={lifecycle} onSave={saveNetworkDevice} onDelete={deleteNetworkDevice} />;
    if (activeTab === 'software') return <SoftwareView items={software} users={users} departments={departments} lifecycle={lifecycle} onSave={saveSoftware} onDelete={deleteSoftware} />;
    if (activeTab === 'passwords') {
        if (currentUser?.role !== 'Super Admin') return <div className="p-10 text-center text-red-500 font-bold">Access Denied</div>;
        return <PasswordView items={passwords} onSave={savePassword} onDelete={deletePassword} />;
    }
    if (activeTab === 'users') return <UsersView items={users} departments={departments} hardware={hardware} software={software} onSave={saveUser} onDelete={deleteUser} onSaveHardware={saveHardware} onSaveSoftware={saveSoftware} />;
    if (activeTab === 'settings') return <SettingsView departments={departments} users={users} categories={categories} onSaveDepartment={saveDepartment} onDeleteDepartment={deleteDepartment} onSaveCategory={saveCategory} onDeleteCategory={deleteCategory} />;
    if (activeTab === 'postgres') return <PostgresHelp />;
    
    // Updated Import/Export View passing necessary data props
    if (activeTab === 'import-export') return <ImportExportView 
        onImportHardware={handleImportHardware} 
        onImportSoftware={handleImportSoftware} 
        onImportNetwork={handleImportNetwork}
        users={users}
        departments={departments}
        locations={locations}
        categories={categories}
    />;
    
    if (activeTab === 'spare') return <SpareView hardware={hardware} software={software} network={networkDevices} />;
    if (activeTab === 'scrap') return <ScrapView items={[...hardware, ...networkDevices]} onSaveHardware={saveHardware} onSaveNetwork={saveNetworkDevice} onDeleteHardware={deleteHardware} onDeleteNetwork={deleteNetworkDevice} />;
    if (activeTab === 'alerts') return <AlertsView definitions={alertDefinitions} onSave={saveAlert} onDelete={deleteAlert} />;
    
    return null;
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} userRole={currentUser?.role} />

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 w-full bg-slate-900 text-white z-20 flex justify-between items-center p-4 shadow-md">
        <div className="font-bold text-lg flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-xs">N</div>
            Niyojan
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-800 z-10 pt-20 px-6 space-y-4">
           <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className="block text-white text-lg py-2">Dashboard</button>
           <button onClick={() => { setActiveTab('alerts'); setIsMobileMenuOpen(false); }} className="block text-white text-lg py-2">Alerts</button>
           <button onClick={() => { setActiveTab('hardware'); setIsMobileMenuOpen(false); }} className="block text-white text-lg py-2">Hardware</button>
           <button onClick={() => { setActiveTab('network'); setIsMobileMenuOpen(false); }} className="block text-white text-lg py-2">Network</button>
           <button onClick={() => { setActiveTab('software'); setIsMobileMenuOpen(false); }} className="block text-white text-lg py-2">Software</button>
           <button onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} className="block text-white text-lg py-2">Users</button>
        </div>
      )}

      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
            {/* Header / User Profile */}
            <div className="flex justify-end items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold text-slate-800">{currentUser?.username}</div>
                        <div className="text-xs text-slate-500">{currentUser?.role}</div>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm">
                        {currentUser?.username.charAt(0).toUpperCase()}
                    </div>
                    <button 
                        onClick={handleLogout} 
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {apiError ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-2xl mx-auto mt-10 shadow-sm">
                    <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <WifiOff className="text-red-600" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-red-700 mb-2">Connection Error</h2>
                    <p className="text-slate-600 mb-6">{apiError}</p>
                    
                    <div className="bg-white p-4 rounded-lg text-left border border-red-100 text-sm mb-6">
                        <p className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                             <ShieldAlert size={16} className="text-orange-500"/>
                             Is this a Self-Signed Certificate issue?
                        </p>
                        <p className="text-slate-500 mb-3">
                            If you are running on HTTPS with a self-signed certificate, your browser blocked the connection.
                        </p>
                        <a 
                            href={apiService.getApiBase().replace('/api', '/api/health')} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium break-all"
                        >
                            Click here to open the API: {apiService.getApiBase().replace('/api', '')}
                        </a>
                        <p className="text-slate-500 mt-2">
                            Then click <b>"Advanced" &gt; "Proceed to..."</b> (unsafe). After that, refresh this page.
                        </p>
                    </div>

                    <div className="flex justify-center gap-3">
                        <button 
                            onClick={() => window.location.reload()} 
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <RefreshCw size={18} /> Retry Connection
                        </button>
                        <button 
                            onClick={() => setActiveTab('postgres')}
                            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <Database size={18} /> DB Settings
                        </button>
                    </div>
                </div>
            ) : loading ? (
                 <div className="flex flex-col items-center justify-center h-[60vh]">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                     <p className="text-slate-500 font-medium">Loading Inventory...</p>
                 </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {renderContent()}
                </div>
            )}
            
            {/* Missing Tables Error Check (Tenant DB specific) */}
            {apiError && apiError.includes('relation') && (
                 <div className="fixed bottom-6 right-6 max-w-sm bg-yellow-50 border border-yellow-200 p-4 rounded-xl shadow-xl z-50 animate-in slide-in-from-right-10">
                     <div className="flex gap-3">
                         <AlertTriangle className="text-yellow-600 shrink-0" />
                         <div>
                             <h4 className="font-bold text-yellow-800">Database Schema Error</h4>
                             <p className="text-xs text-yellow-700 mt-1 mb-2">
                                 It looks like some tables are missing in this Organization's database.
                             </p>
                             <button 
                                onClick={() => setActiveTab('postgres')}
                                className="text-xs bg-yellow-600 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-700 transition-colors"
                             >
                                 View Schema & Fix
                             </button>
                         </div>
                     </div>
                 </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
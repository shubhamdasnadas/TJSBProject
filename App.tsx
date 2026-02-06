
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
// import { ReportsView } from './components/ReportsView';
import { apiService } from './services/api';
import { 
  HardwareItem, SoftwareItem, PasswordItem, UserItem, 
  LifecycleEvent, DepartmentItem, CategoryItem, NetworkItem, 
  AlertDefinition, LoginResponse, LocationItem 
} from './types';
import { WifiOff, RefreshCw, LogOut } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{username: string, role: string} | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      const token = localStorage.getItem('niyojan_token');
      const user = localStorage.getItem('niyojan_user');
      const role = localStorage.getItem('niyojan_role');
      
      localStorage.setItem('niyojan_org_id', 'pcpl');

      if (token && user && role) {
          setIsAuthenticated(true);
          setCurrentUser({ username: user, role });
          loadData();
      }
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setApiError(null);
    try {
        const isHealthy = await apiService.checkHealth();
        if (!isHealthy) {
            setApiError(`Could not connect to Niyojan API on port 3001. Ensure server.js is running.`);
            setLoading(false);
            return;
        }
        
        const results = await Promise.all([
          apiService.getHardware(),
          apiService.getSoftware(),
          apiService.getUsers(),
          apiService.getDepartments(),
          apiService.getCategories(),
          apiService.getLocations(),
          apiService.getLifecycle(),
          apiService.getNetworkDevices(),
          apiService.getAlertDefinitions()
        ]);

        setHardware(results[0]);
        setSoftware(results[1]);
        setUsers(results[2]);
        setDepartments(results[3]);
        setCategories(results[4]);
        setLocations(results[5]);
        setLifecycle(results[6]);
        setNetworkDevices(results[7]);
        setAlertDefinitions(results[8]);

    } catch (err: any) {
        setApiError(`Database Error: ${err.message}`);
    } finally {
        if (!silent) setLoading(false);
    }
  };

  const handleLogin = (data: LoginResponse) => {
      localStorage.setItem('niyojan_token', data.token);
      const displayName = 'username' in data.user ? data.user.username : data.user.name;
      localStorage.setItem('niyojan_user', displayName);
      localStorage.setItem('niyojan_role', data.role);
      localStorage.setItem('niyojan_org_id', 'pcpl');
      
      setIsAuthenticated(true);
      setCurrentUser({ username: displayName, role: data.role });
      loadData();
  };

  const handleLogout = () => {
      localStorage.removeItem('niyojan_token');
      localStorage.removeItem('niyojan_user');
      localStorage.removeItem('niyojan_role');
      setIsAuthenticated(false);
      setCurrentUser(null);
  };

  // --- CRUD HANDLERS ---
  const saveHardware = async (item: HardwareItem) => {
    try {
      await apiService.saveHardware(item);
      loadData(true);
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const deleteHardware = async (id: string) => {
    if (!confirm('Permanently delete this asset?')) return;
    try {
      await apiService.deleteHardware(id);
      loadData(true);
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const saveSoftware = async (item: SoftwareItem) => {
    try {
      await apiService.saveSoftware(item);
      loadData(true);
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

  const deleteSoftware = async (id: string) => {
    if (!confirm('Permanently delete this license?')) return;
    try {
      await apiService.deleteSoftware(id);
      loadData(true);
    } catch (e: any) { alert(`Error: ${e.message}`); }
  };

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

  if (!isAuthenticated) return <LoginView onLoginSuccess={handleLogin} />;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard hardware={hardware} software={software} network={networkDevices} passwords={passwords} lifecycle={lifecycle} alertDefinitions={alertDefinitions} />;
      case 'hardware':
        return <HardwareView items={hardware} users={users} departments={departments} locations={locations} lifecycle={lifecycle} customCategories={categories} onSave={saveHardware} onDelete={deleteHardware} />;
      case 'software':
        return <SoftwareView items={software} users={users} departments={departments} lifecycle={lifecycle} onSave={saveSoftware} onDelete={deleteSoftware} />;
      case 'network':
        return <NetworkView items={networkDevices} locations={locations} lifecycle={lifecycle} onSave={async (item) => { await apiService.saveNetworkDevice(item); loadData(true); }} onDelete={async (id) => { if(confirm('Delete?')) { await apiService.deleteNetworkDevice(id); loadData(true); } }} />;
      case 'users':
        return <UsersView items={users} departments={departments} hardware={hardware} software={software} onSave={saveUser} onDelete={deleteUser} onSaveHardware={saveHardware} onSaveSoftware={saveSoftware} />;
      case 'spare':
        return <SpareView hardware={hardware} software={software} network={networkDevices} />;
      case 'scrap':
        return <ScrapView items={[...hardware, ...networkDevices]} onSaveHardware={saveHardware} onSaveNetwork={async (item) => { await apiService.saveNetworkDevice(item); loadData(true); }} onDeleteHardware={deleteHardware} onDeleteNetwork={async (id) => { await apiService.deleteNetworkDevice(id); loadData(true); } } />;
      case 'alerts':
        return <AlertsView definitions={alertDefinitions} onSave={async (def) => { await apiService.createAlertDefinition(def); loadData(true); }} onDelete={async () => {}} />;
      case 'reports':
        // return <ReportsView />;
      case 'settings':
        return <SettingsView 
          departments={departments} 
          users={users} 
          categories={categories} 
          onSaveDepartment={async (item) => { await apiService.saveDepartment(item); loadData(true); }} 
          onDeleteDepartment={async () => {}} 
          onSaveCategory={async (name) => { await apiService.saveCategory(name); loadData(true); }} 
          onDeleteCategory={async () => {}} 
        />;
      case 'import-export':
        return <ImportExportView 
          users={users} 
          departments={departments} 
          locations={locations} 
          categories={categories} 
          onImportHardware={async (items) => { for(const i of items) await apiService.saveHardware(i); loadData(true); }}
          onImportSoftware={async (items) => { for(const i of items) await apiService.saveSoftware(i); loadData(true); }}
          onImportNetwork={async (items) => { for(const i of items) await apiService.saveNetworkDevice(i); loadData(true); }}
        />;
      case 'postgres':
        return <PostgresHelp />;
      default:
        return <div className="p-10 text-center text-slate-400">Section coming soon...</div>;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} userRole={currentUser?.role} />
      <main className="flex-1 md:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-end items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-sm font-bold text-slate-800">{currentUser?.username}</div>
                        <div className="text-xs text-slate-500">{currentUser?.role} • PCPL Mode</div>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"><LogOut size={20} /></button>
                </div>
            </div>

            {apiError ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-10 text-center max-w-2xl mx-auto mt-10 shadow-sm">
                    <WifiOff className="text-red-600 mx-auto mb-4" size={56} />
                    <h2 className="text-2xl font-black text-red-700 uppercase tracking-tight">Backend Connection Failed</h2>
                    <p className="text-slate-600 mb-8 font-medium leading-relaxed">{apiError}</p>
                    <button onClick={() => loadData()} className="bg-red-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 mx-auto hover:bg-red-700 transition-all shadow-xl shadow-red-100"><RefreshCw size={20} /> Reconnect</button>
                </div>
            ) : loading ? (
                 <div className="flex flex-col items-center justify-center h-[60vh]">
                     <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-blue-600 mb-6"></div>
                     <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing with Niyojan_DB...</p>
                 </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {renderContent()}
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;

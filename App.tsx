import React, { useState, useEffect, useCallback } from 'react';
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
import { HardwareItem, SoftwareItem, PasswordItem, UserItem, LifecycleEvent, DepartmentItem, CategoryItem, NetworkItem, AlertDefinition, LoginResponse, LocationItem } from './types';
import { LogOut, RefreshCcw, Database, ServerCrash, Key, Building2 } from 'lucide-react';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{username: string, role: string} | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

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

  const checkConnection = useCallback(async () => {
      try {
          const status = await apiService.checkHealthDetailed();
          setIsOnline(status.status === 'ok');
          setDbError(status.status === 'error' ? status.message : null);
      } catch (e) {
          setIsOnline(false);
          setDbError("Backend API is unreachable.");
      }
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
        const [hw, sw, usr, dept, cat, loc, net, alrt, pass, life] = await Promise.all([
          apiService.getHardware(), apiService.getSoftware(), apiService.getUsers(), apiService.getDepartments(),
          apiService.getCategories(), apiService.getLocations(), apiService.getNetworkDevices(),
          apiService.getAlertDefinitions(),
          apiService.getPasswords(),
          apiService.getLifecycle()
        ]);
        
        setHardware(hw || []); 
        setSoftware(sw || []); 
        setUsers(usr || []); 
        setDepartments(dept || []);
        setCategories(cat || []); 
        setLocations(loc || []); 
        setNetworkDevices(net || []);
        setAlertDefinitions(alrt || []); 
        setPasswords(pass || []);
        setLifecycle(life || []);
        
    } catch (err: any) { 
        console.error("Data Load Error:", err);
    } finally { 
        if (!silent) setLoading(false); 
    }
  }, []);

  useEffect(() => {
      checkConnection();
      const token = localStorage.getItem('niyojan_token');
      const user = localStorage.getItem('niyojan_user');
      const role = localStorage.getItem('niyojan_role');
      
      if (token && user && role) {
          setIsAuthenticated(true);
          setCurrentUser({ username: user, role });
      }
  }, [checkConnection]);

  useEffect(() => {
      if (isAuthenticated && isOnline && !dbError) {
          loadData();
      }
  }, [isAuthenticated, isOnline, dbError, loadData]);

  const handleLoginSuccess = (data: LoginResponse) => {
      localStorage.setItem('niyojan_token', data.token);
      const username = 'username' in data.user ? data.user.username : (data.user as UserItem).name;
      localStorage.setItem('niyojan_user', username);
      localStorage.setItem('niyojan_role', data.role);
      setIsAuthenticated(true);
      setCurrentUser({ username, role: data.role });
  };

  const handleLogout = () => {
      localStorage.clear();
      setIsAuthenticated(false);
      window.location.reload();
  };

  const renderContent = () => {
    if (dbError && dbError.toLowerCase().includes('authentication')) {
        return (
            <div className="max-w-3xl mx-auto mt-12 bg-white rounded-3xl shadow-2xl overflow-hidden border border-red-100 p-8">
                <h3 className="text-2xl font-bold text-red-600 flex items-center gap-2"><Key/> DB Auth Failed</h3>
                <p className="mt-2 text-slate-600">Please check your <b>DB_PASSWORD</b> in .env.local</p>
            </div>
        );
    }
    if (isOnline === false) {
        return (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <ServerCrash size={40} className="mx-auto mb-4 text-slate-400" />
                <h3 className="text-2xl font-bold text-slate-800">Backend API Offline</h3>
                <button onClick={checkConnection} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Retry Connection</button>
            </div>
        );
    }

    if (activeTab === 'dashboard') return <Dashboard hardware={hardware} software={software} network={networkDevices} passwords={passwords} lifecycle={lifecycle} alertDefinitions={alertDefinitions} />;
    if (activeTab === 'hardware') return <HardwareView items={hardware} users={users} departments={departments} locations={locations} lifecycle={lifecycle} customCategories={categories} onSave={h => apiService.saveHardware(h).then(() => loadData(true))} onDelete={id => apiService.deleteHardware(id).then(() => loadData(true))} />;
    if (activeTab === 'software') return <SoftwareView items={software} users={users} departments={departments} lifecycle={lifecycle} onSave={s => apiService.saveSoftware(s).then(() => loadData(true))} onDelete={id => apiService.deleteSoftware(id).then(() => loadData(true))} />;
    if (activeTab === 'users') return <UsersView items={users} departments={departments} hardware={hardware} software={software} onSave={u => apiService.saveUser(u).then(() => loadData(true))} onDelete={id => apiService.deleteUser(id).then(() => loadData(true))} onSaveHardware={h => apiService.saveHardware(h).then(() => loadData(true))} onSaveSoftware={s => apiService.saveSoftware(s).then(() => loadData(true))} />;
    if (activeTab === 'import-export') return <ImportExportView onImportHardware={async h => { for(let i of h) await apiService.saveHardware(i); loadData(true); }} onImportSoftware={async s => { for(let i of s) await apiService.saveSoftware(i); loadData(true); }} onImportNetwork={async n => { for(let i of n) await apiService.saveNetworkDevice(i); loadData(true); }} users={users} departments={departments} locations={locations} categories={categories} />;
    if (activeTab === 'postgres') return <PostgresHelp />;
    if (activeTab === 'settings') return <SettingsView departments={departments} users={users} categories={categories} onSaveDepartment={d => apiService.saveDepartment(d).then(() => loadData(true))} onDeleteDepartment={id => apiService.deleteDepartment(id).then(() => loadData(true))} onSaveCategory={c => apiService.saveCategory(c).then(() => loadData(true))} onDeleteCategory={id => apiService.deleteCategory(id).then(() => loadData(true))} />;
    if (activeTab === 'network') return <NetworkView items={networkDevices} locations={locations} lifecycle={lifecycle} onSave={n => apiService.saveNetworkDevice(n).then(() => loadData(true))} onDelete={id => apiService.deleteNetworkDevice(id).then(() => loadData(true))} />;
    if (activeTab === 'alerts') return <AlertsView definitions={alertDefinitions} onSave={a => apiService.createAlertDefinition(a).then(() => loadData(true))} onDelete={id => apiService.deleteAlertDefinition(id).then(() => loadData(true))} />;
    if (activeTab === 'spare') return <SpareView hardware={hardware} software={software} network={networkDevices} />;
    if (activeTab === 'scrap') return <ScrapView items={[...hardware, ...networkDevices]} onSaveHardware={h => apiService.saveHardware(h).then(() => loadData(true))} onSaveNetwork={n => apiService.saveNetworkDevice(n).then(() => loadData(true))} onDeleteHardware={id => apiService.deleteHardware(id).then(() => loadData(true))} onDeleteNetwork={id => apiService.deleteNetworkDevice(id).then(() => loadData(true))} />;
    if (activeTab === 'passwords') return <PasswordView items={passwords} onSave={p => apiService.savePassword(p).then(() => loadData(true))} onDelete={id => apiService.deletePassword(id).then(() => loadData(true))} />;
    
    return null;
  };

  if (!isAuthenticated) return <LoginView onLoginSuccess={handleLoginSuccess} />;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} userRole={currentUser?.role} />
      <main className="flex-1 md:ml-64 p-8">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 gap-4">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 pr-6 border-r border-slate-100 text-slate-800 font-black uppercase text-sm">
                        <Building2 size={18} className="text-blue-500" />
                        PCPL Organization
                    </div>
                    <div className="flex items-center gap-3">
                        <Database size={18} className="text-slate-400" />
                        <div className="text-[10px] font-mono font-bold text-slate-600 uppercase">
                            Pool: niyojan_org_pcpl
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => loadData()} className="p-2 text-slate-400 hover:text-blue-600 transition-all">
                        <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">{currentUser?.username}</div>
                        <div className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-1.5 rounded">{currentUser?.role}</div>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 transition-all">
                        <LogOut size={20}/>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-bold text-slate-400 text-xs tracking-widest uppercase">Syncing PCPL Data...</p>
                </div>
            ) : renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{username: string, role: string} | null>(null);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      // CLEANUP: Remove any legacy mock data keys from LocalStorage
      const mockKeys = ['nexus_users', 'nexus_hardware', 'nexus_software', 'nexus_passwords', 'nexus_lifecycle'];
      mockKeys.forEach(k => localStorage.removeItem(k));

      const token = localStorage.getItem('niyojan_token');
      const user = localStorage.getItem('niyojan_user');
      const role = localStorage.getItem('niyojan_role');
      
      // FORCED CONTEXT
      localStorage.setItem('niyojan_org_id', 'pcpl');
      setCurrentOrgId('pcpl');

      if (token && user && role) {
          setIsAuthenticated(true);
          setCurrentUser({ username: user, role });
          loadData();
      }
  }, []);

  const handleLogin = (data: LoginResponse) => {
      localStorage.setItem('niyojan_token', data.token);
      const displayName = 'username' in data.user ? data.user.username : data.user.name;
      localStorage.setItem('niyojan_user', displayName);
      localStorage.setItem('niyojan_role', data.role);
      localStorage.setItem('niyojan_org_id', 'pcpl');
      
      setIsAuthenticated(true);
      setCurrentUser({ username: displayName, role: data.role });
      setCurrentOrgId('pcpl');
      loadData();
  };

  const handleLogout = () => {
      localStorage.removeItem('niyojan_token');
      localStorage.removeItem('niyojan_user');
      localStorage.removeItem('niyojan_role');
      setIsAuthenticated(false);
      setCurrentUser(null);
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    setApiError(null);
    try {
        const isHealthy = await apiService.checkHealth();
        if (!isHealthy) {
            setApiError(`Could not connect to Niyojan API. Ensure server.js is running on port 3001.`);
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

  // Remaining CRUD handlers... (saveHardware, saveSoftware, etc.)

  if (!isAuthenticated) return <LoginView onLoginSuccess={handleLogin} />;

  const renderContent = () => {
    if (activeTab === 'dashboard') return <Dashboard hardware={hardware} software={software} network={networkDevices} passwords={passwords} lifecycle={lifecycle} alertDefinitions={alertDefinitions} />;
    if (activeTab === 'hardware') return <HardwareView items={hardware} users={users} departments={departments} locations={locations} lifecycle={lifecycle} customCategories={categories} onSave={() => {}} onDelete={() => {}} />;
    if (activeTab === 'users') return <UsersView items={users} departments={departments} hardware={hardware} software={software} onSave={saveUser} onDelete={deleteUser} onSaveHardware={async () => {}} onSaveSoftware={async () => {}} />;
    if (activeTab === 'settings') return <SettingsView departments={departments} users={users} categories={categories} onSaveDepartment={() => {}} onDeleteDepartment={() => {}} onSaveCategory={() => {}} onDeleteCategory={() => {}} />;
    if (activeTab === 'postgres') return <PostgresHelp />;
    return <div className="p-10 text-center text-slate-400">Section coming soon...</div>;
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
                    <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 rounded-lg"><LogOut size={20} /></button>
                </div>
            </div>

            {apiError ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-2xl mx-auto mt-10">
                    <WifiOff className="text-red-600 mx-auto mb-4" size={48} />
                    <h2 className="text-xl font-bold text-red-700">API Connection Error</h2>
                    <p className="text-slate-600 mb-6">{apiError}</p>
                    <button onClick={() => loadData()} className="bg-red-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto"><RefreshCw size={18} /> Retry</button>
                </div>
            ) : loading ? (
                 <div className="flex flex-col items-center justify-center h-[60vh]">
                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                     <p className="text-slate-500 font-medium">Connecting to niyojan_org_pcpl...</p>
                 </div>
            ) : (
                <div className="animate-in fade-in duration-500">
                    {renderContent()}
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;

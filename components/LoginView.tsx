
import React, { useState } from 'react';
import { apiService } from '../services/api';
import { LoginResponse, Organization } from '../types';
import { Lock, User, ArrowRight, AlertTriangle, Building2, LayoutGrid } from 'lucide-react';

interface LoginViewProps {
    onLoginSuccess: (data: LoginResponse) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
    const [step, setStep] = useState<'credentials' | 'select-org'>('credentials');
    
    // Credentials
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Super Admin Selection
    const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);
    const [superAdminData, setSuperAdminData] = useState<LoginResponse | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Standard User Login (Org ID is now auto-detected by backend)
            const response = await apiService.login(username, password);

            if (response.isSuperAdmin) {
                // If Super Admin, allow them to pick organization
                setSuperAdminData(response);
                setAvailableOrgs(response.availableOrgs || []);
                setStep('select-org');
            } else {
                // Standard login - Server returns the found Org ID
                if (response.orgId) {
                    localStorage.setItem('niyojan_org_id', response.orgId);
                }
                onLoginSuccess(response);
            }
        } catch (err: any) {
            setError(err.message === 'HTTP Error 401' ? 'Invalid credentials' : err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOrgSelect = (selectedOrgId: string) => {
        if (!superAdminData) return;
        
        // Inject selected org into storage/context logic
        localStorage.setItem('niyojan_org_id', selectedOrgId);
        
        onLoginSuccess(superAdminData);
    };

    if (step === 'select-org') {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
                    <div className="bg-slate-800 p-6 text-white border-b border-slate-700">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <LayoutGrid className="text-blue-400"/> Select Organization
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">Welcome back, Root. Choose a tenant to manage.</p>
                    </div>
                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                        {availableOrgs.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                No organizations found. 
                                <button onClick={() => handleOrgSelect('')} className="block mx-auto mt-2 text-blue-600 hover:underline">
                                    Continue to Dashboard (Create One)
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {availableOrgs.map(org => (
                                    <button 
                                        key={org.id}
                                        onClick={() => handleOrgSelect(org.id)}
                                        className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all text-left group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-blue-200 group-hover:text-blue-700">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 group-hover:text-blue-800">{org.name}</h3>
                                                <div className="text-xs text-slate-500 font-mono">ID: {org.id}</div>
                                            </div>
                                        </div>
                                        <ArrowRight className="text-slate-300 group-hover:text-blue-500" size={20} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-slate-50 border-t text-center">
                        <button onClick={() => setStep('credentials')} className="text-slate-500 hover:text-slate-800 text-sm">Back to Login</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <span className="text-3xl font-bold text-blue-600">N</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Niyojan SaaS</h1>
                        <p className="text-blue-100 text-sm mt-2">Enterprise Inventory Management</p>
                    </div>
                    <div className="absolute top-0 left-0 w-full h-full bg-blue-700 opacity-20 transform rotate-45 translate-y-1/2"></div>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                            <AlertTriangle size={16} /> {error}
                        </div>
                    )}
                    
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                required
                                className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Enter username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="password" 
                                required
                                className="w-full border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Enter password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 disabled:opacity-70 mt-2"
                    >
                        {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

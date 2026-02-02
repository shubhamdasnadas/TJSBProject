
import React, { useState, useEffect } from 'react';
import { Organization } from '../types';
import { apiService } from '../services/api';
import { Building2, Plus, ArrowRightLeft, Database, Loader2 } from 'lucide-react';

interface SuperAdminViewProps {
    currentOrgId: string | null;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = ({ currentOrgId }) => {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Create Org State
    const [isCreating, setIsCreating] = useState(false);
    const [newOrg, setNewOrg] = useState({ id: '', name: '' });
    const [creatingStatus, setCreatingStatus] = useState(false);

    useEffect(() => {
        loadOrgs();
    }, []);

    const loadOrgs = async () => {
        try {
            const data = await apiService.getOrganizations();
            setOrgs(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingStatus(true);
        try {
            await apiService.createOrganization(newOrg.id, newOrg.name);
            await loadOrgs();
            setIsCreating(false);
            setNewOrg({ id: '', name: '' });
        } catch (e: any) {
            alert(e.message);
        } finally {
            setCreatingStatus(false);
        }
    };

    const switchOrg = (id: string) => {
        localStorage.setItem('niyojan_org_id', id);
        window.location.reload();
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Database className="text-blue-600" /> Organization Management
                    </h2>
                    <p className="text-slate-500 mt-1">Super Admin Console • Master Database</p>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
                >
                    <Plus size={18} /> New Organization
                </button>
            </div>

            {/* Current Context Banner */}
            <div className="bg-slate-900 text-white p-6 rounded-xl flex items-center justify-between shadow-lg">
                <div>
                    <h3 className="font-bold text-lg">Current Session</h3>
                    <p className="text-slate-400 text-sm">
                        You are currently managing: <span className="text-white font-bold bg-slate-700 px-2 py-0.5 rounded ml-1">{currentOrgId || 'No Organization Selected'}</span>
                    </p>
                </div>
                {!currentOrgId && (
                    <div className="text-sm bg-yellow-600/20 text-yellow-300 px-3 py-1 rounded border border-yellow-600/50">
                        ⚠ Select an Organization to view Inventory
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-10"><Loader2 className="animate-spin mx-auto text-slate-400"/></div>
                ) : (
                    orgs.map(org => (
                        <div key={org.id} className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all ${currentOrgId === org.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
                                    <Building2 size={24} />
                                </div>
                                {currentOrgId !== org.id && (
                                    <button 
                                        onClick={() => switchOrg(org.id)}
                                        className="text-xs bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors font-medium"
                                    >
                                        <ArrowRightLeft size={14} /> Switch
                                    </button>
                                )}
                                {currentOrgId === org.id && (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Active</span>
                                )}
                            </div>
                            
                            <h3 className="font-bold text-slate-900 text-lg mb-1">{org.name}</h3>
                            <div className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded w-fit mb-4">ID: {org.id}</div>
                            
                            <div className="text-xs text-slate-400 border-t pt-3 flex justify-between">
                                <span>Database: niyojan_org_{org.id}</span>
                                <span>{new Date(org.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Create New Tenant</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Organization Name</label>
                                <input 
                                    required 
                                    type="text" 
                                    className="w-full border p-2.5 rounded-lg"
                                    placeholder="e.g. Tesla Corp"
                                    value={newOrg.name} 
                                    onChange={e => setNewOrg({...newOrg, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">Organization ID (Slug)</label>
                                <input 
                                    required 
                                    type="text" 
                                    className="w-full border p-2.5 rounded-lg font-mono text-sm"
                                    placeholder="e.g. tesla"
                                    value={newOrg.id} 
                                    onChange={e => setNewOrg({...newOrg, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                                />
                                <p className="text-xs text-slate-500">This will create database: <b>niyojan_org_{newOrg.id || '...'}</b></p>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                                <button type="submit" disabled={creatingStatus} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2">
                                    {creatingStatus && <Loader2 size={16} className="animate-spin" />}
                                    {creatingStatus ? 'Provisioning DB...' : 'Create Organization'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

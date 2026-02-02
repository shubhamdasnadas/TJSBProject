import React, { useState } from 'react';
import { PasswordItem } from '../types';
import { Plus, Trash2, Eye, EyeOff, Copy, ShieldAlert } from 'lucide-react';
import { analyzeSecurity } from '../services/gemini';

interface PasswordViewProps {
  items: PasswordItem[];
  onSave: (item: PasswordItem) => void;
  onDelete: (id: string) => void;
}

export const PasswordView: React.FC<PasswordViewProps> = ({ items, onSave, onDelete }) => {
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<PasswordItem>>({});
  const [securityTip, setSecurityTip] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const toggleVisibility = (id: string) => {
    setVisibleId(visibleId === id ? null : id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: PasswordItem = {
      id: Date.now().toString(),
      serviceName: formData.serviceName || 'Untitled Service',
      username: formData.username || '',
      encryptedPassword: formData.encryptedPassword || '', // Simulating encryption
      url: formData.url || '',
      category: formData.category || 'General',
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    onSave(newItem);
    setIsModalOpen(false);
    setFormData({});
  };

  const handleSecurityCheck = async () => {
    setIsAnalyzing(true);
    const dataForAI = items.map(i => ({serviceName: i.serviceName, username: i.username}));
    const tip = await analyzeSecurity(dataForAI);
    setSecurityTip(tip);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Secrets Manager</h2>
          <p className="text-xs text-slate-500 mt-1">⚠ Passwords are stored in local storage. Do not use for real sensitive data in this demo.</p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={handleSecurityCheck} 
            disabled={isAnalyzing}
            className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <ShieldAlert size={18} />
            {isAnalyzing ? 'Analyzing...' : 'AI Security Audit'}
          </button>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus size={18} /> Add Secret
          </button>
        </div>
      </div>

      {securityTip && (
        <div className="bg-purple-50 border border-purple-100 p-4 rounded-lg text-purple-800 text-sm flex gap-3 items-start">
          <ShieldAlert className="shrink-0 mt-0.5" size={18} />
          <div>
            <span className="font-bold block mb-1">AI Security Insight:</span>
            {securityTip}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 font-bold text-lg">
                  {item.serviceName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{item.serviceName}</h3>
                  <p className="text-sm text-slate-500">{item.username}</p>
                </div>
              </div>
              <button onClick={() => onDelete(item.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg flex items-center justify-between border border-slate-100">
              <code className="text-sm font-mono text-slate-700">
                {visibleId === item.id ? item.encryptedPassword : '••••••••••••••••'}
              </code>
              <div className="flex gap-2">
                <button onClick={() => toggleVisibility(item.id)} className="text-slate-400 hover:text-blue-600">
                  {visibleId === item.id ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
                <button onClick={() => copyToClipboard(item.encryptedPassword)} className="text-slate-400 hover:text-blue-600">
                  <Copy size={16}/>
                </button>
              </div>
            </div>
            
            <div className="mt-3 flex justify-between items-center">
               <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">{item.category}</span>
               <a href={item.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate max-w-[150px]">{item.url}</a>
            </div>
          </div>
        ))}
      </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold">Add New Secret</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <input type="text" placeholder="Service Name (e.g. GitHub)" className="w-full border p-2 rounded" required onChange={e => setFormData({...formData, serviceName: e.target.value})}/>
              <input type="text" placeholder="Username / Email" className="w-full border p-2 rounded" required onChange={e => setFormData({...formData, username: e.target.value})}/>
              <input type="password" placeholder="Password" className="w-full border p-2 rounded" required onChange={e => setFormData({...formData, encryptedPassword: e.target.value})}/>
              <input type="url" placeholder="URL" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, url: e.target.value})}/>
              <input type="text" placeholder="Category" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, category: e.target.value})}/>
              
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

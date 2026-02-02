
import { HardwareItem, SoftwareItem, PasswordItem, UserItem, LifecycleEvent, DepartmentItem, CategoryItem, ConsoleAdmin, NetworkItem, AlertDefinition, Organization, LoginResponse, LocationItem } from '../types';

const getHost = () => {
  const stored = localStorage.getItem('niyojan_api_host');
  if (stored) return stored;
  return window.location.hostname || 'localhost';
};

const getProtocol = () => localStorage.getItem('niyojan_api_protocol') || 'http';
const getApiBase = () => `${getProtocol()}://${getHost()}:3001/api`;

// Helper to get headers with Organization context
const getHeaders = () => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    const orgId = localStorage.getItem('niyojan_org_id');
    if (orgId) {
        headers['X-Organization-ID'] = orgId;
    }
    return headers;
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    let errorMessage = `HTTP Error ${res.status}`;
    try {
      const json = await res.json();
      if (json.error) errorMessage = json.error;
    } catch (e) { }
    throw new Error(errorMessage);
  }
  return res.json();
};

export const apiService = {
  getApiBase,

  checkHealth: async (): Promise<boolean> => {
    const host = getHost();
    try {
        const res = await fetch(`https://${host}:3001/api/health`, { method: 'GET', signal: AbortSignal.timeout(1000) });
        if (res.ok) { localStorage.setItem('niyojan_api_protocol', 'https'); return true; }
    } catch (e) {}
    try {
        const res = await fetch(`http://${host}:3001/api/health`, { method: 'GET', signal: AbortSignal.timeout(1000) });
        if (res.ok) { localStorage.setItem('niyojan_api_protocol', 'http'); return true; }
    } catch (e) {}
    return false;
  },

  // --- AUTH & ADMINS ---
  login: async (username: string, password: string, orgId?: string): Promise<LoginResponse> => {
      const res = await fetch(`${getApiBase()}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, orgId })
      });
      return handleResponse(res);
  },

  // --- ORGANIZATION MANAGEMENT (SUPER ADMIN) ---
  getOrganizations: async (): Promise<Organization[]> => {
      const res = await fetch(`${getApiBase()}/admin/organizations`, { headers: getHeaders() });
      return handleResponse(res);
  },

  createOrganization: async (id: string, name: string): Promise<Organization> => {
      const res = await fetch(`${getApiBase()}/admin/organizations`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ id, name })
      });
      return handleResponse(res);
  },

  updateOrganization: async (id: string, data: Partial<Organization>): Promise<Organization> => {
      const res = await fetch(`${getApiBase()}/admin/organizations/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(data)
      });
      return handleResponse(res);
  },

  // --- STANDARD ASSETS ---
  getHardware: async (): Promise<HardwareItem[]> => {
    const res = await fetch(`${getApiBase()}/hardware`, { headers: getHeaders() });
    return handleResponse(res);
  },
  
  saveHardware: async (item: HardwareItem): Promise<HardwareItem> => {
    const idStr = String(item.id);
    const isNew = idStr.length > 10 || idStr.includes('.');
    const url = isNew ? `${getApiBase()}/hardware` : `${getApiBase()}/hardware/${item.id}`;
    const method = isNew ? 'POST' : 'PUT';
    
    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(item) });
    return handleResponse(res);
  },

  deleteHardware: async (id: string) => {
    const res = await fetch(`${getApiBase()}/hardware/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete');
  },

  getNetworkDevices: async (): Promise<NetworkItem[]> => {
      try {
          const res = await fetch(`${getApiBase()}/network`, { headers: getHeaders() });
          if (res.status === 404) return [];
          return handleResponse(res);
      } catch (e) { return []; }
  },

  saveNetworkDevice: async (item: NetworkItem): Promise<NetworkItem> => {
      const idStr = String(item.id);
      const isNew = idStr.length > 10 || idStr.includes('.');
      const url = isNew ? `${getApiBase()}/network` : `${getApiBase()}/network/${item.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(item) });
      return handleResponse(res);
  },

  deleteNetworkDevice: async (id: string) => {
      const res = await fetch(`${getApiBase()}/network/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to delete');
  },

  getSoftware: async (): Promise<SoftwareItem[]> => {
    const res = await fetch(`${getApiBase()}/software`, { headers: getHeaders() });
    return handleResponse(res);
  },

  saveSoftware: async (item: SoftwareItem): Promise<SoftwareItem> => {
    const idStr = String(item.id);
    const isNew = idStr.length > 10 || idStr.includes('.');
    const url = isNew ? `${getApiBase()}/software` : `${getApiBase()}/software/${item.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(item) });
    return handleResponse(res);
  },

  deleteSoftware: async (id: string) => {
    const res = await fetch(`${getApiBase()}/software/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete');
  },

  getPasswords: async (): Promise<PasswordItem[]> => {
    const res = await fetch(`${getApiBase()}/secrets`, { headers: getHeaders() });
    return handleResponse(res);
  },

  savePassword: async (item: PasswordItem): Promise<PasswordItem> => {
    const idStr = String(item.id);
    const isNew = idStr.length > 10 || idStr.includes('.');
    const url = isNew ? `${getApiBase()}/secrets` : `${getApiBase()}/secrets/${item.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(item) });
    return handleResponse(res);
  },

  deletePassword: async (id: string) => {
    const res = await fetch(`${getApiBase()}/secrets/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete');
  },

  getUsers: async (): Promise<UserItem[]> => {
    const res = await fetch(`${getApiBase()}/users`, { headers: getHeaders() });
    return handleResponse(res);
  },

  saveUser: async (item: UserItem): Promise<UserItem> => {
    const idStr = String(item.id);
    const isNew = idStr.length > 10 || idStr.includes('.');
    const url = isNew ? `${getApiBase()}/users` : `${getApiBase()}/users/${item.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(item) });
    return handleResponse(res);
  },

  deleteUser: async (id: string) => {
    const res = await fetch(`${getApiBase()}/users/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete');
  },

  getDepartments: async (): Promise<DepartmentItem[]> => {
    const res = await fetch(`${getApiBase()}/departments`, { headers: getHeaders() });
    return handleResponse(res);
  },

  saveDepartment: async (item: DepartmentItem): Promise<DepartmentItem> => {
    const idStr = String(item.id);
    const isNew = idStr.length > 10 || idStr.includes('.');
    const url = isNew ? `${getApiBase()}/departments` : `${getApiBase()}/departments/${item.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(item) });
    return handleResponse(res);
  },

  deleteDepartment: async (id: string) => {
    const res = await fetch(`${getApiBase()}/departments/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete');
  },

  getCategories: async (): Promise<CategoryItem[]> => {
    const res = await fetch(`${getApiBase()}/categories`, { headers: getHeaders() });
    return handleResponse(res);
  },

  saveCategory: async (name: string): Promise<CategoryItem> => {
    const res = await fetch(`${getApiBase()}/categories`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ name }) });
    return handleResponse(res);
  },

  deleteCategory: async (id: string) => {
    const res = await fetch(`${getApiBase()}/categories/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to delete');
  },

  getLocations: async (): Promise<LocationItem[]> => {
      const res = await fetch(`${getApiBase()}/locations`, { headers: getHeaders() });
      return handleResponse(res);
  },

  saveLocation: async (item: LocationItem): Promise<LocationItem> => {
      const idStr = String(item.id);
      // Logic update: Ensure empty IDs or long timestamp IDs are treated as NEW (POST)
      const isNew = !item.id || idStr.length > 10 || idStr.includes('.');
      
      const url = isNew ? `${getApiBase()}/locations` : `${getApiBase()}/locations/${item.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(item) });
      return handleResponse(res);
  },

  deleteLocation: async (id: string) => {
      const res = await fetch(`${getApiBase()}/locations/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to delete');
  },

  getLifecycle: async (): Promise<LifecycleEvent[]> => {
    const res = await fetch(`${getApiBase()}/lifecycle`, { headers: getHeaders() });
    return handleResponse(res);
  },

  addLifecycleEvent: async (event: LifecycleEvent): Promise<LifecycleEvent> => {
    const res = await fetch(`${getApiBase()}/lifecycle`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(event) });
    return handleResponse(res);
  },

  getAdmins: async (): Promise<ConsoleAdmin[]> => {
      const res = await fetch(`${getApiBase()}/admins`, { headers: getHeaders() });
      return handleResponse(res);
  },

  createAdmin: async (admin: Partial<ConsoleAdmin> & { password: string }): Promise<ConsoleAdmin> => {
      const res = await fetch(`${getApiBase()}/admins`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(admin)
      });
      return handleResponse(res);
  },

  deleteAdmin: async (id: string) => {
      const res = await fetch(`${getApiBase()}/admins/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to delete admin');
  },

  getAlertDefinitions: async (): Promise<AlertDefinition[]> => {
      const res = await fetch(`${getApiBase()}/alerts/definitions`, { headers: getHeaders() });
      return handleResponse(res);
  },

  createAlertDefinition: async (alert: Omit<AlertDefinition, 'id'>): Promise<AlertDefinition> => {
      const res = await fetch(`${getApiBase()}/alerts/definitions`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(alert)
      });
      return handleResponse(res);
  },

  deleteAlertDefinition: async (id: string) => {
      const res = await fetch(`${getApiBase()}/alerts/definitions/${id}`, { method: 'DELETE', headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to delete alert');
  },
};

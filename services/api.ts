
import { HardwareItem, SoftwareItem, PasswordItem, UserItem, LifecycleEvent, DepartmentItem, CategoryItem, ConsoleAdmin, NetworkItem, AlertDefinition, Organization, LoginResponse, LocationItem } from '../types';

const getHost = () => {
  const stored = localStorage.getItem('niyojan_api_host');
  if (stored) return stored;
  return window.location.hostname || 'localhost';
};

const getProtocol = () => localStorage.getItem('niyojan_api_protocol') || 'http';
const getApiBase = () => `${getProtocol()}://${getHost()}:3001/api`;

const getHeaders = () => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    const orgId = localStorage.getItem('niyojan_org_id') || 'pcpl';
    headers['X-Organization-ID'] = orgId;
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

const isNewRecord = (id: string | number | undefined): boolean => {
    if (!id) return true;
    const idStr = String(id);
    // If ID is a long timestamp (frontend generated) or NaN, it's new.
    // If ID is a small numeric string (Postgres serial), it's existing.
    return idStr.length > 10 || isNaN(Number(idStr));
};

export const apiService = {
  getApiBase,

  checkHealth: async (): Promise<boolean> => {
    try {
        const res = await fetch(`${getApiBase()}/health`, { method: 'GET', signal: AbortSignal.timeout(1500) });
        return res.ok;
    } catch (e) { return false; }
  },

  login: async (username: string, password: string, orgId?: string): Promise<LoginResponse> => {
      const res = await fetch(`${getApiBase()}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, orgId })
      });
      return handleResponse(res);
  },

  initializeDatabase: async (): Promise<{ message: string }> => {
    const res = await fetch(`${getApiBase()}/admin/init`, { method: 'POST', headers: getHeaders() });
    return handleResponse(res);
  },

  getUsers: async (): Promise<UserItem[]> => {
    const res = await fetch(`${getApiBase()}/users`, { headers: getHeaders() });
    return handleResponse(res);
  },

  saveUser: async (item: UserItem): Promise<UserItem> => {
    const isNew = isNewRecord(item.id);
    const url = isNew ? `${getApiBase()}/users` : `${getApiBase()}/users/${item.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(item) });
    return handleResponse(res);
  },

  deleteUser: async (id: string) => {
    await fetch(`${getApiBase()}/users/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  getHardware: async (): Promise<HardwareItem[]> => {
    const res = await fetch(`${getApiBase()}/hardware`, { headers: getHeaders() });
    return handleResponse(res);
  },
  
  saveHardware: async (item: HardwareItem): Promise<HardwareItem> => {
    const isNew = isNewRecord(item.id);
    const url = isNew ? `${getApiBase()}/hardware` : `${getApiBase()}/hardware/${item.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(item) });
    return handleResponse(res);
  },

  deleteHardware: async (id: string) => {
    await fetch(`${getApiBase()}/hardware/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  getSoftware: async (): Promise<SoftwareItem[]> => {
    const res = await fetch(`${getApiBase()}/software`, { headers: getHeaders() });
    return handleResponse(res);
  },

  saveSoftware: async (item: SoftwareItem): Promise<SoftwareItem> => {
    const isNew = isNewRecord(item.id);
    const url = isNew ? `${getApiBase()}/software` : `${getApiBase()}/software/${item.id}`;
    const method = isNew ? 'POST' : 'PUT';
    
    const res = await fetch(url, { 
        method, 
        headers: getHeaders(), 
        body: JSON.stringify(item) 
    });
    return handleResponse(res);
  },

  deleteSoftware: async (id: string) => {
    await fetch(`${getApiBase()}/software/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  getLifecycle: async (): Promise<LifecycleEvent[]> => {
    const res = await fetch(`${getApiBase()}/lifecycle`, { headers: getHeaders() });
    return handleResponse(res);
  },

  addLifecycleEvent: async (event: LifecycleEvent): Promise<LifecycleEvent> => {
    const res = await fetch(`${getApiBase()}/lifecycle`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(event) });
    return handleResponse(res);
  },

  getDepartments: async (): Promise<DepartmentItem[]> => {
    const res = await fetch(`${getApiBase()}/departments`, { headers: getHeaders() });
    return handleResponse(res);
  },

  saveDepartment: async (item: DepartmentItem): Promise<DepartmentItem> => {
    const isNew = isNewRecord(item.id);
    const url = isNew ? `${getApiBase()}/departments` : `${getApiBase()}/departments/${item.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(item) });
    return handleResponse(res);
  },

  getCategories: async (): Promise<CategoryItem[]> => {
    const res = await fetch(`${getApiBase()}/categories`, { headers: getHeaders() });
    return handleResponse(res);
  },

  saveCategory: async (name: string): Promise<CategoryItem> => {
    const res = await fetch(`${getApiBase()}/categories`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ name }) });
    return handleResponse(res);
  },

  getLocations: async (): Promise<LocationItem[]> => {
      const res = await fetch(`${getApiBase()}/locations`, { headers: getHeaders() });
      return handleResponse(res);
  },

  saveLocation: async (item: LocationItem): Promise<LocationItem> => {
    const isNew = isNewRecord(item.id);
    const url = isNew ? `${getApiBase()}/locations` : `${getApiBase()}/locations/${item.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(item) });
    return handleResponse(res);
  },

  deleteLocation: async (id: string): Promise<void> => {
    await fetch(`${getApiBase()}/locations/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  getNetworkDevices: async (): Promise<NetworkItem[]> => {
      const res = await fetch(`${getApiBase()}/network`, { headers: getHeaders() });
      return handleResponse(res);
  },

  saveNetworkDevice: async (item: NetworkItem): Promise<NetworkItem> => {
    const isNew = isNewRecord(item.id);
    const url = isNew ? `${getApiBase()}/network` : `${getApiBase()}/network/${item.id}`;
    const method = isNew ? 'POST' : 'PUT';
    const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(item) });
    return handleResponse(res);
  },

  deleteNetworkDevice: async (id: string): Promise<void> => {
    await fetch(`${getApiBase()}/network/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  getAlertDefinitions: async (): Promise<AlertDefinition[]> => {
      const res = await fetch(`${getApiBase()}/alerts/definitions`, { headers: getHeaders() });
      return handleResponse(res);
  },

  createAlertDefinition: async (def: Omit<AlertDefinition, 'id'>): Promise<AlertDefinition> => {
    const res = await fetch(`${getApiBase()}/alerts/definitions`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(def) });
    return handleResponse(res);
  },

  getOrganizations: async (): Promise<Organization[]> => { return []; },
  createOrganization: async (payload: { code: string, name: string }): Promise<Organization> => { return {} as Organization; },
  getAdmins: async (): Promise<ConsoleAdmin[]> => { return []; },
  createAdmin: async (payload: any): Promise<ConsoleAdmin> => { return {} as ConsoleAdmin; },
  deleteAdmin: async (id: string): Promise<void> => {}
};

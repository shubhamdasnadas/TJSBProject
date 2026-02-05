import {
  HardwareItem,
  SoftwareItem,
  PasswordItem,
  UserItem,
  LifecycleEvent,
  DepartmentItem,
  CategoryItem,
  ConsoleAdmin,
  NetworkItem,
  AlertDefinition,
  Organization,
  LoginResponse,
  LocationItem,
} from '../types';

/* ================= CORE CONFIG ================= */

const getHost = () =>
  localStorage.getItem('niyojan_api_host') ||
  window.location.hostname ||
  'localhost';

const getProtocol = () =>
  localStorage.getItem('niyojan_api_protocol') || 'http';

export const getApiBase = () =>
  `${getProtocol()}://${getHost()}:3002/api`;

/* ================= HELPERS ================= */

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = localStorage.getItem('niyojan_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  
  const orgId = localStorage.getItem('niyojan_org_id') || 'pcpl';
  headers['x-organization-id'] = orgId;

  return headers;
};

const isNewEntity = (id?: string | number) =>
  !id || String(id).length > 10 || String(id).includes('.');

const request = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...options.headers }
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const json = await res.json();
      if (json.error) message = json.error;
    } catch {}
    throw new Error(message);
  }

  return res.json();
};

const saveEntity = <T extends { id?: string | number }>(
  baseUrl: string,
  item: T
): Promise<T> => {
  const isNew = isNewEntity(item.id);

  return request<T>(
    isNew ? baseUrl : `${baseUrl}/${item.id}`,
    {
      method: isNew ? 'POST' : 'PUT',
      body: JSON.stringify(item),
    }
  );
};

const deleteEntity = async (url: string) => {
  await request<void>(url, {
    method: 'DELETE',
  });
};

/* ================= API SERVICE ================= */

export const apiService = {
  getApiBase,

  /* ---------- HEALTH ---------- */
  checkHealth: async () =>
    request<{ status: string }>(`${getApiBase()}/health`),

  // Required by App.tsx
  checkHealthDetailed: async (): Promise<{ status: string, message: string }> => {
    try {
        const res = await fetch(`${getApiBase()}/health`, { 
            method: 'GET', 
            headers: getHeaders(),
            signal: AbortSignal.timeout(2000) 
        });
        return await res.json();
    } catch (e) {
        return { status: 'error', message: 'API Offline' };
    }
  },

  /* ---------- AUTH ---------- */
  login: async (
    username: string,
    password: string
  ): Promise<LoginResponse> =>
    request<LoginResponse>(`${getApiBase()}/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  /* ---------- HARDWARE ---------- */
  getHardware: () =>
    request<HardwareItem[]>(`${getApiBase()}/hardware`),

  saveHardware: (item: HardwareItem) =>
    saveEntity<HardwareItem>(`${getApiBase()}/hardware`, item),

  deleteHardware: (id: string) =>
    deleteEntity(`${getApiBase()}/hardware/${id}`),

  /* ---------- SOFTWARE ---------- */
  getSoftware: () =>
    request<SoftwareItem[]>(`${getApiBase()}/software`),

  saveSoftware: (item: SoftwareItem) =>
    saveEntity<SoftwareItem>(`${getApiBase()}/software`, item),

  deleteSoftware: (id: string) =>
    deleteEntity(`${getApiBase()}/software/${id}`),

  /* ---------- NETWORK ---------- */
  getNetworkDevices: () =>
    request<NetworkItem[]>(`${getApiBase()}/network`),

  saveNetworkDevice: (item: NetworkItem) =>
    saveEntity<NetworkItem>(`${getApiBase()}/network`, item),

  deleteNetworkDevice: (id: string) =>
    deleteEntity(`${getApiBase()}/network/${id}`),

  /* ---------- PASSWORDS / SECRETS ---------- */
  getPasswords: () =>
    request<PasswordItem[]>(`${getApiBase()}/secrets`),

  savePassword: (item: PasswordItem) =>
    saveEntity<PasswordItem>(`${getApiBase()}/secrets`, item),

  deletePassword: (id: string) =>
    deleteEntity(`${getApiBase()}/secrets/${id}`),

  /* ---------- USERS ---------- */
  getUsers: () =>
    request<UserItem[]>(`${getApiBase()}/users`),

  saveUser: (item: UserItem) =>
    saveEntity<UserItem>(`${getApiBase()}/users`, item),

  deleteUser: (id: string) =>
    deleteEntity(`${getApiBase()}/users/${id}`),

  /* ---------- DEPARTMENTS ---------- */
  getDepartments: () =>
    request<DepartmentItem[]>(`${getApiBase()}/departments`),

  saveDepartment: (item: DepartmentItem) =>
    saveEntity<DepartmentItem>(`${getApiBase()}/departments`, item),

  deleteDepartment: (id: string) =>
    deleteEntity(`${getApiBase()}/departments/${id}`),

  /* ---------- CATEGORIES ---------- */
  getCategories: () =>
    request<CategoryItem[]>(`${getApiBase()}/categories`),

  saveCategory: (name: string) =>
    request<CategoryItem>(`${getApiBase()}/categories`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  deleteCategory: (id: string) =>
    deleteEntity(`${getApiBase()}/categories/${id}`),

  /* ---------- LOCATIONS ---------- */
  getLocations: () =>
    request<LocationItem[]>(`${getApiBase()}/locations`),

  saveLocation: (item: LocationItem) =>
    saveEntity<LocationItem>(`${getApiBase()}/locations`, item),

  deleteLocation: (id: string) =>
    deleteEntity(`${getApiBase()}/locations/${id}`),

  /* ---------- LIFECYCLE ---------- */
  getLifecycle: () =>
    request<LifecycleEvent[]>(`${getApiBase()}/lifecycle`),

  /* ---------- ADMINS ---------- */
  getAdmins: () =>
    request<ConsoleAdmin[]>(`${getApiBase()}/admins`),

  createAdmin: (admin: {
    username: string;
    password: string;
    role: string;
  }) =>
    request<ConsoleAdmin>(`${getApiBase()}/admins`, {
      method: 'POST',
      body: JSON.stringify(admin),
    }),

  deleteAdmin: (id: string | number) =>
    deleteEntity(`${getApiBase()}/admins/${id}`),

  /* ---------- ALERTS ---------- */
  getAlertDefinitions: () =>
    request<AlertDefinition[]>(`${getApiBase()}/alerts/definitions`),

  createAlertDefinition: (
    item: Omit<AlertDefinition, 'id'>
  ) =>
    request<AlertDefinition>(`${getApiBase()}/alerts/definitions`, {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  deleteAlertDefinition: (id: string) =>
    deleteEntity(`${getApiBase()}/alerts/definitions/${id}`),

  /* ---------- ORGANIZATIONS (SUPER ADMIN) ---------- */
  getOrganizations: () =>
    request<Organization[]>(`${getApiBase()}/admin/organizations`),

  createOrganization: (payload: {
    name: string;
    code: string;
    [k: string]: any;
  }) =>
    request<Organization>(`${getApiBase()}/admin/organizations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Required by PostgresHelp.tsx
  initializeDatabase: async (): Promise<{ message: string }> => 
    request<{ message: string }>(`${getApiBase()}/admin/initialize`, { method: 'POST' }),
};
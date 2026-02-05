export enum ItemStatus {
  ACTIVE = 'Active',
  IN_STORAGE = 'In Storage',
  BROKEN = 'Broken',
  RETIRED = 'Retired',
  MAINTENANCE = 'Maintenance'
}

export enum SoftwareType {
  SUBSCRIPTION = 'Subscription',
  PERPETUAL = 'Perpetual',
  OPEN_SOURCE = 'Open Source'
}

export enum CameraStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  MAINTENANCE = 'Maintenance',
  FAULTY = 'Faulty',
  ANGLE_MISMATCHED = 'Angle Mismatched'
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  registeredAddress?: string;
  communicationAddress?: string;
  legalEntityName?: string;
  pan?: string;
  gstin?: string;
  tan?: string;
  cin?: string;
  companyType?: 'PVT LTD' | 'LIMITED' | 'LLP/Partnership' | 'Prop/HUF/AOP/BOI';
  onboardingDate?: string;
  createdAt: string;
}

export interface LoginResponse {
  user: UserItem | ConsoleAdmin;
  token: string;
  role: string;
  isSuperAdmin?: boolean;
  availableOrgs?: Organization[];
  orgId?: string;
}

export interface UserItem {
  id: string;
  name: string;
  empCode?: string;
  email: string;
  department: string;
  hod?: string;
  role: string;
  status: 'Active' | 'Inactive';
}

export interface ConsoleAdmin {
  id: string;
  username: string;
  role: 'Super Admin' | 'Admin' | 'Viewer';
  lastLogin?: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  hodName: string;
}

export interface CategoryItem {
  id: string;
  name: string;
}

export interface LocationItem {
  id: string;
  orgName?: string;
  type: 'HO' | 'SL' | 'GD';
  name: string;
  code: string;
  dateCreated: string;
  spocName: string;
  spocEmail: string;
  spocPhone: string;
  address: string;
  status: 'Locked' | 'Unlocked';
  subLocations: string[]; 
  description?: string; 
}

export interface Camera {
  id: string;
  model: string;
  serialNumber: string;
  location: string;
  subLocation: string;
  installationDate: string;
  currentStatus: CameraStatus;
  lastChecked?: string;
}

export interface WeeklyUpdate {
  id: string;
  date: string;
  location: string;
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  maintenanceCount: number;
  faultyCount: number;
  mismatchedCount: number;
  notes: string;
}

export interface AlertDefinition {
  id: string;
  name: string;
  module: 'Hardware' | 'Software' | 'Network';
  type: 'DATE_BEFORE' | 'NUMBER_BELOW' | 'VALUE_EQUALS' | 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'GTE' | 'LTE';
  field: string;
  threshold: string; 
  severity: 'Low' | 'Medium' | 'High';
  enabled: boolean;
}

export interface HardwareItem {
  id: string;
  name: string;
  assetTag?: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  category: string;
  status: ItemStatus;
  location?: string;
  department?: string;
  hod?: string;
  assignedTo?: string; 
  previousOwner?: string;
  issuedDate?: string;
  returnedDate?: string;
  retirementDate?: string; 
  vendorName?: string;
  vendorSpoc?: string;
  vendorContact?: string; 
  purchaseDate: string;
  invoiceDate?: string;
  poNumber?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  supportCoverage?: string;
  fitnessYears?: number;
  fitnessExpiry?: string;
  maintenanceType?: 'Internal' | 'External';
  maintenanceStartDate?: string;
  maintenanceEndDate?: string;
  ramConfig?: string;
  diskType?: string;
  storageCapacity?: string;
  processor?: string;
  connectionType?: 'Wired' | 'Wireless';
  resolution?: string;
  smartOs?: string;
  screenDimension?: string;
  mountType?: string;
  inputType?: string;
  powerSource?: string;
  notes?: string;
  cctvType?: 'DVR' | 'NVR';
  dvrModel?: string;
  fieldView?: string;
  ipAddress?: string;
  maintenanceFrequency?: 'Weekly' | 'Monthly' | 'Quarterly';
}

export interface NetworkItem {
  id: string;
  name: string;
  type: 'Firewall' | 'Switch' | 'Access Point' | 'Router' | 'Modem' | 'Other';
  ipAddress: string;
  macAddress: string;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  assetTag?: string;
  serialNumber?: string;
  ram?: string;
  cpu?: string;
  status: ItemStatus;
  location?: string;
  notes?: string;
  purchaseDate?: string;
  invoiceDate?: string;
  poNumber?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  supportCoverage?: string;
  retirementDate?: string;
  vendorName?: string;
  vendorSpoc?: string;
  vendorContact?: string;
  maintenanceType?: 'Internal' | 'External';
  maintenanceStartDate?: string;
  maintenanceEndDate?: string;
}

export interface SoftwareAssignment {
  username: string;
  assignedDate: string;
}

export interface SoftwareItem {
  id: string;
  name: string;
  version: string;
  licenseKey: string;
  type: SoftwareType;
  expiryDate?: string;
  seatCount: number;
  costPerSeat: number;
  assignedTo?: SoftwareAssignment[];
  department?: string;
  hod?: string;
  issuedDate?: string;
  vendorName?: string;
  vendorSpoc?: string;
  vendorContact?: string; 
  purchaseDate?: string;
  invoiceDate?: string;
  poNumber?: string;
  supportCoverage?: string;
  amcEnabled?: boolean;
  amcCost?: number;
  cloudEnabled?: boolean;
  cloudCost?: number;
  trainingEnabled?: boolean;
  trainingCost?: number;
}

export interface PasswordItem {
  id: string;
  serviceName: string;
  username: string;
  encryptedPassword: string;
  url: string;
  category: string;
  lastUpdated: string;
}

export interface LifecycleEvent {
  id: string;
  assetId: string;
  assetType: 'Hardware' | 'Software' | 'User' | 'Secret' | 'Network';
  eventType: 'CREATED' | 'UPDATED' | 'ASSIGNED' | 'STATUS_CHANGE' | 'DELETED' | 'WARNING';
  description: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  actor?: string;
}
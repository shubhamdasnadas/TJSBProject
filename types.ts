
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

export interface Organization {
  id: string; // Used for DB name (derived from code)
  name: string; // Organization/Company Name
  code: string; // Company Code (Unique)
  
  // Addresses
  registeredAddress?: string;
  communicationAddress?: string;
  
  // Legal
  legalEntityName?: string;
  pan?: string;
  gstin?: string;
  tan?: string;
  cin?: string;
  
  // Classification
  companyType?: 'PVT LTD' | 'LIMITED' | 'LLP/Partnership' | 'Prop/HUF/AOP/BOI';
  onboardingDate?: string;
  
  createdAt: string;
}

export interface LoginResponse {
  user: UserItem | ConsoleAdmin;
  token: string;
  role: string;
  isSuperAdmin?: boolean;
  availableOrgs?: Organization[]; // For Super Admin
  orgId?: string; // Returned by global lookup
}

// "Users" in the system (Employees who own assets)
export interface UserItem {
  id: string;
  name: string;
  email: string;
  department: string;
  hod?: string;
  role: string;
  status: 'Active' | 'Inactive';
}

// "Admins" who log into the console
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
  orgName?: string; // Display only
  type: 'HO' | 'SL' | 'GD';
  name: string;
  code: string;
  dateCreated: string;
  spocName: string;
  spocEmail: string;
  spocPhone: string;
  address: string;
  status: 'Locked' | 'Unlocked';
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
  
  // Assignment & Location
  status: ItemStatus;
  location?: string;
  department?: string;
  hod?: string;
  assignedTo?: string; 
  previousOwner?: string;

  // Asset Dates
  issuedDate?: string;
  returnedDate?: string;
  retirementDate?: string; 

  // Vendor Info
  vendorName?: string;
  vendorSpoc?: string;
  vendorContact?: string; 

  // Financials
  purchaseDate: string;
  invoiceDate?: string;
  poNumber?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  supportCoverage?: string;
  
  // Lifecycle / Usage
  fitnessYears?: number;
  fitnessExpiry?: string;

  // Maintenance
  maintenanceType?: 'Internal' | 'External';
  maintenanceStartDate?: string;
  maintenanceEndDate?: string;

  // Technical Specs
  ramConfig?: string;
  diskType?: string;
  storageCapacity?: string;
  processor?: string;
  
  // Peripheral Specifics
  connectionType?: 'Wired' | 'Wireless';

  // TV Specifics
  resolution?: string;
  smartOs?: string;
  screenDimension?: string;
  mountType?: string;
  inputType?: string;
  powerSource?: string;

  // CCTV Specifics
  cctvType?: 'DVR' | 'NVR';
  dvrModel?: string;
  fieldView?: string;
  ipAddress?: string;
  maintenanceFrequency?: 'Weekly' | 'Monthly' | 'Quarterly';

  notes?: string;
}

// NEW: Network Device Interface
export interface NetworkItem {
  id: string;
  name: string; // Hostname
  type: 'Firewall' | 'Switch' | 'Access Point' | 'Router' | 'Modem' | 'Other';
  ipAddress: string;
  macAddress: string;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  assetTag?: string;
  serialNumber?: string;
  
  // Specs
  ram?: string;
  cpu?: string;
  
  status: ItemStatus;
  location?: string;
  notes?: string;

  // Financials & Dates
  purchaseDate?: string;
  invoiceDate?: string;
  poNumber?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  supportCoverage?: string;
  retirementDate?: string;

  // Vendor Info
  vendorName?: string;
  vendorSpoc?: string;
  vendorContact?: string;

  // Maintenance
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
  
  // Ownership
  department?: string;
  hod?: string;

  // Asset Dates
  issuedDate?: string;

  // Vendor Info
  vendorName?: string;
  vendorSpoc?: string;
  vendorContact?: string; 

  // Financials
  purchaseDate?: string;
  invoiceDate?: string;
  poNumber?: string;
  supportCoverage?: string;

  // Additional Costs
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
  url?: string;
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

export interface AIAnalysisResult {
  category?: string;
  manufacturer?: string;
  suggestedTags?: string[];
  securityRisk?: string;
}

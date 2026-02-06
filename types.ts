
export enum ItemStatus {
  ACTIVE = 'Active',
  IN_STORAGE = 'In Stock',
  MAINTENANCE = 'Under Maintenance',
  RETIRED = 'Retired',
  BROKEN = 'Broken'
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

export interface SoftwareAssignment {
  username: string;
  assignedDate: string;
}

export interface UserItem {
  id: string;
  name: string;
  empCode: string; // Employee Code field
  email: string;
  department: string;
  hod: string;
  role: string;
  status: 'Active' | 'Inactive';
}

export interface HardwareItem {
  id: string;
  name: string;
  serialNumber: string;
  assetTag?: string;
  manufacturer: string;
  model: string;
  category: string;
  status: ItemStatus;
  assignedTo?: string;
  department?: string;
  hod?: string;
  location?: string;
  previousOwner?: string;
  purchaseDate?: string;
  invoiceDate?: string;
  poNumber?: string;
  purchaseCost?: number;
  warrantyExpiry?: string;
  supportCoverage?: string;
  fitnessYears?: number;
  fitnessExpiry?: string;
  issuedDate?: string;
  returnedDate?: string;
  retirementDate?: string;
  vendorName?: string;
  vendorSpoc?: string;
  vendorContact?: string;
  maintenanceType?: 'Internal' | 'External';
  maintenanceStartDate?: string;
  maintenanceEndDate?: string;
  ramConfig?: string;
  diskType?: 'SSD' | 'HDD' | 'NVMe';
  storageCapacity?: string;
  processor?: string;
  connectionType?: 'Wired' | 'Wireless';
  resolution?: string;
  smartOs?: string;
  screenDimension?: string;
  mountType?: string;
  inputType?: string;
  powerSource?: string;
  cctvType?: 'DVR' | 'NVR';
  dvrModel?: string;
  fieldView?: string;
  ipAddress?: string;
  maintenanceFrequency?: string;
  notes?: string;
}

export interface SoftwareItem {
  id: string;
  name: string;
  version: string;
  licenseKey: string;
  type: SoftwareType;
  seatCount: number;
  costPerSeat: number;
  expiryDate?: string;
  assignedTo: SoftwareAssignment[];
  department?: string;
  hod?: string;
  purchaseDate?: string;
  invoiceDate?: string;
  poNumber?: string;
  issuedDate?: string;
  returnedDate?: string;
  supportCoverage?: string;
  vendorName?: string;
  vendorSpoc?: string;
  vendorContact?: string;
  amcEnabled?: boolean;
  amcCost?: number;
  cloudEnabled?: boolean;
  cloudCost?: number;
  trainingEnabled?: boolean;
  trainingCost?: number;
}

export interface NetworkItem {
  id: string;
  name: string;
  type: string;
  ipAddress: string;
  macAddress: string;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  assetTag?: string;
  serialNumber: string;
  ram?: string;
  cpu?: string;
  status: ItemStatus;
  location: string;
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

export interface PasswordItem {
  id: string;
  serviceName: string;
  username: string;
  encryptedPassword: string;
  url?: string;
  category: string;
  lastUpdated: string;
}

export interface DepartmentItem {
  id: string;
  name: string;
  hodName?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
}

export interface LocationItem {
  id: string;
  type: string;
  name: string;
  code: string;
  dateCreated: string;
  spocName?: string;
  spocEmail?: string;
  spocPhone?: string;
  address?: string;
  status: 'Locked' | 'Unlocked';
  subLocations: string[];
}

export interface LifecycleEvent {
  id: string;
  timestamp: string;
  assetId: string;
  assetType: 'Hardware' | 'Software' | 'Network' | 'Secret';
  eventType: 'CREATED' | 'UPDATED' | 'DELETED' | 'ASSIGNED' | 'STATUS_CHANGE' | 'WARNING';
  description: string;
  previousValue?: string;
  newValue?: string;
  actor?: string;
}

export interface AlertDefinition {
  id: string;
  name: string;
  module: 'Hardware' | 'Software' | 'Network';
  type: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'GTE' | 'LTE' | 'DATE_BEFORE' | 'VALUE_EQUALS';
  field: string;
  threshold: string;
  severity: 'Low' | 'Medium' | 'High';
  enabled: boolean;
}

export interface ConsoleAdmin {
  id: string;
  username: string;
  role: 'Admin' | 'Viewer' | 'Super Admin';
  last_login?: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  onboardingDate?: string;
  registeredAddress?: string;
  legalEntityName?: string;
  communicationAddress?: string;
  pan?: string;
  gstin?: string;
  tan?: string;
  cin?: string;
  companyType?: string;
}

export interface LoginResponse {
  user: { id: string; username: string; role: string } | { id: string; name: string; role: string };
  token: string;
  role: string;
  orgId?: string;
  availableOrgs?: { id: string; name: string }[];
  isSuperAdmin?: boolean;
}

export interface Camera {
  id: string;
  model: string;
  serialNumber: string;
  location: string;
  subLocation: string;
  currentStatus: CameraStatus;
  installationDate: string;
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

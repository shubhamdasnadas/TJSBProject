
import { HardwareItem, SoftwareItem, PasswordItem, UserItem, LifecycleEvent, ItemStatus, SoftwareType } from '../types';

// Keys
const HARDWARE_KEY = 'nexus_hardware';
const SOFTWARE_KEY = 'nexus_software';
const PASSWORDS_KEY = 'nexus_passwords';
const USERS_KEY = 'nexus_users';
const LIFECYCLE_KEY = 'nexus_lifecycle';

// Mock Data Seeding
const seedData = () => {
  if (!localStorage.getItem(HARDWARE_KEY)) {
    const mockHardware: HardwareItem[] = [
      { id: '1', name: 'MacBook Pro 16"', serialNumber: 'C02XYZ123', manufacturer: 'Apple', model: 'M2 Max', category: 'Laptop', purchaseDate: '2023-05-15', status: ItemStatus.ACTIVE, assignedTo: 'Sarah Connor', warrantyExpiry: '2024-05-15' },
      { id: '2', name: 'Dell XPS 15', serialNumber: 'DL-456-AB', manufacturer: 'Dell', model: '9520', category: 'Laptop', purchaseDate: '2022-11-10', status: ItemStatus.IN_STORAGE, warrantyExpiry: '2023-11-10' },
      { id: '3', name: 'Herman Miller Aeron', serialNumber: 'HM-999', manufacturer: 'Herman Miller', model: 'Remastered', category: 'Furniture', purchaseDate: '2023-01-20', status: ItemStatus.ACTIVE, assignedTo: 'John Smith' },
    ];
    localStorage.setItem(HARDWARE_KEY, JSON.stringify(mockHardware));
  }

  if (!localStorage.getItem(SOFTWARE_KEY)) {
    const mockSoftware: SoftwareItem[] = [
      { 
        id: '1', 
        name: 'Adobe Creative Cloud', 
        version: '2024', 
        licenseKey: 'XXXX-YYYY-ZZZZ', 
        type: SoftwareType.SUBSCRIPTION, 
        seatCount: 5, 
        costPerSeat: 59.99, 
        expiryDate: '2024-12-31', 
        assignedTo: [{ username: 'Sarah Connor', assignedDate: '2023-05-15' }] 
      },
      { 
        id: '2', 
        name: 'Visual Studio Enterprise', 
        version: '2022', 
        licenseKey: 'VS-ENT-999', 
        type: SoftwareType.PERPETUAL, 
        seatCount: 10, 
        costPerSeat: 499.00, 
        assignedTo: [{ username: 'Sarah Connor', assignedDate: '2022-11-10' }, { username: 'John Smith', assignedDate: '2023-01-20' }] 
      },
    ];
    localStorage.setItem(SOFTWARE_KEY, JSON.stringify(mockSoftware));
  }

  if (!localStorage.getItem(PASSWORDS_KEY)) {
    const mockPasswords: PasswordItem[] = [
      { id: '1', serviceName: 'AWS Root', username: 'admin@nexus.com', encryptedPassword: 'supersecretpassword123', url: 'https://aws.amazon.com', category: 'Infrastructure', lastUpdated: '2024-01-15' },
    ];
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(mockPasswords));
  }

  if (!localStorage.getItem(USERS_KEY)) {
    const mockUsers: UserItem[] = [
      { id: '1', name: 'Sarah Connor', email: 'sarah@nexus.com', department: 'Engineering', role: 'Developer', status: 'Active' },
      { id: '2', name: 'John Smith', email: 'john@nexus.com', department: 'HR', role: 'Manager', status: 'Active' },
      { id: '3', name: 'Jane Doe', email: 'jane@nexus.com', department: 'Sales', role: 'Representative', status: 'Active' },
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(mockUsers));
  }

  if (!localStorage.getItem(LIFECYCLE_KEY)) {
    const mockEvents: LifecycleEvent[] = [
      { id: '101', assetId: '1', assetType: 'Hardware', eventType: 'CREATED', description: 'Asset purchased and registered', timestamp: '2023-05-15T09:00:00.000Z' },
      { id: '102', assetId: '1', assetType: 'Hardware', eventType: 'ASSIGNED', description: 'Assigned to Sarah Connor', timestamp: '2023-05-16T10:30:00.000Z' },
      { id: '103', assetId: '2', assetType: 'Hardware', eventType: 'STATUS_CHANGE', description: 'Moved to Storage', timestamp: '2024-02-01T14:15:00.000Z' },
    ];
    localStorage.setItem(LIFECYCLE_KEY, JSON.stringify(mockEvents));
  }
};

seedData();

export const storageService = {
  // Hardware
  getHardware: (): HardwareItem[] => JSON.parse(localStorage.getItem(HARDWARE_KEY) || '[]'),
  saveHardware: (items: HardwareItem[]) => localStorage.setItem(HARDWARE_KEY, JSON.stringify(items)),
  
  // Software
  getSoftware: (): SoftwareItem[] => JSON.parse(localStorage.getItem(SOFTWARE_KEY) || '[]'),
  saveSoftware: (items: SoftwareItem[]) => localStorage.setItem(SOFTWARE_KEY, JSON.stringify(items)),

  // Passwords
  getPasswords: (): PasswordItem[] => JSON.parse(localStorage.getItem(PASSWORDS_KEY) || '[]'),
  savePasswords: (items: PasswordItem[]) => localStorage.setItem(PASSWORDS_KEY, JSON.stringify(items)),

  // Users
  getUsers: (): UserItem[] => JSON.parse(localStorage.getItem(USERS_KEY) || '[]'),
  saveUsers: (items: UserItem[]) => localStorage.setItem(USERS_KEY, JSON.stringify(items)),

  // Lifecycle
  getLifecycle: (): LifecycleEvent[] => JSON.parse(localStorage.getItem(LIFECYCLE_KEY) || '[]'),
  addLifecycleEvent: (event: LifecycleEvent) => {
    const events = JSON.parse(localStorage.getItem(LIFECYCLE_KEY) || '[]');
    events.unshift(event); // Add to top
    localStorage.setItem(LIFECYCLE_KEY, JSON.stringify(events));
  }
};

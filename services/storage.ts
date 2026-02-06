
import { HardwareItem, SoftwareItem, PasswordItem, UserItem, LifecycleEvent } from '../types';

/**
 * STORAGE SERVICE - DEPRECATED MOCK DATA
 * This file is now empty to ensure all data comes strictly from the Postgres database.
 */
export const storageService = {
  getHardware: (): HardwareItem[] => [],
  saveHardware: () => {},
  getSoftware: (): SoftwareItem[] => [],
  saveSoftware: () => {},
  getPasswords: (): PasswordItem[] => [],
  savePasswords: () => {},
  getUsers: (): UserItem[] => [],
  saveUsers: () => {},
  getLifecycle: (): LifecycleEvent[] => [],
  addLifecycleEvent: () => {}
};

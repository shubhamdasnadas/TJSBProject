export interface SynoUser {
  name: string;
  description?: string;
  uid: number;
}

export interface SynoShare {
  name: string;
  path: string;
}

export interface SynoACL {
  user: string;
  perm: {
    read: boolean;
    write: boolean;
    exec: boolean;
  };
}

export type SynoFile = {
  name: string;
  path: string;
  isdir: boolean;
  size: number;
};
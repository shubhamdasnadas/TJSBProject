

// types/synology.ts

export interface SynoUser {
  name: string;
  description?: string;
  email?: string;
  expired?: boolean;
  is_admin?: boolean;
  uid?: number;
}

export interface SynoUserResponse {
  success: boolean;
  data: {
    offset: number;
    total: number;
    users: SynoUser[];
  };
  error?: {
    code: number;
    message?: string;
  };
}

export interface SynoShare {
  name: string;
  path: string;
  description?: string;
  is_aclmode?: boolean;
  is_share_readonly?: boolean;
  is_force_readonly?: boolean;
  additional?: {
    real_path?: string;
    owner?: {
      user?: string;
      group?: string;
      uid?: number;
      gid?: number;
    };
    time?: {
      atime?: number;
      mtime?: number;
      ctime?: number;
      crtime?: number;
    };
    perm?: {
      share_right?: string;
      adv_right?: {
        disable_download?: boolean;
        disable_list?: boolean;
        disable_modify?: boolean;
      };
      acl_enable?: boolean;
      is_acl_mode?: boolean;
      acl?: any[];
    };
    volume_status?: {
      freespace?: number;
      totalspace?: number;
      readonly?: boolean;
    };
  };
}

export interface SynoShareResponse {
  success: boolean;
  data: {
    offset: number;
    shares: SynoShare[];
    total: number;
  };
  error?: {
    code: number;
    message?: string;
  };
}

export interface PermissionLevel {
  noAccess: boolean;
  readWrite: boolean;
  readOnly: boolean;
  custom: boolean;
}

export interface Permission {
  name: string;
  preview: string;
  groupPermissions: string;
  userPermissions: PermissionLevel;
}

export interface UserPermission {
  name: string;
  is_readonly?: boolean;
  is_writable?: boolean;
  is_deny?: boolean;
}

export interface UserPermissionsResponse {
  success: boolean;
  data: {
    permissions: UserPermission[];
  };
  error?: {
    code: number;
    message?: string;
  };
}

export interface GroupPermission {
  name: string;
  is_readonly?: boolean;
  is_writable?: boolean;
  is_deny?: boolean;
}

export interface GroupPermissionsResponse {
  success: boolean;
  data: {
    permissions: GroupPermission[];
  };
  error?: {
    code: number;
    message?: string;
  };
}

export interface SynoPackage {
  id: string;
  name: string;
  version: string;
  status: string;
  startable?: boolean;
  running?: boolean;
  description?: string;
  icon?: string;
}

export interface SynoPackageResponse {
  success: boolean;
  data: {
    packages: SynoPackage[];
    total: number;
  };
  error?: {
    code: number;
    message?: string;
  };
}

export type PermissionType = 'noAccess' | 'readWrite' | 'readOnly' | 'custom';

export interface PermissionChangePayload {
  username: string;
  shareName: string;
  permissionType: PermissionType;
}

export interface SavePermissionsPayload {
  username: string;
  permissions: Array<{
    name: string;
    type: PermissionType;
  }>;
}
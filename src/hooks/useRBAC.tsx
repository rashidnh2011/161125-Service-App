/**
 * React Hook for Role-Based Access Control
 * Provides permission checking and data filtering utilities for React components
 */

import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  hasPermission,
  canAccessModule,
  getAccessibleModules,
  canPerformAction,
  getUserDataScope,
  UserRole,
  Permission
} from '../utils/rbac';
import {
  applyUserDataFilter,
  filterUserData,
  isUserOwnedItem,
  getUserQueryConditions,
  canAccessResourceItem
} from '../utils/dataFilters';

export interface UseRBACOptions {
  resource?: string;
  action?: Permission['action'];
  scope?: Permission['scope'];
  enableDataFiltering?: boolean;
}

/**
 * Custom hook for RBAC functionality
 */
export function useRBAC(options: UseRBACOptions = {}) {
  const { user } = useAuth();

  const userRole = (user?.role as UserRole) || 'technician';
  const userId = user?.id || 0;

  // Permission checking functions
  const checkPermission = useMemo(() => (permission: Permission) => {
    return hasPermission(userRole, permission);
  }, [userRole]);

  const canAccess = useMemo(() => (resource: string, action?: Permission['action'], scope?: Permission['scope']) => {
    return canPerformAction(userRole, resource, action || 'read', scope);
  }, [userRole]);

  const canAccessModuleCheck = useMemo(() => (moduleName: string) => {
    return canAccessModule(userRole, moduleName as any);
  }, [userRole]);

  const accessibleModules = useMemo(() => getAccessibleModules(userRole), [userRole]);

  // Data filtering functions
  const getDataFilters = useMemo(() => (resource: string) => {
    if (!options.enableDataFiltering) return {};
    return applyUserDataFilter({ userId, userRole, resource });
  }, [userId, userRole, options.enableDataFiltering]);

  const filterData = useMemo(() => <T extends Record<string, any>>(data: T[], resource: string) => {
    if (!options.enableDataFiltering || userRole === 'admin') return data;
    return filterUserData(data, { userId, userRole, resource });
  }, [userId, userRole, options.enableDataFiltering]);

  const isOwnedByUser = useMemo(() => (item: Record<string, any>, resource: string) => {
    return isUserOwnedItem(item, userId, userRole, resource);
  }, [userId, userRole]);

  const getQueryConditions = useMemo(() => (resource: string) => {
    return getUserQueryConditions(userId, userRole, resource);
  }, [userId, userRole]);

  const canAccessItem = useMemo(() => (
    item: Record<string, any>,
    resource: string,
    action: 'read' | 'update' | 'delete' = 'read'
  ) => {
    return canAccessResourceItem(item, userId, userRole, resource, action);
  }, [userId, userRole]);

  return {
    // User info
    userRole,
    userId,
    isAdmin: userRole === 'admin',

    // Permission checks
    hasPermission: checkPermission,
    canAccess,
    canAccessModule: canAccessModuleCheck,
    accessibleModules,

    // Data filtering
    getDataFilters,
    filterData,
    isOwnedByUser,
    getQueryConditions,
    canAccessItem,

    // Specific permission checks for common actions
    canCreate: (resource: string) => canAccess(resource, 'create'),
    canRead: (resource: string, scope?: Permission['scope']) => canAccess(resource, 'read', scope),
    canUpdate: (resource: string, scope?: Permission['scope']) => canAccess(resource, 'update', scope),
    canDelete: (resource: string, scope?: Permission['scope']) => canAccess(resource, 'delete', scope),
    canManage: (resource: string) => canAccess(resource, 'manage'),
  };
}

/**
 * HOC for components that need RBAC
 */
export function withRBAC<P extends object>(
  Component: React.ComponentType<P>,
  options: UseRBACOptions = {}
) {
  return function RBACComponent(props: P) {
    const rbac = useRBAC(options);

    return React.createElement(Component, { ...props, rbac });
  };
}

/**
 * Permission gate component
 */
interface PermissionGateProps {
  children: React.ReactNode;
  permission?: Permission;
  resource?: string;
  action?: Permission['action'];
  scope?: Permission['scope'];
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, all permissions must be granted
}

export function PermissionGate({
  children,
  permission,
  resource,
  action,
  scope,
  fallback = null,
  requireAll = false
}: PermissionGateProps) {
  const { hasPermission, canAccess } = useRBAC();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (resource && action) {
    hasAccess = canAccess(resource, action, scope);
  } else {
    hasAccess = true; // No permission check specified
  }

  if (requireAll && !hasAccess) {
    return <>{fallback}</>;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Module access gate component
 */
interface ModuleGateProps {
  children: React.ReactNode;
  moduleName: string;
  fallback?: React.ReactNode;
}

export function ModuleGate({ children, moduleName, fallback = null }: ModuleGateProps) {
  const { canAccessModule } = useRBAC();

  const hasAccess = canAccessModule(moduleName);

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

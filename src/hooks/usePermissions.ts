'use client';

import { useMemo } from 'react';
import { useWorkspace } from './useWorkspace';
import type { Permissions } from '@/types';

const ROLE_PERMISSIONS: Record<string, Permissions> = {
  viewer: {
    canView: true,
    canCreate: false,
    canDelete: false,
    canPurchaseCredits: false,
    canManageTeam: false,
    canEditSettings: false,
    canDeleteWorkspace: false,
    roleName: 'Observateur',
    roleDescription: 'Peut voir le contenu mais ne peut pas créer',
  },
  member: {
    canView: true,
    canCreate: true,
    canDelete: false,
    canPurchaseCredits: false,
    canManageTeam: false,
    canEditSettings: false,
    canDeleteWorkspace: false,
    roleName: 'Membre',
    roleDescription: 'Peut créer du contenu',
  },
  admin: {
    canView: true,
    canCreate: true,
    canDelete: true,
    canPurchaseCredits: true,
    canManageTeam: true,
    canEditSettings: true,
    canDeleteWorkspace: false,
    roleName: 'Administrateur',
    roleDescription: 'Accès complet sauf suppression du workspace',
  },
  owner: {
    canView: true,
    canCreate: true,
    canDelete: true,
    canPurchaseCredits: true,
    canManageTeam: true,
    canEditSettings: true,
    canDeleteWorkspace: true,
    roleName: 'Propriétaire',
    roleDescription: 'Accès complet',
  },
};

export function usePermissions(): Permissions & { role: string } {
  const { workspace } = useWorkspace();
  const role = workspace?.role || 'viewer';

  const permissions = useMemo(() => {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
  }, [role]);

  return {
    ...permissions,
    role,
  };
}

// Permission descriptions for UI
export const PERMISSION_LABELS = {
  canView: 'Voir le workspace, les produits et les shoots',
  canCreate: 'Créer des produits, shoots et générations',
  canDelete: 'Supprimer des produits',
  canPurchaseCredits: 'Acheter des crédits',
  canManageTeam: "Gérer les membres de l'équipe",
  canEditSettings: 'Modifier les paramètres du workspace',
  canDeleteWorkspace: 'Supprimer le workspace',
} as const;

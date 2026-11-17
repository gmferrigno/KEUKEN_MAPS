type Action = keyof typeof PERMISSIONS_GEOREFERENCE;
type Role = (typeof PERMISSIONS_GEOREFERENCE)[Action][number];

/**
 * Permiso de re-georeferenciación de PDVs.
 * Key backend: GEOREFERENCE_PDV (description: "Georeferenciar PDV").
 */
export const PERMISSIONS_GEOREFERENCE = {
  EDIT: ["GEOREFERENCE_PDV"],
} as const;

export const canDo = (
  roles: Role[] | string[] | undefined,
  action: Action
): boolean => {
  return (
    roles?.some((role) =>
      (PERMISSIONS_GEOREFERENCE[action] as readonly string[]).includes(role)
    ) ?? false
  );
};

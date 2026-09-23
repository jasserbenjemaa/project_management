type Role = "consultant" | "people_manager" | "unit_manager";

const PERMISSIONS: Record<Role, string[]> = {
  consultant: [
    "view:consultant", // view own profile/data
    "edit:consultant", // edit own profile/data
  ],
  people_manager: [
    "view:consultant",
    "edit:consultant",
    "add:consultant",
    "remove:consultant",
    "edit:people_manager",
    "view:people_manager",
  ],
  unit_manager: [
    "add:consultant",
    "view:consultant", // view own profile/data
    "view:people_manager",
    "edit:consultant",
    "remove:consultant",
    "add:people_manager",
    "edit:people_manager",
    "remove:people_manager",
  ],
};

const checkPermission = (
  user: { role: Role },
  action: string,
  resource: string,
): boolean => {
  const permissions = PERMISSIONS[user.role];
  if (!permissions) return false;
  return permissions.includes(`${action}:${resource}`);
};

export default checkPermission;

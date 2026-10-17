export const publicUser = (user) => ({
  id: String(user._id),
    name: user.name,
    email: user.email,
    businessName: user.businessName,
    role: user.role || "owner",
    workspaceId: String(user.workspaceId || user._id),
    createdAt: user.createdAt,
    hasPassword: Boolean(user.passwordHash),
});

export const publicUser = (user) => ({
  id: String(user._id),
    name: user.name,
    email: user.email,
    businessName: user.businessName,
    createdAt: user.createdAt,
});

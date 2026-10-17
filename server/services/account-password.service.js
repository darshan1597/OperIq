import bcrypt from "bcryptjs";

export async function createChangedPasswordHash(user, { currentPassword = "", newPassword }) {
  if (user.passwordHash) {
    if (!currentPassword)
      throw Object.assign(Error("Enter your current password"), { status: 400 });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash)))
      throw Object.assign(Error("Current password is incorrect"), { status: 401 });
  }
  return bcrypt.hash(newPassword, 12);
}

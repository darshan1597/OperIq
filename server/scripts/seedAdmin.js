import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import mongoose from "mongoose";
import connectDb from "../config/db.js";
import {
  createUser,
  findUserByEmail,
  initStore,
  updateUserProfile,
} from "../services/store.service.js";

const email = String(process.env.ADMIN_SEED_EMAIL || "admin@operiq.local")
  .trim()
  .toLowerCase();
const password = process.env.ADMIN_SEED_PASSWORD || `Op!${randomBytes(12).toString("base64url")}`;
const name = String(process.env.ADMIN_SEED_NAME || "OperIQ Administrator").trim();
const envPath = resolve(process.cwd(), ".env");

function updateAdminAllowlist(contents) {
  const pattern = /^OPERIQ_ADMIN_EMAILS=.*$/m;
  const currentLine = contents.match(pattern)?.[0] || "";
  const current = currentLine
    .slice(currentLine.indexOf("=") + 1)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value && !value.includes("your-existing-operiq-email"));
  const emails = [...new Set([...current, email])];
  const nextLine = `OPERIQ_ADMIN_EMAILS=${emails.join(",")}`;
  return pattern.test(contents)
    ? contents.replace(pattern, nextLine)
    : `${contents.trimEnd()}\n${nextLine}\n`;
}

try {
  await connectDb();
  await initStore();
  const passwordHash = await bcrypt.hash(password, 12);
  let user = await findUserByEmail(email);
  if (user) {
    user = await updateUserProfile(String(user._id), { passwordHash, name });
  } else {
    user = await createUser({
      name,
      email,
      passwordHash,
      businessName: "OperIQ Administration",
    });
  }

  let envContents = "";
  try { envContents = await readFile(envPath, "utf8"); } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await writeFile(envPath, updateAdminAllowlist(envContents));

  console.log("\nOperIQ admin account is ready.");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log("Admin URL: http://localhost:5174/admin/");
  console.log("Restart the API so the updated admin allowlist is loaded.\n");
} finally {
  await mongoose.disconnect();
}

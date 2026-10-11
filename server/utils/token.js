import jwt from "jsonwebtoken";

const jwtSecret = () => {
  if (!process.env.JWT_SECRET) throw Error("JWT_SECRET is required");
  return process.env.JWT_SECRET;
};

export const signToken = (user) =>
  jwt.sign({ email: user.email }, jwtSecret(), {
    subject: String(user._id),
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

export const verifyToken = (token) => jwt.verify(token, jwtSecret());

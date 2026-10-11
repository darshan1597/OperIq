import mongoose from "mongoose";

export default async function connectDb() {
  if (!process.env.MONGODB_URI) return false;
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  return true;
}

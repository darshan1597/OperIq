import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true
    },
    passwordHash: { 
      type: String, 
      default: "" 
    },
    businessName: { 
      type: String, 
      required: true 
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OperIQUser",
      default: null,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "manager", "receptionist", "staff"],
      default: "owner",
    },
    createdAt: { 
      type: String, 
      required: true 
    },
  },
  { versionKey: false },
);

export default mongoose.models.OperIQUser ||
  mongoose.model("OperIQUser", userSchema, "operiqusers");

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
    createdAt: { 
      type: String, 
      required: true 
    },
  },
  { versionKey: false },
);

export default mongoose.models.OpsDeskUser || mongoose.model("OpsDeskUser", userSchema);

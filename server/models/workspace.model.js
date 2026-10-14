import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OperIQUser",
      required: true,
      unique: true,
      index: true,
    },
    data: mongoose.Schema.Types.Mixed,
  },
  { versionKey: false },
);

export default mongoose.models.OperIQWorkspace ||
  mongoose.model("OperIQWorkspace", workspaceSchema, "operiqworkspaces");

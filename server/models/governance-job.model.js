import mongoose from "mongoose";

const governanceJobSchema = new mongoose.Schema(
  {
    delegationId: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true 
    },
    workspaceId: { 
      type: String, 
      required: true, 
      index: true 
    },
    requestId: { 
      type: String, 
      required: true, 
      index: true 
    },
    status: {
      type: String,
      enum: ["Pending", "Recovering", "Completed", "Rejected", "Expired", "Failed"],
      default: "Pending",
      index: true,
    },
    action: { 
      type: String, 
      required: true
    },
    agent: { 
      type: String, 
      required: true 
    },
    mcp: { 
      type: String, 
      required: true 
    },
    agentId: String,
    userEmail: String,
    params: mongoose.Schema.Types.Mixed,
    tokenEnvelope: mongoose.Schema.Types.Mixed,
    tokenExpiresAt: Date,
    runtimeId: String,
    leaseUntil: { 
      type: Date, 
      index: true 
    },
    attempts: { 
      type: Number, 
      default: 0 
    },
    lastError: String,
    completedAt: Date,
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.models.OperIQGovernanceJob ||
  mongoose.model("OperIQGovernanceJob", governanceJobSchema, "operiqgovernancejobs");

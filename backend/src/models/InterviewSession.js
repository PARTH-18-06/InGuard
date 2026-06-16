const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const interviewSessionSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "completed", "cancelled"],
      default: "scheduled",
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
    roomId: {
      type: String,
      unique: true,
      required: true,
      default: uuidv4,
    },
    recordingUrl: {
      type: String,
      trim: true,
    },
    aiReport: {
      focusScore: Number,
      confidenceScore: Number,
      communicationScore: Number,
      technicalScore: Number,
      trustScore: Number,
      suspiciousActivities: {
        type: [String],
        default: [],
      },
      summary: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);

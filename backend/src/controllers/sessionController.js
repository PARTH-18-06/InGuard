const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const InterviewSession = require("../models/InterviewSession");
const Job = require("../models/Job");
const User = require("../models/User");

const sessionPopulate = [
  { path: "jobId", select: "title domain status experienceLevel" },
  { path: "candidateId", select: "name email role" },
  { path: "recruiterId", select: "name email role" },
];

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getSessionScope = (user) =>
  user.role === "recruiter"
    ? { recruiterId: user.userId }
    : { candidateId: user.userId };

const serializeAiReport = (aiReport) => {
  if (!aiReport) {
    return null;
  }

  return typeof aiReport.toObject === "function" ? aiReport.toObject() : aiReport;
};

const hasAiReportContent = (aiReport) => {
  const report = serializeAiReport(aiReport);

  if (!report) {
    return false;
  }

  return Boolean(
    report.focusScore !== undefined ||
      report.confidenceScore !== undefined ||
      report.communicationScore !== undefined ||
      report.technicalScore !== undefined ||
      report.trustScore !== undefined ||
      (Array.isArray(report.suspiciousActivities) &&
        report.suspiciousActivities.length > 0) ||
      report.summary
  );
};

const createSession = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const { jobId, candidateId, scheduledAt, recordingUrl } = req.body;

    if (!isValidId(jobId) || !isValidId(candidateId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid jobId or candidateId",
      });
    }

    const [job, candidate] = await Promise.all([
      Job.findOne({ _id: jobId, createdBy: req.user.userId }),
      User.findOne({ _id: candidateId, role: "candidate" }),
    ]);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found for this recruiter",
      });
    }

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: "Candidate not found",
      });
    }

    const session = await InterviewSession.create({
      jobId,
      candidateId,
      recruiterId: req.user.userId,
      scheduledAt,
      recordingUrl,
    });

    const populatedSession = await InterviewSession.findById(session._id).populate(
      sessionPopulate
    );

    return res.status(201).json({
      success: true,
      message: "Interview session created successfully",
      data: populatedSession,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Unable to create interview session",
      error: error.message,
    });
  }
};

const getSessions = async (req, res) => {
  try {
    const sessions = await InterviewSession.find(getSessionScope(req.user))
      .populate(sessionPopulate)
      .sort({ scheduledAt: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch interview sessions",
      error: error.message,
    });
  }
};

const getSessionById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session id",
      });
    }

    const session = await InterviewSession.findOne({
      _id: req.params.id,
      ...getSessionScope(req.user),
    }).populate(sessionPopulate);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch interview session",
      error: error.message,
    });
  }
};

const startSession = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session id",
      });
    }

    const session = await InterviewSession.findOne({
      _id: req.params.id,
      recruiterId: req.user.userId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found",
      });
    }

    if (session.status !== "scheduled") {
      return res.status(400).json({
        success: false,
        message: "Only scheduled sessions can be started",
      });
    }

    session.status = "live";
    session.startedAt = new Date();
    await session.save();

    const populatedSession = await InterviewSession.findById(session._id).populate(
      sessionPopulate
    );

    return res.status(200).json({
      success: true,
      message: "Interview session is now live",
      data: populatedSession,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to start interview session",
      error: error.message,
    });
  }
};

const endSession = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session id",
      });
    }

    const session = await InterviewSession.findOne({
      _id: req.params.id,
      recruiterId: req.user.userId,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found",
      });
    }

    if (session.status !== "live") {
      return res.status(400).json({
        success: false,
        message: "Only live sessions can be completed",
      });
    }

    session.status = "completed";
    session.endedAt = new Date();

    if (req.body.recordingUrl) {
      session.recordingUrl = req.body.recordingUrl;
    }

    if (req.body.aiReport) {
      const existingReport = serializeAiReport(session.aiReport) || {};

      session.aiReport = {
        ...existingReport,
        ...req.body.aiReport,
        suspiciousActivities:
          req.body.aiReport.suspiciousActivities ||
          existingReport.suspiciousActivities ||
          [],
      };
    }

    await session.save();

    const populatedSession = await InterviewSession.findById(session._id).populate(
      sessionPopulate
    );

    return res.status(200).json({
      success: true,
      message: "Interview session completed successfully",
      data: populatedSession,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Unable to complete interview session",
      error: error.message,
    });
  }
};

const getSessionReport = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session id",
      });
    }

    const session = await InterviewSession.findOne({
      _id: req.params.id,
      ...getSessionScope(req.user),
    })
      .populate("jobId", "title domain")
      .populate("candidateId", "name email")
      .populate("recruiterId", "name email");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Interview session not found",
      });
    }

    if (!hasAiReportContent(session.aiReport)) {
      return res.status(404).json({
        success: false,
        message: "AI report not available for this session",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        roomId: session.roomId,
        status: session.status,
        job: session.jobId,
        candidate: session.candidateId,
        recruiter: session.recruiterId,
        aiReport: session.aiReport,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch AI report",
      error: error.message,
    });
  }
};

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  startSession,
  endSession,
  getSessionReport,
};

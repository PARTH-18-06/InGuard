const mongoose = require("mongoose");
const Job = require("../models/Job");

const normalizeSkills = (skillsRequired) => {
  if (Array.isArray(skillsRequired)) {
    return skillsRequired;
  }

  if (typeof skillsRequired === "string" && skillsRequired.trim()) {
    return skillsRequired
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return [];
};

const createJob = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      skillsRequired: normalizeSkills(req.body.skillsRequired),
      createdBy: req.user.userId,
    };

    const job = await Job.create(payload);

    return res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: job,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Unable to create job",
      error: error.message,
    });
  }
};

const getJobs = async (_req, res) => {
  try {
    const jobs = await Job.find().populate("createdBy", "name email role");

    return res.status(200).json({
      success: true,
      count: jobs.length,
      data: jobs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch jobs",
      error: error.message,
    });
  }
};

const getJobById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id",
      });
    }

    const job = await Job.findById(req.params.id).populate(
      "createdBy",
      "name email role"
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to fetch job",
      error: error.message,
    });
  }
};

const updateJob = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id",
      });
    }

    const updateData = { ...req.body };
    if (Object.prototype.hasOwnProperty.call(req.body, "skillsRequired")) {
      updateData.skillsRequired = normalizeSkills(req.body.skillsRequired);
    }

    const job = await Job.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: job,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Unable to update job",
      error: error.message,
    });
  }
};

const deleteJob = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid job id",
      });
    }

    const job = await Job.findByIdAndDelete(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Job deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to delete job",
      error: error.message,
    });
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
};

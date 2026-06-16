const express = require("express");
const {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
} = require("../controllers/jobController");
const {
  authMiddleware,
  requireRecruiter,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", requireRecruiter, createJob);
router.get("/", getJobs);
router.get("/:id", getJobById);
router.patch("/:id", requireRecruiter, updateJob);
router.delete("/:id", requireRecruiter, deleteJob);

module.exports = router;

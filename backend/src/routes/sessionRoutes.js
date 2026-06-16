const express = require("express");
const { body } = require("express-validator");
const {
  createSession,
  getSessions,
  getSessionById,
  startSession,
  endSession,
  getSessionReport,
} = require("../controllers/sessionController");
const {
  authMiddleware,
  requireRecruiter,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/",
  requireRecruiter,
  [
    body("jobId").isMongoId().withMessage("Valid jobId is required"),
    body("candidateId").isMongoId().withMessage("Valid candidateId is required"),
    body("scheduledAt")
      .isISO8601()
      .withMessage("Valid scheduledAt date is required"),
    body("recordingUrl")
      .optional()
      .isString()
      .withMessage("recordingUrl must be a string"),
  ],
  createSession
);

router.get("/", getSessions);
router.get("/:id", getSessionById);
router.patch("/:id/start", requireRecruiter, startSession);
router.patch(
  "/:id/end",
  requireRecruiter,
  [
    body("recordingUrl")
      .optional()
      .isString()
      .withMessage("recordingUrl must be a string"),
    body("aiReport")
      .optional()
      .isObject()
      .withMessage("aiReport must be an object"),
  ],
  endSession
);
router.get("/:id/report", getSessionReport);

module.exports = router;

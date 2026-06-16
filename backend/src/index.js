const http = require("http");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const aiRoutes = require("./routes/aiRoutes");
const setupSocketHandlers = require("./socket/socketHandler");

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;
const corsOrigin = process.env.CLIENT_ORIGIN || "*";
const corsOptions = {
  origin: corsOrigin,
  methods: ["GET", "POST", "PATCH", "DELETE"],
};
const io = new Server(server, {
  cors: corsOptions,
});

connectDB();
setupSocketHandlers(io);

app.use(cors(corsOptions));
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "InGuard1 backend is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/ai", aiRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

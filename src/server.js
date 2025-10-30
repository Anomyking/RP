import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";

// Imports
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { createInitialAdmin } from "./config/initAdmin.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";

dotenv.config();

// Express + HTTP server for sockets
const app = express();
const server = http.createServer(app);

// ✅ Enhanced CORS setup
const FRONTEND_URL = "https://rp-frontend-00wi.onrender.com";

app.use(cors({
  origin: [FRONTEND_URL, "http://localhost:3000"], // Add localhost for development
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Handle preflight requests explicitly
app.options("*", cors());

// Socket.IO with CORS
export const io = new Server(server, {
  cors: {
    origin: [FRONTEND_URL, "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
});

// Middleware
app.use(express.json());

// Connect DB
connectDB()
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    await createInitialAdmin();
  })
  .catch((err) => console.error("❌ DB connection error:", err.message));

// Socket connections
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.emit("connectionStatus", { connected: true });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/superadmin", superAdminRoutes);

// ✅ Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

// Serve frontend (if you're serving static files)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only serve static files if they exist
app.use(express.static(path.join(__dirname, "../frontend")));

app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running with WebSockets on port ${PORT}`)
);
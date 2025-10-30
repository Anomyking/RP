// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http"; // ✅ Added for socket server
import { Server } from "socket.io"; // ✅ Socket.IO

// ✅ Imports
import connectDB from "./config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import adminRoutes from "./src/routes/adminRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import { createInitialAdmin } from "./config/initAdmin.js";
import superAdminRoutes from "./src/routes/superAdminRoutes.js";

dotenv.config();

// ✅ Express + HTTP server for sockets
const app = express();
const server = http.createServer(app);
export const io = new Server(server, {
  cors: { origin: "*" },
});

// ✅ Middleware
app.use(cors());
app.use(express.json());

// ✅ Connect DB
connectDB()
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    await createInitialAdmin();
  })
  .catch((err) => console.error("❌ DB connection error:", err.message));

// ✅ Real-time socket connections
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.emit("connectionStatus", { connected: true });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/superadmin", superAdminRoutes);

// ✅ Serve static frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../frontend")));

// ✅ Root route redirect
app.get("/", (req, res) => {
  res.redirect("/login.html");
});

// ✅ Fallback for 404 routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "../frontend/login.html"));
});

// ❌ Remove or comment this line
 server.listen(PORT, () => console.log(`🚀 Server running with WebSockets on port ${PORT}`));

// ✅ Instead, export the app for Vercel
export default app;
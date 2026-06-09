import "dotenv/config";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

import { AuthRouter } from "./routes/auth/auth.router";
import { ScoresRouter } from "./routes/scores/scores.router";
import { CouponsRouter } from "./routes/coupons/coupons.router";
import { EmailRouter } from "./routes/email/email.router";   
import { setupSocket } from "./socket/gameSocket";
import { AdminRouter } from "./routes/admin/admin.router";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", express.static("../frontend/client"));
app.use("/mall", express.static("../frontend/mall-screen"));
app.use("/api/admin", AdminRouter);
app.use("/admin", express.static("../frontend/admin"));

app.use("/auth", AuthRouter);
app.use("/scores", ScoresRouter);
app.use("/coupons", CouponsRouter);
app.use("/email", EmailRouter);   

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT ?? 3000;

const rawServer = createServer(app);

const io = new Server(rawServer, {
  path: "/real-time",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
});

setupSocket(io);

rawServer.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`backend corriendo en http://localhost:${PORT}`);
});
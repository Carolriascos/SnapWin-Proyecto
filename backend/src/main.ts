import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import "dotenv/config";

import { AuthRouter } from "./routes/auth/auth.router";
import { ScoresRouter } from "./routes/scores/scores.router";
import { CouponsRouter } from "./routes/coupons/coupons.router";
import { setupSocket } from "./socket/gameSocket";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", express.static("../frontend/client"));
app.use("/mall", express.static("../frontend/mall-screen"));
app.use("/admin", express.static("../frontend/admin"));

app.use("/auth", AuthRouter);
app.use("/scores", ScoresRouter);
app.use("/coupons", CouponsRouter);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", project: "Flash Play", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT ?? 3000;
const rawServer = createServer(app);

rawServer.listen(PORT, () => {
  console.log(` backend corriendo en http://localhost:${PORT}`);
});

const io = new Server(rawServer, {
  path: "/real-time",
  cors: { origin: "*" },
});

setupSocket(io);

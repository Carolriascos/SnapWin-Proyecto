import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const SECRET = process.env.ADMIN_SECRET ?? "snapwin-admin-secret";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const generateAdminToken = (adminId: string): string => {
  const timestamp = Date.now().toString();
  const sig = crypto.createHmac("sha256", SECRET).update(`${adminId}:${timestamp}`).digest("hex");
  return Buffer.from(`${adminId}:${timestamp}:${sig}`).toString("base64");
};

export const verifyAdminToken = (token: string): string | null => {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;

    const [adminId, timestamp, sig] = parts;
    const expected = crypto.createHmac("sha256", SECRET).update(`${adminId}:${timestamp}`).digest("hex");
    if (sig !== expected) return null;

    const age = Date.now() - Number(timestamp);
    if (Number.isNaN(age) || age > MAX_AGE_MS) return null;

    return adminId;
  } catch {
    return null;
  }
};

export const AdminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Token no proporcionado" });
    return;
  }

  const token = authHeader.split(" ")[1];
  const adminId = verifyAdminToken(token);

  if (!adminId) {
    res.status(401).json({ success: false, error: "Sesión de administrador inválida o expirada" });
    return;
  }

  (req as Request & { adminId: string }).adminId = adminId;
  next();
};

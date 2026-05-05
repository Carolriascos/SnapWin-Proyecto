import { Request, Response, NextFunction } from "express";
import { SupabaseClient } from "../clients/SupabaseClient";

export const AuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Token no proporcionado" });
    return;
  }

  const token = authHeader.split(" ")[1];

  const { data, error } = await SupabaseClient.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ success: false, error: "Token inválido" });
    return;
  }

  next();
};

import express from "express";
import { CouponsController } from "./coupons.controller";
import { AdminAuthMiddleware } from "../../middlewares/AdminAuth.middleware";
export const CouponsRouter = express.Router();

CouponsRouter.post("/generate", CouponsController.generate);

CouponsRouter.post("/redeem", CouponsController.redeemPlayer);

CouponsRouter.get("/validate/:codigo", AdminAuthMiddleware, CouponsController.validate);

CouponsRouter.patch("/redeem/:codigo", AdminAuthMiddleware, CouponsController.redeem);

CouponsRouter.get("/list", AdminAuthMiddleware, CouponsController.list);

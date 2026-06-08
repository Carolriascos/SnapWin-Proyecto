import express from "express";
import { CouponsController } from "./coupons.controller";
import { AuthMiddleware } from "../../middlewares/Auth.middleware";
export const CouponsRouter = express.Router();

CouponsRouter.post("/generate", CouponsController.generate);

CouponsRouter.post("/redeem", CouponsController.redeemPlayer);

CouponsRouter.get("/validate/:codigo", AuthMiddleware, CouponsController.validate);

CouponsRouter.patch("/redeem/:codigo", AuthMiddleware, CouponsController.redeem);

CouponsRouter.get("/list", AuthMiddleware, CouponsController.list);

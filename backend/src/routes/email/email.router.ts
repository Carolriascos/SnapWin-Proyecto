import { Router } from "express";
import { EmailController } from "./email.controller";

export const EmailRouter = Router();

EmailRouter.post("/send-coupon", EmailController.sendCoupon);
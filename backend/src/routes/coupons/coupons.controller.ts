import { Request, Response } from "express";
import CouponsRepository from "./coupons.repository";

const generate = async (req: Request, res: Response) => {
  const { jugadorId, posicion } = req.body;

  if (jugadorId === undefined || posicion === undefined) {
    res.status(400).json({ success: false, error: "jugadorId y posicion son requeridos" });
    return;
  }

  const response = await CouponsRepository.generateCoupon(jugadorId, posicion);
  res.json(response);
};


const validate = async (req: Request, res: Response) => {
  const { codigo } = req.params;

  const response = await CouponsRepository.validateCoupon(codigo);
  res.json(response);
};


const redeem = async (req: Request, res: Response) => {
  const { codigo } = req.params;

  const response = await CouponsRepository.redeemCoupon(codigo);
  res.json(response);
};

const list = async (_req: Request, res: Response) => {
  const response = await CouponsRepository.listCoupons();
  res.json(response);
};

export const CouponsController = { generate, validate, redeem, list };

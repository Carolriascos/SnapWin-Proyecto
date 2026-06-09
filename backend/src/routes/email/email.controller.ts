import { Request, Response } from "express";
import { EmailService } from "./email.service";

const sendCoupon = async (req: Request, res: Response) => {
  try {
    const { to_email, nombre, codigo, nivel, descuento } = req.body;

    if (!to_email || !nombre || !codigo || !nivel || descuento === undefined) {
      res.status(400).json({
        success: false,
        error: "Todos los campos son obligatorios: to_email, nombre, codigo, nivel, descuento",
      });
      return;
    }

    const result = await EmailService.sendCouponEmail({
      to_email,
      nombre,
      codigo,
      nivel,
      descuento: String(descuento),
    });

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.json(result);
  } catch (err) {
    console.error("Error en /email/send-coupon:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Error interno del servidor",
    });
  }
};

export const EmailController = { sendCoupon };
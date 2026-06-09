interface SendCouponPayload {
  to_email: string;
  nombre: string;
  codigo: string;
  nivel: string;
  descuento: string;
}

interface ApiResponse<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export const EmailService = {
  async sendCouponEmail(payload: SendCouponPayload): Promise<ApiResponse> {
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
      console.error("BREVO_API_KEY no está configurada en las variables de entorno");
      return { success: false, error: "Configuración de email incompleta en el servidor" };
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL ?? "noreply@snapwin.com";
    const senderName  = process.env.BREVO_SENDER_NAME  ?? "SnapWin";

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tu cupón SnapWin</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #6c63ff, #4ecdc4); padding: 32px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; }
          .body { padding: 32px; text-align: center; }
          .body h2 { color: #333; font-size: 22px; }
          .coupon-box { background: #f0edff; border: 2px dashed #6c63ff; border-radius: 12px; padding: 24px; margin: 24px 0; }
          .coupon-code { font-size: 32px; font-weight: bold; color: #6c63ff; letter-spacing: 4px; }
          .coupon-details { margin-top: 12px; font-size: 16px; color: #555; }
          .footer { background: #f4f4f4; padding: 16px; text-align: center; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎮 SnapWin</h1>
          </div>
          <div class="body">
            <h2>¡Felicitaciones, ${payload.nombre}! 🎉</h2>
            <p>Ganaste un cupón de descuento. Aquí están los detalles:</p>
            <div class="coupon-box">
              <div class="coupon-code">${payload.codigo}</div>
              <div class="coupon-details">
                <strong>Nivel:</strong> ${payload.nivel}<br>
                <strong>Descuento:</strong> ${payload.descuento}%
              </div>
            </div>
            <p>Presenta este código en caja para reclamar tu descuento. ¡Buena suerte!</p>
          </div>
          <div class="footer">
            Este correo fue enviado automáticamente por SnapWin. No respondas a este mensaje.
          </div>
        </div>
      </body>
      </html>
    `;

    const body = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: payload.to_email, name: payload.nombre }],
      subject: `🎮 SnapWin — Tu cupón de ${payload.descuento}% de descuento`,
      htmlContent,
    };

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error de Brevo:", response.status, errorData);
        return {
          success: false,
          error: `Error al enviar email: ${response.status} ${JSON.stringify(errorData)}`,
        };
      }

      console.log(`Email de cupón enviado a ${payload.to_email}`);
      return { success: true };
    } catch (err) {
      console.error("Error de red al llamar Brevo:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error de red al enviar email",
      };
    }
  },
};
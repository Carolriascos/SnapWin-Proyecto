import { Request, Response } from "express"
import AuthRepository from "./auth.repository"

const register = async (req: Request, res: Response) => {
  try {
    const { nombre, edad, genero, correo, salaId } = req.body

    if (!nombre || !edad || !genero || !correo || !salaId) {
      res.status(400).json({ success: false, error: "Todos los campos son obligatorios" })
      return
    }

    const response = await AuthRepository.createJugador({ nombre, edad, genero, correo, salaId })
    if (!response.success) {
      res.status(500).json(response)
      return
    }
    res.json(response)
  } catch (err) {
    console.error("Error en /auth/register:", err)
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Error interno del servidor",
    })
  }
}

export default { register }

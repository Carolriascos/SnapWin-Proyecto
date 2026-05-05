import { Request, Response } from "express"
import AuthRepository from "./auth.repository"

const register = async (req: Request, res: Response) => {
  const { nombre, edad, genero, correo, salaId } = req.body

  if (!nombre || !edad || !genero || !correo || !salaId) {
    res.status(400).json({ success: false, error: "Todos los campos son obligatorios" })
    return
  }

  const response = await AuthRepository.createJugador({ nombre, edad, genero, correo, salaId })
  res.json(response)
}

export default { register }

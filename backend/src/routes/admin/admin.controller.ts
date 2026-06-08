import { Request, Response } from "express"
import AdminRepository from "./admin.repository"
import { generateAdminToken } from "../../middlewares/AdminAuth.middleware"

const register = async (req: Request, res: Response) => {
  const { nombre, usuario, correo, password } = req.body
  if (!nombre || !usuario || !correo || !password) {
    res.status(400).json({ success: false, error: "Todos los campos son obligatorios" })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ success: false, error: "Contraseña muy corta" })
    return
  }
  const response = await AdminRepository.registerAdmin({ nombre, usuario, correo, password })
  res.json(response)
}

const login = async (req: Request, res: Response) => {
  const { usuario, password } = req.body
  if (!usuario || !password) {
    res.status(400).json({ success: false, error: "Campos obligatorios" })
    return
  }
  const response = await AdminRepository.loginAdmin({ usuario, password })
  if (response.success && response.data?.adminId) {
    res.json({
      ...response,
      data: {
        ...response.data,
        token: generateAdminToken(response.data.adminId),
      },
    })
    return
  }
  res.json(response)
}

export default { register, login }
import { SupabaseClient } from "../../clients/SupabaseClient"

const registerAdmin = async (payload: {
  nombre: string; usuario: string; correo: string; password: string
}) => {
  const { data, error } = await SupabaseClient
    .from("administradores")
    .insert({ nombre: payload.nombre, usuario: payload.usuario, correo: payload.correo, password: payload.password })
    .select().single()
  if (error) return { success: false, error: error.message }
  return { success: true, data: { adminId: data.id } }
}

const loginAdmin = async (payload: { usuario: string; password: string }) => {
  const { data, error } = await SupabaseClient
    .from("administradores")
    .select("*")
    .eq("usuario", payload.usuario)
    .eq("password", payload.password)
    .single()
  if (error || !data) return { success: false, error: "Usuario o contraseña incorrectos" }
  return { success: true, data: { adminId: data.id, nombre: data.nombre } }
}

export default { registerAdmin, loginAdmin }
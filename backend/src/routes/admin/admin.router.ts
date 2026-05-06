import { Router } from "express"
import AdminController from "./admin.controller"

export const AdminRouter = Router()
AdminRouter.post("/register", AdminController.register)
AdminRouter.post("/login",    AdminController.login)
import express from "express"
import ScoresController from "./scores.controller"

export const ScoresRouter = express.Router()

ScoresRouter.get("/ranking/:salaId", ScoresController.getRanking)
ScoresRouter.get("/top3",            ScoresController.getRanking)
ScoresRouter.get("/stats-hoy",       ScoresController.getStatsDia)
ScoresRouter.post("/save",           ScoresController.saveScore)
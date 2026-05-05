import { Request, Response } from "express"
import ScoresRepository from "./scores.repository"

const getRanking = async (req: Request, res: Response) => {
  const { salaId } = req.params

  const response = await ScoresRepository.getTop3(salaId)
  res.json(response)
}

/* Guarda el puntaje final de un jugador al terminar la ronda. */
const saveScore = async (req: Request, res: Response) => {
  const { jugadorId, juego, salaId, puntos } = req.body

  if (!jugadorId || !juego || !salaId || puntos === undefined) {
    res.status(400).json({ success: false, error: "Datos de puntaje incompletos" })
    return
  }

  const response = await ScoresRepository.saveScore({ jugadorId, juego, salaId, puntos })
  res.json(response)
}

export default { getRanking, saveScore }

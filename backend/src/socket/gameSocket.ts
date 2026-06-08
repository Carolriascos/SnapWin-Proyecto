import { Server } from "socket.io";
import ScoresRepository from "../routes/scores/scores.repository";

export const setupSocket = (io: Server) => {
  const salas: Map<string, any[]> = new Map();
  const salaGameMode: Map<string, "shake" | "dodge"> = new Map();
  const salaCountdownStarted: Map<string, boolean> = new Map();
  const salaPuntajes: Map<string, Record<string, number>> = new Map();
  const salaTerminados: Map<string, Set<string>> = new Map();

  const emitirStatsDia = async () => {
    try {
      const res = await ScoresRepository.getStatsDia();
      if (res.success) io.to("sala-001").emit("stats-dia", res.data);
    } catch (e) {
      console.error("Error emitiendo stats:", e);
    }
  };

  io.on("connection", (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    socket.on("join-sala", (data: { salaId: string; jugador: any }) => {
      const { salaId, jugador } = data;
      const modo = jugador?.gameMode === "dodge" ? "dodge" : "shake";
      socket.join(salaId);

      const jugadoresEnSala = salas.get(salaId) ?? [];
      const humanosAntes = jugadoresEnSala.filter((j) => j.id !== "mall-screen").length;

      if (jugador?.id !== "mall-screen" && humanosAntes === 0) {
        salaGameMode.set(salaId, modo);
      }

      jugadoresEnSala.push({ ...jugador, socketId: socket.id, gameMode: modo });
      salas.set(salaId, jugadoresEnSala);

      io.to(salaId).emit("players-update", jugadoresEnSala);

      const humanos = jugadoresEnSala.filter((j) => j.id !== "mall-screen").length;
      if (humanos >= 2 && !salaCountdownStarted.get(salaId)) {
        salaCountdownStarted.set(salaId, true);
        startCountdown(io, salaId, salaGameMode);
      }
    });

    socket.on("shake-data", (data: { salaId: string; jugadorId: string; fuerza: number }) => {
      const puntajes = salaPuntajes.get(data.salaId) ?? {};
      puntajes[data.jugadorId] = (puntajes[data.jugadorId] ?? 0) + Math.round(data.fuerza);
      salaPuntajes.set(data.salaId, puntajes);
      io.to(data.salaId).emit("score-update", {
        jugadorId: data.jugadorId,
        fuerza: data.fuerza,
        timestamp: Date.now(),
      });
    });

    socket.on("dodge-data", (data: { salaId: string; jugadorId: string; angulo?: number; posicion?: number; carril?: number }) => {
      io.to(data.salaId).emit("dodge-update", {
        jugadorId: data.jugadorId,
        angulo: data.angulo ?? 0,
        posicion: data.posicion,
        carril: data.carril,
      });
    });

    socket.on("game-over", async (data: { salaId: string; jugadorId: string; puntos: number }) => {
      const { salaId, jugadorId, puntos } = data;
      const jugadoresEnSala = salas.get(salaId) ?? [];
      const jugador = jugadoresEnSala.find((j) => j.id === jugadorId);

      const puntajes = salaPuntajes.get(salaId) ?? {};
      puntajes[jugadorId] = puntos;
      salaPuntajes.set(salaId, puntajes);

      const terminados = salaTerminados.get(salaId) ?? new Set();
      terminados.add(jugadorId);
      salaTerminados.set(salaId, terminados);

      io.to(salaId).emit("player-finished", {
        jugadorId,
        puntos,
        nombre: jugador?.nombre ?? "Jugador",
        color: jugador?.color ?? "#888",
      });

      const rankingParcial = jugadoresEnSala
        .filter((j) => j.id !== "mall-screen")
        .map((j) => ({
          jugadorId: j.id,
          nombre: j.nombre ?? "Jugador",
          color: j.color ?? "#888",
          puntos: puntajes[j.id] ?? 0,
        }))
        .sort((a, b) => b.puntos - a.puntos);

      const humanos = jugadoresEnSala.filter((j) => j.id !== "mall-screen");
      const todosTerminaron = humanos.length > 0 && humanos.every((j) => terminados.has(j.id));

      if (todosTerminaron) {
        io.to(salaId).emit("ranking-partida", rankingParcial);
        io.to(salaId).emit("partida-finalizada", { ranking: rankingParcial });
        setTimeout(emitirStatsDia, 500);
      } else {
        io.to(salaId).emit("ranking-parcial", rankingParcial);
      }
    });

    socket.on("admin-start-round", (data: { salaId: string }) => {
      salas.set(data.salaId, []);
      salaCountdownStarted.delete(data.salaId);
      salaGameMode.delete(data.salaId);
      salaPuntajes.set(data.salaId, {});
      salaTerminados.set(data.salaId, new Set());
      io.to(data.salaId).emit("players-update", []);
      io.to(data.salaId).emit("ranking-partida", []);
      startCountdown(io, data.salaId, salaGameMode);
    });

    socket.on("pedir-stats", async () => {
      try {
        const res = await ScoresRepository.getStatsDia();
        if (res.success) socket.emit("stats-dia", res.data);
      } catch (e) {
        console.error("Error al pedir stats:", e);
      }
    });

    socket.on("disconnect", () => {
      salas.forEach((jugadores, salaId) => {
        const actualizados = jugadores.filter((j) => j.socketId !== socket.id);
        salas.set(salaId, actualizados);
        const humanosActuales = actualizados.filter((j) => j.id !== "mall-screen").length;
        if (humanosActuales === 0) {
          salaGameMode.delete(salaId);
          salaCountdownStarted.delete(salaId);
          salaTerminados.set(salaId, new Set());
        }
        io.to(salaId).emit("players-update", actualizados);
      });
    });
  });
};

const startCountdown = (io: Server, salaId: string, salaGameMode?: Map<string, "shake" | "dodge">) => {
  let count = 30;
  const interval = setInterval(() => {
    io.to(salaId).emit("countdown", { count });
    count--;
    if (count < 0) {
      clearInterval(interval);
      const game = salaGameMode?.get(salaId) ?? "shake";
      io.to(salaId).emit("game-start", { salaId, game, timestamp: Date.now() });
    }
  }, 1000);
};
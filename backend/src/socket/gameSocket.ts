import { Server } from "socket.io";
import { SupabaseClient } from "../clients/SupabaseClient";

/* Maneja toda la comunicación en tiempo real del juego.*/
export const setupSocket = (io: Server) => {
  const salas: Map<string, any[]> = new Map();
  const salaGameMode: Map<string, "shake" | "dodge"> = new Map();

  io.on("connection", (socket) => {
    console.log(` Cliente conectado: ${socket.id}`);

    socket.on('admin-start-round', (salaId: string) => {
      io.to(salaId).emit('round-started', { salaId })
    })

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
      console.log(`👤 ${jugador.nombre} se unió a sala ${salaId}`);

      // si hay 2 o más jugadores, iniciar cuenta regresiva
      if (jugadoresEnSala.length >= 2) {
        startCountdown(io, salaId, salaGameMode);
      }
    });

    socket.on("shake-data", (data: { salaId: string; jugadorId: string; fuerza: number }) => {
      io.to(data.salaId).emit("score-update", {
        jugadorId: data.jugadorId,
        fuerza: data.fuerza,
        timestamp: Date.now(),
      });
    });

    //  Ángulo de inclinación — Dodge Game
    socket.on(
      "dodge-data",
      (data: { salaId: string; jugadorId: string; angulo?: number; posicion?: number; carril?: number }) => {
        io.to(data.salaId).emit("dodge-update", {
          jugadorId: data.jugadorId,
          angulo: data.angulo ?? 0,
          posicion: data.posicion,
          carril: data.carril,
        });
      }
    );

    //  Fin del juego de un jugador
    socket.on("game-over", async (data: { salaId: string; jugadorId: string; puntos: number }) => {
      io.to(data.salaId).emit("player-finished", {
        jugadorId: data.jugadorId,
        puntos: data.puntos,
      });
    });

    socket.on("admin-start-round", (data: { salaId: string }) => {
      console.log(`Admin inició ronda en sala ${data.salaId}`)
      startCountdown(io, data.salaId, salaGameMode)
    });

    socket.on("disconnect", () => {
      console.log(` Cliente desconectado: ${socket.id}`);

      // Eliminar jugador de todas las salas
      salas.forEach((jugadores, salaId) => {
        const actualizados = jugadores.filter((j) => j.socketId !== socket.id);
        salas.set(salaId, actualizados);
        if (actualizados.filter((j) => j.id !== "mall-screen").length === 0) {
          salaGameMode.delete(salaId);
        }
        io.to(salaId).emit("players-update", actualizados);
      });
    });
  });
};

const startCountdown = (io: Server, salaId: string, salaGameMode?: Map<string, "shake" | "dodge">) => {
  let count = 10;

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

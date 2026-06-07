import { Server } from "socket.io";

export const setupSocket = (io: Server) => {
  const salas: Map<string, any[]> = new Map();
  const salaGameMode: Map<string, "shake" | "dodge"> = new Map();
  const salaCountdownStarted: Map<string, boolean> = new Map();
  // Puntajes EN MEMORIA de la partida actual — se limpian en nueva ronda
  const salaPuntajes: Map<string, Record<string, number>> = new Map();

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
      // Acumular puntaje en memoria
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
      const jugadoresEnSala = salas.get(data.salaId) ?? [];
      const jugador = jugadoresEnSala.find((j) => j.id === data.jugadorId);

      // Actualizar puntaje final en memoria
      const puntajes = salaPuntajes.get(data.salaId) ?? {};
      puntajes[data.jugadorId] = data.puntos;
      salaPuntajes.set(data.salaId, puntajes);

      io.to(data.salaId).emit("player-finished", {
        jugadorId: data.jugadorId,
        puntos: data.puntos,
        nombre: jugador?.nombre ?? 'Jugador',
        color: jugador?.color ?? '#888',
      });

      // Emitir ranking solo de esta partida
      const rankingPartida = jugadoresEnSala
        .filter(j => j.id !== 'mall-screen')
        .map(j => ({
          jugadorId: j.id,
          nombre: j.nombre ?? 'Jugador',
          color: j.color ?? '#888',
          puntos: puntajes[j.id] ?? 0,
        }))
        .sort((a, b) => b.puntos - a.puntos);

      io.to(data.salaId).emit("ranking-partida", rankingPartida);
    });

    socket.on("admin-start-round", (data: { salaId: string }) => {
      // Limpiar TODO de la partida anterior
      salas.set(data.salaId, []);
      salaCountdownStarted.delete(data.salaId);
      salaGameMode.delete(data.salaId);
      salaPuntajes.set(data.salaId, {});
      io.to(data.salaId).emit('players-update', []);
      io.to(data.salaId).emit('ranking-partida', []);
      startCountdown(io, data.salaId, salaGameMode);
    });

    socket.on("disconnect", () => {
      salas.forEach((jugadores, salaId) => {
        const actualizados = jugadores.filter((j) => j.socketId !== socket.id);
        salas.set(salaId, actualizados);
        const humanosActuales = actualizados.filter((j) => j.id !== "mall-screen").length;
        if (humanosActuales === 0) {
          salaGameMode.delete(salaId);
          salaCountdownStarted.delete(salaId);
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
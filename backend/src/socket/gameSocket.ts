import { Server } from "socket.io";
import ScoresRepository from "../routes/scores/scores.repository";

export const setupSocket = (io: Server) => {
  const salas: Map<string, any[]> = new Map();
  const salaGameMode: Map<string, "shake" | "dodge"> = new Map();
  const salaCountdownStarted: Map<string, boolean> = new Map();
  const salaPuntajes: Map<string, Record<string, number>> = new Map();
  const salaTerminados: Map<string, Set<string>> = new Map();
  const salaAdminWantsStart: Map<string, boolean> = new Map();
  const salaCountdownIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  const emitirStatsDia = async (salaId = "sala-001") => {
    try {
      const res = await ScoresRepository.getStatsDia();
      if (res.success) io.to(salaId).emit("stats-dia", res.data);
    } catch (e) {
      console.error("Error emitiendo stats:", e);
    }
  };

  const cancelCountdown = (salaId: string) => {
    const interval = salaCountdownIntervals.get(salaId);
    if (interval) { clearInterval(interval); salaCountdownIntervals.delete(salaId); }
  };

  const startGame = (salaId: string) => {
    cancelCountdown(salaId);
    salaCountdownStarted.set(salaId, true);
    salaAdminWantsStart.delete(salaId);
    const game = salaGameMode.get(salaId) ?? "shake";
    io.to(salaId).emit("game-start", { salaId, game, timestamp: Date.now() });
    io.to(salaId).emit("countdown", { count: 0 });
  };

  const startCountdown = (salaId: string) => {
    cancelCountdown(salaId);
    let count = 30;
    io.to(salaId).emit("countdown", { count });
    const interval = setInterval(() => {
      count--;
      if (count >= 0) io.to(salaId).emit("countdown", { count });
      if (count < 0) { cancelCountdown(salaId); startGame(salaId); }
    }, 1000);
    salaCountdownIntervals.set(salaId, interval);
  };

  const tryStartLobby = (salaId: string) => {
    const jugadoresEnSala = salas.get(salaId) ?? [];
    const humanos = jugadoresEnSala.filter((j) => j.id !== "mall-screen" && j.id !== "admin-panel").length;
    if (humanos < 2 || salaCountdownStarted.get(salaId)) return;
    if (salaAdminWantsStart.get(salaId)) startGame(salaId);
    else { salaCountdownStarted.set(salaId, true); startCountdown(salaId); }
  };

  const resetSala = (salaId: string) => {
    cancelCountdown(salaId);
    const jugadoresActuales = salas.get(salaId) ?? [];
    const noJugadores = jugadoresActuales.filter(
      (j) => j.id === "mall-screen" || j.id === "admin-panel"
    );
    salas.set(salaId, noJugadores);
    salaPuntajes.set(salaId, {});
    salaTerminados.set(salaId, new Set());
    salaCountdownStarted.delete(salaId);
    salaAdminWantsStart.delete(salaId);
    salaGameMode.delete(salaId);
    io.to(salaId).emit("round-reset");
    io.to(salaId).emit("ranking-partida", []);
    io.to(salaId).emit("players-update", noJugadores);
  };

  io.on("connection", (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    socket.on("join-sala", (data: { salaId: string; jugador: any }) => {
      const { salaId, jugador } = data;
      const modo = jugador?.gameMode === "dodge" ? "dodge" : "shake";
      socket.join(salaId);

      const jugadoresEnSala = salas.get(salaId) ?? [];
      const humanosAntes = jugadoresEnSala.filter((j) => j.id !== "mall-screen" && j.id !== "admin-panel").length;

      if (jugador?.id !== "mall-screen" && jugador?.id !== "admin-panel" && humanosAntes === 0) {
        salaGameMode.set(salaId, modo);
      }

      const existente = jugadoresEnSala.findIndex((j) => j.id === jugador?.id);
      const entrada = { ...jugador, socketId: socket.id, gameMode: modo };
      if (existente >= 0) jugadoresEnSala[existente] = entrada;
      else jugadoresEnSala.push(entrada);

      salas.set(salaId, jugadoresEnSala);
      io.to(salaId).emit("players-update", jugadoresEnSala);
      tryStartLobby(salaId);
    });

    socket.on("shake-data", (data: { salaId: string; jugadorId: string; fuerza: number }) => {
      const puntajes = salaPuntajes.get(data.salaId) ?? {};
      puntajes[data.jugadorId] = (puntajes[data.jugadorId] ?? 0) + Math.round(data.fuerza);
      salaPuntajes.set(data.salaId, puntajes);
      io.to(data.salaId).emit("score-update", { jugadorId: data.jugadorId, fuerza: data.fuerza, timestamp: Date.now() });
    });

    socket.on("dodge-data", (data: { salaId: string; jugadorId: string; angulo?: number; posicion?: number; carril?: number }) => {
      io.to(data.salaId).emit("dodge-update", { jugadorId: data.jugadorId, angulo: data.angulo ?? 0, posicion: data.posicion, carril: data.carril });
    });

    socket.on("dodge-sync", (data: { salaId: string; jugadorId: string; carril: number; vidas: number; puntos: number; eliminado: boolean; obstaculos?: any[] }) => {
      io.to(data.salaId).emit("dodge-player-state", data);
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

      io.to(salaId).emit("player-finished", { jugadorId, puntos, nombre: jugador?.nombre ?? "Jugador", color: jugador?.color ?? "#888" });

      const rankingParcial = jugadoresEnSala
        .filter((j) => j.id !== "mall-screen" && j.id !== "admin-panel")
        .map((j) => ({ jugadorId: j.id, nombre: j.nombre ?? "Jugador", color: j.color ?? "#888", puntos: puntajes[j.id] ?? 0 }))
        .sort((a, b) => b.puntos - a.puntos);

      const humanos = jugadoresEnSala.filter((j) => j.id !== "mall-screen" && j.id !== "admin-panel");
      const todosTerminaron = humanos.length > 0 && humanos.every((j) => terminados.has(j.id));

      if (todosTerminaron) {
        io.to(salaId).emit("ranking-partida", rankingParcial);
        io.to(salaId).emit("partida-finalizada", { ranking: rankingParcial });
        cancelCountdown(salaId);
        salaCountdownStarted.delete(salaId);
        salaAdminWantsStart.delete(salaId);
        setTimeout(() => emitirStatsDia(salaId), 500);
      } else {
        io.to(salaId).emit("ranking-parcial", rankingParcial);
      }
    });

    socket.on("admin-start-round", (data: { salaId: string }) => {
      const salaId = data.salaId;

      const jugadoresAntes = salas.get(salaId) ?? [];
      const humanosAntes = jugadoresAntes.filter((j) => j.id !== "mall-screen" && j.id !== "admin-panel");

      resetSala(salaId);

      if (humanosAntes.length >= 2) {
        const jugadoresPost = salas.get(salaId) ?? [];
        for (const h of humanosAntes) {
          jugadoresPost.push(h);
        }
        salas.set(salaId, jugadoresPost);
        io.to(salaId).emit("players-update", jugadoresPost);
        startGame(salaId);
        console.log(`Admin arrancó partida inmediata en ${salaId} con ${humanosAntes.length} jugadores`);
      } else {
        salaAdminWantsStart.set(salaId, true);
        console.log(`Admin esperando jugadores en ${salaId} (${humanosAntes.length} conectados)`);
      }
    });

    socket.on("pedir-stats", async () => {
      try {
        const res = await ScoresRepository.getStatsDia();
        if (res.success) socket.emit("stats-dia", res.data);
      } catch (e) { console.error("Error al pedir stats:", e); }
    });

    socket.on("cupon-generado", async (data: { salaId: string; codigo?: string }) => {
      io.to(data.salaId).emit("cupon-actualizado", { codigo: data.codigo ?? "" });
      await emitirStatsDia(data.salaId);
    });

    socket.on("cupon-canjeado", async (data: { salaId: string; codigo: string }) => {
      io.to(data.salaId).emit("cupon-actualizado", { codigo: data.codigo });
      await emitirStatsDia(data.salaId);
    });

    socket.on("disconnect", () => {
      salas.forEach((jugadores, salaId) => {
        const actualizados = jugadores.filter((j) => j.socketId !== socket.id);
        salas.set(salaId, actualizados);
        const humanosActuales = actualizados.filter((j) => j.id !== "mall-screen" && j.id !== "admin-panel").length;
        if (humanosActuales === 0) {
          cancelCountdown(salaId);
          salaGameMode.delete(salaId);
          salaCountdownStarted.delete(salaId);
          salaAdminWantsStart.delete(salaId);
          salaTerminados.set(salaId, new Set());
        }
        io.to(salaId).emit("players-update", actualizados);
      });
    });
  });
};
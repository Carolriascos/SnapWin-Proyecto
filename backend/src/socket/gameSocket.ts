import { Server } from "socket.io";
import ScoresRepository from "../routes/scores/scores.repository";

const DISCONNECT_GRACE_MS = 120_000;

type PlayerEstado = "espera" | "jugando" | "terminado";

interface JugadorSala {
  id: string;
  nombre?: string;
  color?: string;
  socketId: string;
  gameMode?: "shake" | "dodge";
  estado: PlayerEstado;
  disconnected?: boolean;
  disconnectedAt?: number;
}

export const setupSocket = (io: Server) => {
  const salas: Map<string, JugadorSala[]> = new Map();
  const salaGameMode: Map<string, "shake" | "dodge"> = new Map();
  const salaCountdownStarted: Map<string, boolean> = new Map();
  const salaPuntajes: Map<string, Record<string, number>> = new Map();
  const salaTerminados: Map<string, Set<string>> = new Map();
  const salaAdminWantsStart: Map<string, boolean> = new Map();
  const salaCountdownIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  const salaRoundId: Map<string, number> = new Map();
  const disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  const isSistema = (id: string) => id === "mall-screen" || id === "admin-panel";

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

  const getLobbyPlayers = (salaId: string) => {
    const jugadores = salas.get(salaId) ?? [];
    return jugadores.filter((j) => !isSistema(j.id) && j.estado === "espera" && !j.disconnected);
  };

  const emitPlayersUpdate = (salaId: string) => {
    io.to(salaId).emit("players-update", getLobbyPlayers(salaId));
  };

  const cancelDisconnectTimer = (salaId: string, jugadorId: string) => {
    const key = `${salaId}:${jugadorId}`;
    const timer = disconnectTimers.get(key);
    if (timer) { clearTimeout(timer); disconnectTimers.delete(key); }
  };

  const scheduleDisconnectRemoval = (salaId: string, jugadorId: string) => {
    const key = `${salaId}:${jugadorId}`;
    cancelDisconnectTimer(salaId, jugadorId);
    disconnectTimers.set(key, setTimeout(() => {
      disconnectTimers.delete(key);
      const jugadores = salas.get(salaId) ?? [];
      const actualizados = jugadores.filter((j) => j.id !== jugadorId);
      salas.set(salaId, actualizados);
      emitPlayersUpdate(salaId);
      const humanosEspera = getLobbyPlayers(salaId).length;
      if (humanosEspera === 0) {
        cancelCountdown(salaId);
        salaCountdownStarted.delete(salaId);
        salaAdminWantsStart.delete(salaId);
      }
    }, DISCONNECT_GRACE_MS));
  };

  const limpiarJugadoresHumanos = (salaId: string) => {
    const jugadores = salas.get(salaId) ?? [];
    const sistema = jugadores.filter((j) => isSistema(j.id));
    salas.set(salaId, sistema);
    emitPlayersUpdate(salaId);
  };

  const startGame = (salaId: string) => {
    cancelCountdown(salaId);
    salaCountdownStarted.set(salaId, true);
    salaAdminWantsStart.delete(salaId);

    const jugadores = salas.get(salaId) ?? [];
    jugadores.forEach((j) => {
      if (!isSistema(j.id)) j.estado = "jugando";
    });
    salas.set(salaId, jugadores);

    const game = salaGameMode.get(salaId) ?? "shake";
    io.to(salaId).emit("game-start", { salaId, game, timestamp: Date.now() });
    io.to(salaId).emit("countdown", { count: 0 });
    emitPlayersUpdate(salaId);
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
    const humanos = getLobbyPlayers(salaId).length;
    if (humanos < 2 || salaCountdownStarted.get(salaId)) return;
    if (salaAdminWantsStart.get(salaId)) startGame(salaId);
    else { salaCountdownStarted.set(salaId, true); startCountdown(salaId); }
  };

  const resetSala = (salaId: string) => {
    cancelCountdown(salaId);
    salaPuntajes.set(salaId, {});
    salaTerminados.set(salaId, new Set());
    salaCountdownStarted.delete(salaId);
    salaAdminWantsStart.delete(salaId);
    const roundId = salaRoundId.get(salaId) ?? 0;
    io.to(salaId).emit("round-reset", { roundId });
    io.to(salaId).emit("ranking-partida", []);
    emitPlayersUpdate(salaId);
  };

  io.on("connection", (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    socket.on("join-sala", (data: { salaId: string; jugador: any }) => {
      const { salaId, jugador } = data;
      const modo = jugador?.gameMode === "dodge" ? "dodge" : "shake";
      socket.join(salaId);

      const jugadoresEnSala = salas.get(salaId) ?? [];
      const humanosEspera = getLobbyPlayers(salaId).length;

      if (!isSistema(jugador?.id) && humanosEspera === 0 && !salaCountdownStarted.get(salaId)) {
        salaGameMode.set(salaId, modo);
      }

      const existenteIdx = jugadoresEnSala.findIndex((j) => j.id === jugador?.id);
      const previo = existenteIdx >= 0 ? jugadoresEnSala[existenteIdx] : null;

      if (previo) {
        cancelDisconnectTimer(salaId, jugador.id);
        jugadoresEnSala[existenteIdx] = {
          ...previo,
          ...jugador,
          socketId: socket.id,
          gameMode: previo.estado === "jugando" ? (previo.gameMode ?? modo) : modo,
          estado: previo.estado,
          disconnected: false,
          disconnectedAt: undefined,
        };
      } else if (isSistema(jugador?.id)) {
        const sysIdx = jugadoresEnSala.findIndex((j) => j.id === jugador.id);
        const entrada: JugadorSala = {
          id: jugador.id,
          nombre: jugador.nombre,
          socketId: socket.id,
          estado: "espera",
        };
        if (sysIdx >= 0) jugadoresEnSala[sysIdx] = entrada;
        else jugadoresEnSala.push(entrada);
      } else if (!salaCountdownStarted.get(salaId)) {
        jugadoresEnSala.push({
          id: jugador.id,
          nombre: jugador.nombre,
          color: jugador.color,
          socketId: socket.id,
          gameMode: modo,
          estado: "espera",
          disconnected: false,
        });
      } else {
        return;
      }

      salas.set(salaId, jugadoresEnSala);
      emitPlayersUpdate(salaId);
      if (!isSistema(jugador?.id) && (previo?.estado === "espera" || !previo)) {
        tryStartLobby(salaId);
      }
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

      const jugadorIdx = jugadoresEnSala.findIndex((j) => j.id === jugadorId);
      if (jugadorIdx >= 0) jugadoresEnSala[jugadorIdx].estado = "terminado";
      salas.set(salaId, jugadoresEnSala);

      io.to(salaId).emit("player-finished", { jugadorId, puntos, nombre: jugador?.nombre ?? "Jugador", color: jugador?.color ?? "#888" });

      const rankingParcial = jugadoresEnSala
        .filter((j) => !isSistema(j.id))
        .map((j) => ({ jugadorId: j.id, nombre: j.nombre ?? "Jugador", color: j.color ?? "#888", puntos: puntajes[j.id] ?? 0 }))
        .sort((a, b) => b.puntos - a.puntos);

      const humanos = jugadoresEnSala.filter((j) => !isSistema(j.id));
      const todosTerminaron = humanos.length > 0 && humanos.every((j) => terminados.has(j.id));

      if (todosTerminaron) {
        io.to(salaId).emit("ranking-partida", rankingParcial);
        io.to(salaId).emit("partida-finalizada", { ranking: rankingParcial });
        cancelCountdown(salaId);
        salaCountdownStarted.delete(salaId);
        salaAdminWantsStart.delete(salaId);
        setTimeout(() => {
          limpiarJugadoresHumanos(salaId);
          emitirStatsDia(salaId);
        }, 500);
      } else {
        io.to(salaId).emit("ranking-parcial", rankingParcial);
      }
    });

    socket.on("admin-start-round", (data: { salaId: string }) => {
      const salaId = data.salaId;
      const jugadores = salas.get(salaId) ?? [];
      const sistema = jugadores.filter((j) => isSistema(j.id));
      salas.set(salaId, sistema);
      salaGameMode.delete(salaId);
      salaRoundId.set(salaId, (salaRoundId.get(salaId) ?? 0) + 1);
      resetSala(salaId);
      console.log(`Admin inició nueva ronda en ${salaId}`);
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
        const idx = jugadores.findIndex((j) => j.socketId === socket.id);
        if (idx < 0) return;

        const jugador = jugadores[idx];

        if (isSistema(jugador.id)) {
          jugadores.splice(idx, 1);
          salas.set(salaId, jugadores);
          return;
        }

        jugador.disconnected = true;
        jugador.disconnectedAt = Date.now();
        salas.set(salaId, jugadores);
        scheduleDisconnectRemoval(salaId, jugador.id);

        if (jugador.estado === "espera") {
          emitPlayersUpdate(salaId);
          const humanosEspera = getLobbyPlayers(salaId).length;
          if (humanosEspera === 0) {
            cancelCountdown(salaId);
            salaCountdownStarted.delete(salaId);
            salaAdminWantsStart.delete(salaId);
          }
        }
      });
    });
  });
};

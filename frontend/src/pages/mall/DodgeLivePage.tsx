import { useEffect, useRef, useState } from 'react'
import { useSocket } from '../../hooks/useSocket'
import MallHeader from '../../components/MallHeader'

interface JugadorDodge {
  nombre: string
  color: string
  carril: number
}

const LANES = 4

function laneToPercent(lane: number) {
  return ((lane + 0.5) / LANES) * 100
}

export default function DodgeLivePage() {
  const socket = useSocket()
  const [jugadores, setJugadores] = useState<Record<string, JugadorDodge>>({})
  const [obstaculos, setObstaculos] = useState<{ id: number; lane: number; y: number }[]>([])
  const idRef = useRef(0)

  useEffect(() => {
    const emitJoin = () => {
      socket.emit('join-sala', {
        salaId: 'sala-001',
        jugador: { id: 'mall-screen', nombre: 'Mall' },
      })
    }
    if (socket.connected) emitJoin()
    else socket.on('connect', emitJoin)

    socket.on('players-update', (data: any[]) => {
      setJugadores((prev) => {
        const next = { ...prev }
        data.forEach((j) => {
          if (j.id === 'mall-screen') return
          if (!next[j.id]) {
            next[j.id] = { nombre: j.nombre || 'Jugador', color: j.color || '#7c3aed', carril: 1 }
          }
        })
        return next
      })
    })

    socket.on(
      'dodge-update',
      ({ jugadorId, carril, posicion }: { jugadorId: string; carril?: number; posicion?: number }) => {
        setJugadores((prev) => {
          if (!prev[jugadorId]) return prev
          let lane = carril ?? 1
          if (posicion != null) lane = Math.min(3, Math.max(0, Math.round((posicion / 100) * 4 - 0.5)))
          return { ...prev, [jugadorId]: { ...prev[jugadorId], carril: lane } }
        })
      }
    )

    const spawn = setInterval(() => {
      setObstaculos((prev) => [
        ...prev,
        { id: idRef.current++, lane: Math.floor(Math.random() * LANES), y: -10 },
      ])
    }, 1000)

    const tick = setInterval(() => {
      setObstaculos((prev) =>
        prev
          .map((o) => ({ ...o, y: o.y + 2.5 }))
          .filter((o) => o.y < 110)
      )
    }, 40)

    return () => {
      socket.off('connect', emitJoin)
      socket.off('players-update')
      socket.off('dodge-update')
      clearInterval(spawn)
      clearInterval(tick)
    }
  }, [socket])

  const lista = Object.entries(jugadores).filter(([id]) => id !== 'mall-screen')

  return (
    <div className="mall-screen">
      <div className="mall-pattern" aria-hidden />
      <MallHeader />

      <div className="mall-shake__top">
        <p className="mall-live-badge">¡JUEGO EN VIVO!</p>
        <span className="mall-mode-tag">DODGE GAME</span>
      </div>

      <div className="mall-dodge__lanes mall-dodge__lanes--live">
        {lista.length === 0 ? (
          <p className="mall-shake__empty" style={{ gridColumn: '1 / -1' }}>
            Esperando jugadores...
          </p>
        ) : (
          lista.map(([id, j]) => (
            <div key={id} className="mall-dodge-lane">
              <p className="mall-dodge-lane__name">{j.nombre}</p>
              <div className="mall-dodge-lane__playfield">
                {obstaculos
                  .filter((o) => o.lane === j.carril % LANES)
                  .map((o) => (
                    <div
                      key={o.id}
                      className="mall-dodge-lane__obstacle"
                      style={{ top: `${o.y}%` }}
                    />
                  ))}
                <div
                  className="mall-dodge-lane__player"
                  style={{
                    left: `${laneToPercent(j.carril)}%`,
                    background: j.color,
                  }}
                >
                  ▲
                </div>
              </div>
              <div className="mall-dodge-lane__stats">
                <span>LIFE ♥♥♥</span>
                <span>SCORE</span>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="mall-dodge__tilt">TILT THE PHONE</p>
    </div>
  )
}

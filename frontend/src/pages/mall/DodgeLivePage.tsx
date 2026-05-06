import { useEffect, useState } from 'react'
import { useSocket } from '../../hooks/useSocket'

interface JugadorDodge {
  nombre: string
  color: string
  posicion: number // 0-100%
}

export default function DodgeLivePage() {
  const socket = useSocket()
  const [jugadores, setJugadores] = useState<Record<string, JugadorDodge>>({})

  useEffect(() => {
    socket.on('players-update', (data: any[]) => {
      setJugadores(prev => {
        const next = { ...prev }
        data.forEach(j => {
          if (!next[j.id]) {
            next[j.id] = { nombre: j.nombre || 'Jugador', color: j.color || '#888', posicion: 50 }
          }
        })
        return next
      })
    })

    socket.on('dodge-update', ({ jugadorId, angulo }: { jugadorId: string; angulo: number }) => {
      setJugadores(prev => {
        if (!prev[jugadorId]) return prev
        const nueva = Math.min(100, Math.max(0, prev[jugadorId].posicion + angulo * 0.5))
        return { ...prev, [jugadorId]: { ...prev[jugadorId], posicion: nueva } }
      })
    })

    return () => {
      socket.off('players-update')
      socket.off('dodge-update')
    }
  }, [socket])

  return (
    <div style={{ padding: '20px' }}>
      <h1>DODGE GAME — en vivo</h1>

      {/* Campo del mall */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '300px',
        background: '#1a1a2e',
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        {Object.entries(jugadores).map(([id, j]) => (
          <div key={id} style={{
            position: 'absolute',
            bottom: '20px',
            left: `calc(${j.posicion}% - 24px)`,
            width: '48px',
            height: '48px',
            background: j.color,
            borderRadius: '50%',
            transition: 'left 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: 'white',
            fontWeight: 'bold'
          }}>
            {j.nombre.slice(0, 3)}
          </div>
        ))}
      </div>
    </div>
  )
}
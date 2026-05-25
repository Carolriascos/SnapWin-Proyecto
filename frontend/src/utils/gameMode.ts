export type GameMode = 'shake' | 'dodge'

const KEY = 'gameMode'

export function setGameMode(mode: GameMode) {
  localStorage.setItem(KEY, mode)
}

export function getGameMode(): GameMode {
  const v = localStorage.getItem(KEY)
  return v === 'dodge' ? 'dodge' : 'shake'
}

export function getGameLabel(): string {
  return getGameMode() === 'dodge' ? 'Dodge Game' : 'Shake Battle'
}

export function getGameRoute(): string {
  return getGameMode() === 'dodge' ? '/dodge' : '/shake'
}

export function hasGameMode(): boolean {
  return localStorage.getItem(KEY) === 'shake' || localStorage.getItem(KEY) === 'dodge'
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── Game Constants ───────────────────────────────────────────────
const GRID_SIZE = 20
const CELL_SIZE = 24
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE
const INITIAL_SPEED = 150
const SPEED_INCREMENT = 2
const MIN_SPEED = 60

type Position = { x: number; y: number }
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type GameState = 'idle' | 'playing' | 'paused' | 'gameover'

// ─── Color Palette ────────────────────────────────────────────────
const COLORS = {
  bg: '#0f172a',
  grid: '#1e293b',
  snakeHead: '#22c55e',
  food: '#ef4444',
  foodGlow: 'rgba(239, 68, 68, 0.3)',
  wall: '#334155',
  text: '#f8fafc',
  overlay: 'rgba(15, 23, 42, 0.85)',
}

// ─── Helper: Rounded Rectangle ────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// ─── Helper: Draw Overlay ─────────────────────────────────────────
function drawOverlay(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string
) {
  ctx.fillStyle = COLORS.overlay
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  ctx.fillStyle = COLORS.text
  ctx.textAlign = 'center'

  ctx.font = 'bold 32px "Geist", sans-serif'
  ctx.fillText(title, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 20)

  ctx.font = '16px "Geist", sans-serif'
  ctx.fillStyle = '#94a3b8'
  ctx.fillText(subtitle, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20)
}

// ─── Helper: Render Game ──────────────────────────────────────────
function renderGame(
  ctx: CanvasRenderingContext2D,
  snake: Position[],
  food: Position,
  direction: Direction,
  gameState: GameState,
  currentScore: number,
  foodAnimation: number
) {
  foodAnimation += 0.05

  // Background
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // Grid lines
  ctx.strokeStyle = COLORS.grid
  ctx.lineWidth = 0.5
  for (let i = 0; i <= GRID_SIZE; i++) {
    ctx.beginPath()
    ctx.moveTo(i * CELL_SIZE, 0)
    ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i * CELL_SIZE)
    ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE)
    ctx.stroke()
  }

  // Food with glow effect
  const foodCenterX = food.x * CELL_SIZE + CELL_SIZE / 2
  const foodCenterY = food.y * CELL_SIZE + CELL_SIZE / 2
  const pulseScale = 1 + Math.sin(foodAnimation) * 0.15

  // Glow
  const glowRadius = CELL_SIZE * pulseScale
  const gradient = ctx.createRadialGradient(
    foodCenterX, foodCenterY, 2,
    foodCenterX, foodCenterY, glowRadius
  )
  gradient.addColorStop(0, COLORS.foodGlow)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(
    foodCenterX - glowRadius,
    foodCenterY - glowRadius,
    glowRadius * 2,
    glowRadius * 2
  )

  // Food body
  const foodSize = (CELL_SIZE - 4) * pulseScale
  ctx.fillStyle = COLORS.food
  ctx.beginPath()
  ctx.arc(foodCenterX, foodCenterY, foodSize / 2, 0, Math.PI * 2)
  ctx.fill()

  // Inner highlight
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.beginPath()
  ctx.arc(foodCenterX - 2, foodCenterY - 2, foodSize / 5, 0, Math.PI * 2)
  ctx.fill()

  // Snake
  snake.forEach((seg, i) => {
    const x = seg.x * CELL_SIZE + 1
    const y = seg.y * CELL_SIZE + 1
    const size = CELL_SIZE - 2

    if (i === 0) {
      // Head
      ctx.fillStyle = COLORS.snakeHead
      ctx.shadowColor = COLORS.snakeHead
      ctx.shadowBlur = 8
      roundRect(ctx, x, y, size, size, 6)
      ctx.fill()
      ctx.shadowBlur = 0

      // Eyes
      const eyeSize = 3
      ctx.fillStyle = '#fff'
      let eye1X = 0, eye1Y = 0, eye2X = 0, eye2Y = 0
      const cx = seg.x * CELL_SIZE + CELL_SIZE / 2
      const cy = seg.y * CELL_SIZE + CELL_SIZE / 2

      switch (direction) {
        case 'RIGHT':
          eye1X = cx + 4; eye1Y = cy - 4; eye2X = cx + 4; eye2Y = cy + 4
          break
        case 'LEFT':
          eye1X = cx - 4; eye1Y = cy - 4; eye2X = cx - 4; eye2Y = cy + 4
          break
        case 'UP':
          eye1X = cx - 4; eye1Y = cy - 4; eye2X = cx + 4; eye2Y = cy - 4
          break
        case 'DOWN':
          eye1X = cx - 4; eye1Y = cy + 4; eye2X = cx + 4; eye2Y = cy + 4
          break
      }
      ctx.beginPath()
      ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2)
      ctx.fill()

      // Pupils
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.arc(eye1X, eye1Y, 1.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(eye2X, eye2Y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Body with gradient fade
      const ratio = i / snake.length
      const r = Math.round(34 + ratio * (21 - 34))
      const g = Math.round(197 + ratio * (128 - 197))
      const b = Math.round(94 + ratio * (61 - 94))
      ctx.fillStyle = `rgb(${r},${g},${b})`
      roundRect(ctx, x, y, size, size, 4)
      ctx.fill()
    }
  })

  // Border
  ctx.strokeStyle = COLORS.wall
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // Overlays
  if (gameState === 'idle') {
    drawOverlay(ctx, '🐍 贪吃蛇', '按 空格键 或点击按钮开始')
  } else if (gameState === 'paused') {
    drawOverlay(ctx, '⏸ 暂停', '按 空格键 继续')
  } else if (gameState === 'gameover') {
    drawOverlay(ctx, '💀 游戏结束', `得分: ${currentScore}`)
  }
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const directionRef = useRef<Direction>('RIGHT')
  const nextDirectionRef = useRef<Direction>('RIGHT')
  const snakeRef = useRef<Position[]>([])
  const foodRef = useRef<Position>({ x: 0, y: 0 })
  const scoreRef = useRef(0)
  const speedRef = useRef(INITIAL_SPEED)
  const highScoreRef = useRef(0)
  const foodAnimationRef = useRef(0)
  const gameStateRef = useRef<GameState>('idle')

  const [gameState, setGameState] = useState<GameState>('idle')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [snakeLength, setSnakeLength] = useState(3)

  // Sync ref with state
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  // ─── Spawn Food ───────────────────────────────────────────────
  const spawnFood = useCallback(() => {
    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      }
    } while (snakeRef.current.some(seg => seg.x === newFood.x && seg.y === newFood.y))
    foodRef.current = newFood
  }, [])

  // ─── Initialize Game ──────────────────────────────────────────
  const initGame = useCallback(() => {
    const mid = Math.floor(GRID_SIZE / 2)
    snakeRef.current = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ]
    directionRef.current = 'RIGHT'
    nextDirectionRef.current = 'RIGHT'
    scoreRef.current = 0
    speedRef.current = INITIAL_SPEED
    setScore(0)
    setSnakeLength(3)
    spawnFood()
  }, [spawnFood])

  // ─── Game Step ────────────────────────────────────────────────
  const gameStep = useCallback(() => {
    const snake = snakeRef.current
    directionRef.current = nextDirectionRef.current

    const head = { ...snake[0] }
    switch (directionRef.current) {
      case 'UP': head.y -= 1; break
      case 'DOWN': head.y += 1; break
      case 'LEFT': head.x -= 1; break
      case 'RIGHT': head.x += 1; break
    }

    // Wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      setGameState('gameover')
      if (scoreRef.current > highScoreRef.current) {
        highScoreRef.current = scoreRef.current
        setHighScore(scoreRef.current)
      }
      return
    }

    // Self collision
    if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      setGameState('gameover')
      if (scoreRef.current > highScoreRef.current) {
        highScoreRef.current = scoreRef.current
        setHighScore(scoreRef.current)
      }
      return
    }

    const newSnake = [head, ...snake]

    // Food collision
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      scoreRef.current += 10
      setScore(scoreRef.current)
      setSnakeLength(newSnake.length)
      speedRef.current = Math.max(MIN_SPEED, speedRef.current - SPEED_INCREMENT)
      spawnFood()
    } else {
      newSnake.pop()
    }

    snakeRef.current = newSnake
  }, [spawnFood])

  // ─── Render ───────────────────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    renderGame(
      ctx,
      snakeRef.current,
      foodRef.current,
      directionRef.current,
      gameStateRef.current,
      scoreRef.current,
      foodAnimationRef.current
    )
  }, [])

  // ─── Game Loop (using ref to avoid self-reference) ────────────
  const gameLoopCallback = useRef<(timestamp: number) => void>(() => {})

  useEffect(() => {
    gameLoopCallback.current = (timestamp: number) => {
      if (gameState !== 'playing') {
        render()
        return
      }

      if (timestamp - lastTimeRef.current >= speedRef.current) {
        lastTimeRef.current = timestamp
        gameStep()
      }
      render()
      gameLoopRef.current = requestAnimationFrame(gameLoopCallback.current)
    }
  }, [gameState, gameStep, render])

  // ─── Start Game ───────────────────────────────────────────────
  const startGame = useCallback(() => {
    initGame()
    setGameState('playing')
    lastTimeRef.current = 0
  }, [initGame])

  // ─── Toggle Pause ─────────────────────────────────────────────
  const togglePause = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused')
    } else if (gameState === 'paused') {
      setGameState('playing')
      lastTimeRef.current = 0
    }
  }, [gameState])

  // ─── Keyboard Controls ────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key

      if (key === ' ' || key === 'Spacebar') {
        e.preventDefault()
        if (gameState === 'idle' || gameState === 'gameover') {
          startGame()
        } else {
          togglePause()
        }
        return
      }

      if (gameState !== 'playing') return

      const current = directionRef.current
      switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault()
          if (current !== 'DOWN') nextDirectionRef.current = 'UP'
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault()
          if (current !== 'UP') nextDirectionRef.current = 'DOWN'
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          if (current !== 'RIGHT') nextDirectionRef.current = 'LEFT'
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          if (current !== 'LEFT') nextDirectionRef.current = 'RIGHT'
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, startGame, togglePause])

  // ─── Animation Loop ──────────────────────────────────────────
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoopCallback.current)
    } else {
      render()
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState, render])

  // ─── Initial Render ──────────────────────────────────────────
  useEffect(() => {
    // Initialize refs directly (no setState needed - useState defaults are correct)
    const mid = Math.floor(GRID_SIZE / 2)
    snakeRef.current = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ]
    directionRef.current = 'RIGHT'
    nextDirectionRef.current = 'RIGHT'
    scoreRef.current = 0
    speedRef.current = INITIAL_SPEED

    // Spawn initial food
    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      }
    } while (snakeRef.current.some(seg => seg.x === newFood.x && seg.y === newFood.y))
    foodRef.current = newFood

    render()
  }, [render])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-6">
      {/* Header */}
      <header className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
          🐍 贪吃蛇
        </h1>
        <p className="mt-2 text-slate-400 text-sm sm:text-base">
          方向键 / WASD 控制移动 · 空格键 暂停
        </p>
      </header>

      {/* Score Panel */}
      <div className="flex gap-4 mb-4">
        <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="py-2 px-4 flex items-center gap-2">
            <span className="text-slate-400 text-sm">得分</span>
            <Badge variant="secondary" className="text-lg font-bold bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              {score}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="py-2 px-4 flex items-center gap-2">
            <span className="text-slate-400 text-sm">最高</span>
            <Badge variant="secondary" className="text-lg font-bold bg-amber-500/20 text-amber-400 border-amber-500/30">
              {highScore}
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="py-2 px-4 flex items-center gap-2">
            <span className="text-slate-400 text-sm">长度</span>
            <Badge variant="secondary" className="text-lg font-bold bg-sky-500/20 text-sky-400 border-sky-500/30">
              {snakeLength}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Game Canvas */}
      <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-emerald-500/10 border-2 border-slate-700/50">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="block max-w-full h-auto"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Controls */}
      <div className="mt-6 flex gap-3">
        {gameState === 'idle' && (
          <Button
            onClick={startGame}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95"
          >
            开始游戏
          </Button>
        )}
        {gameState === 'playing' && (
          <Button
            onClick={togglePause}
            size="lg"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white font-semibold px-8 transition-all hover:scale-105 active:scale-95"
          >
            暂停
          </Button>
        )}
        {gameState === 'paused' && (
          <>
            <Button
              onClick={togglePause}
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95"
            >
              继续游戏
            </Button>
            <Button
              onClick={startGame}
              size="lg"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white font-semibold px-8 transition-all hover:scale-105 active:scale-95"
            >
              重新开始
            </Button>
          </>
        )}
        {gameState === 'gameover' && (
          <Button
            onClick={startGame}
            size="lg"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-8 shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95"
          >
            重新开始
          </Button>
        )}
      </div>

      {/* Mobile D-Pad */}
      <div className="mt-6 sm:hidden">
        <div className="grid grid-cols-3 gap-2 w-40">
          <div />
          <Button
            variant="outline"
            size="icon"
            className="border-slate-600 text-slate-300 h-12 w-full"
            onTouchStart={() => {
              if (directionRef.current !== 'DOWN') nextDirectionRef.current = 'UP'
            }}
          >
            ↑
          </Button>
          <div />
          <Button
            variant="outline"
            size="icon"
            className="border-slate-600 text-slate-300 h-12 w-full"
            onTouchStart={() => {
              if (directionRef.current !== 'RIGHT') nextDirectionRef.current = 'LEFT'
            }}
          >
            ←
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="border-slate-600 text-slate-300 h-12 w-full"
            onTouchStart={() => {
              if (directionRef.current !== 'UP') nextDirectionRef.current = 'DOWN'
            }}
          >
            ↓
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="border-slate-600 text-slate-300 h-12 w-full"
            onTouchStart={() => {
              if (directionRef.current !== 'LEFT') nextDirectionRef.current = 'RIGHT'
            }}
          >
            →
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-6 text-center">
        <p className="text-slate-600 text-xs">
          使用方向键 ↑↓←→ 或 WASD 控制蛇的方向 · 按 空格键 暂停/继续
        </p>
      </footer>
    </div>
  )
}

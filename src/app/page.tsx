'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── Game Constants ───────────────────────────────────────────────
const GRID_SIZE = 20
const CELL_SIZE = 24
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE
const INITIAL_SPEED = 150
const SPEED_INCREMENT = 2
const MIN_SPEED = 60
const WORDS_TO_POEM = 8

type Position = { x: number; y: number }
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type GameState = 'idle' | 'playing' | 'paused' | 'gameover'
type PoemLanguage = 'mixed' | 'zh' | 'en'

// ─── Word Pool ────────────────────────────────────────────────────
const WORD_POOL = [
  // English - nature & emotion
  'moon', 'dream', 'river', 'fire', 'wind', 'star', 'rain', 'cloud',
  'forest', 'light', 'shadow', 'ocean', 'dawn', 'night', 'sky', 'snow',
  'thunder', 'heart', 'whisper', 'echo', 'bloom', 'silence', 'wander', 'flame',
  'horizon', 'crystal', 'velvet', 'ember', 'serenity', 'aurora',
  // Chinese - poetic imagery
  '月光', '梦境', '星河', '清风', '流水', '落花', '晨曦', '暮色',
  '烟雨', '山川', '浮云', '归途', '霜雪', '明月', '桃花', '春风',
  '红尘', '天涯', '碧波', '寒霜', '幽兰', '晚霞', '长夜', '孤舟',
  '云海', '竹影', '秋水', '烛光', '远山', '余晖',
]

function getRandomWord(exclude: string[]): string {
  const available = WORD_POOL.filter(w => !exclude.includes(w))
  const pool = available.length > 0 ? available : WORD_POOL
  return pool[Math.floor(Math.random() * pool.length)]
}

// ─── Color Palette ────────────────────────────────────────────────
const COLORS = {
  bg: '#f5f0e1',
  grid: '#36454f',
  snakeHead: '#2d2d2d',
  food: '#ef4444',
  wall: '#36454f',
  text: '#2d2d2d',
  overlay: 'rgba(245, 240, 225, 0.85)',
  wordBg: 'rgba(239, 68, 68, 0.12)',
  wordBorder: 'rgba(239, 68, 68, 0.4)',
  wordText: '#b91c1c',
}

// ─── Rainbow Colors ───────────────────────────────────────────────
const RAINBOW = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6',
]

function getRainbowColor(index: number): string {
  return RAINBOW[index % RAINBOW.length]
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
  ctx.fillStyle = '#8a8575'
  ctx.fillText(subtitle, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 20)
}

// ─── Helper: Render Game ──────────────────────────────────────────
function renderGame(
  ctx: CanvasRenderingContext2D,
  snake: Position[],
  food: Position,
  foodWord: string,
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
  ctx.lineWidth = 0.3
  ctx.globalAlpha = 0.3
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
  ctx.globalAlpha = 1

  // Food word with glow
  const foodCenterX = food.x * CELL_SIZE + CELL_SIZE / 2
  const foodCenterY = food.y * CELL_SIZE + CELL_SIZE / 2
  const pulseScale = 1 + Math.sin(foodAnimation) * 0.08

  // Word background pill
  ctx.save()
  const fontSize = foodWord.length > 3 ? 11 : 13
  ctx.font = `bold ${fontSize}px "Geist", "PingFang SC", "Microsoft YaHei", sans-serif`
  const textMetrics = ctx.measureText(foodWord)
  const textWidth = textMetrics.width
  const pillW = (textWidth + 14) * pulseScale
  const pillH = (fontSize + 10) * pulseScale
  const pillX = foodCenterX - pillW / 2
  const pillY = foodCenterY - pillH / 2

  // Glow
  ctx.shadowColor = 'rgba(239, 68, 68, 0.4)'
  ctx.shadowBlur = 12 * pulseScale
  ctx.fillStyle = COLORS.wordBg
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // Border
  ctx.strokeStyle = COLORS.wordBorder
  ctx.lineWidth = 1.5
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2)
  ctx.stroke()

  // Word text
  ctx.fillStyle = COLORS.wordText
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(foodWord, foodCenterX, foodCenterY + 1)
  ctx.restore()

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
      ctx.fillStyle = '#f5f0e1'
      ctx.beginPath()
      ctx.arc(eye1X, eye1Y, 1.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(eye2X, eye2Y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Body with rainbow colors
      ctx.fillStyle = getRainbowColor(i - 1)
      ctx.shadowColor = getRainbowColor(i - 1)
      ctx.shadowBlur = 4
      roundRect(ctx, x, y, size, size, 4)
      ctx.fill()
      ctx.shadowBlur = 0
    }
  })

  // Border
  ctx.strokeStyle = COLORS.wall
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // Overlays
  if (gameState === 'idle') {
    drawOverlay(ctx, '🐍 贪吃蛇', '吃掉单词，收集灵感，创作诗歌')
  } else if (gameState === 'paused') {
    drawOverlay(ctx, '⏸ 暂停', '按 空格键 继续')
  } else if (gameState === 'gameover') {
    drawOverlay(ctx, '💀 游戏结束', `得分: ${currentScore}`)
  }
}

// ─── Main Component ───────────────────────────────────────────────
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
  const foodWordRef = useRef<string>('')

  const [gameState, setGameState] = useState<GameState>('idle')
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [snakeLength, setSnakeLength] = useState(3)
  const [collectedWords, setCollectedWords] = useState<string[]>([])
  const [poem, setPoem] = useState<string>('')
  const [isGeneratingPoem, setIsGeneratingPoem] = useState(false)
  const [poemLanguage, setPoemLanguage] = useState<PoemLanguage>('mixed')

  // Sync ref with state
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  // ─── Spawn Food ───────────────────────────────────────────────
  const spawnFood = useCallback((collected: string[] = []) => {
    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      }
    } while (snakeRef.current.some(seg => seg.x === newFood.x && seg.y === newFood.y))
    foodRef.current = newFood
    foodWordRef.current = getRandomWord(collected)
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
    spawnFood([])
  }, [spawnFood])

  // ─── Generate Poem ────────────────────────────────────────────
  const generatePoem = useCallback(async (words: string[], lang: PoemLanguage) => {
    if (words.length < WORDS_TO_POEM) return
    setIsGeneratingPoem(true)
    setPoem('')
    try {
      const res = await fetch('/api/poem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words, language: lang }),
      })
      const data = await res.json()
      if (data.poem) {
        setPoem(data.poem)
      }
    } catch {
      setPoem('❌ 诗歌生成失败，请重试')
    } finally {
      setIsGeneratingPoem(false)
    }
  }, [])

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
      const eatenWord = foodWordRef.current
      scoreRef.current += 10
      setScore(scoreRef.current)
      setSnakeLength(newSnake.length)
      speedRef.current = Math.max(MIN_SPEED, speedRef.current - SPEED_INCREMENT)

      // Add word to collection
      setCollectedWords(prev => {
        const updated = [...prev, eatenWord]
        // Auto-generate poem when we hit the target
        if (updated.length === WORDS_TO_POEM) {
          generatePoem(updated, poemLanguage)
        }
        // Spawn new food with updated word list
        spawnFood(updated)
        return updated
      })
    } else {
      newSnake.pop()
    }

    snakeRef.current = newSnake
  }, [spawnFood, generatePoem, poemLanguage])

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
      foodWordRef.current,
      directionRef.current,
      gameStateRef.current,
      scoreRef.current,
      foodAnimationRef.current
    )
  }, [])

  // ─── Game Loop ────────────────────────────────────────────────
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

    let newFood: Position
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      }
    } while (snakeRef.current.some(seg => seg.x === newFood.x && seg.y === newFood.y))
    foodRef.current = newFood
    foodWordRef.current = getRandomWord([])

    render()
  }, [render])

  // ─── Clear Words & Poem ──────────────────────────────────────
  const clearCollection = useCallback(() => {
    setCollectedWords([])
    setPoem('')
  }, [])

  // ─── Remix Poem ──────────────────────────────────────────────
  const remixPoem = useCallback(() => {
    if (collectedWords.length >= WORDS_TO_POEM) {
      generatePoem(collectedWords, poemLanguage)
    }
  }, [collectedWords, generatePoem, poemLanguage])

  const wordProgress = Math.min(collectedWords.length, WORDS_TO_POEM)

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f0e1] via-[#ede8d8] to-[#f5f0e1] p-4 sm:p-6">
      {/* Header */}
      <header className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-[#36454f] tracking-tight">
          🐍 诗意贪吃蛇
        </h1>
        <p className="mt-2 text-[#5a5545] text-sm sm:text-base">
          吃掉单词，收集灵感，创作诗歌 ✨
        </p>
      </header>

      {/* Main Layout: Game + Collection Panel */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center w-full max-w-5xl mx-auto">
        {/* Left: Game Area */}
        <div className="flex flex-col items-center">
          {/* Score Panel */}
          <div className="flex gap-4 mb-4">
            <Card className="bg-amber-50/80 border-amber-200/60 backdrop-blur-sm">
              <CardContent className="py-2 px-4 flex items-center gap-2">
                <span className="text-[#5a5545] text-sm">得分</span>
                <Badge variant="secondary" className="text-lg font-bold bg-emerald-500/20 text-emerald-700 border-emerald-500/30">
                  {score}
                </Badge>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/80 border-amber-200/60 backdrop-blur-sm">
              <CardContent className="py-2 px-4 flex items-center gap-2">
                <span className="text-[#5a5545] text-sm">最高</span>
                <Badge variant="secondary" className="text-lg font-bold bg-amber-500/20 text-amber-700 border-amber-500/30">
                  {highScore}
                </Badge>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/80 border-amber-200/60 backdrop-blur-sm">
              <CardContent className="py-2 px-4 flex items-center gap-2">
                <span className="text-[#5a5545] text-sm">词汇</span>
                <Badge variant="secondary" className="text-lg font-bold bg-violet-500/20 text-violet-700 border-violet-500/30">
                  {wordProgress}/{WORDS_TO_POEM}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Game Canvas */}
          <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-emerald-500/5 border-2 border-[#36454f]/50">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block max-w-full h-auto"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Controls */}
          <div className="mt-4 flex gap-3">
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
                className="border-[#36454f]/60 text-[#36454f] hover:bg-[#36454f]/10 font-semibold px-8 transition-all hover:scale-105 active:scale-95"
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
                  className="border-[#36454f]/60 text-[#36454f] hover:bg-[#36454f]/10 font-semibold px-8 transition-all hover:scale-105 active:scale-95"
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
          <div className="mt-4 lg:hidden">
            <div className="grid grid-cols-3 gap-2 w-40">
              <div />
              <Button
                variant="outline"
                size="icon"
                className="border-[#36454f]/60 text-[#36454f] h-12 w-full"
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
                className="border-[#36454f]/60 text-[#36454f] h-12 w-full"
                onTouchStart={() => {
                  if (directionRef.current !== 'RIGHT') nextDirectionRef.current = 'LEFT'
                }}
              >
                ←
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="border-[#36454f]/60 text-[#36454f] h-12 w-full"
                onTouchStart={() => {
                  if (directionRef.current !== 'UP') nextDirectionRef.current = 'DOWN'
                }}
              >
                ↓
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="border-[#36454f]/60 text-[#36454f] h-12 w-full"
                onTouchStart={() => {
                  if (directionRef.current !== 'LEFT') nextDirectionRef.current = 'RIGHT'
                }}
              >
                →
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Word Collection & Poem Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Word Collection Box */}
          <Card className="bg-amber-50/80 border-amber-200/60 backdrop-blur-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center justify-between text-[#36454f]">
                <span>📦 词匣子</span>
                <span className="text-sm font-normal text-[#8a8575]">
                  {wordProgress}/{WORDS_TO_POEM}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {/* Progress bar */}
              <div className="w-full h-2 bg-[#ede8d8] rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(wordProgress / WORDS_TO_POEM) * 100}%`,
                    background: wordProgress >= WORDS_TO_POEM
                      ? 'linear-gradient(90deg, #8b5cf6, #ec4899, #ef4444)'
                      : 'linear-gradient(90deg, #f97316, #ef4444)',
                  }}
                />
              </div>
              {/* Word tags */}
              <div className="flex flex-wrap gap-2 min-h-[48px]">
                {collectedWords.length === 0 ? (
                  <p className="text-[#b0a890] text-sm italic">吃掉单词来收集...</p>
                ) : (
                  collectedWords.map((word, i) => (
                    <span
                      key={`${word}-${i}`}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium border"
                      style={{
                        backgroundColor: `${getRainbowColor(i)}15`,
                        color: getRainbowColor(i),
                        borderColor: `${getRainbowColor(i)}40`,
                      }}
                    >
                      {word}
                    </span>
                  ))
                )}
              </div>
              {/* Clear button */}
              {collectedWords.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCollection}
                  className="mt-3 w-full text-[#8a8575] hover:text-[#ef4444] hover:bg-red-50/50 text-xs"
                >
                  清空词汇
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Poem Display */}
          <Card className="bg-amber-50/80 border-amber-200/60 backdrop-blur-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-base flex items-center gap-2 text-[#36454f]">
                <span>🖋️ 诗歌</span>
                {isGeneratingPoem && (
                  <span className="text-xs font-normal text-violet-500 animate-pulse">
                    创作中...
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {/* Language selector */}
              <div className="flex gap-2 mb-3">
                {([
                  { key: 'mixed', label: '中英混合' },
                  { key: 'zh', label: '纯中文' },
                  { key: 'en', label: '纯英文' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPoemLanguage(key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      poemLanguage === key
                        ? 'bg-[#36454f] text-[#f5f0e1] shadow-sm'
                        : 'bg-[#ede8d8] text-[#5a5545] hover:bg-[#e0dac8]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Poem text */}
              <div className="min-h-[120px] rounded-lg bg-[#faf7ee] border border-amber-200/40 p-4">
                {poem ? (
                  <div className="text-[#36454f] text-sm leading-relaxed whitespace-pre-wrap">
                    {poem}
                  </div>
                ) : isGeneratingPoem ? (
                  <div className="flex items-center justify-center h-full min-h-[80px]">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                ) : collectedWords.length < WORDS_TO_POEM ? (
                  <p className="text-[#b0a890] text-sm italic">
                    再收集 {WORDS_TO_POEM - collectedWords.length} 个单词即可生成诗歌 ✍️
                  </p>
                ) : (
                  <p className="text-[#b0a890] text-sm italic">
                    词汇已就绪，正在创作...
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-3">
                <Button
                  onClick={remixPoem}
                  disabled={collectedWords.length < WORDS_TO_POEM || isGeneratingPoem}
                  size="sm"
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white shadow-sm disabled:opacity-40"
                >
                  🔄 重新创作
                </Button>
                <Button
                  onClick={clearCollection}
                  disabled={isGeneratingPoem}
                  variant="outline"
                  size="sm"
                  className="border-[#36454f]/30 text-[#36454f]/60 hover:bg-red-50/50 hover:text-[#ef4444] hover:border-red-300/50"
                >
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto pt-6 text-center">
        <p className="text-[#8a8575] text-xs">
          方向键 / WASD 控制移动 · 空格键 暂停 · 收集 {WORDS_TO_POEM} 个单词创作诗歌
        </p>
      </footer>
    </div>
  )
}

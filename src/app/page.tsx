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
type WordLanguage = 'all' | 'zh' | 'en'
type WordTheme = 'all' | 'nature' | 'season' | 'mood' | 'cosmos' | 'journey' | 'myth' | 'time' | 'teawine' | 'deepsea' | 'music' | 'city' | 'wuxia'

// ─── Themed Word Pools ────────────────────────────────────────────
const WORD_THEMES: Record<WordTheme, { label: string; icon: string; zh: string[]; en: string[] }> = {
  all: {
    label: '全部',
    icon: '🌈',
    zh: [
      '月光', '梦境', '星河', '清风', '流水', '落花', '晨曦', '暮色',
      '烟雨', '山川', '浮云', '归途', '霜雪', '明月', '桃花', '春风',
      '红尘', '天涯', '碧波', '寒霜', '幽兰', '晚霞', '长夜', '孤舟',
      '云海', '竹影', '秋水', '烛光', '远山', '余晖',
      '雷鸣', '心语', '回声', '花语', '寂静', '漫步', '烈焰', '地平线',
      '水晶', '丝绒', '余烬', '宁静', '极光', '银河', '苍穹', '海潮',
      '浪花', '沙漠', '绿洲', '彩虹', '风暴', '彼岸', '迷雾', '幻梦',
    ],
    en: [
      'moon', 'dream', 'river', 'fire', 'wind', 'star', 'rain', 'cloud',
      'forest', 'light', 'shadow', 'ocean', 'dawn', 'night', 'sky', 'snow',
      'thunder', 'heart', 'whisper', 'echo', 'bloom', 'silence', 'wander', 'flame',
      'horizon', 'crystal', 'velvet', 'ember', 'serenity', 'aurora',
      'galaxy', 'mirage', 'blossom', 'solitude', 'eternal', 'drifting',
      'tempest', 'oasis', 'mirage', 'rainbow', 'tide', 'dew', 'frost', 'haze',
    ],
  },
  nature: {
    label: '自然',
    icon: '🌿',
    zh: [
      '月光', '清风', '流水', '落花', '晨曦', '烟雨', '山川', '浮云',
      '霜雪', '桃花', '碧波', '幽兰', '晚霞', '云海', '竹影', '秋水',
      '远山', '雷鸣', '花语', '银河', '海潮', '浪花', '彩虹', '风暴',
    ],
    en: [
      'moon', 'river', 'wind', 'rain', 'forest', 'ocean', 'dawn', 'snow',
      'blossom', 'meadow', 'aurora', 'glacier', 'tide', 'canyon', 'breeze',
      'meadow', 'coral', 'petal', 'grove', 'cascade', 'dew', 'frost', 'storm',
    ],
  },
  season: {
    label: '四季',
    icon: '🌸',
    zh: [
      '春风', '桃花', '晨曦', '落花', '夏蝉', '碧波', '烟雨', '流萤',
      '秋水', '霜降', '晚霞', '枫叶', '冬雪', '寒霜', '长夜', '暖阳',
      '梅香', '谷雨', '白露', '小雪', '惊蛰', '芒种', '大寒', '立秋',
    ],
    en: [
      'spring', 'blossom', 'sunlight', 'petal', 'summer', 'firefly', 'breeze',
      'harvest', 'autumn', 'maple', 'twilight', 'fog', 'winter', 'frost',
      'blizzard', 'ember', 'equinox', 'solstice', 'hibernal', 'vernal',
      'golden', 'crimson', 'amber', 'snowfall',
    ],
  },
  mood: {
    label: '心绪',
    icon: '💫',
    zh: [
      '梦境', '心语', '寂静', '回声', '孤独', '思念', '忧愁', '欢喜',
      '迷惘', '释然', '眷恋', '怅惘', '温柔', '惆怅', '悸动', '安宁',
      '寂寥', '希冀', '幽思', '归心', '踯躅', '缱绻', '淡然', '执念',
    ],
    en: [
      'dream', 'whisper', 'silence', 'echo', 'solitude', 'longing', 'melancholy',
      'serenity', 'wander', 'tender', 'euphoria', 'nostalgia', 'reverie',
      'despair', 'bliss', 'sorrow', 'grace', 'solace', 'yearning', 'wistful',
      'tranquil', 'resilient', 'fervent', 'luminous',
    ],
  },
  cosmos: {
    label: '宇宙',
    icon: '🌌',
    zh: [
      '星河', '银河', '苍穹', '极光', '流星', '星云', '黑洞', '光年',
      '星尘', '引力', '轨道', '超新星', '脉冲', '暗物质', '量子', '维度',
      '时空', '奇点', '虫洞', '天体', '彗星', '星座', '星图', '深渊',
    ],
    en: [
      'galaxy', 'nebula', 'cosmos', 'aurora', 'stellar', 'pulsar', 'quantum',
      'eclipse', 'infinity', 'orbit', 'supernova', 'void', 'celestial',
      'meteor', 'photon', 'dimension', 'singularity', 'wormhole', 'zenith',
      'horizon', 'spectrum', 'cosmic', 'spacetime', 'astral',
    ],
  },
  journey: {
    label: '旅途',
    icon: '🗺️',
    zh: [
      '归途', '天涯', '孤舟', '远山', '彼岸', '驿站', '行囊', '渡口',
      '岔路', '沿途', '远方', '足迹', '路标', '黄昏', '破晓', '启程',
      '流浪', '寻觅', '跨越', '漫游', '等待', '相遇', '告别', '重逢',
    ],
    en: [
      'horizon', 'wander', 'voyage', 'compass', 'trail', 'crossroad', 'haven',
      'odyssey', 'passage', 'drifting', 'wayfarer', 'sojourn', 'pilgrim',
      'departure', 'arrival', 'wilderness', 'frontier', 'expedition',
      'beacon', 'anchor', 'navigate', 'roaming', 'quest', 'milestone',
    ],
  },
  myth: {
    label: '神话',
    icon: '🐉',
    zh: [
      '凤凰', '蛟龙', '嫦娥', '夸父', '女娲', '盘古', '精卫', '麒麟',
      '瑶池', '蓬莱', '天柱', '九天', '神谕', '涅槃', '飞升', '仙山',
      '封印', '祭坛', '神火', '灵兽', '伏羲', '洛神', '瑶琴', '蟠桃',
    ],
    en: [
      'phoenix', 'dragon', 'oracle', 'prophecy', 'titan', 'olympus', 'valhalla',
      'griffin', 'siren', 'muse', 'pantheon', 'mythos', 'immortal', 'ritual',
      'enchanted', 'celestial', 'divine', 'saga', 'relic', 'artifact',
      'chimera', 'eternal', 'sacred', 'legend',
    ],
  },
  time: {
    label: '时光',
    icon: '⏳',
    zh: [
      '瞬间', '永恒', '回忆', '轮回', '琥珀', '流年', '韶华', '迟暮',
      '岁月', '刹那', '光阴', '往昔', '晨昏', '须臾', '沧桑', '永恒',
      '时光', '暮年', '追忆', '流沙', '年华', '今夕', '昔年', '余温',
    ],
    en: [
      'moment', 'eternal', 'memory', 'cycle', 'amber', 'fleeting', 'epoch',
      'twilight', 'relic', 'yesterday', 'tomorrow', 'ancient', 'ephemeral',
      'timeless', 'forever', 'passage', 'hourglass', 'legacy', 'vintage',
      'reminisce', 'dusk', 'dawn', 'seasons', 'temporal',
    ],
  },
  teawine: {
    label: '茶酒',
    icon: '🍵',
    zh: [
      '清茶', '浊酒', '炊烟', '桂花酿', '碧螺春', '竹叶青', '女儿红', '龙井',
      '茶禅', '微醺', '独酌', '对饮', '醉月', '茶香', '酒旗', '暖炉',
      '杯盏', '半醺', '清欢', '浮白', '煮酒', '品茗', '残茶', '新酿',
    ],
    en: [
      'brew', 'vintage', 'amber', 'toast', 'cellar', 'distill', 'ferment',
      'sip', 'pour', 'vessel', 'nectar', 'intoxicate', 'sober', 'decanter',
      'barrel', 'infusion', 'ceremony', 'steep', 'aroma', 'bouquet',
      'vintage', 'goblet', 'chalice', 'elixir',
    ],
  },
  deepsea: {
    label: '深海',
    icon: '🌊',
    zh: [
      '暗流', '珊瑚', '鲸歌', '深渊', '海沟', '潮汐', '沉船', '海藻',
      '灯塔', '暗礁', '海底', '碧蓝', '浮游', '漩涡', '寒流', '海月',
      '深渊', '海螺', '水母', '海沟', '龙宫', '潮涌', '海风', '蓝洞',
    ],
    en: [
      'abyss', 'coral', 'whale', 'depth', 'current', 'trench', 'shipwreck',
      'bioluminescent', 'lighthouse', 'reef', 'sunken', 'plankton', 'vortex',
      'siren', 'kraken', 'mariana', 'pressure', 'tidepool', 'sonar',
      'aquatic', 'submerge', 'drift', 'byssal', 'lagoon',
    ],
  },
  music: {
    label: '音乐',
    icon: '🎵',
    zh: [
      '琴弦', '回旋', '休止', '即兴', '旋律', '和声', '笛声', '鼓点',
      '余音', '低吟', '变奏', '序曲', '终章', '清唱', '和弦', '颤音',
      '韵律', '乐章', '共鸣', '独奏', '交响', '泛音', '节拍', '咏叹',
    ],
    en: [
      'melody', 'harmony', 'rhythm', 'crescendo', 'tempo', 'chord', 'refrain',
      'sonata', 'cadence', 'staccato', 'legato', 'falsetto', 'resonance',
      'cadenza', 'diminuendo', 'forte', 'vibrato', 'encore', 'fugue',
      'aria', 'nocturne', 'prelude', 'symphony', 'improvisation',
    ],
  },
  city: {
    label: '城市',
    icon: '🏙️',
    zh: [
      '霓虹', '地铁', '天际线', '咖啡馆', '街角', '灯火', '橱窗', '夜行',
      '站台', '巷弄', '高楼', '斑马线', '钟楼', '天桥', '夜市', '公寓',
      '烟火', '弄堂', '摩天', '城池', '路灯', '车流', '黄昏', '人潮',
    ],
    en: [
      'neon', 'subway', 'skyline', 'espresso', 'alley', 'boulevard', 'rooftop',
      'brownstone', 'penthouse', 'crosswalk', 'skyscraper', 'pavement',
      'marquee', 'overpass', 'nightmarket', 'highrise', 'streetlight',
      'traffic', 'downtown', 'suburb', 'laneway', 'plaza', 'balcony', 'commute',
    ],
  },
  wuxia: {
    label: '武侠',
    icon: '🗡️',
    zh: [
      '剑气', '侠骨', '风尘', '刀光', '江湖', '恩仇', '轻功', '内力',
      '剑客', '破阵', '刀锋', '义薄', '绝世', '铁掌', '寒刃', '飞檐',
      '侠义', '秘籍', '掌门', '追风', '落剑', '点穴', '走镖', '踏雪',
    ],
    en: [
      'blade', 'honor', 'vengeance', 'clan', 'master', 'disciple', 'dual',
      'shadowless', 'ironfist', 'dragonfly', 'vengeful', 'righteous',
      'unyielding', 'hermit', 'monastery', 'shaft', 'parry', 'thrust',
      'dojo', 'sensei', 'ronin', 'shogun', 'samurai', 'warrior',
    ],
  },
}

// ─── Get Random Word from active theme + language ─────────────────
function getRandomWord(
  theme: WordTheme,
  lang: WordLanguage,
  exclude: string[]
): string {
  const pool = WORD_THEMES[theme]
  let words: string[] = []
  if (lang === 'zh') {
    words = pool.zh
  } else if (lang === 'en') {
    words = pool.en
  } else {
    words = [...pool.zh, ...pool.en]
  }

  const available = words.filter(w => !exclude.includes(w))
  const finalPool = available.length > 0 ? available : words
  return finalPool[Math.floor(Math.random() * finalPool.length)]
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

  ctx.save()
  const fontSize = foodWord.length > 3 ? 11 : 13
  ctx.font = `bold ${fontSize}px "Geist", "PingFang SC", "Microsoft YaHei", sans-serif`
  const textMetrics = ctx.measureText(foodWord)
  const textWidth = textMetrics.width
  const pillW = (textWidth + 14) * pulseScale
  const pillH = (fontSize + 10) * pulseScale
  const pillX = foodCenterX - pillW / 2
  const pillY = foodCenterY - pillH / 2

  ctx.shadowColor = 'rgba(239, 68, 68, 0.4)'
  ctx.shadowBlur = 12 * pulseScale
  ctx.fillStyle = COLORS.wordBg
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2)
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.strokeStyle = COLORS.wordBorder
  ctx.lineWidth = 1.5
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2)
  ctx.stroke()

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
      ctx.fillStyle = COLORS.snakeHead
      ctx.shadowColor = COLORS.snakeHead
      ctx.shadowBlur = 8
      roundRect(ctx, x, y, size, size, 6)
      ctx.fill()
      ctx.shadowBlur = 0

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

      ctx.fillStyle = '#f5f0e1'
      ctx.beginPath()
      ctx.arc(eye1X, eye1Y, 1.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(eye2X, eye2Y, 1.5, 0, Math.PI * 2)
      ctx.fill()
    } else {
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
    drawOverlay(ctx, '🐍 诗意贪吃蛇', '吃掉单词，收集灵感，创作诗歌')
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
  const [wordLanguage, setWordLanguage] = useState<WordLanguage>('all')
  const [wordTheme, setWordTheme] = useState<WordTheme>('all')

  // Auto-derive poem language from word language
  const poemLanguage: PoemLanguage = wordLanguage === 'zh' ? 'zh' : wordLanguage === 'en' ? 'en' : 'mixed'

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
    foodWordRef.current = getRandomWord(wordTheme, wordLanguage, collected)
  }, [wordTheme, wordLanguage])

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

  // ─── Delete Single Word ───────────────────────────────────────
  const deleteWord = useCallback((index: number) => {
    setCollectedWords(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // If we had a poem and dropped below threshold, keep the poem
      // but update the food to avoid already-collected words
      spawnFood(updated)
      return updated
    })
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
          const lang: PoemLanguage = wordLanguage === 'zh' ? 'zh' : wordLanguage === 'en' ? 'en' : 'mixed'
          generatePoem(updated, lang)
        }
        spawnFood(updated)
        return updated
      })
    } else {
      newSnake.pop()
    }

    snakeRef.current = newSnake
  }, [spawnFood, generatePoem, wordLanguage])

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
    foodWordRef.current = getRandomWord('all', 'all', [])

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

  // ─── Re-spawn food when theme/language changes ───────────────
  useEffect(() => {
    if (gameState === 'playing' || gameState === 'paused') {
      foodWordRef.current = getRandomWord(wordTheme, wordLanguage, collectedWords)
    }
  }, [wordTheme, wordLanguage, collectedWords, gameState])

  const wordProgress = Math.min(collectedWords.length, WORDS_TO_POEM)

  // ─── Theme Selector Render ────────────────────────────────────────
  const renderThemeSelector = () => (
    <Card className="bg-amber-50/80 border-amber-200/60 backdrop-blur-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base text-[#36454f]">
          🎨 词库主题
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Language filter */}
        <div>
          <p className="text-xs text-[#8a8575] mb-1.5">语言</p>
          <div className="flex gap-2">
            {([
              { key: 'all' as WordLanguage, label: '中英混合', icon: '🌏' },
              { key: 'zh' as WordLanguage, label: '中文', icon: '🇨🇳' },
              { key: 'en' as WordLanguage, label: 'English', icon: '🇬🇧' },
            ]).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setWordLanguage(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  wordLanguage === key
                    ? 'bg-[#36454f] text-[#f5f0e1] shadow-sm'
                    : 'bg-[#ede8d8] text-[#5a5545] hover:bg-[#e0dac8]'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme filter */}
        <div>
          <p className="text-xs text-[#8a8575] mb-1.5">主题</p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(WORD_THEMES) as [WordTheme, typeof WORD_THEMES[WordTheme]][]).map(([key, { label, icon }]) => (
              <button
                key={key}
                onClick={() => setWordTheme(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  wordTheme === key
                    ? 'bg-[#36454f] text-[#f5f0e1] shadow-sm'
                    : 'bg-[#ede8d8] text-[#5a5545] hover:bg-[#e0dac8]'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f0e1] via-[#ede8d8] to-[#f5f0e1] p-4 sm:p-6">
      {/* Header */}
      <header className="mb-4 sm:mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-[#36454f] tracking-tight">
          🐍 诗意贪吃蛇
        </h1>
        <p className="mt-2 text-[#5a5545] text-sm sm:text-base">
          吃掉单词，收集灵感，创作诗歌 ✨
        </p>
      </header>

      {/* Mobile: Theme Selector between header and game */}
      <div className="w-full max-w-md mx-auto lg:hidden mb-4">
        {renderThemeSelector()}
      </div>

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-center w-full max-w-5xl mx-auto">
        {/* Game Area */}
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
              <Button variant="outline" size="icon" className="border-[#36454f]/60 text-[#36454f] h-12 w-full"
                onTouchStart={() => { if (directionRef.current !== 'DOWN') nextDirectionRef.current = 'UP' }}>↑</Button>
              <div />
              <Button variant="outline" size="icon" className="border-[#36454f]/60 text-[#36454f] h-12 w-full"
                onTouchStart={() => { if (directionRef.current !== 'RIGHT') nextDirectionRef.current = 'LEFT' }}>←</Button>
              <Button variant="outline" size="icon" className="border-[#36454f]/60 text-[#36454f] h-12 w-full"
                onTouchStart={() => { if (directionRef.current !== 'UP') nextDirectionRef.current = 'DOWN' }}>↓</Button>
              <Button variant="outline" size="icon" className="border-[#36454f]/60 text-[#36454f] h-12 w-full"
                onTouchStart={() => { if (directionRef.current !== 'LEFT') nextDirectionRef.current = 'RIGHT' }}>→</Button>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          {/* Desktop: Theme Selector inside panel */}
          <div className="hidden lg:block">
            {renderThemeSelector()}
          </div>

          {/* ─── Word Collection Box ─────────────────────────── */}
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
              {/* Word tags with delete */}
              <div className="flex flex-wrap gap-2 min-h-[48px]">
                {collectedWords.length === 0 ? (
                  <p className="text-[#b0a890] text-sm italic">吃掉单词来收集...</p>
                ) : (
                  collectedWords.map((word, i) => (
                    <span
                      key={`${word}-${i}`}
                      className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium border cursor-default transition-all hover:shadow-sm"
                      style={{
                        backgroundColor: `${getRainbowColor(i)}15`,
                        color: getRainbowColor(i),
                        borderColor: `${getRainbowColor(i)}40`,
                      }}
                    >
                      {word}
                      <button
                        onClick={() => deleteWord(i)}
                        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                        style={{ color: getRainbowColor(i) }}
                        aria-label={`删除 ${word}`}
                      >
                        ✕
                      </button>
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

          {/* ─── Poem Display ────────────────────────────────── */}
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
              {/* Language hint */}
              <p className="text-xs text-[#8a8575] mb-3">
                诗歌语言自动匹配词库：{wordLanguage === 'zh' ? '纯中文' : wordLanguage === 'en' ? '纯英文' : '中英混合'}
              </p>

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

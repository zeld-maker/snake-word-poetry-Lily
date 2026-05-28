import ZAI from 'z-ai-web-dev-sdk'

type PoemForm = 'auto' | 'fivechar' | 'sevenchar' | 'changgu' | 'modern' | 'sonnet' | 'haiku' | 'ballad' | 'limerick' | 'villanelle'
type PoemLanguage = 'zh' | 'en' | 'mixed'

// ─── Helper: detect if a word is Chinese ──────────────────────────
function isChineseWord(word: string): boolean {
  return /[\u4e00-\u9fff]/.test(word)
}

// ─── Helper: classify words by language ───────────────────────────
function classifyWords(words: string[]): { zhWords: string[]; enWords: string[] } {
  const zhWords: string[] = []
  const enWords: string[] = []
  for (const w of words) {
    if (isChineseWord(w)) {
      zhWords.push(w)
    } else {
      enWords.push(w)
    }
  }
  return { zhWords, enWords }
}

// ─── Language-aware form instructions ─────────────────────────────
// Each form provides different instructions for Chinese vs English
function getFormInstruction(form: PoemForm, language: PoemLanguage): string {
  // Chinese-native forms: only have Chinese versions
  const zhNativeForms: Record<string, string> = {
    fivechar: `【必须写五言诗】请从五言绝句或五言律诗中选择一种来创作。详细规则：

五言绝句（4句，每句5字，共20字）：
1. 每句必须恰好5个字，不可多字少字
2. 第二、四句末字必须押韵，首句可押可不押
3. 韵脚必须属同一韵部（《平水韵》或《中华新韵》），不可串韵
4. 平仄需基本合律："一三不论，二四分明"

五言律诗（8句，每句5字，共40字）：
1. 每句必须恰好5个字，不可多字少字
2. 第二、四、六、八句末字必须押韵，首句可押可不押
3. 韵脚必须属同一韵部，不可串韵
4. 严格遵守平仄规则
5. 中间两联（颔联3-4句、颈联5-6句）必须对仗

请在诗末用括号注明选择了哪种：如（五言绝句）或（五言律诗）`,

    sevenchar: `【必须写七言诗】请从七言绝句或七言律诗中选择一种来创作。详细规则：

七言绝句（4句，每句7字，共28字）：
1. 每句必须恰好7个字，不可多字少字
2. 第二、四句末字必须押韵，首句可押可不押
3. 韵脚必须属同一韵部（《平水韵》或《中华新韵》），不可串韵
4. 平仄需基本合律："一三五不论，二四六分明"

七言律诗（8句，每句7字，共56字）：
1. 每句必须恰好7个字，不可多字少字
2. 第二、四、六、八句末字必须押韵，首句可押可不押
3. 韵脚必须属同一韵部，不可串韵
4. 严格遵守平仄规则："一三五不论，二四六分明"
5. 中间两联（颔联3-4句、颈联5-6句）必须对仗

请在诗末用括号注明选择了哪种：如（七言绝句）或（七言律诗）`,

    changgu: `【必须写长古诗/歌行体】请创作一首歌行体或古风长诗。详细规则：

1. 每句五言或七言（可混用），句数不限，通常8句以上
2. 可以换韵：不同段落可以使用不同的韵部，但同一韵段内必须押韵一致
3. 不要求严格的平仄对仗（区别于律诗）
4. 注重叙事性和抒情性的结合，如白居易《琵琶行》、李白《梦游天姥吟留别》的风格
5. 可以有较长的篇幅来充分展开意境和情感
6. 句式可以灵活变化，允许长短句交替
7. 请在诗末注明（歌行体）或（古风）

这是最适合8个关键词的体裁，因为有足够的篇幅自然融入所有关键词。`,

    modern: `【必须写现代诗】请写自由体现代诗歌。规则：
1. 可以自由排列，不拘字数和行数
2. 可以不押韵，但应有内在的节奏感和音乐性
3. 注重意象的营造和情感的流动
4. 语言要优美、凝练、有张力
5. 可以使用跨行、断句等现代诗技巧
6. 诗末用括号注明（现代诗）`,
  }

  // Bilingual forms: have both Chinese and English versions
  const bilingualForms: Record<string, { zh: string; en: string }> = {

    sonnet: {
      zh: `【必须写中文十四行诗】将莎士比亚十四行诗的体例改编为中文创作。详细规则：

1. 共14行：三个四行诗节（韵脚 ABAB CDCD EFEF）+ 一个两行对句（韵脚 GG）
2. 【中文格律】每行必须恰好10个汉字，不可多字少字
3. 韵脚必须严格遵循 ABAB CDCD EFEF GG 的韵式
4. 中文押韵应使用同一韵部（《中华新韵》），不可串韵
5. 最后两行对句应当点题或反转
6. 每个四行诗节应推进一层意思
7. 请在诗末注明（十四行诗）

示例韵脚格式：
第1节：A末-B末-A末-B末（如：光-香-方-长）
第2节：C末-D末-C末-D末
第3节：E末-F末-E末-F末
第4节：G末-G末`,

      en: `【Must write a Shakespearean sonnet — STRICT FORM REQUIRED】Rules:

1. Exactly 14 lines: three quatrains (ABAB CDCD EFEF) + one couplet (GG)
2. Each line MUST be in iambic pentameter: exactly 10 syllables with the stress pattern da-DUM da-DUM da-DUM da-DUM da-DUM
3. The rhyme scheme must be STRICTLY followed — no near-rhymes, no slant-rhymes
4. Each quatrain should develop the theme; the couplet should deliver a twist or summary
5. COUNT SYLLABLES on every line before finalizing. 10 syllables per line is NON-NEGOTIABLE.
6. Example of correct iambic pentameter:
   "Shall I com-pare thee to a sum-mer's day?" (10 syllables ✓)
   "The love that I have for you will never die" (10 syllables ✓)
7. Add (Sonnet) at the end`,
    },

    haiku: {
      zh: `【必须写俳句 — 严格五七五字数】用中文创作俳句，将英文俳句的5-7-5音节规则转换为中文的5-7-5字数规则。详细规则：

1. 创作2-3首独立俳句，每首恰好3行
2. 【中文格律·最重要】每行字数严格为：
   - 第一行：恰好5个汉字
   - 第二行：恰好7个汉字
   - 第三行：恰好5个汉字
3. 字数计算：每个汉字算1个字，不可多字少字
4. 写每一行之前先数清字数，写完后再检查一遍
5. 俳句不要求押韵，但应有画面感和瞬间感
6. 尽量包含季语（表示季节的词语）
7. 用具象的意象表达，不要直白说理

【正确示例】：
秋月照寒潭（5字 ✓）
一尾红鲤跃水面（7字 ✓）
涟漪入夜寒（5字 ✓）

【错误示例】：
秋天的月光照着（7字 ✗ 第一行应为5字）
一条红色鲤鱼跳出水面（10字 ✗ 第二行应为7字）

8. 请在诗末注明（俳句）`,

      en: `【Must write a haiku sequence — STRICT SYLLABLE COUNT REQUIRED】Rules:

1. Write 2-3 independent haiku, each EXACTLY 3 lines following the 5-7-5 syllable pattern
2. SYLLABLE COUNTING IS THE MOST IMPORTANT RULE. Count every single syllable carefully:
   - Line 1: EXACTLY 5 syllables (e.g., "The old si-lent pond" = 5 ✓ | "The very old si-lent pond" = 6 ✗)
   - Line 2: EXACTLY 7 syllables (e.g., "A frog jumps in-to the wa-ter" = 7 ✓ | "A small frog jumps in-to the wa-ter" = 8 ✗)
   - Line 3: EXACTLY 5 syllables (e.g., "Sound of the deep splash" = 5 ✓ | "The sound of the deep splash" = 6 ✗)
3. Before writing each line, COUNT THE SYLLABLES OUT LOUD. Double-check your count after writing.
4. If a word has unclear syllable count, choose a simpler word.
5. Each haiku should capture a moment, image, or sensation — show, don't tell
6. Include a kigo (season word) or nature reference if possible
7. Do NOT add extra words to make lines "sound better" if it breaks the syllable count
8. Example of a correct haiku:
   Au-tumn moon-light falls (5)
   On the si-lent moun-tain lake (7)
   Ri-ples in the dark (5)
9. Add (Haiku) at the end`,
    },

    ballad: {
      zh: `【必须写中文民谣体诗歌】将英式民谣体（Ballad）改编为中文创作。详细规则：

1. 写3-4节，每节4行
2. 【中文格律】奇数行7字，偶数行7字（或奇数行7字偶数行5字，形成长短交错）
3. 韵脚：第二、四行末字必须押韵（ABCB或ABAB），韵脚属同一韵部
4. 民谣体重在叙事——要有起承转合的故事感
5. 语言要朴素、直接、生动，避免过于华丽
6. 可以使用反复出现的诗句作为"副歌"
7. 请在诗末注明（民谣体）

示例格式（ABCB韵）：
七字某某某某某（A）
七字某某某某香（B押韵）
七字某某某某某（C）
七字某某某某长（B押韵）`,

      en: `【Must write a ballad — STRICT FORM REQUIRED】Rules:

1. Write 3-4 quatrains (4-line stanzas)
2. Rhyme scheme: ABAB or ABCB (second and fourth lines MUST rhyme)
3. Meter: alternating lines of iambic tetrameter (4 beats/8 syllables) and iambic trimeter (3 beats/6 syllables)
4. COUNT SYLLABLES: odd lines = 8 syllables, even lines = 6 syllables (or all lines 8 syllables)
5. Ballads tell a story — include narrative progression with a beginning, middle, and end
6. Use simple, direct, and vivid language
7. The refrain or repeated element is optional but effective
8. Add (Ballad) at the end`,
    },

    limerick: {
      zh: `【必须写中文打油诗】将英文Limerick改编为中文创作。详细规则：

1. 写1-2首打油诗，每首恰好5行
2. 韵脚：AABBA（第一、二、五行末字押韵，第三、四行末字押另一韵）
3. 【中文格律】第一、二、五行每行7字；第三、四行每行5字
4. 风格要幽默诙谐、俏皮轻松
5. 最后一行最好有意想不到的转折
6. 韵脚使用同一韵部，不可串韵

示例格式：
某某某某某某猫（A押韵）
某某某某某某逃（A押韵）
某某某某跑（B押韵）
某某某某叫（B押韵）
某某某某某某高（A押韵）

7. 请在诗末注明（打油诗）`,

      en: `【Must write limerick(s) — STRICT FORM REQUIRED】Rules:

1. Write 1-2 limericks to incorporate the given words
2. Each limerick is EXACTLY 5 lines with AABBA rhyme scheme
3. Lines 1, 2, and 5: 8-9 syllables, rhyme with each other (A)
4. Lines 3 and 4: 5-6 syllables, rhyme with each other (B)
5. COUNT SYLLABLES on every line. The pattern must be: long-long-short-short-long
6. The tone should be humorous, witty, or whimsical
7. The best limericks have a surprising twist in the last line
8. Example:
   A won-drous crea-ture named Ned (8, A)
   Had a ver-y large bump on his head (9, A)
   He bumped in-to doors (5, B)
   And fell on all fours (5, B)
   And wished he were home in his bed (9, A)
9. Add (Limerick) at the end`,
    },

    villanelle: {
      zh: `【必须写中文维拉内拉】将英文Villanelle改编为中文创作。详细规则：

1. 共19行：五个三行诗节 + 一个四行诗节
2. 全诗只用两个韵（A韵和b韵），b韵行不押A韵
3. 第一行作为"叠句一"在第6、12、18行原样重复
4. 第三行作为"叠句二"在第9、15、19行原样重复
5. 【中文格律】每行7个汉字
6. 韵脚格式：
   第1节：A韵 - b韵 - A韵（叠句二）
   第2节：A韵 - b韵 - 叠句一
   第3节：A韵 - b韵 - 叠句二
   第4节：A韵 - b韵 - 叠句一
   第5节：A韵 - b韵 - 叠句二
   第6节：A韵 - b韵 - 叠句一 - 叠句二
7. 叠句应当在重复中逐渐累积新的含义
8. 请在诗末注明（维拉内拉）`,

      en: `【Must write a villanelle — STRICT FORM REQUIRED】Rules:

1. Exactly 19 lines: five tercets (3-line stanzas) + one quatrain (4-line stanza)
2. Only two rhyme sounds throughout (A and a, where a rhymes with A)
3. Line 1 is repeated EXACTLY as lines 6, 12, and 18 — do NOT change a single word
4. Line 3 is repeated EXACTLY as lines 9, 15, and 19 — do NOT change a single word
5. The rhyme/refrain scheme:
   Stanza 1: A¹ b A²
   Stanza 2: a b A¹
   Stanza 3: a b A²
   Stanza 4: a b A¹
   Stanza 5: a b A²
   Stanza 6: a b A¹ A²
   (A¹ = first refrain, A² = second refrain, a/b = rhyming lines)
6. Each line should be in iambic pentameter (10 syllables, da-DUM pattern)
7. The refrains should be evocative lines that gain meaning with each repetition
8. Add (Villanelle) at the end`,
    },
  }

  // Look up the form instruction
  if (form in zhNativeForms) {
    // Chinese-native forms always use the Chinese version
    return zhNativeForms[form]
  }

  if (form in bilingualForms) {
    const bilingual = bilingualForms[form]
    if (language === 'zh') {
      return bilingual.zh
    } else {
      return bilingual.en
    }
  }

  return '' // auto
}

export async function POST(request: Request) {
  try {
    const { words, language, form } = await request.json()

    if (!words || !Array.isArray(words) || words.length === 0) {
      return Response.json({ error: 'Words array is required' }, { status: 400 })
    }

    const zai = await ZAI.create()

    const poemForm = (form as PoemForm) || 'auto'
    const poemLanguage = (language as PoemLanguage) || 'mixed'
    const { zhWords, enWords } = classifyWords(words)

    // ─── Common rule: no asterisks around keywords ─────────────
    const noAsteriskRule = `\n\n【重要格式规则】绝对不要在任何关键词周围加星号(*)或任何标记符号，关键词应该自然融入诗文中，不加任何特殊标记。`

    // ─── Language mismatch handling ─────────────────────────────
    const languageMismatchInstruction = (() => {
      if (poemLanguage === 'zh' && enWords.length > 0) {
        return `\n\n【语言规则】本诗必须完全使用中文创作。以下关键词中有英文词汇：${enWords.join('、')}。请将这些英文词翻译为对应的中文表达后融入诗中（例如 moon→月，river→河，ocean→海）。如果某个英文词无法自然翻译，可以不使用该词，但其余词汇必须全部融入。诗中不得出现任何英文单词。`
      }
      if (poemLanguage === 'en' && zhWords.length > 0) {
        return `\n\n【Language Rule】This poem MUST be written ENTIRELY in English. Among the given words, some are Chinese: ${zhWords.join(', ')}. Please translate these Chinese words into their English equivalents and use the English versions in the poem (e.g., 月光→moonlight, 清风→breeze, 落花→fallen petals). If a Chinese word cannot be naturally translated, you may omit it, but incorporate all others. No Chinese characters should appear in the poem.`
      }
      return ''
    })()

    // ─── Get language-aware form instruction ────────────────────
    const formInstruction = getFormInstruction(poemForm, poemLanguage)

    // ─── Form compliance reminder ──────────────────────────────
    const complianceReminder = formInstruction
      ? `\n\n【体裁合规提醒】你已被指定了特定的诗歌体裁，必须严格遵守该体裁的所有规则（字数、行数、韵脚、结构等）。不要为了迁就关键词而违反体裁规则。如果关键词无法完全融入，可以适当调整或省略个别词，但体裁格式不可妥协。`
      : ''

    let systemPrompt = ''
    let userPrompt = ''

    if (poemLanguage === 'zh') {
      systemPrompt = `你是一位精通中国古典诗词和现代诗歌的诗人。${formInstruction || `你可以自由选择写五言绝句、五言律诗、七言绝句、七言律诗、歌行体古风或现代诗。如果写古体诗，必须严格遵守押韵和平仄规则。如果写现代诗，不要求押韵，但要有诗意和节奏。诗末用括号注明诗体。`}

无论选择何种体裁，都必须将所有给定的关键词自然融入诗中。${languageMismatchInstruction}${complianceReminder}${noAsteriskRule}`

      userPrompt = `请根据以下关键词创作一首中文诗歌：${words.join('、')}

${formInstruction ? '请严格按照指定体裁创作，遵守所有字数、行数、韵脚规则。' : '请自由选择最合适的诗体创作。'}将所有关键词自然融入诗中，不要给关键词加任何标记符号。${enWords.length > 0 ? `\n\n注意：英文关键词需要翻译为中文后使用，诗中不能出现英文。` : ''}`
    } else if (poemLanguage === 'en') {
      systemPrompt = `You are a talented poet who creates beautiful, evocative English poems. ${formInstruction || `You may choose any form — sonnet, ballad, free verse, haiku, etc. Pay attention to rhythm, meter, and musicality. If you write in a traditional form, follow its conventions carefully. If free verse, focus on vivid imagery and emotional resonance. Add the form name in parentheses at the end.`}

Weave ALL the given words naturally into the poem. Make it feel like the words naturally belong together.${languageMismatchInstruction}${complianceReminder}${noAsteriskRule}`

      userPrompt = `Create a poem inspired by these words: ${words.join(', ')}

${formInstruction ? 'Follow the specified form STRICTLY — obey all syllable counts, line counts, rhyme schemes, and structural rules.' : 'Choose the best form for these words.'} Include all the given words naturally — do NOT add asterisks or any special markers around them.${zhWords.length > 0 ? `\n\nNote: Chinese words in the list must be translated to their English equivalents. The poem must be written entirely in English with no Chinese characters.` : ''}`
    } else {
      // mixed
      systemPrompt = `你是一位精通中英双语诗歌的诗人。你可以创作中英文混合的诗歌，让两种语言自然交织、融为一体。

${formInstruction || `中文部分：如写古体诗需严格押韵（偶数句末字押韵，韵脚属同一韵部），现代诗可自由。英文部分注意韵律和节奏感。`}

【混合创作规则】：
- 中英文的交替要自然流畅，不可生硬拼接
- 两种语言之间应有呼应和对照
- 整首诗要有统一的意境和情感
- 如果选择了特定体裁，需同时遵守该体裁的中英文规则
- 诗末请注明诗体风格${complianceReminder}${noAsteriskRule}`

      userPrompt = `请根据以下关键词创作一首中英文混合诗歌：${words.join('、')}

${formInstruction ? '请严格按照指定体裁创作，遵守所有格式规则。' : ''}将所有关键词自然融入诗中，中英文自然交织，不要给关键词加任何标记符号。`
    }

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    })

    const poem = completion.choices[0]?.message?.content

    if (!poem) {
      return Response.json({ error: 'Failed to generate poem' }, { status: 500 })
    }

    return Response.json({ poem })
  } catch (error) {
    console.error('Poem generation error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

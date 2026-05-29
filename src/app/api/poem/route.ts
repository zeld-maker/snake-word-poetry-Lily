import ZAI from 'z-ai-web-dev-sdk'

type PoemForm = 'auto' | 'fivechar' | 'sevenchar' | 'changgu' | 'modern' | 'sonnet' | 'haiku' | 'ballad' | 'limerick' | 'villanelle'
type PoemLanguage = 'zh' | 'en' | 'mixed'

// ─── LLM Provider: supports external OpenAI-compatible APIs ─────
// Set LLM_API_KEY, LLM_BASE_URL, LLM_MODEL env vars to use an external API.
// If not set, falls back to z-ai-web-dev-sdk (sandbox environment).

const LLM_API_KEY = process.env.LLM_API_KEY || ''
const LLM_BASE_URL = process.env.LLM_BASE_URL || ''
const LLM_MODEL = process.env.LLM_MODEL || ''

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  // If external API is configured, use it
  if (LLM_API_KEY && LLM_BASE_URL) {
    const baseUrl = LLM_BASE_URL.replace(/\/+$/, '')
    const url = `${baseUrl}/chat/completions`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL || 'qwen-plus',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`LLM API error (${response.status}):`, errorText)
      throw new Error(`LLM API returned status ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('LLM API returned empty content')
    }
    return content
  }

  // Fallback: use z-ai-web-dev-sdk (sandbox environment)
  const zai = await ZAI.create()
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    thinking: { type: 'disabled' },
  })
  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('z-ai SDK returned empty content')
  }
  return content
}

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

【五言绝句示例】：
空山新雨后（5字 ✓）— 不押韵
天气晚来秋（5字 ✓）— 押韵(A)
明月松间照（5字 ✓）— 不押韵
清泉石上流（5字 ✓）— 押韵(A)
（注：秋、流同属一韵部 ✓）

五言律诗（8句，每句5字，共40字）：
1. 每句必须恰好5个字，不可多字少字
2. 第二、四、六、八句末字必须押韵，首句可押可不押
3. 韵脚必须属同一韵部，不可串韵
4. 严格遵守平仄规则
5. 中间两联（颔联3-4句、颈联5-6句）必须对仗

【五言律诗示例】（节选结构）：
国破山河在（5字）— 首句
城春草木深（5字）— 押韵(A)
感时花溅泪（5字）— 颔联上句 ↘对仗
恨别鸟惊心（5字）— 颔联下句 ↗
烽火连三月（5字）— 颈联上句 ↘对仗
家书抵万金（5字）— 颈联下句 ↗
白头搔更短（5字）
浑欲不胜簪（5字）— 押韵(A)

请在诗末用括号注明选择了哪种：如（五言绝句）或（五言律诗）`,

    sevenchar: `【必须写七言诗】请从七言绝句或七言律诗中选择一种来创作。详细规则：

七言绝句（4句，每句7字，共28字）：
1. 每句必须恰好7个字，不可多字少字
2. 第二、四句末字必须押韵，首句可押可不押
3. 韵脚必须属同一韵部（《平水韵》或《中华新韵》），不可串韵
4. 平仄需基本合律："一三五不论，二四六分明"

【七言绝句示例】：
朝辞白帝彩云间（7字 ✓）— 押韵(A)
千里江陵一日还（7字 ✓）— 押韵(A)
两岸猿声啼不住（7字 ✓）— 不押韵
轻舟已过万重山（7字 ✓）— 押韵(A)
（注：间、还、山同属一韵部 ✓）

七言律诗（8句，每句7字，共56字）：
1. 每句必须恰好7个字，不可多字少字
2. 第二、四、六、八句末字必须押韵，首句可押可不押
3. 韵脚必须属同一韵部，不可串韵
4. 严格遵守平仄规则："一三五不论，二四六分明"
5. 中间两联（颔联3-4句、颈联5-6句）必须对仗

【七言律诗示例】（节选结构）：
风急天高猿啸哀（7字）— 押韵(A)
渚清沙白鸟飞回（7字）— 押韵(A)
无边落木萧萧下（7字）— 颔联上句 ↘对仗
不尽长江滚滚来（7字）— 颔联下句 ↗
万里悲秋常作客（7字）— 颈联上句 ↘对仗
百年多病独登台（7字）— 颈联下句 ↗
艰难苦恨繁霜鬓（7字）
潦倒新停浊酒杯（7字）— 押韵(A)

请在诗末用括号注明选择了哪种：如（七言绝句）或（七言律诗）`,

    changgu: `【必须写长古诗/歌行体】请创作一首歌行体或古风长诗。详细规则：

1. 每句五言或七言（可混用），句数不限，通常8句以上
2. 可以换韵：不同段落可以使用不同的韵部，但同一韵段内必须押韵一致
3. 不要求严格的平仄对仗（区别于律诗）
4. 注重叙事性和抒情性的结合，如白居易《琵琶行》、李白《梦游天姥吟留别》的风格
5. 可以有较长的篇幅来充分展开意境和情感
6. 句式可以灵活变化，允许长短句交替
7. 请在诗末注明（歌行体）或（古风）

【歌行体完整示例】（展示换韵与七言为主的格式）：
君不见黄河之水天上来（7字）— 押A韵
奔流到海不复回（7字）— 押A韵
君不见高堂明镜悲白发（7字）— 换B韵
朝如青丝暮成雪（7字）— 押B韵
人生得意须尽欢（7字）— 换C韵
莫使金樽空对月（7字）— 押C韵
天生我材必有用（7字）— 换D韵
千金散尽还复来（7字）— 押D韵
……（篇幅可自由延伸，可继续换韵）

这是最适合8个关键词的体裁，因为有足够的篇幅自然融入所有关键词。`,

    modern: `【必须写现代诗】请写自由体现代诗歌。规则：
1. 可以自由排列，不拘字数和行数
2. 可以不押韵，但应有内在的节奏感和音乐性
3. 注重意象的营造和情感的流动
4. 语言要优美、凝练、有张力
5. 可以使用跨行、断句等现代诗技巧
6. 诗末用括号注明（现代诗）

【现代诗完整示例】：
从远方来的人
带着海的盐味
和风的形状

他把月光
折成一只纸鹤
放在我的窗台上

那一刻
所有的寂静
都有了翅膀`,
  }

  // Bilingual forms: have Chinese, English, and Mixed versions
  const bilingualForms: Record<string, { zh: string; en: string; mixed: string }> = {

    sonnet: {
      zh: `【必须写中文十四行诗】将莎士比亚十四行诗的体例改编为中文创作。详细规则：

1. 共14行：三个四行诗节（韵脚 ABAB CDCD EFEF）+ 一个两行对句（韵脚 GG）
2. 【中文格律】每行必须恰好10个汉字，不可多字少字
3. 韵脚必须严格遵循 ABAB CDCD EFEF GG 的韵式
4. 中文押韵应使用同一韵部（《中华新韵》），不可串韵
5. 最后两行对句应当点题或反转
6. 每个四行诗节应推进一层意思
7. 请在诗末注明（十四行诗）

【完整示例】（14行，每行10字，ABAB CDCD EFEF GG）：
第1节：
月落星沉时分满庭芬芳（10字 ✓）A-芳(fāng)
谁在远方独自诉说离愁（10字 ✓）B-愁(chóu)
春风送来阵阵花的幽香（10字 ✓）A-香(xiāng)
思念如同河水日夜东流（10字 ✓）B-流(liú)
第2节：
夜深露重霜气透骨清寒（10字 ✓）C-寒(hán)
孤雁南飞何日才能北归（10字 ✓）D-归(guī)
往事如烟岁月早已凋残（10字 ✓）C-残(cán)
望断天涯唯有落花纷飞（10字 ✓）D-飞(fēi)
第3节：
岁月匆匆世事总是难寻（10字 ✓）E-寻(xún)
只盼春风再度百花重开（10字 ✓）F-开(kāi)
长路漫漫何处才是情深（10字 ✓）E-深(shēn)
纵使千山万水我也走来（10字 ✓）F-来(lái)
第4节（对句）：
此情此意年年愈加深浓（10字 ✓）G-浓(nóng)
唯愿君心与我永世相同（10字 ✓）G-同(tóng)`,

      en: `【Must write a Shakespearean sonnet — STRICT FORM REQUIRED】Rules:

1. Exactly 14 lines: three quatrains (ABAB CDCD EFEF) + one couplet (GG)
2. Each line MUST be in iambic pentameter: exactly 10 syllables with the stress pattern da-DUM da-DUM da-DUM da-DUM da-DUM
3. The rhyme scheme must be STRICTLY followed — no near-rhymes, no slant-rhymes
4. Each quatrain should develop the theme; the couplet should deliver a twist or summary
5. COUNT SYLLABLES on every line before finalizing. 10 syllables per line is NON-NEGOTIABLE.

【Complete Example】(14 lines, 10 syllables each, ABAB CDCD EFEF GG):
Quatrain 1:
The morn-ing sun a-wakes the sleep-ing land (10 ✓) A
And gold-en rays dance on the qui-et sea (10 ✓) B
I feel the warmth of na-ture's gen-tle hand (10 ✓) A
As wind and wa-ter sing in har-mo-ny (10 ✓) B
Quatrain 2:
The ros-es bloom a-long the gar-den wall (10 ✓) C
Their fra-grance float-ing on the sum-mer air (10 ✓) D
I hear the an-cient o-cean's dis-tant call (10 ✓) C
And find a mo-ment's peace be-yond com-pare (10 ✓) D
Quatrain 3:
Yet sha-dows creep a-cross the fade-ing day (10 ✓) E
The si-lence grows be-neath the tree-tops high (10 ✓) F
And all the col-ors wash in gray a-way (10 ✓) E
As eve-ning stars a-wak-en in the sky (10 ✓) F
Couplet:
So let us hold this fleet-ing mo-ment fast (10 ✓) G
For beau-ty fades but mem-o-ry will last (10 ✓) G

6. Add (Sonnet) at the end`,

      mixed: `【必须写中英混合十四行诗】将莎士比亚十四行诗改编为中英混合创作。规则：

1. 共14行：三个四行诗节 + 一个两行对句
2. 韵脚遵循 ABAB CDCD EFEF GG（中英文行之间也需要押韵或谐音押韵）
3. 中英文自然交织，可以一行中文一行英文，或在同一行中混用
4. 中文行约10字，英文行约10音节，混合行总长度相当
5. 最后两行对句点题或反转
6. 请在诗末注明（十四行诗·混合）

【混合示例】（节选第1节，ABAB韵）：
月落星沉满庭芬芳（中文10字）A-芳(fāng)
And si-lence falls a-cross the sea（英文10音节）B-sea
春风送来花的幽香（中文10字）A-香(xiāng)
The mem-o-ries re-turn to me（英文10音节）B-me

（注：中文A韵行互相押韵，英文B韵行互相押韵；中英文行交替出现，形成对话感）`,
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

【Complete Example】:
Haiku 1:
Au-tumn moon-light falls (5 ✓)
On the si-lent moun-tain lake (7 ✓)
Ri-ples in the dark (5 ✓)

Haiku 2:
Cher-ry blos-soms drift (5 ✓)
A gen-tle breeze a-cross the hill (7 ✓)
Pet-als on the stream (5 ✓)

8. Add (Haiku) at the end`,

      mixed: `【必须写中英混合俳句】规则：

1. 创作2-3首俳句，每首3行
2. 中文行严格5或7字，英文行严格5或7音节
3. 第一行5字/音节，第二行7字/音节，第三行5字/音节
4. 中英文自然交织，可以在不同行交替使用两种语言

【混合完整示例】：
秋月照寒潭（中文5字）
A si-lent ri-pple on the lake（英文7音节）
涟漪入夜寒（中文5字）

（注：中文行严格遵守字数，英文行严格遵守音节数，两种语言在5-7-5框架内自由交替）`,
    },

    ballad: {
      zh: `【必须写中文民谣体诗歌】将英式民谣体（Ballad）改编为中文创作。详细规则：

1. 写3-4节，每节4行
2. 【中文格律】奇数行7字，偶数行5字（形成长短交错的民谣节奏感）；也可全部7字
3. 韵脚：第二、四行末字必须押韵（ABCB），首行也可押韵（ABAB），韵脚属同一韵部
4. 民谣体重在叙事——要有起承转合的故事感
5. 语言要朴素、直接、生动，避免过于华丽
6. 可以使用反复出现的诗句作为"副歌"
7. 请在诗末注明（民谣体）

【完整示例】（3节，ABCB韵，7-5-7-5字数交替）：
第1节：
秋风吹过古城墙（7字）
月下独含愁（5字）B-愁(chóu)
落叶纷飞伴夕阳（7字）
思念向东流（5字）B-流(liú)

第2节：
雁阵南飞过远山（7字）
何日把家归（5字）D-归(guī)
往事如烟渐凋残（7字）
落花随风飞（5字）D-飞(fēi)

第3节：
千里迢迢路漫长（7字）
独自守空门（5字）E-门(mén)
不知何日返故乡（7字）
月下盼归人（5字）E-人(rén)`,

      en: `【Must write a ballad — STRICT FORM REQUIRED】Rules:

1. Write 3-4 quatrains (4-line stanzas)
2. Rhyme scheme: ABAB or ABCB (second and fourth lines MUST rhyme)
3. Meter: alternating lines of iambic tetrameter (4 beats/8 syllables) and iambic trimeter (3 beats/6 syllables)
4. COUNT SYLLABLES: odd lines = 8 syllables, even lines = 6 syllables (or all lines 8 syllables)
5. Ballads tell a story — include narrative progression with a beginning, middle, and end
6. Use simple, direct, and vivid language
7. The refrain or repeated element is optional but effective

【Complete Example】(3 stanzas, ABCB rhyme, 8/6/8/6 syllables):
Stanza 1:
The cold wind blew through the val-ley (8, A)
And swept a-way the snow (6, B)
The trav-el-er walked in si-lence (8, C)
With no-where left to go (6, B)

Stanza 2:
He passed the bro-ken stone bridg-es (8, D)
And hous-es fall-en down (6, E)
He heard the church bells soft-ly ring (8, F)
A-bove the sleep-y town (6, E)

Stanza 3:
He fi-nal-ly found a can-dle (8, G)
That burned be-hind the door (6, H)
A voice said come and rest here now (8, I)
You need not wan-der more (6, H)

8. Add (Ballad) at the end`,

      mixed: `【必须写中英混合民谣体】规则：

1. 写3-4节，每节4行
2. 第二、四行末字/词押韵（ABCB）
3. 中文行7字或5字，英文行8音节或6音节，长短交替
4. 中英文自然交替，可以中文叙事、英文抒情，形成对话感
5. 语言朴素生动，有故事感
6. 请在诗末注明（民谣体·混合）

【混合示例】（节选第1节，ABCB韵）：
秋风吹过古城墙（中文7字）
The au-tumn wind is cold and gray（英文8音节）B-gray
落叶纷飞伴夕阳（中文7字）
A thou-sand miles a-way（英文5音节）B-away`,
    },

    limerick: {
      zh: `【必须写中文打油诗】将英文Limerick改编为中文创作。详细规则：

1. 写1-2首打油诗，每首恰好5行
2. 韵脚：AABBA（第一、二、五行末字押韵，第三、四行末字押另一韵）
3. 【中文格律】第一、二、五行每行7字；第三、四行每行5字
4. 风格要幽默诙谐、俏皮轻松
5. 最后一行最好有意想不到的转折
6. 韵脚使用同一韵部，不可串韵

【完整示例】：
隔壁老张养金鱼（7字）A-鱼(yú)
鱼缸放在小窗居（7字）A-居(jū)
来了一只猫（5字）B-猫(māo)
吓得鱼想逃（5字）B-逃(táo)
满地碎片水空余（7字）A-余(yú)

（注：A韵"鱼、居、余"同属中华新韵"迂"韵部 ✓，B韵"猫、逃"同属"凹"韵部 ✓）

7. 请在诗末注明（打油诗）`,

      en: `【Must write limerick(s) — STRICT FORM REQUIRED】Rules:

1. Write 1-2 limericks to incorporate the given words
2. Each limerick is EXACTLY 5 lines with AABBA rhyme scheme
3. Lines 1, 2, and 5: 8-9 syllables, rhyme with each other (A)
4. Lines 3 and 4: 5-6 syllables, rhyme with each other (B)
5. COUNT SYLLABLES on every line. The pattern must be: long-long-short-short-long
6. The tone should be humorous, witty, or whimsical
7. The best limericks have a surprising twist in the last line

【Complete Example】:
A won-drous crea-ture named Ned (8, A)
Had a ver-y large bump on his head (9, A)
He bumped in-to doors (5, B)
And fell on all fours (5, B)
And wished he were home in his bed (9, A)

8. Add (Limerick) at the end`,

      mixed: `【必须写中英混合打油诗】规则：

1. 写1-2首打油诗，每首5行，AABBA韵
2. 第一、二、五行：中文7字或英文8-9音节；第三、四行：中文5字或英文5-6音节
3. 中英文交替使用，同韵脚行之间需要押韵（中文押韵母，英文押尾音）
4. 风格幽默诙谐，最后一行有意想不到的转折
5. 请在诗末注明（打油诗·混合）

【混合完整示例】：
隔壁老张养金鱼（中文7字）A-鱼(yú)
His fish bowl sat by the win-dow pane（英文9音节）A-pane
来了一只猫（中文5字）B-猫(māo)
It tried to run a-way（英文5音节）B-way
满地碎片水空余（中文7字）A-余(yú)

（注：A韵中文行互押"鱼-余"，英文行可独立押韵；B韵中文"猫"与英文"away"形成跨语言谐趣对照）`,
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
8. 请在诗末注明（维拉内拉）

【完整示例】（19行，每行7字，A韵=ang，b韵=huái）：
第1节：
月光洒满旧城墙（7字）A-墙(qiáng) ← 叠句一
谁在风中独徘徊（7字）b-徊(huái)
回忆如潮不可挡（7字）A-挡(dǎng) ← 叠句二

第2节：
岁月无声自流淌（7字）A-淌(tǎng)
谁在风中独徘徊（7字）b-徊
月光洒满旧城墙（7字）叠句一

第3节：
花开花落又一霜（7字）A-霜(shuāng)
谁在风中独徘徊（7字）b-徊
回忆如潮不可挡（7字）叠句二

第4节：
古道西风夜正凉（7字）A-凉(liáng)
谁在风中独徘徊（7字）b-徊
月光洒满旧城墙（7字）叠句一

第5节：
星河万里夜未央（7字）A-央(yāng)
谁在风中独徘徊（7字）b-徊
回忆如潮不可挡（7字）叠句二

第6节（末节）：
纵然前路两茫茫（7字）A-茫(máng)
谁在风中独徘徊（7字）b-徊
月光洒满旧城墙（7字）叠句一
回忆如潮不可挡（7字）叠句二

（注：A韵"墙、挡、淌、霜、凉、央、茫"同属中华新韵"昂"韵部 ✓，b韵"徊"属"开"韵部，与A韵不同 ✓）`,

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

【Complete Example】(19 lines, 10 syllables each):
Stanza 1:
The stars be-gin to fade a-way from sight (10) A¹
While au-tumn leaves are scat-tered all a-round (10) b
And still I walk a-lone through end-less night (10) A²

Stanza 2:
The sha-dows stretch a-cross the fad-ing light (10) a
While au-tumn leaves are scat-tered all a-round (10) b
The stars be-gin to fade a-way from sight (10) A¹

Stanza 3:
Each step I take now e-choes in-to flight (10) a
While au-tumn leaves are scat-tered all a-round (10) b
And still I walk a-lone through end-less night (10) A²

Stanza 4:
The mem-o-ries of days that burned so bright (10) a
While au-tumn leaves are scat-tered all a-round (10) b
The stars be-gin to fade a-way from sight (10) A¹

Stanza 5:
A dis-tant can-dle glows with an-cient might (10) a
While au-tumn leaves are scat-tered all a-round (10) b
And still I walk a-lone through end-less night (10) A²

Stanza 6 (final quatrain):
Let hope re-main when no-thing else seems right (10) a
While au-tumn leaves are scat-tered all a-round (10) b
The stars be-gin to fade a-way from sight (10) A¹
And still I walk a-lone through end-less night (10) A²

8. Add (Villanelle) at the end`,

      mixed: `【必须写中英混合维拉内拉】规则：

1. 共19行：五个三行诗节 + 一个四行诗节
2. 全诗只用两个韵，叠句必须原样重复
3. 中文行7字，英文行10音节
4. 中英文可以交替出现，叠句保持语言一致（便于原样重复）
5. A韵行中文互押、英文互押；b韵行同理
6. 请在诗末注明（维拉内拉·混合）

【混合示例】（节选第1-3节，展示中英交替与叠句结构）：
第1节：
月光洒满旧城墙（中文7字）A ← 叠句一
While au-tumn leaves are scat-tered round（英文10音节）b
回忆如潮不可挡（中文7字）A ← 叠句二

第2节：
岁月无声自流淌（中文7字）a
While au-tumn leaves are scat-tered round（英文10音节）b
月光洒满旧城墙（叠句一）

第3节：
Each step I take e-choes through the night（英文10音节）a
While au-tumn leaves are scat-tered round（英文10音节）b
回忆如潮不可挡（叠句二）

（注：叠句使用中文以保持重复一致性，b韵行使用英文形成对照；A韵中文行互押ang韵，英文行互押ight韵）`,
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
    } else if (language === 'en') {
      return bilingual.en
    } else {
      // mixed language
      return bilingual.mixed
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

    const poemForm = (form as PoemForm) || 'auto'
    const poemLanguage = (language as PoemLanguage) || 'mixed'
    const { zhWords, enWords } = classifyWords(words)

    // ─── Common rule: no asterisks around keywords & clean output ─
    const formatRules = `\n\n【重要格式规则】
1. 绝对不要在任何关键词周围加星号(*)或任何标记符号，关键词应该自然融入诗文中，不加任何特殊标记。
2. 输出只能包含诗歌文本本身和诗末的体裁标注（如（五言绝句）、（Sonnet）等），除此之外不要添加任何说明文字——包括但不限于：韵脚标注、字数统计、音节计数、段落关系说明、对仗标注、创作思路、注释等。诗就是诗，干净纯粹。`

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

无论选择何种体裁，都必须将所有给定的关键词自然融入诗中。${languageMismatchInstruction}${complianceReminder}${formatRules}`

      userPrompt = `请根据以下关键词创作一首中文诗歌：${words.join('、')}

${formInstruction ? '请严格按照指定体裁创作，遵守所有字数、行数、韵脚规则。' : '请自由选择最合适的诗体创作。'}将所有关键词自然融入诗中，不要给关键词加任何标记符号。输出只能包含诗歌文本和末尾的体裁标注，不要附加任何韵脚、字数、对仗等说明文字。${enWords.length > 0 ? `\n\n注意：英文关键词需要翻译为中文后使用，诗中不能出现英文。` : ''}`
    } else if (poemLanguage === 'en') {
      systemPrompt = `You are a talented poet who creates beautiful, evocative English poems. ${formInstruction || `You may choose any form — sonnet, ballad, free verse, haiku, etc. Pay attention to rhythm, meter, and musicality. If you write in a traditional form, follow its conventions carefully. If free verse, focus on vivid imagery and emotional resonance. Add the form name in parentheses at the end.`}

Weave ALL the given words naturally into the poem. Make it feel like the words naturally belong together.${languageMismatchInstruction}${complianceReminder}${formatRules}

【CRITICAL OUTPUT RULE】Your output must contain ONLY the poem text itself and the form name in parentheses at the very end (e.g., (Sonnet), (Haiku)). Do NOT include any annotations, explanations, syllable counts, rhyme labels, structural notes, commentary, or analysis. Just the pure poem and the form label. Nothing else.`

      userPrompt = `Create a poem inspired by these words: ${words.join(', ')}

${formInstruction ? 'Follow the specified form STRICTLY — obey all syllable counts, line counts, rhyme schemes, and structural rules.' : 'Choose the best form for these words.'} Include all the given words naturally — do NOT add asterisks or any special markers around them. Output ONLY the poem and the form name in parentheses — no annotations, no commentary.${zhWords.length > 0 ? `\n\nNote: Chinese words in the list must be translated to their English equivalents. The poem must be written entirely in English with no Chinese characters.` : ''}`
    } else {
      // mixed
      systemPrompt = `你是一位精通中英双语诗歌的诗人。你可以创作中英文混合的诗歌，让两种语言自然交织、融为一体。

${formInstruction || `中文部分：如写古体诗需严格押韵（偶数句末字押韵，韵脚属同一韵部），现代诗可自由。英文部分注意韵律和节奏感。`}

【混合创作规则】：
- 中英文的交替要自然流畅，不可生硬拼接
- 两种语言之间应有呼应和对照
- 整首诗要有统一的意境和情感
- 如果选择了特定体裁，需同时遵守该体裁的中英文规则
- 诗末请注明诗体风格${complianceReminder}${formatRules}`

      userPrompt = `请根据以下关键词创作一首中英文混合诗歌：${words.join('、')}

${formInstruction ? '请严格按照指定体裁创作，遵守所有格式规则。' : ''}将所有关键词自然融入诗中，中英文自然交织，不要给关键词加任何标记符号。输出只能包含诗歌文本和末尾的体裁标注，不要附加任何韵脚、字数、对仗等说明文字。`
    }

    const poem = await callLLM(systemPrompt, userPrompt)

    return Response.json({ poem })
  } catch (error) {
    console.error('Poem generation error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

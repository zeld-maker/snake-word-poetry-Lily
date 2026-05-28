import ZAI from 'z-ai-web-dev-sdk'

type PoemForm = 'auto' | 'classical' | 'modern' | 'sonnet' | 'haiku'

export async function POST(request: Request) {
  try {
    const { words, language, form } = await request.json()

    if (!words || !Array.isArray(words) || words.length === 0) {
      return Response.json({ error: 'Words array is required' }, { status: 400 })
    }

    const zai = await ZAI.create()

    const poemForm = (form as PoemForm) || 'auto'

    let systemPrompt = ''
    let userPrompt = ''

    // ─── Form-specific instructions ────────────────────────────
    const formInstructions: Record<PoemForm, string> = {
      auto: '',
      classical: `【必须写古体诗】请写五言或七言的绝句或律诗。规则：
1. 必须严格押韵：偶数句末字必须押韵（绝句二四句押韵，律诗二四六八句押韵），首句可押可不押
2. 韵脚必须属于同一韵部（参考《平水韵》或《中华新韵》），不可串韵
3. 五言每句五字，七言每句七字，不可多字少字
4. 律诗需遵循"一三五不论，二四六分明"的平仄规则
5. 律诗中间两联必须对仗
6. 诗末用括号注明诗体，如（七言绝句）、（五言律诗）
7. 必须将所有给定关键词自然融入诗中`,
      modern: `【必须写现代诗】请写自由体现代诗歌。规则：
1. 可以自由排列，不拘字数和行数
2. 可以不押韵，但应有内在的节奏感和音乐性
3. 注重意象的营造和情感的流动
4. 语言要优美、凝练、有张力
5. 可以使用跨行、断句等现代诗技巧
6. 诗末用括号注明（现代诗）
7. 必须将所有给定关键词自然融入诗中`,
      sonnet: `【Must write a Shakespearean sonnet】Rules:
1. Exactly 14 lines: three quatrains (ABAB CDCD EFEF) + one couplet (GG)
2. Each line should be in iambic pentameter (10 syllables, da-DUM da-DUM da-DUM da-DUM da-DUM)
3. The rhyme scheme must be strictly followed
4. The couplet at the end should deliver a twist or summary
5. Weave ALL the given words naturally into the poem
6. Add (Sonnet) at the end`,
      haiku: `【Must write a haiku sequence】Rules:
1. Write 2-3 haiku, each following the 5-7-5 syllable pattern
2. Each haiku should capture a moment, image, or sensation from the given words
3. Include a kigo (season word) or nature reference if possible
4. Show, don't tell — use concrete imagery
5. Weave ALL the given words naturally across the haiku sequence
6. Add (Haiku) at the end`,
    }

    const formInstruction = formInstructions[poemForm]

    if (language === 'zh') {
      systemPrompt = `你是一位精通中国古典诗词和现代诗歌的诗人。${formInstruction || `你可以自由选择写古体诗（五言绝句/七言绝句/律诗）或现代诗。如果写古体诗，必须严格遵守押韵和平仄规则。如果写现代诗，不要求押韵，但要有诗意和节奏。诗末用括号注明诗体。`}

无论选择何种体裁，都必须将所有给定的关键词自然融入诗中。`

      userPrompt = `请根据以下关键词创作一首中文诗歌：${words.join('、')}

${formInstruction ? '请严格按照指定体裁创作。' : '请自由选择诗体创作。'}将所有关键词自然融入诗中。`
    } else if (language === 'en') {
      systemPrompt = `You are a talented poet who creates beautiful, evocative English poems. ${formInstruction || `You may choose any form — sonnet, ballad, free verse, etc. Pay attention to rhythm, meter, and musicality. If you write in a traditional form, follow its conventions carefully. If free verse, focus on vivid imagery and emotional resonance. Add the form name in parentheses at the end.`}

Weave ALL the given words naturally into the poem. Make it feel like the words naturally belong together.`

      userPrompt = `Create a poem inspired by these words: ${words.join(', ')}

${formInstruction ? 'Follow the specified form strictly.' : 'Choose the best form for these words.'} Include all the given words.`
    } else {
      // mixed
      systemPrompt = `你是一位精通中英双语诗歌的诗人。你可以创作中英文混合的诗歌，让两种语言自然交织、融为一体。

${formInstruction || `中文部分：如写古体诗需严格押韵（偶数句末字押韵，韵脚属同一韵部），现代诗可自由。英文部分注意韵律和节奏感。`}

【混合创作规则】：
- 中英文的交替要自然流畅，不可生硬拼接
- 两种语言之间应有呼应和对照
- 整首诗要有统一的意境和情感
- 诗末请注明诗体风格`

      userPrompt = `请根据以下关键词创作一首中英文混合诗歌：${words.join('、')}

将所有关键词自然融入诗中，中英文自然交织。`
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

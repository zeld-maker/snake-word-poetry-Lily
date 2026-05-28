import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: Request) {
  try {
    const { words, language } = await request.json()

    if (!words || !Array.isArray(words) || words.length === 0) {
      return Response.json({ error: 'Words array is required' }, { status: 400 })
    }

    const zai = await ZAI.create()

    let systemPrompt = ''
    let userPrompt = ''

    if (language === 'zh') {
      systemPrompt = `你是一位精通中国古典诗词和现代诗歌的诗人。你的中文诗歌创作必须遵循以下规则：

【古体诗规则】（五言/七言绝句、律诗）：
1. 必须严格押韵：偶数句末字必须押韵（即第二、四句押韵，律诗则二、四、六、八句押韵），首句可押可不押
2. 韵脚必须属于同一韵部（参考《平水韵》或《中华新韵》），不可串韵
3. 五言绝句每句五字，七言绝句每句七字，不可多字少字
4. 律诗需遵循"一三五不论，二四六分明"的平仄规则
5. 对仗：律诗中间两联（颔联、颈联）必须对仗

【现代诗规则】：
1. 可以自由排列，不拘字数
2. 可以不押韵，但应有内在的节奏感和音乐性
3. 注重意象的营造和情感的流动
4. 语言要优美、凝练、有张力

【创作原则】：
- 你可以自由选择写古体诗（五言绝句/七言绝句/律诗）或现代诗
- 如果写古体诗，必须严格遵守押韵和平仄规则，韵脚不可凑韵
- 如果写现代诗，不要求押韵，但要有诗意和节奏
- 无论如何选择，都必须将所有给定的关键词自然融入诗中
- 诗完成后，请在末尾用括号注明诗体，如（七言绝句）、（五言律诗）、（现代诗）等`

      userPrompt = `请根据以下关键词创作一首中文诗歌：${words.join('、')}

要求：
1. 将所有关键词自然融入诗中
2. 如果选择古体诗，必须严格押韵，韵脚不可串韵
3. 如果选择现代诗，可以不押韵，但要有节奏感和诗意
4. 请在诗末注明诗体`
    } else if (language === 'en') {
      systemPrompt = `You are a talented poet who creates beautiful, evocative English poems. You weave the given words into a cohesive, artistic poem. The poem should be 4-8 lines with rich imagery and emotion. Pay attention to rhythm, meter, and musicality. If you write in a traditional form (sonnet, ballad, etc.), follow its conventions carefully. If free verse, focus on vivid imagery and emotional resonance. Make it feel like the words naturally belong together.`

      userPrompt = `Create a poem inspired by these words: ${words.join(', ')}`
    } else {
      // mixed
      systemPrompt = `你是一位精通中英双语诗歌的诗人。你可以创作中英文混合的诗歌，让两种语言自然交织、融为一体。

【中文部分规则】：
- 如果写古体诗（五言/七言），必须严格押韵：偶数句末字押韵，韵脚属同一韵部，不可串韵
- 如果写现代诗，不要求押韵，但要有节奏感和诗意

【英文部分规则】：
- 注意韵律和节奏感，可以适当使用头韵、尾韵等修辞手法

【混合创作规则】：
- 中英文的交替要自然流畅，不可生硬拼接
- 两种语言之间应有呼应和对照
- 整首诗要有统一的意境和情感
- 可以在同一句中混合中英文，也可以中英文句交替
- 诗末请注明诗体风格`

      userPrompt = `请根据以下关键词创作一首中英文混合诗歌：${words.join('、')}

要求：
1. 将所有关键词自然融入诗中
2. 中英文自然交织，融为一体
3. 中文部分如用古体诗需严格押韵，现代诗可自由
4. 请在诗末注明诗体风格`
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

import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: Request) {
  try {
    const { words, language } = await request.json()

    if (!words || !Array.isArray(words) || words.length === 0) {
      return Response.json({ error: 'Words array is required' }, { status: 400 })
    }

    const zai = await ZAI.create()

    const langInstruction =
      language === 'zh'
        ? '请用纯中文创作'
        : language === 'en'
          ? 'Please write purely in English'
          : '请用中文和英文混合创作，让两种语言自然交织'

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are a talented poet who creates beautiful, evocative poems. ${langInstruction}. You weave the given words into a cohesive, artistic poem. The poem should be 4-8 lines, with rich imagery and emotion. Make it feel like the words naturally belong together.`,
        },
        {
          role: 'user',
          content: `Create a poem inspired by these words: ${words.join(', ')}`,
        },
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

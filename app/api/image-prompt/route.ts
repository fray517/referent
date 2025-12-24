import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
    try {
        const { title, content, provider } = await request.json();

        if (!content || typeof content !== 'string') {
            return NextResponse.json(
                { error: 'Контент статьи обязателен' },
                { status: 400 }
            );
        }

        const apiProvider: 'openai' | 'perplexity' | 'openrouter' =
            provider === 'openai'
                ? 'openai'
                : provider === 'openrouter'
                ? 'openrouter'
                : 'perplexity';

        const apiKey =
            apiProvider === 'openai'
                ? process.env.OPENAI_API_KEY
                : apiProvider === 'openrouter'
                ? process.env.OPENROUTER_API_KEY
                : process.env.PERPLEXITY_API_KEY;
        const baseUrl =
            apiProvider === 'openai'
                ? process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
                : apiProvider === 'openrouter'
                ? process.env.OPENROUTER_BASE_URL ||
                  'https://openrouter.ai/api/v1'
                : process.env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai';
        const model =
            apiProvider === 'openai'
                ? process.env.OPENAI_MODEL || 'gpt-4.1-mini'
                : apiProvider === 'openrouter'
                ? process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat'
                : process.env.PERPLEXITY_MODEL || 'sonar-pro';

        if (!apiKey) {
            return NextResponse.json(
                {
                    error:
                        apiProvider === 'openai'
                            ? 'API ключ OpenAI не настроен'
                            : apiProvider === 'openrouter'
                            ? 'API ключ OpenRouter не настроен'
                            : 'API ключ Perplexity не настроен',
                },
                { status: 500 }
            );
        }

        // Формируем промпт для создания описания изображения
        const systemPrompt =
            'Ты профессиональный художник и иллюстратор. На основе следующей статьи создай детальное описание изображения на английском языке для генерации иллюстрации. Описание должно быть конкретным, визуально богатым и отражать основную тему статьи. Используй стиль фотографии или реалистичной иллюстрации. Описание должно быть длиной 50-100 слов. Ответ должен содержать только описание изображения, без дополнительных комментариев.';

        const userPrompt = title
            ? `Заголовок: ${title}\n\nКонтент: ${content.substring(0, 2000)}`
            : `Контент: ${content.substring(0, 2000)}`;

        const base = baseUrl.replace(/\/$/, '');
        const apiUrl = `${base}/chat/completions`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt,
                    },
                    {
                        role: 'user',
                        content: userPrompt,
                    },
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                {
                    error:
                        errorData.error?.message ||
                        `Ошибка API: ${response.statusText}`,
                },
                { status: response.status }
            );
        }

        const data = await response.json();
        const prompt =
            data.choices?.[0]?.message?.content ||
            'Не удалось создать промпт для изображения';

        return NextResponse.json(
            { prompt: prompt.trim() },
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
            }
        );
    } catch (error) {
        console.error('Ошибка создания промпта для изображения:', error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Произошла ошибка при создании промпта',
            },
            { status: 500 }
        );
    }
}

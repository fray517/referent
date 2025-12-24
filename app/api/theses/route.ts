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

        // Формируем промпт для выделения тезисов
        const systemPrompt =
            'Ты профессиональный аналитик. Прочитай следующую статью и выдели основные тезисы (ключевые идеи, утверждения, выводы). Представь их в виде структурированного списка на русском языке. Каждый тезис должен быть кратким и содержательным. Используй формат маркированного списка.';

        const userPrompt = title
            ? `Заголовок: ${title}\n\nКонтент: ${content}`
            : `Контент: ${content}`;

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
                temperature: 0.3,
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
        const theses =
            data.choices?.[0]?.message?.content ||
            'Не удалось выделить тезисы статьи';

        return NextResponse.json(
            { theses: theses },
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
            }
        );
    } catch (error) {
        console.error('Ошибка выделения тезисов:', error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Произошла ошибка при выделении тезисов',
            },
            { status: 500 }
        );
    }
}

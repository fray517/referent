import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
    try {
        const { title, content } = await request.json();

        if (!content || typeof content !== 'string') {
            return NextResponse.json(
                { error: 'Контент статьи обязателен' },
                { status: 400 }
            );
        }

        const apiKey = process.env.PERPLEXITY_API_KEY;
        const baseUrl = process.env.PERPLEXITY_BASE_URL || 'https://api.perplexity.ai';

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API ключ Perplexity не настроен' },
                { status: 500 }
            );
        }

        // Формируем промпт для выделения тезисов
        const systemPrompt =
            'Ты профессиональный аналитик. Прочитай следующую статью и выдели основные тезисы (ключевые идеи, утверждения, выводы). Представь их в виде структурированного списка на русском языке. Каждый тезис должен быть кратким и содержательным. Используй формат маркированного списка.';

        const userPrompt = title
            ? `Заголовок: ${title}\n\nКонтент: ${content}`
            : `Контент: ${content}`;

        const apiUrl = `${baseUrl}/chat/completions`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'sonar-pro',
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
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return NextResponse.json(
                {
                    error:
                        errorData.error?.message ||
                        `Ошибка API Perplexity: ${response.statusText}`,
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

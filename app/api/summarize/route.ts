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

        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API ключ OpenRouter не настроен' },
                { status: 500 }
            );
        }

        // Формируем промпт для создания резюме
        const systemPrompt =
            'Ты профессиональный аналитик. Прочитай следующую статью и создай краткое резюме на русском языке (2-3 абзаца), объясняющее основную тему и ключевые моменты статьи.';

        const userPrompt = title
            ? `Заголовок: ${title}\n\nКонтент: ${content}`
            : `Контент: ${content}`;

        const response = await fetch(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer':
                        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                },
                body: JSON.stringify({
                    model: 'deepseek/deepseek-chat',
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
                        `Ошибка API OpenRouter: ${response.statusText}`,
                },
                { status: response.status }
            );
        }

        const data = await response.json();
        const summary =
            data.choices?.[0]?.message?.content ||
            'Не удалось создать резюме статьи';

        return NextResponse.json(
            { summary: summary },
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
            }
        );
    } catch (error) {
        console.error('Ошибка создания резюме:', error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Произошла ошибка при создании резюме',
            },
            { status: 500 }
        );
    }
}

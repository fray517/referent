import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
    try {
        const { content } = await request.json();

        if (!content || typeof content !== 'string') {
            return NextResponse.json(
                { error: 'Контент для перевода обязателен' },
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
                        content: 'Ты профессиональный переводчик. Переведи следующий текст с английского на русский язык, сохраняя структуру и стиль оригинала.',
                    },
                    {
                        role: 'user',
                        content: content,
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
                        `Ошибка API Perplexity: ${response.statusText}`,
                },
                { status: response.status }
            );
        }

        const data = await response.json();
        const translatedText =
            data.choices?.[0]?.message?.content ||
            'Не удалось получить перевод';

        return NextResponse.json(
            { translation: translatedText },
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
            }
        );
    } catch (error) {
        console.error('Ошибка перевода:', error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Произошла ошибка при переводе',
            },
            { status: 500 }
        );
    }
}

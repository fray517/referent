import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
    try {
        const { title, content, date } = await request.json();

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

        // Формируем промпт для создания поста для Telegram
        const systemPrompt =
            'Ты профессиональный копирайтер. На основе следующей статьи создай пост для Telegram на русском языке. Пост должен быть:\n' +
            '- Интересным и привлекающим внимание\n' +
            '- Структурированным (используй Markdown: **жирный**, *курсив*, списки)\n' +
            '- Содержать краткое резюме и ключевые моменты\n' +
            '- Иметь призыв к действию или вопрос для обсуждения\n' +
            '- Длина: 500-800 символов\n' +
            'Используй только Markdown форматирование, поддерживаемое Telegram.';

        let userPrompt = '';
        if (title) {
            userPrompt += `Заголовок: ${title}\n\n`;
        }
        if (date) {
            userPrompt += `Дата: ${date}\n\n`;
        }
        userPrompt += `Контент: ${content}`;

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
                    temperature: 0.7,
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
        const post =
            data.choices?.[0]?.message?.content ||
            'Не удалось создать пост для Telegram';

        return NextResponse.json(
            { post: post },
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
            }
        );
    } catch (error) {
        console.error('Ошибка создания поста для Telegram:', error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Произошла ошибка при создании поста',
            },
            { status: 500 }
        );
    }
}

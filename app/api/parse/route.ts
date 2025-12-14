import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';


interface ParseResult {
    date: string | null;
    title: string | null;
    content: string | null;
}


export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();

        if (!url || typeof url !== 'string') {
            return NextResponse.json(
                { error: 'URL обязателен' },
                { status: 400 }
            );
        }

        // Загружаем HTML страницы
        const response = await fetch(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Charset': 'utf-8',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Не удалось загрузить страницу: ${response.statusText}` },
                { status: response.status }
            );
        }

        // Получаем HTML с правильной кодировкой
        // Используем text() который автоматически обрабатывает кодировку
        const html = await response.text();
        const $ = cheerio.load(html);

        // Поиск заголовка
        let title: string | null = null;
        const titleSelectors = [
            'h1',
            'article h1',
            '.post-title',
            '.article-title',
            '[class*="title"]',
            'title',
        ];

        for (const selector of titleSelectors) {
            const element = $(selector).first();
            if (element.length) {
                title = element.text().trim();
                if (title) break;
            }
        }

        // Поиск даты
        let date: string | null = null;
        const dateSelectors = [
            'time[datetime]',
            '[datetime]',
            '.date',
            '.published',
            '.post-date',
            '.article-date',
            '[class*="date"]',
            'meta[property="article:published_time"]',
            'meta[name="publish-date"]',
        ];

        for (const selector of dateSelectors) {
            const element = $(selector).first();
            if (element.length) {
                if (selector.includes('meta')) {
                    date = element.attr('content') || null;
                } else {
                    date =
                        element.attr('datetime') ||
                        element.attr('content') ||
                        element.text().trim() ||
                        null;
                }
                if (date) break;
            }
        }

        // Поиск основного контента
        let content: string | null = null;
        const contentSelectors = [
            'article',
            '.post',
            '.content',
            '.article-content',
            '.post-content',
            '[class*="content"]',
            'main',
            '.entry-content',
        ];

        for (const selector of contentSelectors) {
            const element = $(selector).first();
            if (element.length) {
                // Удаляем ненужные элементы (скрипты, стили, реклама)
                element.find('script, style, nav, aside, .ad, .advertisement').remove();
                const text = element.text().trim();
                if (text && text.length > 100) {
                    // Минимальная длина контента
                    content = text;
                    break;
                }
            }
        }

        // Если не нашли через селекторы, пробуем body
        if (!content) {
            const body = $('body');
            body.find('script, style, nav, aside, header, footer').remove();
            const text = body.text().trim();
            if (text && text.length > 100) {
                content = text;
            }
        }

        const result: ParseResult = {
            date: date || null,
            title: title || null,
            content: content || null,
        };

        return NextResponse.json(result, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
        });
    } catch (error) {
        console.error('Ошибка парсинга:', error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Произошла ошибка при парсинге',
            },
            { status: 500 }
        );
    }
}

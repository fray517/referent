export type SummaryLength = 'short' | 'normal' | 'detailed';

export function isSummaryLength(value: unknown): value is SummaryLength {
    return value === 'short' || value === 'normal' || value === 'detailed';
}

export function getSummaryPrompt(length: SummaryLength): string {
    const instructions: Record<SummaryLength, string> = {
        short: 'Создай краткое резюме в 4-6 абзацах. Передай только основную мысль и главные выводы.',
        normal: 'Создай резюме в 2-3 абзацах, объясняющее основную тему и ключевые моменты статьи.',
        detailed: 'Создай подробное резюме в 4-6 абзацах. Раскрой ключевые аргументы, важные детали и выводы статьи.',
    };

    return `Ты профессиональный аналитик. Прочитай следующую статью и подготовь резюме на русском языке. ${instructions[length]} Не добавляй фактов, которых нет в статье.`;
}

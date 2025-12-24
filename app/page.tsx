'use client';

import { useState, useRef, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Copy, X } from 'lucide-react';


interface ParseResult {
    date: string | null;
    title: string | null;
    content: string | null;
}


type ApiProvider = 'openai' | 'perplexity' | 'openrouter';


type ErrorType =
    | 'parse_error'
    | 'network_error'
    | 'api_error'
    | 'content_error'
    | 'unknown_error';


interface ErrorInfo {
    type: ErrorType;
    message: string;
}


function getFriendlyErrorMessage(
    error: unknown,
    responseStatus?: number,
    action?: string
): ErrorInfo {
    // Ошибки сети (таймаут, нет соединения и т.д.)
    if (
        error instanceof TypeError ||
        (error instanceof Error &&
            (error.message.includes('fetch') ||
                error.message.includes('network') ||
                error.message.includes('Failed to fetch') ||
                error.name === 'NetworkError' ||
                error.name === 'AbortError'))
    ) {
        return {
            type: 'network_error',
            message: 'Не удалось загрузить статью по этой ссылке.',
        };
    }

    // Ошибки парсинга статьи (404, 500, таймаут)
    if (responseStatus !== undefined) {
        if (responseStatus === 404) {
            return {
                type: 'parse_error',
                message: 'Не удалось загрузить статью по этой ссылке.',
            };
        }
        if (responseStatus >= 500) {
            return {
                type: 'parse_error',
                message: 'Не удалось загрузить статью по этой ссылке.',
            };
        }
        if (responseStatus === 408 || responseStatus === 504) {
            return {
                type: 'parse_error',
                message: 'Не удалось загрузить статью по этой ссылке.',
            };
        }
    }

    // Ошибки из API
    if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        // Ошибки загрузки статьи
        if (
            errorMessage.includes('не удалось загрузить') ||
            errorMessage.includes('парсинге') ||
            errorMessage.includes('parse')
        ) {
            return {
                type: 'parse_error',
                message: 'Не удалось загрузить статью по этой ссылке.',
            };
        }

        // Ошибки контента
        if (
            errorMessage.includes('контент') ||
            errorMessage.includes('извлечь')
        ) {
            return {
                type: 'content_error',
                message: 'Не удалось извлечь содержимое статьи. Попробуйте другую ссылку.',
            };
        }

        // Ошибки API (перевод, резюме и т.д.)
        if (
            errorMessage.includes('перевод') ||
            errorMessage.includes('резюме') ||
            errorMessage.includes('тезис') ||
            errorMessage.includes('пост') ||
            errorMessage.includes('api')
        ) {
            const actionMessages: Record<string, string> = {
                Перевести: 'Не удалось перевести статью. Попробуйте позже.',
                'О чем статья?':
                    'Не удалось создать резюме статьи. Попробуйте позже.',
                Тезисы: 'Не удалось выделить тезисы. Попробуйте позже.',
                'Пост для Telegram':
                    'Не удалось создать пост для Telegram. Попробуйте позже.',
            };

            return {
                type: 'api_error',
                message:
                    action && actionMessages[action]
                        ? actionMessages[action]
                        : 'Произошла ошибка при обработке. Попробуйте позже.',
            };
        }
    }

    // Неизвестная ошибка
    return {
        type: 'unknown_error',
        message: 'Произошла непредвиденная ошибка. Попробуйте еще раз.',
    };
}


export default function Home() {
    const [url, setUrl] = useState('');
    const [result, setResult] = useState<ParseResult | string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeButton, setActiveButton] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [apiProvider, setApiProvider] = useState<ApiProvider>('perplexity');
    const [processStage, setProcessStage] = useState<string>('');
    const [copySuccess, setCopySuccess] = useState(false);
    const resultRef = useRef<HTMLDivElement>(null);

    // Автоматическая прокрутка к результатам после успешной генерации
    useEffect(() => {
        if (result && !isLoading && resultRef.current) {
            resultRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }
    }, [result, isLoading]);

    const handleClear = () => {
        setUrl('');
        setResult(null);
        setError(null);
        setIsLoading(false);
        setActiveButton(null);
        setProcessStage('');
        setCopySuccess(false);
    };

    const handleCopy = async () => {
        if (!result) return;

        const textToCopy =
            typeof result === 'string'
                ? result
                : JSON.stringify(result, null, 2);

        try {
            await navigator.clipboard.writeText(textToCopy);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Ошибка при копировании:', err);
        }
    };

    const handleSubmit = async (action: string) => {
        if (!url.trim()) {
            alert('Пожалуйста, введите URL статьи');
            return;
        }

        setIsLoading(true);
        setActiveButton(action);
        setResult(null);
        setError(null);
        setProcessStage('Загружаю статью...');

        try {
            // Сначала парсим статью
            let parseResponse: Response;
            try {
                parseResponse = await fetch('/api/parse', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ url: url.trim() }),
                });
            } catch (fetchError) {
                const errorInfo = getFriendlyErrorMessage(fetchError);
                setError(errorInfo.message);
                return;
            }

            let parseData: any;
            try {
                parseData = await parseResponse.json();
            } catch (jsonError) {
                const errorInfo = getFriendlyErrorMessage(
                    jsonError,
                    parseResponse.status
                );
                setError(errorInfo.message);
                return;
            }

            if (!parseResponse.ok) {
                const errorInfo = getFriendlyErrorMessage(
                    parseData.error || 'Ошибка при парсинге статьи',
                    parseResponse.status
                );
                setError(errorInfo.message);
                return;
            }

            const parsedArticle = parseData as ParseResult;

            // Обработка различных действий
            if (action === 'Перевести') {
                if (!parsedArticle.content) {
                    const errorInfo = getFriendlyErrorMessage(
                        new Error('Не удалось извлечь контент статьи'),
                        undefined,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                setProcessStage('Перевожу статью...');
                let translateResponse: Response;
                try {
                    translateResponse = await fetch('/api/translate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            content: parsedArticle.content,
                            provider: apiProvider,
                        }),
                    });
                } catch (fetchError) {
                    const errorInfo = getFriendlyErrorMessage(
                        fetchError,
                        undefined,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                let translateData: any;
                try {
                    translateData = await translateResponse.json();
                } catch (jsonError) {
                    const errorInfo = getFriendlyErrorMessage(
                        jsonError,
                        translateResponse.status,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                if (!translateResponse.ok) {
                    const errorInfo = getFriendlyErrorMessage(
                        translateData.error || 'Ошибка при переводе статьи',
                        translateResponse.status,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                setResult(translateData.translation);
            } else if (action === 'О чем статья?') {
                if (!parsedArticle.content) {
                    const errorInfo = getFriendlyErrorMessage(
                        new Error('Не удалось извлечь контент статьи'),
                        undefined,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                setProcessStage('Создаю резюме...');
                let summarizeResponse: Response;
                try {
                    summarizeResponse = await fetch('/api/summarize', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            title: parsedArticle.title,
                            content: parsedArticle.content,
                            provider: apiProvider,
                        }),
                    });
                } catch (fetchError) {
                    const errorInfo = getFriendlyErrorMessage(
                        fetchError,
                        undefined,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                let summarizeData: any;
                try {
                    summarizeData = await summarizeResponse.json();
                } catch (jsonError) {
                    const errorInfo = getFriendlyErrorMessage(
                        jsonError,
                        summarizeResponse.status,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                if (!summarizeResponse.ok) {
                    const errorInfo = getFriendlyErrorMessage(
                        summarizeData.error || 'Ошибка при создании резюме',
                        summarizeResponse.status,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                setResult(summarizeData.summary);
            } else if (action === 'Тезисы') {
                if (!parsedArticle.content) {
                    const errorInfo = getFriendlyErrorMessage(
                        new Error('Не удалось извлечь контент статьи'),
                        undefined,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                setProcessStage('Выделяю тезисы...');
                let thesesResponse: Response;
                try {
                    thesesResponse = await fetch('/api/theses', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            title: parsedArticle.title,
                            content: parsedArticle.content,
                            provider: apiProvider,
                        }),
                    });
                } catch (fetchError) {
                    const errorInfo = getFriendlyErrorMessage(
                        fetchError,
                        undefined,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                let thesesData: any;
                try {
                    thesesData = await thesesResponse.json();
                } catch (jsonError) {
                    const errorInfo = getFriendlyErrorMessage(
                        jsonError,
                        thesesResponse.status,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                if (!thesesResponse.ok) {
                    const errorInfo = getFriendlyErrorMessage(
                        thesesData.error || 'Ошибка при выделении тезисов',
                        thesesResponse.status,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                setResult(thesesData.theses);
            } else if (action === 'Пост для Telegram') {
                if (!parsedArticle.content) {
                    const errorInfo = getFriendlyErrorMessage(
                        new Error('Не удалось извлечь контент статьи'),
                        undefined,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                setProcessStage('Создаю пост для Telegram...');
                let telegramPostResponse: Response;
                try {
                    telegramPostResponse = await fetch('/api/telegram-post', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            title: parsedArticle.title,
                            date: parsedArticle.date,
                            content: parsedArticle.content,
                            provider: apiProvider,
                        }),
                    });
                } catch (fetchError) {
                    const errorInfo = getFriendlyErrorMessage(
                        fetchError,
                        undefined,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                let telegramPostData: any;
                try {
                    telegramPostData = await telegramPostResponse.json();
                } catch (jsonError) {
                    const errorInfo = getFriendlyErrorMessage(
                        jsonError,
                        telegramPostResponse.status,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                if (!telegramPostResponse.ok) {
                    const errorInfo = getFriendlyErrorMessage(
                        telegramPostData.error || 'Ошибка при создании поста',
                        telegramPostResponse.status,
                        action
                    );
                    setError(errorInfo.message);
                    return;
                }

                setResult(telegramPostData.post);
            } else {
                // Для других действий показываем результат парсинга
                setResult(parsedArticle);
            }
        } catch (err) {
            const errorInfo = getFriendlyErrorMessage(err);
            setError(errorInfo.message);
        } finally {
            setIsLoading(false);
            setActiveButton(null);
            setProcessStage('');
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="mb-3 sm:mb-4 flex justify-start">
                    <div className="inline-flex flex-wrap items-center gap-2 rounded-lg bg-white/80 px-2 sm:px-3 py-1.5 sm:py-2 shadow">
                        <span className="text-xs sm:text-sm text-gray-600">
                            AI-провайдер:
                        </span>
                        <select
                            className="rounded-md border border-gray-300 bg-white px-1.5 sm:px-2 py-1 text-xs sm:text-sm text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={apiProvider}
                            onChange={(event) =>
                                setApiProvider(event.target.value as ApiProvider)
                            }
                            disabled={isLoading}
                        >
                            <option value="openai">OPENAI_BASE_URL</option>
                            <option value="perplexity">PERPLEXITY_BASE_URL</option>
                            <option value="openrouter">OPENROUTER_BASE_URL</option>
                        </select>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 lg:p-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                        Referent
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                        Референт - переводчик с ИИ-обработкой
                    </p>

                    {/* Поле ввода URL */}
                    <div className="mb-6">
                        <label
                            htmlFor="article-url"
                            className="block text-sm font-medium text-gray-700 mb-2"
                        >
                            URL англоязычной статьи
                        </label>
                        <input
                            id="article-url"
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Введите URL статьи, например: https://example.com/article"
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors text-sm sm:text-base"
                            disabled={isLoading}
                        />
                        <p className="mt-2 text-xs text-gray-500">
                            Укажите ссылку на англоязычную статью
                        </p>
                    </div>

                    {/* Кнопки действий */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                        <button
                            onClick={() => handleSubmit('О чем статья?')}
                            disabled={isLoading}
                            title="Получить краткое резюме статьи с помощью ИИ"
                            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-white transition-all duration-200 text-sm sm:text-base ${
                                isLoading && activeButton === 'О чем статья?'
                                    ? 'bg-indigo-400 cursor-wait'
                                    : activeButton === 'О чем статья?'
                                    ? 'bg-indigo-700'
                                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                            } disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg`}
                        >
                            {isLoading && activeButton === 'О чем статья?' ? (
                                <span className="flex items-center justify-center">
                                    <svg
                                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Обработка...
                                </span>
                            ) : (
                                'О чем статья?'
                            )}
                        </button>

                        <button
                            onClick={() => handleSubmit('Тезисы')}
                            disabled={isLoading}
                            title="Выделить основные тезисы и ключевые моменты статьи"
                            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-white transition-all duration-200 text-sm sm:text-base ${
                                isLoading && activeButton === 'Тезисы'
                                    ? 'bg-indigo-400 cursor-wait'
                                    : activeButton === 'Тезисы'
                                    ? 'bg-indigo-700'
                                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                            } disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg`}
                        >
                            {isLoading && activeButton === 'Тезисы' ? (
                                <span className="flex items-center justify-center">
                                    <svg
                                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Обработка...
                                </span>
                            ) : (
                                'Тезисы'
                            )}
                        </button>

                        <button
                            onClick={() => handleSubmit('Пост для Telegram')}
                            disabled={isLoading}
                            title="Создать готовый пост для публикации в Telegram-канале"
                            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-white transition-all duration-200 text-sm sm:text-base ${
                                isLoading && activeButton === 'Пост для Telegram'
                                    ? 'bg-indigo-400 cursor-wait'
                                    : activeButton === 'Пост для Telegram'
                                    ? 'bg-indigo-700'
                                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                            } disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg`}
                        >
                            {isLoading && activeButton === 'Пост для Telegram' ? (
                                <span className="flex items-center justify-center">
                                    <svg
                                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Обработка...
                                </span>
                            ) : (
                                'Пост для Telegram'
                            )}
                        </button>

                        <button
                            onClick={() => handleSubmit('Перевести')}
                            disabled={isLoading}
                            title="Перевести статью с английского на русский язык"
                            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium text-white transition-all duration-200 text-sm sm:text-base ${
                                isLoading && activeButton === 'Перевести'
                                    ? 'bg-green-400 cursor-wait'
                                    : activeButton === 'Перевести'
                                    ? 'bg-green-700'
                                    : 'bg-green-600 hover:bg-green-700 active:scale-95'
                            } disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg`}
                        >
                            {isLoading && activeButton === 'Перевести' ? (
                                <span className="flex items-center justify-center">
                                    <svg
                                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                    Перевод...
                                </span>
                            ) : (
                                'Перевести'
                            )}
                        </button>
                    </div>

                    {/* Кнопка очистки */}
                    <div className="mb-4 sm:mb-6 flex justify-center sm:justify-end">
                        <button
                            onClick={handleClear}
                            disabled={isLoading}
                            title="Очистить все поля и результаты"
                            className="w-full sm:w-auto px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                            <X className="h-4 w-4" />
                            Очистить
                        </button>
                    </div>

                    {/* Блок текущего процесса */}
                    {isLoading && (
                        <div className="mb-4 sm:mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <svg
                                    className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                <p className="text-xs sm:text-sm text-blue-800 font-medium break-words">
                                    {processStage || 'Загружаю статью...'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Блок результата */}
                    <div className="mt-6 sm:mt-8" ref={resultRef}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                                Результат
                            </h2>
                            {result && !isLoading && (
                                <button
                                    onClick={handleCopy}
                                    title="Копировать результат"
                                    className="w-full sm:w-auto px-3 py-1.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2 text-xs sm:text-sm"
                                >
                                    <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                                    {copySuccess ? 'Скопировано!' : 'Копировать'}
                                </button>
                            )}
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 min-h-[200px]">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-48">
                                    <div className="text-center">
                                        <svg
                                            className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        <p className="text-gray-600">
                                            {activeButton === 'Перевести'
                                                ? 'Перевод статьи...'
                                                : activeButton === 'О чем статья?'
                                                ? 'Создание резюме...'
                                                : activeButton === 'Тезисы'
                                                ? 'Выделение тезисов...'
                                                : activeButton === 'Пост для Telegram'
                                                ? 'Создание поста...'
                                                : 'Парсинг статьи...'}
                                        </p>
                                    </div>
                                </div>
                            ) : error ? (
                                <Alert variant="destructive" className="border-red-200 bg-red-50">
                                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                    <AlertTitle className="text-red-800 text-sm sm:text-base">
                                        Ошибка
                                    </AlertTitle>
                                    <AlertDescription className="text-red-700 text-xs sm:text-sm break-words">
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            ) : result ? (
                                <div className="prose max-w-none">
                                    {typeof result === 'string' ? (
                                        <div className="whitespace-pre-wrap break-words text-gray-800 font-sans text-xs sm:text-sm leading-relaxed bg-white p-3 sm:p-4 rounded border overflow-auto">
                                            {result}
                                        </div>
                                    ) : (
                                        <pre className="whitespace-pre-wrap break-words text-gray-800 font-sans text-xs sm:text-sm leading-relaxed bg-white p-3 sm:p-4 rounded border overflow-auto">
                                            {JSON.stringify(result, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-8 sm:py-12 text-sm sm:text-base">
                                    Результат обработки появится здесь
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

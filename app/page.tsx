'use client';

import { useState } from 'react';


interface ParseResult {
    date: string | null;
    title: string | null;
    content: string | null;
}


export default function Home() {
    const [url, setUrl] = useState('');
    const [result, setResult] = useState<ParseResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeButton, setActiveButton] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (action: string) => {
        if (!url.trim()) {
            alert('Пожалуйста, введите URL статьи');
            return;
        }

        setIsLoading(true);
        setActiveButton(action);
        setResult(null);
        setError(null);

        try {
            const response = await fetch('/api/parse', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка при парсинге статьи');
            }

            setResult(data as ParseResult);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Произошла ошибка'
            );
        } finally {
            setIsLoading(false);
            setActiveButton(null);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-xl p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Referent
                    </h1>
                    <p className="text-gray-600 mb-8">
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
                            placeholder="https://example.com/article"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Кнопки действий */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <button
                            onClick={() => handleSubmit('О чем статья?')}
                            disabled={isLoading}
                            className={`px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 ${
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
                            className={`px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 ${
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
                            className={`px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 ${
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
                    </div>

                    {/* Блок результата */}
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">
                            Результат
                        </h2>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 min-h-[200px]">
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
                                            Парсинг статьи...
                                        </p>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="text-red-600 text-center py-8">
                                    <p className="font-medium">Ошибка:</p>
                                    <p className="mt-2">{error}</p>
                                </div>
                            ) : result ? (
                                <div className="prose max-w-none">
                                    <pre className="whitespace-pre-wrap text-gray-800 font-sans text-sm leading-relaxed bg-white p-4 rounded border overflow-auto">
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-12">
                                    Результат парсинга появится здесь
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

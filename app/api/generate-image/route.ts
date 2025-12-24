import { NextRequest, NextResponse } from 'next/server';


export async function POST(request: NextRequest) {
    try {
        const { prompt } = await request.json();

        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json(
                { error: 'Промпт обязателен' },
                { status: 400 }
            );
        }

        const huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY;
        const huggingFaceModel =
            process.env.HUGGINGFACE_MODEL ||
            'stabilityai/stable-diffusion-xl-base-1.0';

        if (!huggingFaceApiKey) {
            return NextResponse.json(
                { error: 'API ключ Hugging Face не настроен' },
                { status: 500 }
            );
        }

        // Используем Hugging Face Router API (новый endpoint)
        const apiUrl = `https://router.huggingface.co/hf-inference/models/${huggingFaceModel}`;

        console.log('Отправка запроса к Hugging Face:', {
            model: huggingFaceModel,
            promptLength: prompt.length,
        });

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${huggingFaceApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    guidance_scale: 7.5,
                    num_inference_steps: 50,
                    width: 512,
                    height: 512,
                },
            }),
        });

        console.log('Ответ от Hugging Face:', {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
        });

        // Проверяем Content-Type ответа
        const contentType = response.headers.get('content-type') || '';

        if (!response.ok) {
            let errorText = '';
            let errorMessage = 'Ошибка при генерации изображения';

            try {
                errorText = await response.text();
                console.error('Ошибка от Hugging Face API:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText: errorText.substring(0, 500), // Ограничиваем длину для логов
                });
                if (errorText) {
                    try {
                        const errorData = JSON.parse(errorText);
                        errorMessage =
                            errorData.error ||
                            errorData.message ||
                            errorData.details ||
                            Array.isArray(errorData) && errorData[0]?.error
                                ? errorData[0].error
                                : errorMessage;
                    } catch {
                        errorMessage = errorText || response.statusText || errorMessage;
                    }
                }
            } catch (parseError) {
                console.error('Ошибка парсинга ответа об ошибке:', parseError);
                errorMessage = response.statusText || errorMessage;
            }

            // Если модель еще загружается, возвращаем специальную ошибку
            if (response.status === 503) {
                return NextResponse.json(
                    {
                        error:
                            'Модель загружается. Попробуйте через несколько секунд.',
                    },
                    { status: 503 }
                );
            }

            return NextResponse.json(
                { error: errorMessage },
                { status: response.status }
            );
        }

        // Проверяем, что ответ действительно изображение
        if (!contentType.includes('image/')) {
            console.warn('Получен неожиданный Content-Type:', contentType);
            const errorText = await response.text();
            let errorMessage = 'Ожидалось изображение, но получен другой формат';

            try {
                const errorData = JSON.parse(errorText);
                errorMessage =
                    errorData.error ||
                    errorData.message ||
                    (Array.isArray(errorData) && errorData[0]?.error
                        ? errorData[0].error
                        : null) ||
                    errorMessage;
            } catch {
                // Если не JSON, используем текст как есть
                if (errorText) {
                    errorMessage = errorText.substring(0, 500); // Ограничиваем длину
                }
            }

            console.error('Ошибка: получен неверный формат ответа:', errorMessage);
            return NextResponse.json(
                { error: errorMessage },
                { status: 500 }
            );
        }

        // Получаем изображение как blob
        const imageBlob = await response.blob();
        console.log('Изображение успешно получено:', {
            size: imageBlob.size,
            type: imageBlob.type,
        });

        // Конвертируем blob в base64
        const arrayBuffer = await imageBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');
        console.log('Изображение конвертировано в base64, длина:', base64Image.length);

        // Определяем MIME тип
        const mimeType =
            imageBlob.type || 'image/png'; // По умолчанию PNG

        return NextResponse.json(
            {
                image: `data:${mimeType};base64,${base64Image}`,
                prompt: prompt,
            },
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
            }
        );
    } catch (error) {
        console.error('Ошибка генерации изображения:', error);
        const errorMessage =
            error instanceof Error
                ? error.message
                : typeof error === 'string'
                ? error
                : 'Произошла ошибка при генерации изображения';
        return NextResponse.json(
            {
                error: errorMessage,
            },
            { status: 500 }
        );
    }
}

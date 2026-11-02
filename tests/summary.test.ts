import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextRequest } from 'next/server';
import { POST } from '../app/api/summarize/route';

const cases = [
    { length: 'short', expected: /одном абзаце/ },
    { length: 'normal', expected: /2-3 абзацах/ },
    { length: 'detailed', expected: /4-6 абзацах/ },
    { length: undefined, expected: /2-3 абзацах/ },
];

for (const { length, expected } of cases) {
    test(`Summary API uses the requested length: ${length ?? 'default'}`, async (t) => {
        const originalKey = process.env.PERPLEXITY_API_KEY;
        process.env.PERPLEXITY_API_KEY = 'test-key';
        t.after(() => {
            if (originalKey === undefined) delete process.env.PERPLEXITY_API_KEY;
            else process.env.PERPLEXITY_API_KEY = originalKey;
        });

        const calls: Array<{ messages: Array<{ role: string; content: string }> }> = [];
        t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
            calls.push(JSON.parse(init.body as string));
            return Response.json({ choices: [{ message: { content: 'Тестовое резюме' } }] });
        });

        const response = await POST(new NextRequest('http://localhost/api/summarize', {
            method: 'POST',
            body: JSON.stringify({ title: 'Article', content: 'Article text', summaryLength: length }),
        }));

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { summary: 'Тестовое резюме' });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].messages[0].role, 'system');
        assert.match(calls[0].messages[0].content, expected);
        assert.match(calls[0].messages[1].content, /Article text/);
    });
}

for (const length of ['unsupported', null, 42]) {
    test(`Summary API rejects invalid length: ${JSON.stringify(length)}`, async (t) => {
        const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
            throw new Error('Invalid requests must not reach the AI provider');
        });
        const response = await POST(new NextRequest('http://localhost/api/summarize', {
            method: 'POST',
            body: JSON.stringify({ content: 'Article text', summaryLength: length }),
        }));

        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), { error: 'Недопустимая длина резюме' });
        assert.equal(fetchMock.mock.callCount(), 0);
    });
}

import { OpenAiCompatibleProvider } from '../../../src/llm/openai-compatible.provider';
import { GeminiProvider } from '../../../src/llm/gemini.provider';
import { EmptyAiAnswerError } from '../../../src/llm/errors';
import { ServiceUnavailableException } from '@nestjs/common';

function mockFetch(body: string, ok = true, status = 200) {
  return jest.fn().mockResolvedValue({
    ok,
    status,
    text: async () => body,
  });
}

describe('Provider level validation', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('OpenAiCompatibleProvider returns valid content', async () => {
    process.env.DEEPSEEK_API_KEY = 'x';
    process.env.DEEPSEEK_BASE_URL = 'https://api.test';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';

    const provider = new OpenAiCompatibleProvider();
    (global as any).fetch = mockFetch(JSON.stringify({ choices: [{ message: { content: ' hello ' } }] }));

    const res = await provider.generateAnswer({ question: 'q', context: '', systemPrompt: '' });
    expect(res.answer).toBe('hello');
  });

  it('OpenAiCompatibleProvider throws ServiceUnavailableException for empty content even with reasoning_content', async () => {
    process.env.DEEPSEEK_API_KEY = 'x';
    process.env.DEEPSEEK_BASE_URL = 'https://api.test';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';

    const provider = new OpenAiCompatibleProvider();
    (global as any).fetch = mockFetch(JSON.stringify({ choices: [{ message: { content: '', reasoning_content: 'internal' } }] }));

    await expect(provider.generateAnswer({ question: 'q', context: '', systemPrompt: '' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('OpenAiCompatibleProvider throws ServiceUnavailableException for invalid JSON', async () => {
    process.env.DEEPSEEK_API_KEY = 'x';
    process.env.DEEPSEEK_BASE_URL = 'https://api.test';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';

    const provider = new OpenAiCompatibleProvider();
    (global as any).fetch = mockFetch('not json');

    await expect(provider.generateAnswer({ question: 'q', context: '', systemPrompt: '' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('GeminiProvider returns ServiceUnavailableException when API indicates unsupported location', async () => {
    process.env.GEMINI_API_KEY = 'x';
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';

    const provider = new GeminiProvider();
    const body = JSON.stringify({ error: { message: 'location is not supported', status: 'FAILED_PRECONDITION' } });
    (global as any).fetch = mockFetch(body, false, 400);

    await expect(provider.generateAnswer({ question: 'q', context: '', systemPrompt: '' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('GeminiProvider treats malformed JSON as failure', async () => {
    process.env.GEMINI_API_KEY = 'x';
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';

    const provider = new GeminiProvider();
    (global as any).fetch = mockFetch('not json');

    await expect(provider.generateAnswer({ question: 'q', context: '', systemPrompt: '' })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('OpenAiCompatibleProvider empty/malformed triggers failure (simulated by unexpected shape)', async () => {
    process.env.DEEPSEEK_API_KEY = 'x';
    process.env.DEEPSEEK_BASE_URL = 'https://api.test';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';

    const provider = new OpenAiCompatibleProvider();
    // Simulate provider returning unexpected shape -> empty content
    (global as any).fetch = mockFetch(JSON.stringify({ foo: 'bar' }));

    await expect(provider.generateAnswer({ question: 'q', context: '', systemPrompt: '' })).rejects.toBeInstanceOf(Error);
  });
});

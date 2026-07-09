import { LlmService } from '../../../src/llm/llm.service';

describe('LlmService fallback chain', () => {
  it('falls back through providers to local generation', async () => {
    process.env.GEMINI_API_KEY = 'x';
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';
    process.env.DEEPSEEK_API_KEY = 'x';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';
    process.env.OPENAI_API_KEY = 'x';
    process.env.OPENAI_MODEL = 'gpt-4o-mini';

    const failingProvider = { generateAnswer: jest.fn().mockRejectedValue(new Error('fail')) } as any;
    const emptyAnswerProvider = { generateAnswer: jest.fn().mockRejectedValue({ name: 'EmptyAiAnswerError' }) } as any;
    const localProvider = { generateAnswer: jest.fn().mockResolvedValue({ answer: 'ok' }) } as any;

    const service = new LlmService(failingProvider, emptyAnswerProvider, localProvider);
    const result = await service.generateAnswer({ question: 'Q', context: 'контекст: надо купить молоко', systemPrompt: 'sys' });
    expect(result.answer).toBe('ok');
  });
});

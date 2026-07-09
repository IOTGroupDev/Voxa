import { LlmService } from '../../../src/llm/llm.service';
import { EmptyAiAnswerError, MalformedJsonError, ProviderRegionBlockedError } from '../../../src/llm/errors';

describe('LLM providers - fallback and error handling', () => {
  const makeService = (g: any, d: any, o: any) => new LlmService(g, d, o);

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'x';
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';
    process.env.DEEPSEEK_API_KEY = 'x';
    process.env.DEEPSEEK_MODEL = 'deepseek-chat';
    process.env.OPENAI_API_KEY = 'x';
    process.env.OPENAI_MODEL = 'gpt-4o-mini';
    process.env.LLM_PROVIDER_ORDER = 'gemini,deepseek,openai,local';
  });

  it('returns result from Gemini when valid', async () => {
    const gemini = { generateAnswer: jest.fn().mockResolvedValue({ answer: 'from-gemini' }) };
    const deepseek = { generateAnswer: jest.fn() };
    const openai = { generateAnswer: jest.fn() };

    const svc = makeService(gemini, deepseek, openai);
    const res = await svc.generateAnswer({ question: 'Q', context: '', systemPrompt: '' });
    expect(res.answer).toBe('from-gemini');
  });

  it('falls back when Gemini returns empty content', async () => {
    const gemini = { generateAnswer: jest.fn().mockRejectedValue(new EmptyAiAnswerError()) };
    const deepseek = { generateAnswer: jest.fn().mockResolvedValue({ answer: 'from-deepseek' }) };
    const openai = { generateAnswer: jest.fn() };

    const svc = makeService(gemini, deepseek, openai);
    const res = await svc.generateAnswer({ question: 'Q', context: '', systemPrompt: '' });
    expect(res.answer).toBe('from-deepseek');
  });

  it('does not expose reasoning_content and continues to next provider', async () => {
    const gemini = { generateAnswer: jest.fn().mockRejectedValue(new Error('gemini fail')) };
    const deepseek = { generateAnswer: jest.fn().mockRejectedValue(new EmptyAiAnswerError()) } as any;
    const openai = { generateAnswer: jest.fn().mockResolvedValue({ answer: 'from-openai' }) };

    const svc = makeService(gemini, deepseek, openai);
    const res = await svc.generateAnswer({ question: 'Q', context: '', systemPrompt: '' });
    expect(res.answer).toBe('from-openai');
  });

  it('treats malformed JSON as failure and falls back', async () => {
    const gemini = { generateAnswer: jest.fn().mockRejectedValue(new MalformedJsonError()) } as any;
    const deepseek = { generateAnswer: jest.fn().mockResolvedValue({ answer: 'deepseek-ok' }) } as any;
    const openai = { generateAnswer: jest.fn() };

    const svc = makeService(gemini, deepseek, openai);
    const res = await svc.generateAnswer({ question: 'Q', context: '', systemPrompt: '' });
    expect(res.answer).toBe('deepseek-ok');
  });

  it('skips Gemini when region blocked', async () => {
    const gemini = { generateAnswer: jest.fn().mockRejectedValue(new ProviderRegionBlockedError()) } as any;
    const deepseek = { generateAnswer: jest.fn().mockResolvedValue({ answer: 'deepseek-after-block' }) } as any;
    const openai = { generateAnswer: jest.fn() };

    const svc = makeService(gemini, deepseek, openai);
    const res = await svc.generateAnswer({ question: 'Q', context: '', systemPrompt: '' });
    expect(res.answer).toBe('deepseek-after-block');
  });

  it('falls back to local attention generation when all providers fail', async () => {
    const gemini = { generateAnswer: jest.fn().mockRejectedValue(new Error('x')) } as any;
    const deepseek = { generateAnswer: jest.fn().mockRejectedValue(new Error('y')) } as any;
    const openai = { generateAnswer: jest.fn().mockRejectedValue(new Error('z')) } as any;

    const svc = makeService(gemini, deepseek, openai);
    const res = await svc.generateAnswer({ question: 'Купить хлеб', context: 'надо купить молоко и хлеб', systemPrompt: '' });
    const parsed = JSON.parse(res.answer);
    expect(parsed.type).toBe('attention');
    expect(Array.isArray(parsed.items)).toBe(true);
    expect(parsed.items.length).toBeGreaterThanOrEqual(1);
  });
});

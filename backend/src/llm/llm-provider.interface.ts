export interface GenerateAnswerInput {
  question: string;
  context: string;
  systemPrompt: string;
}

export interface GenerateAnswerResult {
  answer: string;
}

export interface LlmProvider {
  generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult>;
}

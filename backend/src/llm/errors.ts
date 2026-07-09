export class ProviderRegionBlockedError extends Error {
  constructor(message?: string) {
    super(message ?? 'Provider region blocked');
    this.name = 'ProviderRegionBlockedError';
  }
}

export class EmptyAiAnswerError extends Error {
  constructor(message?: string) {
    super(message ?? 'Provider returned empty content');
    this.name = 'EmptyAiAnswerError';
  }
}

export class MalformedJsonError extends Error {
  constructor(message?: string) {
    super(message ?? 'Provider returned malformed JSON');
    this.name = 'MalformedJsonError';
  }
}

export class ProviderResponseError extends Error {
  constructor(message?: string) {
    super(message ?? 'Provider returned an error response');
    this.name = 'ProviderResponseError';
  }

}

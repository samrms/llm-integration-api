export abstract class AppError extends Error {
  public abstract readonly code: string;
  public readonly statusCode: number;
  public readonly requestId?: string;

  protected constructor(
    message: string,
    statusCode: number,
    options?: { requestId?: string; cause?: Error },
  ) {
    super(message, { cause: options?.cause });
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.requestId = options?.requestId;
  }

  public toJSON(): {
    error: { code: string; message: string; requestId?: string };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.requestId ? { requestId: this.requestId } : {}),
      },
    };
  }
}

export class ValidationError extends AppError {
  public readonly code = "VALIDATION_ERROR" as const;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    options?: { requestId?: string; details?: Record<string, unknown> },
  ) {
    super(message, 400, { requestId: options?.requestId });
    this.details = options?.details;
  }
}

export class AuthenticationError extends AppError {
  public readonly code = "AUTHENTICATION_ERROR" as const;

  constructor(message = "Authentication required", options?: { requestId?: string }) {
    super(message, 401, { requestId: options?.requestId });
  }
}

export class AuthorizationError extends AppError {
  public readonly code = "AUTHORIZATION_ERROR" as const;

  constructor(
    message = "Insufficient permissions",
    options?: { requestId?: string },
  ) {
    super(message, 403, { requestId: options?.requestId });
  }
}

export class NotFoundError extends AppError {
  public readonly code = "NOT_FOUND" as const;

  constructor(resource: string, options?: { requestId?: string }) {
    super(`${resource} not found`, 404, { requestId: options?.requestId });
  }
}

export class ConflictError extends AppError {
  public readonly code = "CONFLICT" as const;

  constructor(message: string, options?: { requestId?: string }) {
    super(message, 409, { requestId: options?.requestId });
  }
}

export class RateLimitError extends AppError {
  public readonly code = "RATE_LIMIT_EXCEEDED" as const;
  public readonly retryAfter: number;

  constructor(retryAfter: number, options?: { requestId?: string }) {
    super("Rate limit exceeded", 429, { requestId: options?.requestId });
    this.retryAfter = retryAfter;
  }
}

export class QuotaExceededError extends AppError {
  public readonly code = "QUOTA_EXCEEDED" as const;

  constructor(message = "Usage quota exceeded", options?: { requestId?: string }) {
    super(message, 429, { requestId: options?.requestId });
  }
}

export abstract class LLMError extends AppError {
  public abstract readonly llmCode: string;
  public readonly provider: string;

  protected constructor(
    message: string,
    statusCode: number,
    provider: string,
    options?: { requestId?: string },
  ) {
    super(message, statusCode, { requestId: options?.requestId });
    this.provider = provider;
  }
}

export class LLMTimeoutError extends LLMError {
  public readonly code = "LLM_TIMEOUT" as const;
  public readonly llmCode = "TIMEOUT" as const;

  constructor(provider: string, options?: { requestId?: string }) {
    super(`Request to ${provider} timed out`, 504, provider, options);
  }
}

export class LLMRateLimitError extends LLMError {
  public readonly code = "LLM_RATE_LIMIT" as const;
  public readonly llmCode = "RATE_LIMITED" as const;
  public readonly retryAfter?: number;

  constructor(
    provider: string,
    retryAfter?: number,
    options?: { requestId?: string },
  ) {
    super(`Rate limited by ${provider}`, 429, provider, options);
    this.retryAfter = retryAfter;
  }
}

export class LLMUnavailableError extends LLMError {
  public readonly code = "LLM_PROVIDER_UNAVAILABLE" as const;
  public readonly llmCode = "UNAVAILABLE" as const;

  constructor(provider: string, options?: { requestId?: string }) {
    super(`Provider ${provider} is temporarily unavailable`, 502, provider, options);
  }
}

export class LLMInvalidRequestError extends LLMError {
  public readonly code = "LLM_INVALID_REQUEST" as const;
  public readonly llmCode = "INVALID_REQUEST" as const;

  constructor(
    provider: string,
    message: string,
    options?: { requestId?: string },
  ) {
    super(`Invalid request to ${provider}: ${message}`, 400, provider, options);
  }
}

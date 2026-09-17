import { describe, it, expect } from 'bun:test'
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  QuotaExceededError,
  LLMTimeoutError,
  LLMRateLimitError,
  LLMUnavailableError,
  LLMInvalidRequestError,
} from '../../../../src/domain/errors/AppError.js'

describe('AppError hierarchy', () => {
  describe('ValidationError', () => {
    it('has statusCode 400 and code VALIDATION_ERROR', () => {
      const err = new ValidationError('Invalid input')
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('VALIDATION_ERROR')
      expect(err.message).toBe('Invalid input')
    })

    it('includes details when provided', () => {
      const err = new ValidationError('Invalid', {
        details: { field: 'email' },
      })
      expect(err.details).toEqual({ field: 'email' })
    })

    it('toJSON returns proper format', () => {
      const err = new ValidationError('Bad request')
      const json = err.toJSON()
      expect(json).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Bad request',
        },
      })
    })

    it('propagates requestId', () => {
      const err = new ValidationError('Bad', { requestId: 'req-1' })
      expect(err.requestId).toBe('req-1')
      const json = err.toJSON()
      expect(json.error.requestId).toBe('req-1')
    })
  })

  describe('AuthenticationError', () => {
    it('has statusCode 401 and code AUTHENTICATION_ERROR', () => {
      const err = new AuthenticationError()
      expect(err.statusCode).toBe(401)
      expect(err.code).toBe('AUTHENTICATION_ERROR')
      expect(err.message).toBe('Authentication required')
    })

    it('accepts custom message', () => {
      const err = new AuthenticationError('Invalid credentials')
      expect(err.message).toBe('Invalid credentials')
    })

    it('toJSON returns proper format', () => {
      const err = new AuthenticationError('Unauth')
      const json = err.toJSON()
      expect(json.error.code).toBe('AUTHENTICATION_ERROR')
      expect(json.error.message).toBe('Unauth')
    })
  })

  describe('AuthorizationError', () => {
    it('has statusCode 403 and code AUTHORIZATION_ERROR', () => {
      const err = new AuthorizationError()
      expect(err.statusCode).toBe(403)
      expect(err.code).toBe('AUTHORIZATION_ERROR')
      expect(err.message).toBe('Insufficient permissions')
    })

    it('accepts custom message', () => {
      const err = new AuthorizationError('Cannot access resource')
      expect(err.message).toBe('Cannot access resource')
    })
  })

  describe('NotFoundError', () => {
    it('has statusCode 404 and code NOT_FOUND', () => {
      const err = new NotFoundError('User')
      expect(err.statusCode).toBe(404)
      expect(err.code).toBe('NOT_FOUND')
      expect(err.message).toBe('User not found')
    })

    it('formats resource name into message', () => {
      expect(new NotFoundError('Conversation').message).toBe(
        'Conversation not found',
      )
      expect(new NotFoundError('Model "gpt-5"').message).toBe(
        'Model "gpt-5" not found',
      )
    })
  })

  describe('ConflictError', () => {
    it('has statusCode 409 and code CONFLICT', () => {
      const err = new ConflictError('Email already exists')
      expect(err.statusCode).toBe(409)
      expect(err.code).toBe('CONFLICT')
      expect(err.message).toBe('Email already exists')
    })
  })

  describe('RateLimitError', () => {
    it('has statusCode 429 and code RATE_LIMIT_EXCEEDED', () => {
      const err = new RateLimitError(60)
      expect(err.statusCode).toBe(429)
      expect(err.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(err.retryAfter).toBe(60)
    })

    it('has correct default message', () => {
      const err = new RateLimitError(30)
      expect(err.message).toBe('Rate limit exceeded')
    })
  })

  describe('QuotaExceededError', () => {
    it('has statusCode 429 and code QUOTA_EXCEEDED', () => {
      const err = new QuotaExceededError()
      expect(err.statusCode).toBe(429)
      expect(err.code).toBe('QUOTA_EXCEEDED')
      expect(err.message).toBe('Usage quota exceeded')
    })

    it('accepts custom message', () => {
      const err = new QuotaExceededError('Monthly limit reached')
      expect(err.message).toBe('Monthly limit reached')
    })
  })

  describe('Request ID propagation', () => {
    it('propagates requestId through toJSON for any error', () => {
      const errors = [
        new ValidationError('v', { requestId: 'r1' }),
        new AuthenticationError('a', { requestId: 'r2' }),
        new AuthorizationError('z', { requestId: 'r3' }),
        new NotFoundError('N', { requestId: 'r4' }),
        new ConflictError('c', { requestId: 'r5' }),
        new RateLimitError(10, { requestId: 'r6' }),
        new QuotaExceededError('q', { requestId: 'r7' }),
      ]

      errors.forEach((err, i) => {
        expect(err.requestId).toBe(`r${i + 1}`)
        expect(err.toJSON().error.requestId).toBe(`r${i + 1}`)
      })
    })

    it('omits requestId from JSON when not provided', () => {
      const err = new ValidationError('no id')
      const json = err.toJSON()
      expect(json.error.requestId).toBeUndefined()
    })
  })

  describe('Error inheritance', () => {
    it('all errors are instances of Error', () => {
      const errors = [
        new ValidationError('v'),
        new AuthenticationError(),
        new AuthorizationError(),
        new NotFoundError('X'),
        new ConflictError('c'),
        new RateLimitError(1),
        new QuotaExceededError(),
      ]

      for (const err of errors) {
        expect(err).toBeInstanceOf(Error)
        expect(err.name).toBe(err.constructor.name)
      }
    })
  })
})

describe('LLMError hierarchy', () => {
  describe('LLMTimeoutError', () => {
    it('has statusCode 504, code LLM_TIMEOUT, and provider', () => {
      const err = new LLMTimeoutError('openai')
      expect(err.statusCode).toBe(504)
      expect(err.code).toBe('LLM_TIMEOUT')
      expect(err.llmCode).toBe('TIMEOUT')
      expect(err.provider).toBe('openai')
      expect(err.message).toBe('Request to openai timed out')
    })

    it('is instance of Error and LLMError', () => {
      const err = new LLMTimeoutError('anthropic')
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('LLMTimeoutError')
    })

    it('propagates requestId', () => {
      const err = new LLMTimeoutError('openai', { requestId: 'req-abc' })
      expect(err.requestId).toBe('req-abc')
      expect(err.toJSON().error.requestId).toBe('req-abc')
    })
  })

  describe('LLMRateLimitError', () => {
    it('has statusCode 429 and code LLM_RATE_LIMIT', () => {
      const err = new LLMRateLimitError('openai', 30)
      expect(err.statusCode).toBe(429)
      expect(err.code).toBe('LLM_RATE_LIMIT')
      expect(err.llmCode).toBe('RATE_LIMITED')
      expect(err.provider).toBe('openai')
      expect(err.retryAfter).toBe(30)
    })

    it('works without retryAfter', () => {
      const err = new LLMRateLimitError('anthropic')
      expect(err.retryAfter).toBeUndefined()
      expect(err.message).toBe('Rate limited by anthropic')
    })
  })

  describe('LLMUnavailableError', () => {
    it('has statusCode 502 and code LLM_PROVIDER_UNAVAILABLE', () => {
      const err = new LLMUnavailableError('openai')
      expect(err.statusCode).toBe(502)
      expect(err.code).toBe('LLM_PROVIDER_UNAVAILABLE')
      expect(err.llmCode).toBe('UNAVAILABLE')
      expect(err.provider).toBe('openai')
      expect(err.message).toBe('Provider openai is temporarily unavailable')
    })
  })

  describe('LLMInvalidRequestError', () => {
    it('has statusCode 400 and code LLM_INVALID_REQUEST', () => {
      const err = new LLMInvalidRequestError('openai', 'model not found')
      expect(err.statusCode).toBe(400)
      expect(err.code).toBe('LLM_INVALID_REQUEST')
      expect(err.llmCode).toBe('INVALID_REQUEST')
      expect(err.provider).toBe('openai')
      expect(err.message).toBe('Invalid request to openai: model not found')
    })
  })

  describe('LLMError toJSON', () => {
    it('includes provider in serialized form via standard fields', () => {
      const err = new LLMTimeoutError('openai', { requestId: 'r1' })
      const json = err.toJSON()
      expect(json.error.code).toBe('LLM_TIMEOUT')
      expect(json.error.message).toBe('Request to openai timed out')
      expect(json.error.requestId).toBe('r1')
      // provider is a direct field, not in toJSON output
      expect(err.provider).toBe('openai')
    })
  })
})

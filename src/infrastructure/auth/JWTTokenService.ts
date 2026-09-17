import { randomUUID } from 'node:crypto'
import { createHash } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import type {
  TokenService,
  TokenPayload,
} from '../../domain/ports/TokenService.js'

export interface JWTTokenServiceOptions {
  jwtSecret: string
  jwtExpiresIn: string
  issuer?: string
  audience?: string
}

export class JWTTokenService implements TokenService {
  private readonly secretKey: Uint8Array
  private readonly expiresInSeconds: number
  private readonly issuer: string | undefined
  private readonly audience: string | undefined

  constructor(options: JWTTokenServiceOptions) {
    this.secretKey = new TextEncoder().encode(options.jwtSecret)
    this.expiresInSeconds = parseDuration(options.jwtExpiresIn)
    this.issuer = options.issuer
    this.audience = options.audience
  }

  async generateAccessToken(payload: {
    sub: string
    email: string
  }): Promise<string> {
    const now = Math.floor(Date.now() / 1000)

    let jwt = new SignJWT({
      sub: payload.sub,
      email: payload.email,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(`${this.expiresInSeconds}s`)

    if (this.issuer) {
      jwt = jwt.setIssuer(this.issuer)
    }
    if (this.audience) {
      jwt = jwt.setAudience(this.audience)
    }

    return jwt.sign(this.secretKey)
  }

  async generateRefreshToken(): Promise<string> {
    return randomUUID()
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const { payload } = await jwtVerify(token, this.secretKey, {
      issuer: this.issuer,
      audience: this.audience,
    })

    return {
      sub: payload.sub as string,
      email: (payload.email as string) ?? '',
      iat: payload.iat as number,
      exp: payload.exp as number,
      iss: payload.iss as string | undefined,
      aud: payload.aud as string | undefined,
    }
  }

  async hashToken(token: string): Promise<string> {
    return createHash('sha256').update(token).digest('hex')
  }

  generateId(): string {
    return randomUUID()
  }
}

/**
 * Parse a simple duration string like "15m", "7d", "3600s" into seconds.
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/)
  if (!match) {
    // Try to parse as a raw number (seconds)
    const numeric = Number.parseInt(duration, 10)
    if (!Number.isNaN(numeric) && numeric > 0) {
      return numeric
    }
    throw new Error(
      `Invalid duration format: "${duration}". Use "Ns", "Nm", "Nh", or "Nd".`,
    )
  }

  const value = Number.parseInt(match[1]!, 10)
  const unit = match[2]

  switch (unit) {
    case 's':
      return value
    case 'm':
      return value * 60
    case 'h':
      return value * 3600
    case 'd':
      return value * 86400
    default:
      throw new Error(`Unknown duration unit: "${unit}"`)
  }
}

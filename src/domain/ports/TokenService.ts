export interface TokenPayload {
  sub: string
  email: string
  iat: number
  exp: number
  iss?: string
  aud?: string
}

export interface TokenService {
  generateAccessToken(payload: { sub: string; email: string }): Promise<string>
  generateRefreshToken(): Promise<string>
  verifyAccessToken(token: string): Promise<TokenPayload>
  hashToken(token: string): Promise<string>
  generateId(): string
}

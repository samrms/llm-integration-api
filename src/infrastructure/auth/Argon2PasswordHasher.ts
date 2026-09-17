import argon2 from 'argon2'
import type { PasswordHasher } from '../../domain/ports/PasswordHasher.js'

export interface Argon2Options {
  timeCost?: number
  memoryCost?: number
  parallelism?: number
}

export class Argon2PasswordHasher implements PasswordHasher {
  private readonly options: Argon2Options

  constructor(options?: Argon2Options) {
    this.options = {
      timeCost: options?.timeCost ?? 3,
      memoryCost: options?.memoryCost ?? 65536,
      parallelism: options?.parallelism ?? 4,
    }
  }

  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      timeCost: this.options.timeCost,
      memoryCost: this.options.memoryCost,
      parallelism: this.options.parallelism,
      type: argon2.argon2id,
    })
  }

  async verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password)
  }
}

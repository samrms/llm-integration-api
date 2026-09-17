import type { UserRepository } from '../../domain/ports/UserRepository.js'
import type { OrganizationRepository } from '../../domain/ports/OrganizationRepository.js'
import type { OrganizationMemberRepository } from '../../domain/ports/OrganizationMemberRepository.js'
import type { PasswordHasher } from '../../domain/ports/PasswordHasher.js'
import { User, UserRole } from '../../domain/entities/User.js'
import { Organization } from '../../domain/entities/Organization.js'
import { OrganizationMember } from '../../domain/entities/OrganizationMember.js'
import { ConflictError, ValidationError } from '../../domain/errors/AppError.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface SignupInput {
  email: string
  password: string
  name?: string
}

export interface SignupOutput {
  user: User
  organization: Organization
  membership: OrganizationMember
}

export class SignupUseCase {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly orgRepo: OrganizationRepository,
    private readonly memberRepo: OrganizationMemberRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: SignupInput): Promise<SignupOutput> {
    const email = input.email.toLowerCase().trim()

    if (!email || email.length === 0) {
      throw new ValidationError('Email is required')
    }

    if (!EMAIL_REGEX.test(email)) {
      throw new ValidationError('Invalid email format')
    }

    if (!input.password || input.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long')
    }

    const existing = await this.userRepo.findByEmail(email)
    if (existing) {
      throw new ConflictError('A user with this email already exists')
    }

    const passwordHash = await this.hasher.hash(input.password)

    // NOTE: These three writes should ideally be in a transaction.
    // The repositories do not yet support transactions; for now they are sequential.
    const user = await this.userRepo.create({
      email,
      passwordHash,
      name: input.name?.trim(),
    })

    const org = await this.orgRepo.create({
      name: `${user.name ?? user.email}'s Organization`,
      ownerId: user.id,
    })

    const membership = await this.memberRepo.add({
      organizationId: org.id,
      userId: user.id,
      role: UserRole.OWNER,
    })

    return { user, organization: org, membership }
  }
}

import { loadConfig, type Config } from '../config/Config.js'
import { PostgreSQLConnection } from '../infrastructure/database/PostgreSQLConnection.js'
import {
  RedisConnection,
  RedisCacheService,
} from '../infrastructure/redis/RedisClient.js'
import { JWTTokenService } from '../infrastructure/auth/JWTTokenService.js'
import { Argon2PasswordHasher } from '../infrastructure/auth/Argon2PasswordHasher.js'
import { OpenAIProvider } from '../infrastructure/llm/OpenAIProvider.js'
import { AnthropicProvider } from '../infrastructure/llm/AnthropicProvider.js'

import { DrizzleUserRepository } from '../infrastructure/repositories/DrizzleUserRepository.js'
import { DrizzleOrganizationRepository } from '../infrastructure/repositories/DrizzleOrganizationRepository.js'
import { DrizzleOrganizationMemberRepository } from '../infrastructure/repositories/DrizzleOrganizationMemberRepository.js'
import { DrizzleRefreshTokenRepository } from '../infrastructure/repositories/DrizzleRefreshTokenRepository.js'
import { DrizzleAPIKeyRepository } from '../infrastructure/repositories/DrizzleAPIKeyRepository.js'
import { DrizzleModelRepository } from '../infrastructure/repositories/DrizzleModelRepository.js'
import { DrizzleConversationRepository } from '../infrastructure/repositories/DrizzleConversationRepository.js'
import { DrizzleMessageRepository } from '../infrastructure/repositories/DrizzleMessageRepository.js'
import { DrizzleLLMRequestRepository } from '../infrastructure/repositories/DrizzleLLMRequestRepository.js'
import { DrizzleIdempotencyRepository } from '../infrastructure/repositories/DrizzleIdempotencyRepository.js'

import { SignupUseCase } from '../application/auth/SignupUseCase.js'
import { SigninUseCase } from '../application/auth/SigninUseCase.js'
import { RefreshTokenUseCase } from '../application/auth/RefreshTokenUseCase.js'
import { LogoutUseCase } from '../application/auth/LogoutUseCase.js'
import { GetUserProfileUseCase } from '../application/auth/GetUserProfileUseCase.js'
import { CreateOrganizationUseCase } from '../application/organizations/CreateOrganizationUseCase.js'
import { ListOrganizationsUseCase } from '../application/organizations/ListOrganizationsUseCase.js'
import { AddMemberUseCase } from '../application/organizations/AddMemberUseCase.js'
import { RemoveMemberUseCase } from '../application/organizations/RemoveMemberUseCase.js'
import { CreateAPIKeyUseCase } from '../application/api-keys/CreateAPIKeyUseCase.js'
import { ListAPIKeysUseCase } from '../application/api-keys/ListAPIKeysUseCase.js'
import { RevokeAPIKeyUseCase } from '../application/api-keys/RevokeAPIKeyUseCase.js'
import { ListModelsUseCase } from '../application/models/ListModelsUseCase.js'
import { CompletionUseCase } from '../application/completions/CompletionUseCase.js'
import { StreamingCompletionUseCase } from '../application/completions/StreamingCompletionUseCase.js'
import { CreateConversationUseCase } from '../application/conversations/CreateConversationUseCase.js'
import { ListConversationsUseCase } from '../application/conversations/ListConversationsUseCase.js'
import { GetConversationUseCase } from '../application/conversations/GetConversationUseCase.js'
import { DeleteConversationUseCase } from '../application/conversations/DeleteConversationUseCase.js'
import { ListMessagesUseCase } from '../application/conversations/ListMessagesUseCase.js'
import { SendMessageUseCase } from '../application/conversations/SendMessageUseCase.js'
import { GetUsageUseCase } from '../application/usage/GetUsageUseCase.js'

import { createAuthController } from '../presentation/controllers/authController.js'
import { createOrganizationController } from '../presentation/controllers/organizationController.js'
import { createAPIKeyController } from '../presentation/controllers/apiKeyController.js'
import { createModelController } from '../presentation/controllers/modelController.js'
import { createCompletionController } from '../presentation/controllers/completionController.js'
import { createConversationController } from '../presentation/controllers/conversationController.js'
import { createUsageController } from '../presentation/controllers/usageController.js'

export interface Container {
  config: Config
  db: PostgreSQLConnection
  redis: RedisConnection
  cache: RedisCacheService
  // Repositories
  userRepo: DrizzleUserRepository
  orgRepo: DrizzleOrganizationRepository
  memberRepo: DrizzleOrganizationMemberRepository
  refreshTokenRepo: DrizzleRefreshTokenRepository
  apiKeyRepo: DrizzleAPIKeyRepository
  modelRepo: DrizzleModelRepository
  conversationRepo: DrizzleConversationRepository
  messageRepo: DrizzleMessageRepository
  llmRequestRepo: DrizzleLLMRequestRepository
  idempotencyRepo: DrizzleIdempotencyRepository
  // Services
  tokenService: JWTTokenService
  passwordHasher: Argon2PasswordHasher
  // Use Cases
  signupUseCase: SignupUseCase
  signinUseCase: SigninUseCase
  refreshTokenUseCase: RefreshTokenUseCase
  logoutUseCase: LogoutUseCase
  getUserProfileUseCase: GetUserProfileUseCase
  createOrganizationUseCase: CreateOrganizationUseCase
  listOrganizationsUseCase: ListOrganizationsUseCase
  addMemberUseCase: AddMemberUseCase
  removeMemberUseCase: RemoveMemberUseCase
  createAPIKeyUseCase: CreateAPIKeyUseCase
  listAPIKeysUseCase: ListAPIKeysUseCase
  revokeAPIKeyUseCase: RevokeAPIKeyUseCase
  listModelsUseCase: ListModelsUseCase
  completionUseCase: CompletionUseCase
  streamingCompletionUseCase: StreamingCompletionUseCase
  createConversationUseCase: CreateConversationUseCase
  listConversationsUseCase: ListConversationsUseCase
  getConversationUseCase: GetConversationUseCase
  deleteConversationUseCase: DeleteConversationUseCase
  listMessagesUseCase: ListMessagesUseCase
  sendMessageUseCase: SendMessageUseCase
  getUsageUseCase: GetUsageUseCase
  // Controllers
  authController: ReturnType<typeof createAuthController>
  organizationController: ReturnType<typeof createOrganizationController>
  apiKeyController: ReturnType<typeof createAPIKeyController>
  modelController: ReturnType<typeof createModelController>
  completionController: ReturnType<typeof createCompletionController>
  conversationController: ReturnType<typeof createConversationController>
  usageController: ReturnType<typeof createUsageController>
}

export async function createContainer(): Promise<Container> {
  const config = loadConfig()

  // Infrastructure
  const db = new PostgreSQLConnection(config.DATABASE_URL)
  await db.connect()

  const redis = new RedisConnection(config.REDIS_URL)
  await redis.connect()

  const drizzleDb = db.getDb()
  const redisClient = redis.getClient()
  const cache = new RedisCacheService(redisClient)

  // Auth services
  const tokenService = new JWTTokenService({
    jwtSecret: config.JWT_SECRET,
    jwtExpiresIn: config.JWT_EXPIRES_IN,
  })

  const passwordHasher = new Argon2PasswordHasher({
    timeCost: config.ARGON2_TIME_COST,
    memoryCost: config.ARGON2_MEMORY_COST,
    parallelism: config.ARGON2_PARALLELISM,
  })

  // Repositories
  const userRepo = new DrizzleUserRepository(drizzleDb)
  const orgRepo = new DrizzleOrganizationRepository(drizzleDb)
  const memberRepo = new DrizzleOrganizationMemberRepository(drizzleDb)
  const refreshTokenRepo = new DrizzleRefreshTokenRepository(drizzleDb)
  const apiKeyRepo = new DrizzleAPIKeyRepository(drizzleDb)
  const modelRepo = new DrizzleModelRepository(drizzleDb)
  const conversationRepo = new DrizzleConversationRepository(drizzleDb)
  const messageRepo = new DrizzleMessageRepository(drizzleDb)
  const llmRequestRepo = new DrizzleLLMRequestRepository(drizzleDb)
  const idempotencyRepo = new DrizzleIdempotencyRepository(drizzleDb)

  // LLM Providers
  const providers = []
  if (config.OPENAI_API_KEY) {
    providers.push(new OpenAIProvider({ apiKey: config.OPENAI_API_KEY }))
  }
  if (config.ANTHROPIC_API_KEY) {
    providers.push(new AnthropicProvider({ apiKey: config.ANTHROPIC_API_KEY }))
  }

  // Use Cases
  const signupUseCase = new SignupUseCase(
    userRepo,
    orgRepo,
    memberRepo,
    passwordHasher,
  )

  const signinUseCase = new SigninUseCase(
    userRepo,
    refreshTokenRepo,
    tokenService,
    passwordHasher,
    config.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  )

  const refreshTokenUseCase = new RefreshTokenUseCase(
    refreshTokenRepo,
    tokenService,
    userRepo,
    config.REFRESH_TOKEN_EXPIRES_IN_DAYS,
  )

  const logoutUseCase = new LogoutUseCase(refreshTokenRepo, tokenService)

  const getUserProfileUseCase = new GetUserProfileUseCase(userRepo)

  const createOrganizationUseCase = new CreateOrganizationUseCase(
    orgRepo,
    memberRepo,
  )

  const listOrganizationsUseCase = new ListOrganizationsUseCase(memberRepo)

  const addMemberUseCase = new AddMemberUseCase(memberRepo, userRepo, orgRepo)

  const removeMemberUseCase = new RemoveMemberUseCase(memberRepo)

  const createAPIKeyUseCase = new CreateAPIKeyUseCase(apiKeyRepo, memberRepo)

  const listAPIKeysUseCase = new ListAPIKeysUseCase(apiKeyRepo)

  const revokeAPIKeyUseCase = new RevokeAPIKeyUseCase(apiKeyRepo, memberRepo)

  const listModelsUseCase = new ListModelsUseCase(modelRepo)

  const completionUseCase = new CompletionUseCase(
    modelRepo,
    providers,
    llmRequestRepo,
    cache,
    idempotencyRepo,
    { MAX_CONCURRENT_LLM_REQUESTS: config.MAX_CONCURRENT_LLM_REQUESTS },
  )

  const streamingCompletionUseCase = new StreamingCompletionUseCase(
    modelRepo,
    providers,
    llmRequestRepo,
    cache,
    { MAX_CONCURRENT_LLM_REQUESTS: config.MAX_CONCURRENT_LLM_REQUESTS },
  )

  const createConversationUseCase = new CreateConversationUseCase(
    conversationRepo,
  )

  const listConversationsUseCase = new ListConversationsUseCase(
    conversationRepo,
  )

  const getConversationUseCase = new GetConversationUseCase(conversationRepo)

  const deleteConversationUseCase = new DeleteConversationUseCase(
    conversationRepo,
    messageRepo,
  )

  const listMessagesUseCase = new ListMessagesUseCase(messageRepo)

  const sendMessageUseCase = new SendMessageUseCase(
    conversationRepo,
    messageRepo,
    providers,
    modelRepo,
    llmRequestRepo,
  )

  const getUsageUseCase = new GetUsageUseCase(llmRequestRepo)

  // Controllers
  const authController = createAuthController({
    signupUseCase,
    signinUseCase,
    refreshTokenUseCase,
    logoutUseCase,
    getUserProfileUseCase,
  })

  const organizationController = createOrganizationController({
    createOrganizationUseCase,
    listOrganizationsUseCase,
    addMemberUseCase,
    removeMemberUseCase,
  })

  const apiKeyController = createAPIKeyController({
    createAPIKeyUseCase,
    listAPIKeysUseCase,
    revokeAPIKeyUseCase,
  })

  const modelController = createModelController({ listModelsUseCase })

  const completionController = createCompletionController({
    completionUseCase,
    streamingCompletionUseCase,
  })

  const conversationController = createConversationController({
    createConversationUseCase,
    listConversationsUseCase,
    getConversationUseCase,
    deleteConversationUseCase,
    listMessagesUseCase,
    sendMessageUseCase,
  })

  const usageController = createUsageController({ getUsageUseCase })

  return {
    config,
    db,
    redis,
    cache,
    userRepo,
    orgRepo,
    memberRepo,
    refreshTokenRepo,
    apiKeyRepo,
    modelRepo,
    conversationRepo,
    messageRepo,
    llmRequestRepo,
    idempotencyRepo,
    tokenService,
    passwordHasher,
    signupUseCase,
    signinUseCase,
    refreshTokenUseCase,
    logoutUseCase,
    getUserProfileUseCase,
    createOrganizationUseCase,
    listOrganizationsUseCase,
    addMemberUseCase,
    removeMemberUseCase,
    createAPIKeyUseCase,
    listAPIKeysUseCase,
    revokeAPIKeyUseCase,
    listModelsUseCase,
    completionUseCase,
    streamingCompletionUseCase,
    createConversationUseCase,
    listConversationsUseCase,
    getConversationUseCase,
    deleteConversationUseCase,
    listMessagesUseCase,
    sendMessageUseCase,
    getUsageUseCase,
    authController,
    organizationController,
    apiKeyController,
    modelController,
    completionController,
    conversationController,
    usageController,
  }
}

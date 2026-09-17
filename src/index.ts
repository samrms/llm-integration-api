import { createContainer } from './app/Container.js'
import { createApplication } from './app/Application.js'

async function main(): Promise<void> {
  const container = await createContainer()
  const app = createApplication(container)

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`)
    await app.stop()
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason)
  })

  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error)
    process.exit(1)
  })

  await app.start()
}

main().catch((error) => {
  console.error('Failed to start application:', error)
  process.exit(1)
})

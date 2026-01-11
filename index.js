const Fastify = require('fastify')
const fastify = Fastify({ logger: true })

const db = require('./db')

//health check
fastify.get('/health', async () => {
  return { status: 'ok' }
})

//test
fastify.get('/categories', async () => {
  return db.prepare('SELECT * FROM categories').all()
})

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' })
    console.log('API running on http://localhost:3000')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

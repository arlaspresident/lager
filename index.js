const Fastify = require('fastify')
const fastify = Fastify({ logger: true })

const cors = require('@fastify/cors')
const db = require('./db')


fastify.register(cors, {
  origin: true
})

//health check
fastify.get('/health', async () => {
  return { status: 'ok' }
})

//hämta alla kategorier
fastify.get('/categories', async () => {
  return db.prepare('SELECT * FROM categories').all()
})

//skapa ny kategori
fastify.post('/categories', async (request, reply) => {
  const { name } = request.body || {}

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return reply.code(400).send({ error: 'Namn måste vara minst 2 tecken' })
  }

  const result = db
    .prepare('INSERT INTO categories (name) VALUES (?)')
    .run(name.trim())

  return reply.code(201).send({
    id: result.lastInsertRowid,
    name: name.trim()
  })
})

//hämta en specifik kategori med id
fastify.get('/categories/:id', async (request, reply) => {
  const id = Number(request.params.id)

  if (!Number.isInteger(id)) {
    return reply.code(400).send({ error: 'Ogiltigt ID' })
  }

  const category = db
    .prepare('SELECT * FROM categories WHERE id = ?')
    .get(id)

  if (!category) {
    return reply.code(404).send({ error: 'Kategori hittades inte' })
  }

  return category
})

//uppdatera kategori
fastify.put('/categories/:id', async (request, reply) => {
  const id = Number(request.params.id)
  const { name } = request.body || {}

  if (!Number.isInteger(id)) {
    return reply.code(400).send({ error: 'Ogiltigt ID' })
  }

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return reply.code(400).send({ error: 'Namn måste vara minst 2 tecken' })
  }

  const result = db
    .prepare('UPDATE categories SET name = ? WHERE id = ?')
    .run(name.trim(), id)

  if (result.changes === 0) {
    return reply.code(404).send({ error: 'Kategori hittades inte' })
  }

  return { id, name: name.trim() }
})

//ta bort kategori
fastify.delete('/categories/:id', async (request, reply) => {
  const id = Number(request.params.id)

  if (!Number.isInteger(id)) {
    return reply.code(400).send({ error: 'Ogiltigt ID' })
  }

  const result = db
    .prepare('DELETE FROM categories WHERE id = ?')
    .run(id)

  if (result.changes === 0) {
    return reply.code(404).send({ error: 'Kategori hittades inte' })
  }

  return reply.code(204).send()
})

//startar servern
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

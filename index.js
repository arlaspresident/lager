const Fastify = require('fastify')
const fastify = Fastify({ logger: true })

const cors = require('@fastify/cors')
const db = require('./db')
const jwt = require('@fastify/jwt')
const bcrypt = require('bcrypt')



fastify.register(cors, {
  origin: true
})

fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev_secret_byta_sen'
})

fastify.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    return reply.code(401).send({ error: 'Du måste vara inloggad' })
  }
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


fastify.post('/auth/register', async (request, reply) => {
  const { email, password, role } = request.body || {}

  if (!email || !password) {
    return reply.code(400).send({ error: 'email och password krävs' })
  }

  if (typeof password !== 'string' || password.length < 6) {
    return reply.code(400).send({ error: 'lösenord måste vara minst 6 tecken' })
  }

  const normalizedEmail = String(email).trim().toLowerCase()
  const userRole = role && String(role).trim() ? String(role).trim() : 'staff'

  //kolla om användare finns
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)
  if (existing) {
    return reply.code(409).send({ error: 'Användare finns redan' })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const result = db
    .prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
    .run(normalizedEmail, passwordHash, userRole)

  return reply.code(201).send({ id: result.lastInsertRowid, email: normalizedEmail, role: userRole })
})

fastify.post('/auth/login', async (request, reply) => {
  const { email, password } = request.body || {}

  if (!email || !password) {
    return reply.code(400).send({ error: 'email och password krävs' })
  }

  const normalizedEmail = String(email).trim().toLowerCase()

  const user = db
    .prepare('SELECT id, email, password_hash, role FROM users WHERE email = ?')
    .get(normalizedEmail)

  if (!user) {
    return reply.code(401).send({ error: 'Fel email eller lösenord' })
  }

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) {
    return reply.code(401).send({ error: 'Fel email eller lösenord' })
  }

  const token = fastify.jwt.sign({ sub: user.id, email: user.email, role: user.role })

  return { token }
})

//test route för att verifiera jwt
fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request) => {
  return request.user
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

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
fastify.get('/categories', { preHandler: [fastify.authenticate] }, async () => {
  return db.prepare('SELECT * FROM categories').all()
})

//skapa ny kategori
fastify.post('/categories', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
fastify.get('/categories/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
fastify.put('/categories/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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
fastify.delete('/categories/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
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

//hämta alla produkter
fastify.get('/products', { preHandler: [fastify.authenticate] }, async () => {
  return db.prepare(`
    SELECT 
      p.id, p.sku, p.name, p.description, p.location, p.price, p.quantity, p.is_active,
      p.category_id,
      c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    ORDER BY p.id DESC
  `).all()
})

//skapa ny produkt
fastify.post('/products', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  const {
    sku,
    name,
    description = null,
    category_id = null,
    location = null,
    price = null,
    quantity = 0,
    is_active = 1
  } = request.body || {}

  //enkel validering
  if (!sku || typeof sku !== 'string') {
    return reply.code(400).send({ error: 'sku krävs' })
  }

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return reply.code(400).send({ error: 'namn måste vara minst 2 tecken' })
  }

  const qty = Number(quantity)
  if (!Number.isInteger(qty) || qty < 0) {
    return reply.code(400).send({ error: 'kvantitet måste vara ett heltal' })
  }

  const pr = price === null ? null : Number(price)
  if (pr !== null && Number.isNaN(pr)) {
    return reply.code(400).send({ error: 'pris måste vara ett nummer' })
  }

  const catId = category_id === null ? null : Number(category_id)
  if (catId !== null && !Number.isInteger(catId)) {
    return reply.code(400).send({ error: 'category_id måste vara ett heltal' })
  }

  const result = db.prepare(`
    INSERT INTO products (sku, name, description, category_id, location, price, quantity, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sku.trim(),
    name.trim(),
    description,
    catId,
    location,
    pr,
    qty,
    is_active ? 1 : 0
  )

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid)
  return reply.code(201).send(created)
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

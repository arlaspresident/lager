# Lagerhanteringssystem - Backend API

Detta projekt är en REST webbtjänst för ett lagerhanteringssystem byggt med **fastify**, **sqlite** och **jwt autentisering**.

APIt används av en vue baserad klientapp för att hantera produkter, kategorier och lagersaldo.

---

## Tekniker
- Node.js
- Fastify
- SQLite (better-sqlite3)
- JWT (JSON Web Tokens)
- bcrypt

---

## Starta projektet lokalt

1. Klona repot
2. Installera beroenden:
```bash
npm install
```
3. Skapa en .env fil
```env
JWT_SECRET=valfritt
```
4. Starta servern:
```
node index.js
```
5. Servern körs på:
http://localhost:3000

## Autentisering

APIt använder jwt för autentisering.

## Registrera användare
POST /auth/register
```json
{
  "email": "admin@carcare.se",
  "password": "test123",
  "role": "admin"
}
```
## Logga in
POST /auth/login
```json
{
  "email": "admin@carcare.se",
  "password": "test123"
}
``` 
Svar innehåller token, skicka den i headern för skyddade endpoints

## Endpoints
### Auth
- POST /auth/register
- POST /auth/login
- GET /me (skyddad)

### Categories skyddade
- GET /categories
- POST /categories
- GET /categories/:id
- PUT /categories/:id
- DELETE /categories/:id

### Products skyddade
- GET /products
- GET /products/:id
- POST /products
- PUT /products/:id
- DELETE /products/:id
- PATCH /products/:id/stock

## Lagersaldo

Justera lagersaldo via:
PATCH /products/:id/stock
```json
{"delta" : 5 }
```
delta kan va negativt men lagersaldo får inte bli under 0

## Databas

Tabeller: users, categories, products.

## Publicering

Projektet körs lokalt och demonstreras i videopresentation.
 
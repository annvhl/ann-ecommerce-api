# E-commerce Backend REST API — Phase 2
**Batman Technology — Practical Training Program**

**Student name:** ann momani

---

## Project Description

This project builds a Backend REST API using Node.js and Express.js on top
of the e-commerce database designed and populated in Phase 1 (Neon
PostgreSQL). The API exposes endpoints to manage products, categories, and
users, with full validation, correct HTTP status codes, and protection
against SQL injection through parameterized queries.

## Tech Stack

- **Node.js** + **Express.js** — REST API framework
- **pg** (node-postgres) — PostgreSQL client, using parameterized queries throughout
- **dotenv** — loads the Neon connection string from a local `.env` file
- **cors** — enables cross-origin requests (useful for testing/future frontend)
- **Neon PostgreSQL** — the database created in Phase 1
- **Postman** — used to test every endpoint (collection included)

## Project Structure

```
ecommerce-api/
├── server.js                      # App entry point
├── config/
│   └── db.js                      # PostgreSQL connection pool (reads DATABASE_URL)
├── controllers/
│   ├── productsController.js      # Business logic for /api/products
│   ├── categoriesController.js    # Business logic for /api/categories
│   └── usersController.js         # Business logic for /api/users
├── routes/
│   ├── products.js
│   ├── categories.js
│   └── users.js
├── middleware/
│   └── errorHandler.js            # Central error handler; maps Postgres error
│                                   # codes (23505, 23503, 23514, 23502, 22P02)
│                                   # to the correct HTTP status codes
├── postman_collection.json        # Full Postman collection (valid + invalid requests)
├── package.json
├── .env                           # NOT committed — holds DATABASE_URL and PORT
└── .gitignore                     # excludes node_modules/ and .env
```

## Environment Variables

Create a `.env` file in the project root (never committed to GitHub):

```
DATABASE_URL=postgresql://username:password@your-neon-host/neondb?sslmode=require
PORT=3000
```

## How to Run

```bash
npm install
node server.js
```

Server starts at `http://localhost:3000`. A quick health check is available at `GET /`.

## API Endpoints

### Products
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List products. Supports `?page=&limit=` (pagination), `?sort=price\|sku\|name\|created_at\|stock_quantity&order=asc\|desc` (sorting), `?category_id=` and `?is_active=` (filtering) |
| GET | `/api/products/:id` | Get a single product |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/:id` | Full update of a product |
| PATCH | `/api/products/:id/deactivate` | Set `is_active = false` without deleting |
| DELETE | `/api/products/:id` | Delete a product (blocked if referenced in past orders) |

### Categories
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/categories` | List all categories |
| GET | `/api/categories/:id` | Get a single category |
| POST | `/api/categories` | Create a category |
| PUT | `/api/categories/:id` | Update a category |
| DELETE | `/api/categories/:id` | Delete a category (blocked if products still reference it) |

### Users
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users` | List users (paginated). `password_hash` is never returned |
| GET | `/api/users/:id` | Get a single user |
| POST | `/api/users` | Create a user (validates required fields + email format) |
| PATCH | `/api/users/:id/status` | Activate/deactivate a user (`is_active: true/false`) |

## Status Codes Used

| Code | Meaning | Example trigger |
|---|---|---|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Missing required field, negative price, invalid email format, invalid `is_active` value |
| 404 | Not Found | Resource ID does not exist, or referenced `category_id` doesn't exist |
| 409 | Conflict | Duplicate email/SKU/category name, or delete blocked by a foreign key relationship |
| 500 | Internal Server Error | Unexpected server-side failure |

## Validation & Security Notes

- **SQL Injection protection:** every database query uses parameterized queries (`$1, $2, ...`) via the `pg` library — no string concatenation into SQL is used anywhere in the codebase.
- **Input validation:** required fields, numeric ranges (price > 0, stock ≥ 0), and email format are checked in the controllers before touching the database.
- **Referential integrity:** the API checks that a `category_id` exists before creating/updating a product, and relies on the database's foreign key constraints (from Phase 1) to block deletes that would orphan data — these are caught by `errorHandler.js` and returned as `409 Conflict` instead of a raw crash.
- **Sensitive data:** `password_hash` is excluded from every user-related response.
- **Environment variables:** the real Neon connection string lives only in `.env`, which is excluded from Git via `.gitignore`. Only `.env.example` (with placeholder values) is committed.

## Testing

All endpoints were tested using Postman. The collection (`postman_collection.json`)
includes, for every resource, both a valid request and deliberately invalid
requests to demonstrate each required status code — see `screenshots/` for
example runs, including:
- Pagination, sorting, and category filtering on `/api/products`
- 400 for missing fields, negative price, invalid email, invalid `is_active`
- 404 for nonexistent product/category/user IDs
- 409 for duplicate SKU, duplicate category name, duplicate email, and deletes blocked by foreign key relationships

## Notes / Issues Encountered

- Express 5 (used in this project) requires async route handlers to either
  use `try/catch` with `next(err)` or let native async error propagation
  handle it — all controllers here explicitly `catch` and call `next(err)`
  so errors always reach the central error handler instead of crashing the
  process.
- The database's own constraints (from Phase 1: `UNIQUE`, `CHECK`,
  `FOREIGN KEY`) are the real source of truth for data integrity — the API
  layer duplicates some of this validation (e.g. checking `category_id`
  exists before insert) purely to return clearer, faster error messages,
  but the database constraints are still what ultimately guarantee
  correctness even if a bug slipped through the API validation.

# Upravnik Platform — Backend API

REST API for a residential building management platform. Built with NestJS, PostgreSQL, Prisma, and JWT authentication.

---

## Tech Stack

- **Framework:** NestJS 11
- **Database:** PostgreSQL 16 (Docker)
- **ORM:** Prisma 7
- **Auth:** JWT (passport-jwt)
- **Realtime:** Socket.IO
- **Docs:** Swagger UI

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

---

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd upravnik-platform
npm install
```

---

## 2. Environment Setup

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/upravnik?schema=public"
JWT_SECRET="change-this-secret-in-production"
```

---

## 3. Database Setup (Docker)

### Install Docker Desktop

Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/). Once installed, make sure it is running — you should see the Docker icon in your system tray.

### Start the database

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container on port `5432`. Data is persisted in a Docker volume and survives restarts.

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start the database in the background |
| `docker compose down` | Stop the database |
| `docker compose down -v` | Stop and wipe all data |

---

## 4. Migrations & Seed

Apply the schema:

```bash
npx prisma migrate deploy
```

Seed the database with test data:

```bash
npm run seed
```

The seed prints all generated IDs and credentials to the console — keep these handy for Postman.

**Test accounts:**

| Role | Username | Password |
|------|----------|----------|
| SUPER_ADMIN | admin@upravnik.rs | Admin123! |
| UPRAVNIK | upravnik@zgrada.rs | Upravnik123! |
| BOARD_MEMBER | board@zgrada.rs | Board123! |
| RESIDENT | 1A | Resident123! |
| RESIDENT | 1B | Resident123! |
| RESIDENT | 2A | Resident123! |
| RESIDENT | 2B | Resident123! |
| RESIDENT | 3A | Resident123! |

---

## 5. Run the API

```bash
npm run start:dev
```

- API base URL: `http://localhost:3000/api`
- Swagger docs: `http://localhost:3000/api/docs`

---

## 6. DBeaver Setup

[DBeaver](https://dbeaver.io/) is a free GUI for browsing your database.

1. Download and install [DBeaver Community](https://dbeaver.io/download/)
2. Open DBeaver → **New Database Connection** → select **PostgreSQL**
3. Enter the connection details:
   - **Host:** `localhost`
   - **Port:** `5432`
   - **Database:** `upravnik`
   - **Username:** `postgres`
   - **Password:** `postgres`
4. Click **Test Connection** → should say "Connected"
5. Click **Finish**

---

## 7. Postman Setup

### Import the collection

1. Open Postman → **Import**
2. Select `postman/upravnik-platform.postman_collection.json`

### Import the environment

1. **Import** again
2. Select `postman/Upravnik Local.postman_environment.json`
3. Select **Upravnik Local** from the environment dropdown (top-right)

### Update IDs after seeding

After running `npm run seed`, copy the printed IDs into your **Upravnik Local** environment variables:

- `complexId`, `buildingId`
- `unit1A_id`, `unit1B_id`, `unit2A_id`
- `user_admin`, `user_upravnik`, `user_board`, `user_1A`, `user_1B`

Update both the **Initial Value** and **Current Value** columns for each variable.

### Authenticate

1. Open the **Auth** folder in the collection
2. Send any **Login as ...** request
3. The token saves automatically to `{{authToken}}` — all other requests use it immediately

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start in watch mode |
| `npm run start:prod` | Start compiled build |
| `npm run build` | Compile TypeScript |
| `npm run seed` | Seed the database |
| `npm run test` | Run unit tests |
| `npx prisma migrate dev` | Create and apply a new migration |
| `npx prisma migrate reset` | Wipe DB, rerun migrations, reseed |
| `npx prisma studio` | Open Prisma visual DB browser |

# Express CMS - Quick Start

A modern CMS built with Express 5, TypeScript, Prisma v7, and EJS with glassmorphism theme.

## Project Location

```
c:\project\express-cms\
```

## Setup Instructions

```bash
# 1. Navigate to project
cd c:\project\express-cms

# 2. Install dependencies
npm install

# 3. Push database schema
npx prisma db push

# 4. Seed database
npm run db:seed

# 5. Start development server
npm run dev
```

## Login Credentials

- **Email**: admin@example.com
- **Password**: admin123

## Features

- ✅ JWT Authentication with multi-device sessions
- ✅ Dynamic form generation from config
- ✅ Glassmorphism dark/light theme
- ✅ CRUD for Users, Roles, Posts, Categories, Tags
- ✅ Express 5 + TypeScript + Prisma v7

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production build |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run generate:crud ModelName` | **Auto-generate CRUD** for a model |

## Project Structure

```
express-cms/
├── prisma/              # Database schema and seed
├── src/
│   ├── app.ts           # Main Express app
│   ├── config/forms/    # Form configs for dynamic forms
│   ├── lib/             # Prisma client, auth services
│   ├── middleware/      # Auth middleware
│   ├── routes/          # Express routes
│   ├── views/           # EJS templates
│   └── public/          # Static files (CSS, JS)
└── package.json
```

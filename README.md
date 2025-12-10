# Pacman Game

A modern web-based recreation of the classic Pacman arcade game, built with React/TypeScript frontend using Phaser 3 game engine and Express/TypeScript backend.

## Features

- Classic Pacman gameplay mechanics
- Procedurally generated mazes with increasing difficulty
- Responsive pixel art graphics
- Keyboard and touch controls
- Classic sound effects
- High score system with 3-letter acronyms
- Persistent score storage with PostgreSQL

## Tech Stack

### Frontend
- React 18+ with TypeScript
- Phaser 3 game engine
- Vite for build tooling
- Axios for API communication

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM
- PostgreSQL 14+

### DevOps
- Docker & Docker Compose
- Nginx for production serving

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- npm or yarn

### Development Setup

1. Clone the repository
2. Install dependencies:

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Set up environment variables:

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your database credentials
```

4. Start the development environment with Docker:

```bash
# From the root directory
docker-compose up -d postgres

# Run database migrations
cd backend
npm run prisma:migrate

# Start backend dev server
npm run dev

# In another terminal, start frontend dev server
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:3000` and the backend at `http://localhost:3001`.

### Production Deployment

Build and run all services with Docker Compose:

```bash
docker-compose up --build
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
.
├── frontend/              # React + Phaser frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── game/         # Phaser game logic
│   │   └── services/     # API client
│   └── public/           # Static assets
├── backend/              # Express backend
│   ├── src/
│   │   ├── controllers/  # Route controllers
│   │   ├── services/     # Business logic
│   │   └── models/       # Data models
│   └── prisma/           # Database schema
└── docker-compose.yml    # Docker orchestration
```

## Development Commands

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm test` - Run tests

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## License

MIT

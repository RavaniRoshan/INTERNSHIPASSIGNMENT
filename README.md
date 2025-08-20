# Creator Portfolio Hub

A platform for creators to showcase their work through rich project pages, case studies, and media galleries, with powerful discovery and recommendation features for viewers.

## Features

- **Authentication & Roles**: Creator vs Viewer with protected creator studio
- **Rich Project Pages**: TipTap editor, image/video galleries, cover image cropping
- **Search & Discovery**: Full-text search with faceted filtering
- **Recommendations**: Similar projects and trending content
- **Analytics**: Project views, CTR, funnel analytics, retention charts

## Tech Stack

### Frontend
- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- React Query (TanStack Query)
- React Hook Form with Zod validation

### Backend
- Express.js with TypeScript
- Prisma ORM with PostgreSQL
- JWT Authentication
- BullMQ for background jobs
- Redis for caching

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (optional, for caching)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both frontend and backend directories
   - Update the database connection string and other configuration

4. Set up the database:
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

5. Start the development servers:

```bash
# Backend (from backend directory)
npm run dev

# Frontend (from frontend directory)
npm run dev
```

The frontend will be available at http://localhost:3000 and the backend API at http://localhost:3001.

## Project Structure

```
├── frontend/          # Next.js frontend application
├── backend/           # Express.js backend API
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── types/
│   └── prisma/        # Database schema and migrations
└── .kiro/             # Kiro spec files
    └── specs/
        └── creator-portfolio-hub/
```

## Development

This project follows a spec-driven development approach. See the `.kiro/specs/creator-portfolio-hub/` directory for:
- `requirements.md` - Feature requirements and user stories
- `design.md` - System architecture and technical design
- `tasks.md` - Implementation plan and task list

## License

MIT
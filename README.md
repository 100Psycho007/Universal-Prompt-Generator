# Universal IDE Prompt Generator

A production-ready Next.js 14+ application for generating optimized prompts for Universal IDE integration.

## Tech Stack

- **Framework**: Next.js 14+ with TypeScript
- **Styling**: TailwindCSS v4 + ShadCN UI Component Library
- **Database**: Supabase (PostgreSQL + Vector DB)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel
- **Code Quality**: ESLint + Prettier

## Project Structure

```
src/
├── app/              # Next.js App Router routes
├── components/       # Reusable React components
├── lib/
│   ├── api/         # API client utilities
│   ├── supabase/    # Supabase client setup
│   └── utils/       # General utility functions
├── types/           # TypeScript type definitions
├── config/          # Configuration files
├── layouts/         # Base layout components
└── public/          # Static assets
```

## Prerequisites

- Node.js 20.x or higher
- npm or yarn
- A Supabase project (free tier available at https://supabase.com)

## Getting Started

### 1. Clone and Setup

```bash
# Install dependencies
npm install
```

### 2. Environment Configuration

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Then update `.env.local` with your Supabase project details:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Type check with TypeScript
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting

## Local Development with Docker

To run Supabase locally for development:

```bash
docker-compose up -d
```

Access Supabase Studio at [http://localhost:3001](http://localhost:3001)

## Configuration Files

- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `eslint.config.mjs` - ESLint configuration
- `.prettierrc.json` - Prettier configuration
- `vercel.json` - Vercel deployment configuration

## Database Setup

1. Create a new Supabase project at https://supabase.com
2. Copy the project URL and keys to `.env.local`
3. Use Supabase Studio to create tables and set up your schema

## Deployment

### Vercel

1. Push your code to GitHub
2. Import the repository on Vercel
3. Add the environment variables in the Vercel dashboard
4. Deploy!

For detailed instructions, see [Next.js Deployment Documentation](https://nextjs.org/docs/app/building-your-application/deploying)

## Components & Layouts

### Available Layouts

- `MainLayout` - Default layout with footer
- `AuthLayout` - Centered layout for authentication pages
- `AdminLayout` - Two-column layout for admin dashboard

### ShadCN Components

ShadCN UI components are available for use. Add new components with:

```bash
npx shadcn@latest add [component-name]
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run lint` and `npm run type-check`
4. Submit a pull request

## Support

For issues and questions, please refer to:

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [ShadCN Documentation](https://ui.shadcn.com/docs)

## License

MIT

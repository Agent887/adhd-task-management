# Done365: ADHD Task Management App

A modern task management application specifically designed for individuals with ADHD, focusing on reducing cognitive load and improving executive function.

## Features

- 🧠 ADHD-optimized task management
- 🤖 AI-powered task breakdown and scheduling
- ⚡ Energy level tracking and optimization
- 🎯 Context-aware task organization
- ⏰ Smart time management
- 🔄 Executive function support

## Tech Stack

- Frontend: Next.js 14 with TypeScript
- Backend: Cloudflare Workers
- Database: Cloudflare D1 (SQLite)
- Cache: Cloudflare KV
- AI: Llama-70B via Replicate

## Development Process

This project follows a strict phase-based development approach to ensure quality and maintainability:

1. Foundation (Weeks 1-3)
2. ADHD-Optimized Features (Weeks 4-6)
3. User Experience (Weeks 7-8)
4. Polish & Launch (Weeks 9-10)

For detailed information about each phase, see [Roadmap.md](Roadmap.md).

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/done365.git
   cd done365
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Development Guidelines

1. Follow the phase-based development approach
2. Run `npm run check-build` before committing to ensure compliance
3. Create feature branches from the current phase branch
4. Submit PRs with the provided template

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run check-build` - Validate current development phase
- `npm run advance-day` - Move to next development day
- `npm run advance-week` - Move to next development week
- `npm run advance-phase` - Move to next development phase

## Contributing

1. Ensure you're working on the correct phase (check `build-lock.json`)
2. Create a feature branch from the current phase
3. Make your changes
4. Run tests and build checks
5. Submit a PR using the template

## License

MIT

## Support

For support, please open an issue on GitHub.

# Done365 User Manual

## Introduction

Done365 is an ADHD-optimized task management app designed to help users stay organized and focused. The app uses advanced AI capabilities, including the Llama-3.3-70B model, to provide personalized task management that adapts to your cognitive needs and energy levels.

## Getting Started

1. Open a web browser and navigate to http://127.0.0.1:8787/
2. Click on the "Get Started" button to begin using the app
3. Follow the prompts to create an account or log in if you already have one
4. Complete the initial setup questionnaire to customize the app to your ADHD needs

## Navigation

The app is divided into several sections:
* **Task Dashboard**: Your personalized view of tasks and priorities
* **Context Manager**: Manage and track context switching
* **Energy Tracker**: Monitor your energy levels and optimal work times
* **Task Dependencies**: View and manage task relationships
* **Analytics**: View your performance metrics and patterns
* **Settings**: Customize the app's behavior to your needs

## Task Management

### Basic Task Operations
* Click "Add Task" to create a new task
* Click on a task to view and edit its details
* Use the "Delete" button to remove tasks

### Smart Task Features
* **Automatic Task Analysis**: The app analyzes task complexity and suggests breakdowns
* **Energy-Aware Scheduling**: Tasks are suggested based on your current energy level
* **Cognitive Load Assessment**: Each task is evaluated for its cognitive demands

## Context Switching Management

### Understanding Context Categories
* Tasks are automatically categorized into different contexts (e.g., "Deep Focus", "Creative", "Administrative")
* Each context has an associated cognitive load factor

### Managing Context Switches
1. **View Current Context**: See your active task context in the Context Manager
2. **Planned Switches**: 
   * Use the "Plan Switch" button to evaluate the cost of switching to a new task
   * Review the suggested optimal switching times
   * Get ADHD-specific recommendations for managing the switch
3. **Context History**: 
   * View your context switching patterns
   * See analytics on your most productive context combinations

### Context Switching Tips
* The app provides real-time guidance on:
  * Best times to switch contexts
  * Recovery time needed between switches
  * Strategies to minimize switching costs
  * Energy level considerations

## Task Dependencies

### Viewing Dependencies
* Use the Task Graph view to visualize task relationships
* Colors indicate dependency strength and type
* Hover over connections to see dependency details

### Managing Dependencies
* **Add Dependencies**: Link related tasks using the "Add Dependency" button
* **Types of Dependencies**:
  * Prerequisite: Must complete before starting
  * Related: Benefits from being done together
  * Sequential: Best done in sequence
* **Automatic Suggestions**: The app suggests potential dependencies based on task analysis

## Energy Management

### Energy Tracking
* Log your energy levels throughout the day
* View energy patterns and peak performance times
* Receive task suggestions optimized for your current energy level

### Optimization Features
* **Smart Breaks**: Get break time suggestions based on task intensity
* **Peak Hours**: See your most productive times for different task types
* **Recovery Periods**: Recommended rest times after intensive tasks

## Analytics and Insights

* **Performance Metrics**: Track your task completion patterns
* **Cognitive Load Trends**: Monitor your cognitive load over time
* **Success Analysis**: Review what works best for you
* **Pattern Recognition**: Get insights into your most productive workflows

## Settings

### Personalization Options
* Set your preferred working hours
* Customize context switching thresholds
* Configure notification preferences
* Adjust UI complexity based on cognitive load

### ADHD-Specific Settings
* Set hyperfocus management preferences
* Configure task breakdown granularity
* Adjust context switching sensitivity
* Set energy level tracking frequency

## Troubleshooting

* If you encounter issues, try refreshing the page or logging out and back in
* Check the Help Center for common solutions
* For technical support, contact support@done365.com

## Best Practices

1. **Regular Energy Updates**
   * Log your energy levels at key points during the day
   * Use this data to optimize your task scheduling

2. **Context Management**
   * Plan major context switches during high-energy periods
   * Use suggested recovery times between switches
   * Group similar tasks to minimize context switching

3. **Task Dependencies**
   * Review suggested dependencies regularly
   * Keep your task graph up to date
   * Use dependency information for better planning

## Conclusion

Done365 is designed to work with your ADHD, not against it. By leveraging AI analysis, energy tracking, and smart context management, the app helps you maintain focus and productivity while respecting your cognitive needs. Use this manual as a reference as you explore the features, and don't hesitate to contact support if you need assistance.

---

# Done365: Developer Manual

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Cloudflare account
- Replicate API key (for Llama-70B)

### Installation
```bash
# Clone repository
git clone https://github.com/yourusername/done365.git
cd done365

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
```

### Environment Setup
```env
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# Database
DATABASE_URL=your_d1_database_url

# Replicate (Llama)
REPLICATE_API_TOKEN=your_replicate_token

# Auth
JWT_SECRET=your_jwt_secret
```

## Development

### Local Development
```bash
# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

### Database Management
```bash
# Create new migration
pnpm db:migration:create

# Run migrations
pnpm db:migrate

# Reset database (development only)
pnpm db:reset
```

## Architecture Overview

### Directory Structure
```
done365/
├── src/                    # Source code
│   ├── app/               # Next.js pages
│   ├── components/        # React components
│   ├── lib/              # Shared utilities
│   └── workers/          # Cloudflare Workers
├── public/               # Static assets
├── tests/               # Test files
└── scripts/             # Build scripts
```

### Key Components

#### 1. Task Management
- Task creation/editing
- Priority system
- Task breakdown
- Dependencies

#### 2. ADHD Support Features
- Cognitive load tracking
- Context management
- Energy monitoring
- Focus assistance

#### 3. AI Integration
- Task analysis
- Complexity assessment
- Personalized suggestions
- Pattern recognition

## API Documentation

### Task Endpoints

#### Create Task
```typescript
POST /api/tasks
{
  title: string
  description?: string
  priority: number
  dueDate?: string
  contextCategory?: string
}
```

#### Update Task
```typescript
PATCH /api/tasks/:id
{
  title?: string
  status?: string
  priority?: number
  // ... other fields
}
```

#### Get Task Analysis
```typescript
GET /api/tasks/:id/analysis
// Returns
{
  complexityScore: number
  suggestedBreakdown: string[]
  cognitiveLoad: number
  // ... other analysis
}
```

### Context Management

#### Track Energy Level
```typescript
POST /api/energy
{
  level: number
  context?: string
  notes?: string
}
```

#### Get Optimal Schedule
```typescript
GET /api/schedule/optimize
// Returns
{
  timeBlocks: Array<{
    startTime: string
    endTime: string
    taskId: string
    energyLevel: number
  }>
}
```

## Testing

### Unit Tests
```bash
# Run unit tests
pnpm test:unit

# Run with coverage
pnpm test:coverage
```

### Integration Tests
```bash
# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e
```

## Deployment

### Production Deployment
```bash
# Build project
pnpm build

# Deploy to Cloudflare
pnpm deploy
```

### Staging Deployment
```bash
# Deploy to staging
pnpm deploy:staging
```

## Monitoring

### Performance Monitoring
- Response times
- Cache hit rates
- Error rates
- CPU/Memory usage

### Error Tracking
- Error logging
- Alert thresholds
- Debug information

## Best Practices

### Code Style
- Follow TypeScript best practices
- Use ESLint configuration
- Follow component patterns
- Write comprehensive tests

### Performance
- Implement proper caching
- Optimize database queries
- Minimize API calls
- Use edge functions appropriately

### Security
- Validate all inputs
- Implement rate limiting
- Use proper authentication
- Follow OWASP guidelines

## Troubleshooting

### Common Issues
1. Database connection errors
2. Worker deployment issues
3. Cache invalidation problems
4. API rate limiting

### Debug Tools
- Cloudflare dashboard
- Local development tools
- Logging utilities
- Performance profilers

# Done365: ADHD-Optimized Task Management System

## System Architecture

### Core Technology Stack
- **Frontend**: Next.js App Router with TypeScript
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Cache**: Cloudflare KV
- **AI Engine**: Llama-70B via Replicate
- **Real-time**: WebSocket over Workers

### Database Schema

```sql
-- Core Task Management
Tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    due_date DATETIME,
    user_id TEXT NOT NULL,
    parent_task_id TEXT,
    priority INTEGER DEFAULT 0,
    cognitive_load INTEGER,
    energy_required INTEGER,
    context_category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_task_id) REFERENCES Tasks(id)
);

-- Task Analysis & Intelligence
TaskAnalysis (
    task_id TEXT PRIMARY KEY,
    complexity_score INTEGER,
    suggested_breakdown TEXT,
    attention_required INTEGER,
    executive_load INTEGER,
    memory_load INTEGER,
    analyzed_at DATETIME,
    llm_suggestions TEXT,
    FOREIGN KEY (task_id) REFERENCES Tasks(id)
);

-- User Energy & Context Management
EnergyLevels (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    level INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    context TEXT,
    notes TEXT
);

-- User Preferences & Settings
UserPreferences (
    user_id TEXT PRIMARY KEY,
    ui_complexity TEXT DEFAULT 'medium',
    notification_level TEXT DEFAULT 'balanced',
    color_theme TEXT DEFAULT 'light',
    focus_mode_settings TEXT,
    voice_enabled BOOLEAN DEFAULT false
);

-- Context & Time Tracking
TimeBlocks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    start_time DATETIME,
    end_time DATETIME,
    task_id TEXT,
    energy_level INTEGER,
    productivity_score INTEGER,
    FOREIGN KEY (task_id) REFERENCES Tasks(id)
);
```

### Component Architecture

#### Frontend Components
```plaintext
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── tasks/            # Task management
│   ├── energy/           # Energy tracking
│   ├── analytics/        # Analytics views
│   └── settings/         # User settings
├── components/           # Reusable components
├── hooks/               # Custom hooks
├── lib/                # Shared utilities
└── styles/             # Global styles
```

#### Backend Workers
```plaintext
workers/
├── api/                # API endpoints
│   ├── tasks.ts       # Task management
│   ├── analysis.ts    # Task analysis
│   ├── energy.ts      # Energy tracking
│   └── auth.ts        # Authentication
├── ai/                # AI integration
│   ├── llm.ts         # LLM service
│   └── analysis.ts    # Analysis service
└── utils/             # Shared utilities
```

### Key Features Implementation

#### 1. Cognitive Load Management
- Real-time assessment via LLM
- UI adaptation based on load
- Task complexity scoring
- Energy level tracking
- Focus state monitoring

#### 2. Executive Function Support
- Task breakdown assistance
- Priority management
- Time estimation
- Decision support
- Automated scheduling

#### 3. Context Management
- Task batching
- Context switching cost calculation
- Optimal timing suggestions
- Energy-based task grouping
- Focus preservation

#### 4. Time Management
- Time blocking system
- Pomodoro integration
- Energy-based scheduling
- Break optimization
- Time perception aids

### External Services

### OpenRouter Integration
- Used for task analysis and intelligent scheduling
- Endpoints:
  - `/api/analyze-task`: Task complexity and breakdown
  - `/api/suggest-priority`: Context-aware priority suggestions
  - `/api/optimize-schedule`: Schedule optimization
- Rate limiting and token usage tracking
- Default model: mistral-7b-instruct

### Google Calendar Integration
- Used for task scheduling and time management
- Features:
  - Event synchronization
  - Intelligent scheduling
  - Conflict detection
  - Energy-aware time blocking
- OAuth2 authentication
- Real-time calendar updates

### Backup System

#### Automated Backups
- Daily incremental backups
- Weekly full backups (Sundays)
- Stored in Cloudflare R2 (S3-compatible storage)
- 30-day retention policy

#### Backup Features
- Checksum verification
- Transaction-safe restore
- Point-in-time recovery
- Incremental backup support
- Automated cleanup

#### Backup Components
- BackupManager: Core backup/restore functionality
- BackupScheduler: Cron-based scheduling
- Backup Metadata: Database tracking
- R2 Storage: Cloud storage integration

### Security & Performance

#### Security Measures
- JWT authentication
- Edge security with Cloudflare
- Encrypted data storage
- Rate limiting
- Input sanitization

#### Performance Optimization
- Edge computing
- Global CDN
- Response caching
- LLM result caching
- Optimistic updates

### Deployment Architecture

```plaintext
User Request → Cloudflare CDN → Edge Worker → D1/KV → Response
                     ↓
              Cache (if available)
                     ↓
         LLM Analysis (if needed)
```

### Development Workflow
```plaintext
Local Dev → Testing → Staging → Production
    ↑          |         |          |
    └──────────┴─────────┴──────────┘
```

### Monitoring & Analytics
- Real-time performance monitoring
- User behavior analytics
- Error tracking
- Usage patterns
- Performance metrics

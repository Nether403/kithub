import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const isReplitHelium = connectionString.includes("helium");
const client = postgres(connectionString, { ssl: isReplitHelium ? false : "require" });
const db = drizzle(client, { schema });

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface SkillSeed {
  slug: string;
  title: string;
  emoji: string;
  category: string;
  summary: string;
  description: string;
  tags: string[];
}

const SKILLS: SkillSeed[] = [
  {
    slug: "ai-humanizer",
    title: "AI Humanizer",
    emoji: "🧑‍💻",
    category: "writing",
    summary: "Detects and removes AI-generated text patterns to produce natural, human-sounding content that bypasses AI detection tools.",
    description: `The AI Humanizer skill transforms machine-generated text into natural, human-sounding prose. It identifies and eliminates common AI writing patterns — repetitive sentence structures, overused transition phrases, generic filler, and unnaturally uniform paragraph lengths.

## What It Does
- Analyzes text for telltale AI patterns (hedging language, excessive qualifiers, formulaic openings)
- Rewrites flagged passages with varied sentence length, authentic voice, and natural rhythm
- Preserves the original meaning and factual accuracy while improving readability
- Validates output against common AI detection heuristics

## When to Use
- Editing drafts that sound too "robotic" or formulaic
- Preparing content that needs to read as authentically human-written
- Polishing marketing copy, blog posts, or documentation for natural tone

## How It Works
1. Scan the input text for AI-pattern markers (sentence uniformity, passive constructions, filler phrases)
2. Score each paragraph on a "naturalness" scale
3. Rewrite low-scoring sections with varied syntax, contractions, and conversational elements
4. Re-score and iterate until the text passes the naturalness threshold

## Constraints
- Works best with English-language content
- Does not fabricate facts — only restructures and rephrases existing content
- Output quality depends on the input's factual density`,
    tags: ["writing", "content", "editing", "nlp"],
  },
  {
    slug: "sql-optimization",
    title: "SQL Optimization",
    emoji: "⚡",
    category: "database",
    summary: "Debugs slow database queries, identifies N+1 problems, optimizes indexes, and rewrites SQL for maximum performance.",
    description: `The SQL Optimization skill turns slow, inefficient database queries into high-performance operations. It understands query execution plans, index strategies, and common anti-patterns across PostgreSQL, MySQL, and SQLite.

## What It Does
- Analyzes SQL queries and their execution plans to identify bottlenecks
- Detects N+1 query patterns in ORM-generated SQL
- Recommends index additions, query rewrites, and schema adjustments
- Generates optimized versions of slow queries with explanations

## When to Use
- API response times are degrading as data grows
- Database CPU or I/O is spiking during peak traffic
- You suspect N+1 queries in your ORM layer (Drizzle, Prisma, ActiveRecord, etc.)
- Migration planning — ensuring new tables have proper indexes from day one

## How It Works
1. Accept the problematic SQL query (or ORM code that generates it)
2. Run EXPLAIN ANALYZE (or equivalent) to understand the current plan
3. Identify full table scans, missing indexes, unnecessary joins, and suboptimal WHERE clauses
4. Produce an optimized query with CREATE INDEX statements and rationale
5. Estimate the performance improvement based on the execution plan delta

## Constraints
- Requires access to the database schema (table definitions, existing indexes)
- Recommendations are database-engine-specific (PostgreSQL vs MySQL syntax differs)
- Complex multi-tenant query optimization may require iterative refinement`,
    tags: ["database", "sql", "performance", "backend"],
  },
  {
    slug: "excel-master",
    title: "Excel Master",
    emoji: "📊",
    category: "data",
    summary: "Creates, edits, and analyzes spreadsheets using Python (openpyxl, pandas). Builds formulas, pivot tables, charts, and automated reports.",
    description: `The Excel Master skill handles all spreadsheet operations programmatically — from creating formatted workbooks to analyzing complex datasets with pivot tables and charts.

## What It Does
- Creates Excel workbooks with formatted headers, data validation, and conditional formatting
- Builds pivot tables and summary sheets from raw data
- Generates charts (bar, line, pie, scatter) embedded in the workbook
- Writes complex Excel formulas (VLOOKUP, INDEX/MATCH, array formulas)
- Reads and transforms existing spreadsheets for reporting

## When to Use
- Generating automated reports from database queries or API responses
- Transforming CSV/JSON data into formatted Excel deliverables
- Building financial models, dashboards, or data summaries
- Batch-processing multiple spreadsheets with consistent formatting

## How It Works
1. Accept the data source (CSV, JSON, database query results, or existing Excel file)
2. Define the output structure — sheets, columns, formatting rules, charts
3. Use openpyxl for workbook creation and pandas for data transformation
4. Apply formatting: column widths, number formats, colors, borders, freeze panes
5. Export the final .xlsx file

## Constraints
- Outputs .xlsx format (not .xls or Google Sheets native)
- Chart types are limited to what openpyxl supports
- Very large datasets (>1M rows) may require chunked processing`,
    tags: ["data", "spreadsheet", "python", "reporting"],
  },
  {
    slug: "mobile-developer",
    title: "Mobile Developer",
    emoji: "📱",
    category: "development",
    summary: "Builds production-grade mobile apps with React Native or Flutter. Handles navigation, state management, native APIs, and app store deployment.",
    description: `The Mobile Developer skill covers the full lifecycle of building cross-platform mobile applications — from project setup through app store submission.

## What It Does
- Scaffolds React Native (Expo or bare) and Flutter projects with best-practice structure
- Implements navigation patterns (stack, tab, drawer) with proper deep linking
- Integrates native device APIs: camera, location, push notifications, biometrics
- Sets up state management (Redux Toolkit, Zustand, Riverpod, BLoC)
- Configures CI/CD pipelines for automated builds and store submissions

## When to Use
- Building a new mobile app from scratch
- Adding native features (camera, GPS, push) to an existing app
- Debugging platform-specific issues (iOS vs Android behavior differences)
- Preparing an app for App Store / Google Play submission

## How It Works
1. Assess requirements: platforms, features, backend integration needs
2. Scaffold the project with the chosen framework and navigation structure
3. Implement screens, components, and business logic
4. Integrate native APIs with proper permission handling
5. Configure builds, signing, and store metadata
6. Test on both platforms and optimize performance

## Constraints
- React Native and Flutter are the primary frameworks (no native Swift/Kotlin-only projects)
- App Store review guidelines must be followed — no private API usage
- Push notification setup requires platform-specific certificates/keys`,
    tags: ["mobile", "react-native", "flutter", "development"],
  },
  {
    slug: "docs-generator",
    title: "Docs Generator",
    emoji: "📝",
    category: "documentation",
    summary: "Produces PRDs, technical design documents, API specs, and architecture docs from codebases, conversations, or requirements.",
    description: `The Docs Generator skill creates professional technical documentation from various inputs — code, conversations, requirements, or existing rough notes.

## What It Does
- Generates Product Requirements Documents (PRDs) with user stories, acceptance criteria, and scope
- Produces Technical Design Documents (TDDs) with architecture diagrams described in text, data flow, and API contracts
- Creates API documentation from code (OpenAPI/Swagger spec generation)
- Writes onboarding guides, runbooks, and README files
- Extracts and organizes documentation from existing codebases

## When to Use
- Starting a new project and need a PRD before development begins
- Documenting an existing system that has grown without proper docs
- Preparing API documentation for external consumers
- Creating team onboarding materials for a codebase

## How It Works
1. Accept the input: codebase path, requirements text, conversation transcript, or rough notes
2. Analyze the structure, identify key components and flows
3. Generate the document in the requested format (Markdown, Google Doc-style, or Confluence-compatible)
4. Include diagrams (described in Mermaid or PlantUML syntax), tables, and code examples
5. Review for completeness against a documentation checklist

## Constraints
- Diagrams are described in text-based formats (Mermaid, PlantUML) — not image generation
- PRD quality depends on the clarity of input requirements
- Generated docs should always be reviewed by a human before publishing`,
    tags: ["documentation", "technical-writing", "prd", "api"],
  },
  {
    slug: "ai-ml-developer",
    title: "AI/ML Developer",
    emoji: "🤖",
    category: "ai-ml",
    summary: "Builds LLM-powered applications, RAG systems, fine-tuning pipelines, and AI agent architectures with production-grade patterns.",
    description: `The AI/ML Developer skill covers building intelligent applications powered by large language models, retrieval-augmented generation, and multi-agent systems.

## What It Does
- Designs and implements RAG (Retrieval-Augmented Generation) pipelines with vector databases
- Builds conversational AI agents with tool use, memory, and planning capabilities
- Sets up fine-tuning pipelines for custom model training (LoRA, QLoRA)
- Implements prompt engineering patterns: chain-of-thought, few-shot, structured output
- Integrates with OpenAI, Anthropic, Google, and open-source model APIs

## When to Use
- Building a chatbot or conversational interface powered by LLMs
- Creating a knowledge base Q&A system over your own documents
- Designing multi-agent workflows where AI agents collaborate
- Fine-tuning a model for a domain-specific task
- Adding AI features (summarization, classification, extraction) to existing apps

## How It Works
1. Define the AI task: generation, classification, extraction, conversation, or agent workflow
2. Select the model and inference approach (API, self-hosted, fine-tuned)
3. Implement the pipeline: prompt templates, retrieval layer (if RAG), output parsing
4. Add guardrails: input validation, output filtering, token budget management
5. Deploy with monitoring: latency tracking, cost estimation, quality scoring

## Constraints
- API costs scale with token usage — budget management is essential
- RAG quality depends on chunking strategy and embedding model choice
- Fine-tuning requires representative training data (minimum ~100 examples)
- Agent loops must have termination conditions to prevent runaway costs`,
    tags: ["ai", "machine-learning", "llm", "rag", "agents"],
  },
  {
    slug: "api-builder",
    title: "API Builder",
    emoji: "🔌",
    category: "backend",
    summary: "Designs and builds RESTful and GraphQL APIs end-to-end with FastAPI, Django, Express, or Fastify. Handles auth, validation, and deployment.",
    description: `The API Builder skill creates production-ready APIs from requirements — covering design, implementation, testing, and deployment.

## What It Does
- Designs RESTful API schemas following OpenAPI 3.0 conventions
- Implements APIs with FastAPI (Python), Django REST (Python), Express/Fastify (Node.js)
- Sets up authentication: JWT, OAuth 2.0, API keys, session-based auth
- Adds input validation, rate limiting, CORS, and error handling
- Generates API documentation (Swagger UI, ReDoc)
- Writes integration tests and sets up CI pipelines

## When to Use
- Building a backend API for a web or mobile frontend
- Creating a public API for third-party integrations
- Migrating from a monolith to microservices with well-defined API boundaries
- Adding auth, rate limiting, or validation to an existing API

## How It Works
1. Define the API contract: endpoints, methods, request/response shapes
2. Scaffold the project with the chosen framework and database ORM
3. Implement route handlers with proper validation and error responses
4. Add middleware: authentication, rate limiting, logging, CORS
5. Write integration tests covering happy paths and error cases
6. Generate OpenAPI docs and deploy

## Constraints
- Focused on HTTP APIs (REST and GraphQL) — not gRPC or WebSocket-only services
- Database choice affects ORM setup (PostgreSQL recommended for most use cases)
- Rate limiting and auth strategies should match the deployment environment`,
    tags: ["api", "backend", "rest", "fastapi", "node"],
  },
  {
    slug: "data-analyst",
    title: "Data Analyst",
    emoji: "📈",
    category: "data",
    summary: "Applies rigorous statistical methods to datasets, builds visualizations, and writes clear data narratives that drive decisions.",
    description: `The Data Analyst skill transforms raw data into actionable insights through statistical analysis, visualization, and clear narrative writing.

## What It Does
- Performs exploratory data analysis (EDA) with summary statistics and distribution checks
- Applies statistical tests: t-tests, chi-square, ANOVA, regression analysis
- Builds visualizations with matplotlib, seaborn, plotly, or D3.js
- Writes data narratives that translate numbers into business-friendly insights
- Cleans and transforms messy datasets (missing values, outliers, type conversions)

## When to Use
- Analyzing user behavior, conversion funnels, or A/B test results
- Preparing data-driven presentations for stakeholders
- Cleaning and validating a new dataset before modeling
- Building dashboards or recurring reports

## How It Works
1. Ingest the dataset (CSV, JSON, database query, API response)
2. Profile the data: types, distributions, missing values, correlations
3. Apply the appropriate analytical method based on the question being asked
4. Generate visualizations that highlight key findings
5. Write a narrative summary with conclusions and recommended actions

## Constraints
- Statistical conclusions require sufficient sample sizes — small datasets get caveats
- Correlation is not causation — the narrative distinguishes between the two
- Visualization format depends on the output medium (static images vs interactive charts)`,
    tags: ["data", "analytics", "statistics", "visualization"],
  },
  {
    slug: "uiux-designer",
    title: "UI/UX Designer",
    emoji: "🎨",
    category: "design",
    summary: "Creates design systems, color palettes, typography scales, and component libraries. Produces accessible, responsive UI specifications.",
    description: `The UI/UX Designer skill produces complete design specifications — from color systems and typography to component libraries and interaction patterns.

## What It Does
- Creates cohesive color palettes with proper contrast ratios (WCAG AA/AAA compliance)
- Defines typography scales with font pairings, sizes, and line heights
- Designs component libraries: buttons, inputs, cards, modals, navigation patterns
- Produces responsive layout specifications for mobile, tablet, and desktop
- Applies UX principles: information hierarchy, cognitive load reduction, accessibility

## When to Use
- Starting a new project and need a design system foundation
- Improving the visual consistency of an existing application
- Adding dark mode or theming support to a design system
- Auditing an interface for accessibility compliance
- Creating a style guide for a development team

## How It Works
1. Understand the brand identity, target audience, and platform constraints
2. Generate a color palette with primary, secondary, neutral, and semantic colors
3. Define the typography scale and select font pairings
4. Design core UI components with states (default, hover, active, disabled, error)
5. Document spacing, grid, and responsive breakpoint conventions
6. Validate all color combinations for accessibility contrast ratios

## Constraints
- Outputs are CSS/design token specifications — not image mockups
- Font recommendations use freely available fonts (Google Fonts, system fonts)
- Accessibility compliance targets WCAG 2.1 AA minimum`,
    tags: ["design", "ui", "ux", "accessibility", "css"],
  },
  {
    slug: "frontend-expert",
    title: "Frontend Expert",
    emoji: "⚛️",
    category: "development",
    summary: "Builds modern web interfaces with React 19, Next.js, TypeScript, and Tailwind CSS. Covers Server Components, streaming, and performance optimization.",
    description: `The Frontend Expert skill covers modern web development with React 19, Next.js App Router, TypeScript, and Tailwind CSS — following current best practices and patterns.

## What It Does
- Builds React components with proper TypeScript typing and composition patterns
- Implements Next.js App Router features: Server Components, streaming, parallel routes
- Uses React 19 patterns: use() hook, Server Actions, form actions, optimistic updates
- Applies Tailwind CSS with custom design tokens and responsive utilities
- Optimizes performance: code splitting, image optimization, Core Web Vitals

## When to Use
- Building a new web application with React and Next.js
- Migrating from Pages Router to App Router in Next.js
- Refactoring class components or legacy patterns to modern React
- Improving page load performance and Core Web Vitals scores
- Setting up a component library with Tailwind CSS

## How It Works
1. Assess the project structure and identify the rendering strategy (SSR, SSG, ISR, client)
2. Design the component hierarchy with clear server/client boundaries
3. Implement components with TypeScript, following React 19 conventions
4. Style with Tailwind CSS using consistent spacing, color, and typography tokens
5. Optimize: lazy loading, image optimization, font loading, bundle analysis
6. Test with React Testing Library and Playwright for e2e coverage

## Constraints
- React 19 and Next.js 14+ are the primary targets
- Tailwind CSS is the default styling approach (CSS-in-JS alternatives available if needed)
- Server Components cannot use hooks or browser APIs — client boundary placement matters`,
    tags: ["frontend", "react", "nextjs", "typescript", "tailwind"],
  },
];

async function seedSkills() {
  console.log("🌱 Seeding universal agent skills...\n");

  const curatorUserId = "skill-curator-user-00000000";
  const curatorPublisherId = "skill-curator-publisher-0000";

  await db.insert(schema.users).values({
    id: curatorUserId,
    email: "curator@skillkithub.community",
    emailVerified: new Date(),
  }).onConflictDoNothing();

  await db.insert(schema.publisherProfiles).values({
    id: curatorPublisherId,
    userId: curatorUserId,
    agentName: "SkillCurator",
  }).onConflictDoNothing();

  console.log("✅ SkillCurator publisher profile ready\n");

  let seeded = 0;

  for (const skill of SKILLS) {
    const installCount = rand(50, 500);

    await db.insert(schema.skills).values({
      slug: skill.slug,
      publisherId: curatorPublisherId,
      title: skill.title,
      emoji: skill.emoji,
      category: skill.category,
      summary: skill.summary,
      description: skill.description,
      installCount,
    }).onConflictDoNothing();

    for (const tag of skill.tags) {
      await db.insert(schema.skillTags).values({
        skillSlug: skill.slug,
        tag: tag.toLowerCase(),
      }).onConflictDoNothing();
    }

    console.log(`  ✅ ${skill.emoji} ${skill.title} (${skill.slug}) — ${installCount} installs`);
    seeded++;
  }

  console.log(`\n🎉 Done! Seeded ${seeded} universal agent skills.\n`);
  await client.end();
}

seedSkills().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});

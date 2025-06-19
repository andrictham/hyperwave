![image](https://github.com/user-attachments/assets/a30e8af8-8ab0-492e-af7d-c0cfaf29aa31)

# Hyperwave
An open-source AI chat app built with Convex and TanStack Router.

## Features

- Fast client-side navigation with TanStack Router
- Authentication with GitHub via Convex Auth
- Chat with multiple LLMs via OpenRouter
- Live chat history synchronization via Convex DB
- Resumable Streams via Convex Agent: Continue generation after page refresh
- Syntax highlighting of LLM responses via Shiki
- Web search via Jina
- Responsive layout: chat on mobile, tablet, and desktop

### Planned

- [ ] File and image attachment support (WIP)
- [ ] Bring your own key via OpenRouter
- [ ] Share chats via a public link
- [ ] Chat branching (when the Convex Agent component supports it)
- [ ] Edit message and message versioning (when the Convex Agent component supports it)

### Known Issues

- [ ] Layout isn’t fully responsive (horizontal overflow on some breakpoints due to Markdown tables) - https://github.com/andrictham/hyperwave/issues/82
- [ ] No ability to stop generating in the middle of a stream https://github.com/andrictham/hyperwave/issues/83

## Stack

- **TypeScript** - For type safety and improved developer experience
- [**TanStack Router**](https://tanstack.com/router/latest) - File-based routing with full type safety
- [**Convex**](https://www.convex.dev/) - Reactive backend-as-a-service platform
  - [**Convex Auth**](https://labs.convex.dev/auth) - Authentication with GitHub
  - [**Convex Agent Component**](https://convex.dev/docs/agent-component) - AI Agent framework built on Convex that handles storage of chat history
- [**OpenRouter**](https://openrouter.ai/) - AI model gateway
- [**TailwindCSS**](https://tailwindcss.com/) - Utility-first CSS for rapid UI development
- [**shadcn/ui**](https://ui.shadcn.com/) - Reusable UI components
- [**Turborepo**](https://turborepo.com/) - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
pnpm install
```

## Environment variables

There are two .env files used in this project that you must specify when working locally:

- `/apps/webapp/.env` - Environment variables for the webapp
  - `VITE_CONVEX_URL` - URL of the Convex server, e.g. “https://lively-dog-999.convex.cloud” which you can find in the Convex dashboard
- `/packages/backend/.env` - Environment variables for the Convex server. This will be auto-generated for you when you run `pnpm dev:setup`

## Development Setup

### Convex Setup

This project uses Convex as a backend. You'll need to set up Convex before running the app:

```bash
pnpm dev:setup
```

Follow the prompts to create a new Convex project and connect it to your application.

Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.

Your app will connect to the Convex cloud backend automatically.

### Convex Auth Setup

To setup [Convex Auth](https://labs.convex.dev/auth), run the following commands, one after another:

```bash
cd packages/backend
pnpm add @convex-dev/auth @auth/core
pnpm convex auth
```

This will bootstrap Convex Auth by adding the necessary environment variables to your personal Convex environment in the cloud.

Next, you’ll need to setup a GitHub OAuth app, so that you can sign into the app with your GitHub account while developing it locally. You can find instructions for this in the [Convex Auth documentation](https://labs.convex.dev/auth/config/oauth/github).

### OpenRouter Setup

To ensure [your OpenRouter API key](https://openrouter.ai/settings/keys) (starts with `sk-or-`) is not exposed in the client-side code, you will need to set it as an environment variable **in your Convex environment**.

```bash
cd packages/backend
npx convex env set OPENROUTER_API_KEY <your-openrouter-api-key>
```

### Jina Search Setup

To enable web search, add [your Jina API token](https://jina.ai/) to your Convex environment:

```bash
cd packages/backend
npx convex env set JINA_API_KEY <your-jina-api-key>
```

## Deploying to Production

To deploy your app to production, follow these steps:

1. Convex Auth: Follow the steps [here](https://labs.convex.dev/auth/production).
2. GitHub OAuth: You must create a new GitHub OAuth app for production, and then set the environment variables in your Production Convex environment in the Convex dashboard. Follow the guide [here](https://labs.convex.dev/auth/config/oauth/github).
3. OpenRouter: You must set the `OPENROUTER_API_KEY` environment variable in your Production Convex environment in the Convex dashboard.
4. Jina API: You must set the `JINA_API_KEY` environment variable in your Production Convex environment.
5. Deploy the app: You can deploy the frontend (`apps/webapp`) to either Netlify or Vercel. Follow the official Convex deployment guides [here](https://docs.convex.dev/production/hosting/).

Read the Convex guide on [production deployment](https://docs.convex.dev/production) for more information.

## Project Structure

```
hyperwave/
├── apps/
│   ├── webapp/         # Frontend application (React + TanStack Router)
├── packages/
│   └── backend/     # Convex backend functions and schema

```

## Available Scripts

- `pnpm dev`: Start all applications in development mode
- `pnpm build`: Build all applications
- `pnpm dev:webapp`: Start only the web application
- `pnpm dev:server`: Start only the Convex server
- `pnpm dev:setup`: Setup and configure your Convex project
- `pnpm check-types`: Check TypeScript types across all apps
- `pnpm update-deps`: Update dependencies to the latest versions using taze
- `pnpm format`: Format all files using Prettier
- `pnpm format:check`: Check if files are formatted

# Credits

## Core Contributors

- ideosyncretic
- andrictham

## Dependencies and Tools Used

- Thanks to the Convex team, and Ian Macartney in particular, for their work on the [Convex Agent component](https://github.com/get-convex/agent).
- This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Router, Convex, and more.
- UI Theming was done with the help of [tweakcn](https://tweakcn.com/)

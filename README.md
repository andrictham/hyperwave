# Hyperwave

## An open-source AI chat app built with Convex and TanStack Router.

## Features

- Fast client-side navigation with TanStack Router
- Authentication with GitHub via Convex Auth
- Chat with multiple LLMs via OpenRouter
- Live chat history synchronization via Convex DB
- Resumable Streams via Convex Agent: Continue generation after page refresh
- Syntax highlighting of LLM responses via Shiki

### Planned
- [ ] Bring your own key via OpenRouter
- [ ] Web search via Jina
- [ ] File and image attachment support
- [ ] Chat branching (when the Convex Agent component supports it)
- [ ] Edit message and message versioning
- [ ] Share chats via a public link

### Known Issues
- [ ] Layout doesn’t fully work on mobile
- [ ] Provider errors aren't properly handled in the UI
The following aren’t yet implemented due to issues in the Convex Agent component:
- [ ] Reasoning tokens aren’t streaming in properly
- [ ] No ability to stop generating in the middle of a stream ([get-convex/agent#61](https://github.com/get-convex/agent/issues/61))

## Stack

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **Convex** - Reactive backend-as-a-service platform
  - **Convex Auth** - Authentication with GitHub
  - [**Convex Agent Component**](https://convex.dev/docs/agent-component) - AI Agent framework built on Convex that handles storage of chat history
- **OpenRouter** - AI model gateway
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Turborepo** - Optimized monorepo build system

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

## Convex Setup

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

To setup [Convex Auth](https://labs.convex.dev/auth), run the following commands, one after another:

```bash
cd packages/backend
pnpm add @convex-dev/auth @auth/core
pnpm convex auth
```

This will bootstrap Convex Auth by adding the necessary environment variables to your personal Convex environment in the cloud.

Next, you’ll need to setup a GitHub OAuth app, so that you can sign into the app with your GitHub account while developing it locally. You can find instructions for this in the [Convex Auth documentation](https://labs.convex.dev/auth/config/oauth/github).

When deploying to production, follow the steps [here](https://labs.convex.dev/auth/production).

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
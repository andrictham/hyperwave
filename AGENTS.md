# Hyperwave

- Consult `README.md` in the root of this monorepo for information about how this monorepo is structured and the tech stack used.

- This project is a monorepo created with Turborepo. Sub-repos of this monorepo can be found in `apps/*` and `packages/*`.

- Guidelines for how to use Convex, which powers the backend of this stack, as well as reactive data queries and mutations on the frontend, can be found in the section below titled “Convex guidelines”.

- Guidelines for how to use the Convex “AI Agent Component” [(@convex-dev/agent)](https://github.com/get-convex/agent) can be found in the section below titled “Convex Agent Component guidelines”.

- Guidelines for how to use the OpenRouter AI SDK Provider, which acts as our AI provider, can be found in the section below titled “OpenRouter AI SDK Provider guidelines”.

- Guidelines for how to use TanStack Router, which powers the frontend routing of this stack, can be found in `./apps/webapp/AGENTS.md`.

# Convex guidelines

## Function guidelines

### New function syntax

- ALWAYS use the new function syntax for Convex functions. For example:

```typescript
import { v } from "convex/values";

import { query } from "./_generated/server";

export const f = query({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    // Function body
  },
});
```

### Http endpoint syntax

- HTTP endpoints are defined in `convex/http.ts` and require an `httpAction` decorator. For example:

```typescript
import { httpRouter } from "convex/server";

import { httpAction } from "./_generated/server";

const http = httpRouter();
http.route({
  path: "/echo",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.bytes();
    return new Response(body, { status: 200 });
  }),
});
```

- HTTP endpoints are always registered at the exact path you specify in the `path` field. For example, if you specify `/api/someRoute`, the endpoint will be registered at `/api/someRoute`.

### Validators

- Below is an example of an array validator:

```typescript
import { v } from "convex/values";

import { mutation } from "./_generated/server";

export default mutation({
  args: {
    simpleArray: v.array(v.union(v.string(), v.number())),
  },
  handler: async (ctx, args) => {
    //...
  },
});
```

- Below is an example of a schema with validators that codify a discriminated union type:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  results: defineTable(
    v.union(
      v.object({
        kind: v.literal("error"),
        errorMessage: v.string(),
      }),
      v.object({
        kind: v.literal("success"),
        value: v.number(),
      }),
    ),
  ),
});
```

- Always use the `v.null()` validator when returning a null value. Below is an example query that returns a null value:

```typescript
import { v } from "convex/values";

import { query } from "./_generated/server";

export const exampleQuery = query({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("This query returns a null value");
    return null;
  },
});
```

- Here are the valid Convex types along with their respective validators:
  Convex Type | TS/JS type | Example Usage | Validator for argument validation and schemas | Notes |
  | ----------- | ------------| -----------------------| -----------------------------------------------| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
  | Id | string | `doc._id` | `v.id(tableName)` | |
  | Null | null | `null` | `v.null()` | JavaScript's `undefined` is not a valid Convex value. Functions the return `undefined` or do not return will return `null` when called from a client. Use `null` instead. |
  | Int64 | bigint | `3n` | `v.int64()` | Int64s only support BigInts between -2^63 and 2^63-1. Convex supports `bigint`s in most modern browsers. |
  | Float64 | number | `3.1` | `v.number()` | Convex supports all IEEE-754 double-precision floating point numbers (such as NaNs). Inf and NaN are JSON serialized as strings. |
  | Boolean | boolean | `true` | `v.boolean()` |
  | String | string | `"abc"` | `v.string()` | Strings are stored as UTF-8 and must be valid Unicode sequences. Strings must be smaller than the 1MB total size limit when encoded as UTF-8. |
  | Bytes | ArrayBuffer | `new ArrayBuffer(8)` | `v.bytes()` | Convex supports first class bytestrings, passed in as `ArrayBuffer`s. Bytestrings must be smaller than the 1MB total size limit for Convex types. |
  | Array | Array] | `[1, 3.2, "abc"]` | `v.array(values)` | Arrays can have at most 8192 values. |
  | Object | Object | `{a: "abc"}` | `v.object({property: value})` | Convex only supports "plain old JavaScript objects" (objects that do not have a custom prototype). Objects can have at most 1024 entries. Field names must be nonempty and not start with "$" or "_". |
| Record      | Record      | `{"a": "1", "b": "2"}` | `v.record(keys, values)`                       | Records are objects at runtime, but can have dynamic keys. Keys must be only ASCII characters, nonempty, and not start with "$" or "\_". |

### Function registration

- Use `internalQuery`, `internalMutation`, and `internalAction` to register internal functions. These functions are private and aren't part of an app's API. They can only be called by other Convex functions. These functions are always imported from `./_generated/server`.
- Use `query`, `mutation`, and `action` to register public functions. These functions are part of the public API and are exposed to the public Internet. Do NOT use `query`, `mutation`, or `action` to register sensitive internal functions that should be kept private.
- You CANNOT register a function through the `api` or `internal` objects.
- ALWAYS include argument and return validators for all Convex functions. This includes all of `query`, `internalQuery`, `mutation`, `internalMutation`, `action`, and `internalAction`. If a function doesn't return anything, include `returns: v.null()` as its output validator.
- If the JavaScript implementation of a Convex function doesn't have a return value, it implicitly returns `null`.

### Function calling

- Use `ctx.runQuery` to call a query from a query, mutation, or action.
- Use `ctx.runMutation` to call a mutation from a mutation or action.
- Use `ctx.runAction` to call an action from an action.
- ONLY call an action from another action if you need to cross runtimes (e.g. from V8 to Node). Otherwise, pull out the shared code into a helper async function and call that directly instead.
- Try to use as few calls from actions to queries and mutations as possible. Queries and mutations are transactions, so splitting logic up into multiple calls introduces the risk of race conditions.
- All of these calls take in a `FunctionReference`. Do NOT try to pass the callee function directly into one of these calls.
- When using `ctx.runQuery`, `ctx.runMutation`, or `ctx.runAction` to call a function in the same file, specify a type annotation on the return value to work around TypeScript circularity limitations. For example,

```
export const f = query({
  args: { name: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    return "Hello " + args.name;
  },
});

export const g = query({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    const result: string = await ctx.runQuery(api.example.f, { name: "Bob" });
    return null;
  },
});
```

### Function references

- Function references are pointers to registered Convex functions.
- Use the `api` object defined by the framework in `convex/_generated/api.ts` to call public functions registered with `query`, `mutation`, or `action`.
- Use the `internal` object defined by the framework in `convex/_generated/api.ts` to call internal (or private) functions registered with `internalQuery`, `internalMutation`, or `internalAction`.
- Convex uses file-based routing, so a public function defined in `convex/example.ts` named `f` has a function reference of `api.example.f`.
- A private function defined in `convex/example.ts` named `g` has a function reference of `internal.example.g`.
- Functions can also registered within directories nested within the `convex/` folder. For example, a public function `h` defined in `convex/messages/access.ts` has a function reference of `api.messages.access.h`.

### Api design

- Convex uses file-based routing, so thoughtfully organize files with public query, mutation, or action functions within the `convex/` directory.
- Use `query`, `mutation`, and `action` to define public functions.
- Use `internalQuery`, `internalMutation`, and `internalAction` to define private, internal functions.

### Pagination

- Paginated queries are queries that return a list of results in incremental pages.
- You can define pagination using the following syntax:

```ts
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

export const listWithExtraArg = query({
  args: { paginationOpts: paginationOptsValidator, author: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("author"), args.author))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});
```

Note: `paginationOpts` is an object with the following properties:

- `numItems`: the maximum number of documents to return (the validator is `v.number()`)
- `cursor`: the cursor to use to fetch the next page of documents (the validator is `v.union(v.string(), v.null())`)
- A query that ends in `.paginate()` returns an object that has the following properties: - page (contains an array of documents that you fetches) - isDone (a boolean that represents whether or not this is the last page of documents) - continueCursor (a string that represents the cursor to use to fetch the next page of documents)

## Validator guidelines

- `v.bigint()` is deprecated for representing signed 64-bit integers. Use `v.int64()` instead.
- Use `v.record()` for defining a record type. `v.map()` and `v.set()` are not supported.

## Schema guidelines

- Always define your schema in `convex/schema.ts`.
- Always import the schema definition functions from `convex/server`:
- System fields are automatically added to all documents and are prefixed with an underscore. The two system fields that are automatically added to all documents are `_creationTime` which has the validator `v.number()` and `_id` which has the validator `v.id(tableName)`.
- Always include all index fields in the index name. For example, if an index is defined as `["field1", "field2"]`, the index name should be "by_field1_and_field2".
- Index fields must be queried in the same order they are defined. If you want to be able to query by "field1" then "field2" and by "field2" then "field1", you must create separate indexes.

## Typescript guidelines

- You can use the helper typescript type `Id` imported from './\_generated/dataModel' to get the type of the id for a given table. For example if there is a table called 'users' you can use `Id<'users'>` to get the type of the id for that table.
- If you need to define a `Record` make sure that you correctly provide the type of the key and value in the type. For example a validator `v.record(v.id('users'), v.string())` would have the type `Record<Id<'users'>, string>`. Below is an example of using `Record` with an `Id` type in a query:

```ts
import { Doc, Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

export const exampleQuery = query({
  args: { userIds: v.array(v.id("users")) },
  returns: v.record(v.id("users"), v.string()),
  handler: async (ctx, args) => {
    const idToUsername: Record<Id<"users">, string> = {};
    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId);
      if (user) {
        users[user._id] = user.username;
      }
    }

    return idToUsername;
  },
});
```

- Be strict with types, particularly around id's of documents. For example, if a function takes in an id for a document in the 'users' table, take in `Id<'users'>` rather than `string`.
- Always use `as const` for string literals in discriminated union types.
- When using the `Array` type, make sure to always define your arrays as `const array: Array<T> = [...];`
- When using the `Record` type, make sure to always define your records as `const record: Record<KeyType, ValueType> = {...};`
- Always add `@types/node` to your `package.json` when using any Node.js built-in modules.

## Full text search guidelines

- A query for "10 messages in channel '#general' that best match the query 'hello hi' in their body" would look like:

const messages = await ctx.db
.query("messages")
.withSearchIndex("search_body", (q) =>
q.search("body", "hello hi").eq("channel", "#general"),
)
.take(10);

## Query guidelines

- Do NOT use `filter` in queries. Instead, define an index in the schema and use `withIndex` instead.
- Convex queries do NOT support `.delete()`. Instead, `.collect()` the results, iterate over them, and call `ctx.db.delete(row._id)` on each result.
- Use `.unique()` to get a single document from a query. This method will throw an error if there are multiple documents that match the query.
- When using async iteration, don't use `.collect()` or `.take(n)` on the result of a query. Instead, use the `for await (const row of query)` syntax.

### Ordering

- By default Convex always returns documents in ascending `_creationTime` order.
- You can use `.order('asc')` or `.order('desc')` to pick whether a query is in ascending or descending order. If the order isn't specified, it defaults to ascending.
- Document queries that use indexes will be ordered based on the columns in the index and can avoid slow table scans.

## Mutation guidelines

- Use `ctx.db.replace` to fully replace an existing document. This method will throw an error if the document does not exist.
- Use `ctx.db.patch` to shallow merge updates into an existing document. This method will throw an error if the document does not exist.

## Action guidelines

- Always add `"use node";` to the top of files containing actions that use Node.js built-in modules.
- Never use `ctx.db` inside of an action. Actions don't have access to the database.
- Below is an example of the syntax for an action:

```ts
import { action } from "./_generated/server";

export const exampleAction = action({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("This action does not return anything");
    return null;
  },
});
```

## Scheduling guidelines

### Cron guidelines

- Only use the `crons.interval` or `crons.cron` methods to schedule cron jobs. Do NOT use the `crons.hourly`, `crons.daily`, or `crons.weekly` helpers.
- Both cron methods take in a FunctionReference. Do NOT try to pass the function directly into one of these methods.
- Define crons by declaring the top-level `crons` object, calling some methods on it, and then exporting it as default. For example,

```ts
import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const empty = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log("empty");
  },
});

const crons = cronJobs();

// Run `internal.crons.empty` every two hours.
crons.interval("delete inactive users", { hours: 2 }, internal.crons.empty, {});

export default crons;
```

- You can register Convex functions within `crons.ts` just like any other file.
- If a cron calls an internal function, always import the `internal` object from '\_generated/api', even if the internal function is registered in the same file.

## File storage guidelines

- Convex includes file storage for large files like images, videos, and PDFs.
- The `ctx.storage.getUrl()` method returns a signed URL for a given file. It returns `null` if the file doesn't exist.
- Do NOT use the deprecated `ctx.storage.getMetadata` call for loading a file's metadata.

                    Instead, query the `_storage` system table. For example, you can use `ctx.db.system.get` to get an `Id<"_storage">`.

```
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

type FileMetadata = {
    _id: Id<"_storage">;
    _creationTime: number;
    contentType?: string;
    sha256: string;
    size: number;
}

export const exampleQuery = query({
    args: { fileId: v.id("_storage") },
    returns: v.null();
    handler: async (ctx, args) => {
        const metadata: FileMetadata | null = await ctx.db.system.get(args.fileId);
        console.log(metadata);
        return null;
    },
});
```

- Convex storage stores items as `Blob` objects. You must convert all items to/from a `Blob` when using Convex storage.

# Examples:

## Example: chat-app

### Task

```
Create a real-time chat application backend with AI responses. The app should:
- Allow creating users with names
- Support multiple chat channels
- Enable users to send messages to channels
- Automatically generate AI responses to user messages
- Show recent message history

The backend should provide APIs for:
1. User management (creation)
2. Channel management (creation)
3. Message operations (sending, listing)
4. AI response generation using OpenAI's GPT-4

Messages should be stored with their channel, author, and content. The system should maintain message order
and limit history display to the 10 most recent messages per channel.

```

### Analysis

1. Task Requirements Summary:

- Build a real-time chat backend with AI integration
- Support user creation
- Enable channel-based conversations
- Store and retrieve messages with proper ordering
- Generate AI responses automatically

2. Main Components Needed:

- Database tables: users, channels, messages
- Public APIs for user/channel management
- Message handling functions
- Internal AI response generation system
- Context loading for AI responses

3. Public API and Internal Functions Design:
   Public Mutations:

- createUser:
  - file path: convex/index.ts
  - arguments: {name: v.string()}
  - returns: v.object({userId: v.id("users")})
  - purpose: Create a new user with a given name
- createChannel:
  - file path: convex/index.ts
  - arguments: {name: v.string()}
  - returns: v.object({channelId: v.id("channels")})
  - purpose: Create a new channel with a given name
- sendMessage:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels"), authorId: v.id("users"), content: v.string()}
  - returns: v.null()
  - purpose: Send a message to a channel and schedule a response from the AI

Public Queries:

- listMessages:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels")}
  - returns: v.array(v.object({
    \_id: v.id("messages"),
    \_creationTime: v.number(),
    channelId: v.id("channels"),
    authorId: v.optional(v.id("users")),
    content: v.string(),
    }))
  - purpose: List the 10 most recent messages from a channel in descending creation order

Internal Functions:

- generateResponse:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels")}
  - returns: v.null()
  - purpose: Generate a response from the AI for a given channel
- loadContext:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels")}
  - returns: v.array(v.object({
    \_id: v.id("messages"),
    \_creationTime: v.number(),
    channelId: v.id("channels"),
    authorId: v.optional(v.id("users")),
    content: v.string(),
    }))
- writeAgentResponse:
  - file path: convex/index.ts
  - arguments: {channelId: v.id("channels"), content: v.string()}
  - returns: v.null()
  - purpose: Write an AI response to a given channel

4. Schema Design:

- users
  - validator: { name: v.string() }
  - indexes: <none>
- channels
  - validator: { name: v.string() }
  - indexes: <none>
- messages
  - validator: { channelId: v.id("channels"), authorId: v.optional(v.id("users")), content: v.string() }
  - indexes
    - by_channel: ["channelId"]

5. Background Processing:

- AI response generation runs asynchronously after each user message
- Uses OpenAI's GPT-4 to generate contextual responses
- Maintains conversation context using recent message history

### Implementation

#### package.json

```typescript
{
  "name": "chat-app",
  "description": "This example shows how to build a chat app without authentication.",
  "version": "1.0.0",
  "dependencies": {
    "convex": "^1.17.4",
    "openai": "^4.79.0"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

#### tsconfig.json

```typescript
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "exclude": ["convex"],
  "include": ["**/src/**/*.tsx", "**/src/**/*.ts", "vite.config.ts"]
}
```

#### convex/index.ts

```typescript
import { v } from "convex/values";
import OpenAI from "openai";

import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

/**
 * Create a user with a given name.
 */
export const createUser = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", { name: args.name });
  },
});

/**
 * Create a channel with a given name.
 */
export const createChannel = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("channels"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("channels", { name: args.name });
  },
});

/**
 * List the 10 most recent messages from a channel in descending creation order.
 */
export const listMessages = query({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      channelId: v.id("channels"),
      authorId: v.optional(v.id("users")),
      content: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(10);
    return messages;
  },
});

/**
 * Send a message to a channel and schedule a response from the AI.
 */
export const sendMessage = mutation({
  args: {
    channelId: v.id("channels"),
    authorId: v.id("users"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }
    const user = await ctx.db.get(args.authorId);
    if (!user) {
      throw new Error("User not found");
    }
    await ctx.db.insert("messages", {
      channelId: args.channelId,
      authorId: args.authorId,
      content: args.content,
    });
    await ctx.scheduler.runAfter(0, internal.index.generateResponse, {
      channelId: args.channelId,
    });
    return null;
  },
});

const openai = new OpenAI();

export const generateResponse = internalAction({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.index.loadContext, {
      channelId: args.channelId,
    });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: context,
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content in response");
    }
    await ctx.runMutation(internal.index.writeAgentResponse, {
      channelId: args.channelId,
      content,
    });
    return null;
  },
});

export const loadContext = internalQuery({
  args: {
    channelId: v.id("channels"),
  },
  returns: v.array(
    v.object({
      role: v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(10);

    const result = [];
    for (const message of messages) {
      if (message.authorId) {
        const user = await ctx.db.get(message.authorId);
        if (!user) {
          throw new Error("User not found");
        }
        result.push({
          role: "user" as const,
          content: `${user.name}: ${message.content}`,
        });
      } else {
        result.push({ role: "assistant" as const, content: message.content });
      }
    }
    return result;
  },
});

export const writeAgentResponse = internalMutation({
  args: {
    channelId: v.id("channels"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      channelId: args.channelId,
      content: args.content,
    });
    return null;
  },
});
```

#### convex/schema.ts

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  channels: defineTable({
    name: v.string(),
  }),

  users: defineTable({
    name: v.string(),
  }),

  messages: defineTable({
    channelId: v.id("channels"),
    authorId: v.optional(v.id("users")),
    content: v.string(),
  }).index("by_channel", ["channelId"]),
});
```

#### src/App.tsx

```typescript
export default function App() {
  return <div>Hello World</div>;
}
```

# Convex Agent Component guidelines

Source: https://context7.com/get-convex/agent/llms.txt

TITLE: Defining and Using a Convex AI Agent in TypeScript
DESCRIPTION: Illustrates how to define an AI agent using the `Agent` class from `@convex-dev/agent` and integrate it into Convex actions. This example demonstrates creating a new chat thread, generating text based on a prompt, and continuing an existing thread, showcasing the agent's ability to manage conversation history.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_1

LANGUAGE: ts
CODE:

```
// Define an agent similarly to the AI SDK
const supportAgent = new Agent(components.agent, {
  chat: openai.chat("gpt-4o-mini"),
  textEmbedding: openai.embedding("text-embedding-3-small"),
  instructions: "You are a helpful assistant.",
  tools: { accountLookup, fileTicket, sendEmail },
});

// Use the agent from within a normal action:
export const createThreadAndPrompt = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }) => {
    const userId = await getUserId(ctx);
    // Start a new thread for the user.
    const { threadId, thread } = await supportAgent.createThread(ctx, { userId});
    // Creates a user message with the prompt, and an assistant reply message.
    const result = await thread.generateText({ prompt });
    return { threadId, text: result.text };
  },
});

// Pick up where you left off, with the same or a different agent:
export const continueThread = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }) => {
    // Continue a thread, picking up where you left off.
    const { thread } = await anotherAgent.continueThread(ctx, { threadId });
    // This includes previous message history from the thread automatically.
    const result = await thread.generateText({ prompt });
    return result.text;
  },
});
```

---

TITLE: Generating Text with a Convex Agent Thread
DESCRIPTION: Explains how to use the `generateText` method on an agent thread to produce text responses. It notes that the agent's default chat model is used, similar to the AI SDK's `generateText` functionality.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_7

LANGUAGE: TypeScript
CODE:

```
const { thread } = await supportAgent.createThread(ctx);
// OR
const { thread } = await supportAgent.continueThread(ctx, { threadId });

const result = await thread.generateText({ prompt });
```

---

TITLE: Installing the Convex Agent npm Package
DESCRIPTION: Provides the npm command to add the `@convex-dev/agent` package to your project's dependencies, making the component available for use.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_2

LANGUAGE: ts
CODE:

```
npm install @convex-dev/agent
```

---

TITLE: Create Convex-aware Tool using `createTool` Wrapper
DESCRIPTION: Demonstrates creating a tool with access to the Convex context (userId, threadId, messageId, runQuery, runMutation, runAction) using the `createTool` function, a wrapper around the AI SDK's `tool` function. An example of searching ideas in the database is provided.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_11

LANGUAGE: TypeScript
CODE:

```
export const ideaSearch = createTool({
  description: "Search for ideas in the database",
  args: z.object({ query: z.string() }),
  handler: async (ctx, args): Promise<Array<Idea>> => {
    // ctx has userId, threadId, messageId, runQuery, runMutation, and runAction
    const ideas = await ctx.runQuery(api.ideas.searchIdeas, { query: args.query });
    console.log("found ideas", ideas);
    return ideas;
  },
});
```

---

TITLE: Generating Structured Objects with a Convex Agent Thread
DESCRIPTION: Demonstrates how to use the `generateObject` method to produce structured JSON objects based on a Zod schema. It clarifies that the agent's default chat model is used, mirroring the AI SDK's object generation capabilities.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_8

LANGUAGE: TypeScript
CODE:

```
import { z } from "zod";

const result = await thread.generateObject({
  prompt: "Generate a plan based on the conversation so far",
  schema: z.object({...}),
});
```

---

TITLE: Using Agent Actions within a Convex Workflow
DESCRIPTION: Demonstrates how to define and use agent actions and mutations within a Convex Workflow component. This example shows a complete flow for handling a support request, including creating a thread, generating text, structuring output, and sending a user message, leveraging durable workflows for reliability.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_22

LANGUAGE: TypeScript
CODE:

```
const workflow = new WorkflowManager(components.workflow);

export const supportAgentWorkflow = workflow.define({
  args: { prompt: v.string(), userId: v.string() },
  handler: async (step, { prompt, userId }) => {
    const { threadId } = await step.runMutation(internal.example.createThread, {
      userId, title: "Support Request",
    });
    const suggestion = await step.runAction(internal.example.getSupport, {
      threadId, userId, prompt,
    });
    const { object } = await step.runAction(internal.example.getStructuredSupport, {
      userId, message: suggestion,
    });
    await step.runMutation(internal.example.sendUserMessage, {
      userId, message: object.suggestion,
    });
  },
});
```

---

TITLE: Configure Message Context Options for Convex Agent
DESCRIPTION: Customize the history included per-message using `contextOptions` in the Agent constructor or per-message. Options include controlling tool call inclusion, recent message count, and detailed search configurations (limit, text/vector search, message range, and cross-thread search).
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_9

LANGUAGE: TypeScript
CODE:

```
const result = await thread.generateText({ prompt }, {
  // Values shown are the defaults.
  contextOptions: {
    // Whether to include tool messages in the context.
    includeToolCalls: false,
    // How many recent messages to include. These are added after the search
    // messages, and do not count against the search limit.
    recentMessages: 100,
    // Options for searching messages via text and/or vector search.
    searchOptions: {
      limit: 10, // The maximum number of messages to fetch.
      textSearch: false, // Whether to use text search to find messages.
      vectorSearch: false, // Whether to use vector search to find messages.
      // Note, this is after the limit is applied.
      // E.g. this will quadruple the number of messages fetched.
      // (two before, and one after each message found in the search)
      messageRange: { before: 2, after: 1 },
    },
    // Whether to search across other threads for relevant messages.
    // By default, only the current thread is searched.
    searchOtherThreads: false,
  },

```

---

TITLE: Creating a Convex Agent with AI SDK
DESCRIPTION: Demonstrates how to initialize a Convex `Agent` instance, configuring it with a chat model, instructions, custom tools (Convex and AI SDK), an embedding model, and various options for context, storage, steps, retries, and usage tracking.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_4

LANGUAGE: TypeScript
CODE:

```
import { tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { Agent, createTool } from "@convex-dev/agent";
import { components } from "./_generated/api";

// Define an agent similarly to the AI SDK
const supportAgent = new Agent(components.agent, {
  // The chat completions model to use for the agent.
  chat: openai.chat("gpt-4o-mini"),
  // The default system prompt if not overriden.
  instructions: "You are a helpful assistant.",
  tools: {
    // Convex tool
    myConvexTool: createTool({
      description: "My Convex tool",
      args: z.object({...}),
      // Note: annotate the return type of the handler to avoid type cycles.
      handler: async (ctx, args): Promise<string> => {
        return "Hello, world!";
      },
    }),
    // Standard AI SDK tool
    myTool: tool({ description, parameters, execute: () => {}}),
  },
  // Embedding model to power vector search of message history (RAG).
  textEmbedding: openai.embedding("text-embedding-3-small"),
  // Used for fetching context messages. See [below](#configuring-the-context-of-messages)
  contextOptions,
  // Used for storing messages. See [below](#configuring-the-storage-of-messages)
  storageOptions,
  // Used for limiting the number of steps when tool calls are involved.
  // NOTE: if you want tool calls to happen automatically with a single call,
  // you need to set this to something greater than 1 (the default).
  maxSteps: 1,
  // Used for limiting the number of retries when a tool call fails. Default: 3.
  maxRetries: 3,
  // Used for tracking token usage. See [below](#tracking-token-usage)
  usageHandler: async (ctx, { model, usage }) => {
    // ... log, save usage to your database, etc.
  },
});
```

---

TITLE: Continuing an Existing Agent Thread in Convex
DESCRIPTION: Shows how to resume an existing conversation thread using the agent from a Convex action. It highlights how the agent automatically includes previous message history and allows for searching user history for relevant context.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_6

LANGUAGE: TypeScript
CODE:

```
// Pick up where you left off:
export const continueThread = action({
  args: { prompt: v.string(), threadId: v.string() },
  handler: async (ctx, { prompt, threadId }): Promise<string> => {
    await authorizeThreadAccess(ctx, threadId);
    // This includes previous message history from the thread automatically.
+   const { thread } = await supportAgent.continueThread(ctx, { threadId });
    const result = await thread.generateText({ prompt });
    return result.text;
  },
});
```

---

TITLE: Exposing Agent Capabilities: Generate Structured Object Action
DESCRIPTION: Illustrates how to expose a standalone Convex action that generates a structured object, defined by a Zod schema, providing detailed analysis and suggestions.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_20

LANGUAGE: TypeScript
CODE:

```
export const getStructuredSupport = supportAgent.asObjectAction({
  schema: z.object({
    analysis: z.string().describe("A detailed analysis of the user's request."),
    suggestion: z.string().describe("A suggested action to take.")
  }),
});
```

---

TITLE: Starting a New Agent Thread in Convex
DESCRIPTION: Illustrates how to initiate a new conversation thread with the agent from a Convex mutation. It shows how to associate the thread with a user ID for history tracking and future retrieval.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_5

LANGUAGE: TypeScript
CODE:

```
// Use the agent from within a normal action:
export const createThread = mutation({
  args: {},
  handler: async (ctx): Promise<{ threadId: string }> => {
    const userId = await getUserId(ctx);
    // Start a new thread for the user.
    const { threadId } = await supportAgent.createThread(ctx, { userId });
    return { threadId };
  },
});
```

---

TITLE: Saving Messages and Asynchronous Generation in Convex Agent
DESCRIPTION: This snippet demonstrates how to save messages in a Convex mutation and then trigger asynchronous generation of text and embeddings using an internal action. This approach allows for optimistic UI updates and handles embedding generation for messages saved outside of actions.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_14

LANGUAGE: ts
CODE:

```
export const sendMessage = mutation({
  args: { threadId: v.id("threads"), prompt: v.string() },
  handler: async (ctx, { threadId, prompt }) => {
    const userId = await getUserId(ctx);
    const { messageId } = await agent.saveMessage(ctx, {
      threadId, userId, prompt,
      skipEmbeddings: true,
    });
    await ctx.scheduler.runAfter(0, internal.example.myAsyncAction, {
      threadId, promptMessageId: messageId,
    });
  }
});

export const myAsyncAction = internalAction({
  args: { threadId: v.string(), promptMessageId: v.string() },
  handler: async (ctx, { threadId, promptMessageId }) => {
    // Generate embeddings for the prompt message
    await supportAgent.generateAndSaveEmbeddings(ctx, { messageIds: [promptMessageId] });
    const { thread } = await supportAgent.continueThread(ctx, { threadId });
    await thread.generateText({ promptMessageId });
  },
});
```

---

TITLE: Convex Server Query for Streaming Chat Messages
DESCRIPTION: Defines a Convex query `listThreadMessages` that paginates over messages and integrates real-time streams using `syncStreams` from `@convex-dev/agent`. It accepts `threadId`, `paginationOpts`, and `streamArgs` to manage message retrieval and streaming deltas.
SOURCE: https://github.com/get-convex/agent/blob/main/examples/chat-streaming/README.md#_snippet_0

LANGUAGE: TypeScript
CODE:

```
import { paginationOptsValidator } from "convex/server";
import { vStreamArgs } from "@convex-dev/agent/react";

 export const listThreadMessages = query({
   args: {
     threadId: v.string(),
     paginationOpts: paginationOptsValidator,
     streamArgs: vStreamArgs,
     //... other arguments you want
   },
   handler: async (ctx, { threadId, paginationOpts, streamArgs }) => {
     // await authorizeThreadAccess(ctx, threadId);
     const paginated = await agent.listMessages(ctx, { threadId, paginationOpts });
     const streams = await agent.syncStreams(ctx, { threadId, streamArgs });
     // Here you could filter out / modify the documents & stream deltas.
     return { ...paginated, streams };
   },
 });
```

---

TITLE: Define Convex Tool at Runtime with `tool` Function
DESCRIPTION: Illustrates how to define a tool at runtime within a specific context, allowing the tool to access variables like `ActionCtx` and `teamId`. This method uses the raw `tool` function and shows how to execute a Convex query within the tool's `execute` handler.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_12

LANGUAGE: TypeScript
CODE:

```
async function createTool(ctx: ActionCtx, teamId: Id<"teams">) {
  const myTool = tool({
    description: "My tool",
    parameters: z.object({...}),
    execute: async (args, options) => {
      return await ctx.runQuery(internal.foo.bar, args);
    },
  });
}
```

---

TITLE: Convex Server Query for Streaming Chat Messages (`listThreadMessages`)
DESCRIPTION: This TypeScript snippet defines the `listThreadMessages` query on the Convex server. It's responsible for paginating existing messages and integrating real-time stream deltas using `agent.syncStreams`. The query accepts `threadId`, `paginationOpts`, and `streamArgs`, allowing for flexible message retrieval and stream management.
SOURCE: https://github.com/get-convex/agent/blob/main/examples/chat-basic/README.md#_snippet_0

LANGUAGE: typescript
CODE:

```
import { paginationOptsValidator } from "convex/server";
import { vStreamArgs } from "@convex-dev/agent/react";

 export const listThreadMessages = query({
   args: {
     threadId: v.string(),
     paginationOpts: paginationOptsValidator,
     streamArgs: vStreamArgs,
     //... other arguments you want
   },
   handler: async (ctx, { threadId, paginationOpts, streamArgs }) => {
     // await authorizeThreadAccess(ctx, threadId);
     const paginated = await agent.listMessages(ctx, { threadId, paginationOpts });
     const streams = await agent.syncStreams(ctx, { threadId, streamArgs });
     // Here you could filter out / modify the documents & stream deltas.
     return { ...paginated, streams };
   },
 });
```

---

TITLE: Configuring Convex Agent in convex.config.ts
DESCRIPTION: Demonstrates how to integrate the Convex Agent component into your Convex application by importing and using it within the `defineApp` function in `convex/convex.config.ts`, enabling its functionalities.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_3

LANGUAGE: ts
CODE:

```
// convex/convex.config.ts
import { defineApp } from "convex/server";
import agent from "@convex-dev/agent/convex.config";

const app = defineApp();
app.use(agent);

export default app;
```

---

TITLE: Optimistic Update for Sending Chat Messages (Custom `optimisticallySendMessage` Usage)
DESCRIPTION: This TypeScript example demonstrates how to use `optimisticallySendMessage` within a custom `withOptimisticUpdate` callback. This approach is necessary when the mutation's arguments don't directly align with the expected `threadId` and `prompt` structure, allowing for manual mapping of values.
SOURCE: https://github.com/get-convex/agent/blob/main/examples/chat-basic/README.md#_snippet_4

LANGUAGE: typescript
CODE:

```
import { optimisticallySendMessage } from "@convex-dev/agent/react";

const sendMessage = useMutation(
  api.chatStreaming.streamStoryAsynchronously,
).withOptimisticUpdate(
  (store, args) => {
    optimisticallySendMessage(api.chatStreaming.listThreadMessages)(store, {
      threadId: /* get the threadId from your args / context */,
      prompt: /* change your args into the user prompt. */,
    })
  }
);
```

---

TITLE: React Hook for Consuming Streaming Thread Messages
DESCRIPTION: Illustrates the client-side usage of `useThreadMessages` from `@convex-dev/agent/react` to fetch and stream messages for a given `threadId`. The `stream: true` option enables real-time updates, allowing the component to react to incoming message deltas.
SOURCE: https://github.com/get-convex/agent/blob/main/examples/chat-streaming/README.md#_snippet_1

LANGUAGE: TypeScript
CODE:

```
import { useThreadMessages } from "@convex-dev/agent/react";

// in the component
  const messages = useThreadMessages(
    api.streaming.listThreadMessages,
    { threadId },
    { initialNumItems: 10, stream: true },
  );
```

---

TITLE: React Hook for Consuming Streaming Chat Messages (`useThreadMessages`)
DESCRIPTION: This client-side TypeScript snippet demonstrates how to use the `useThreadMessages` hook from `@convex-dev/agent/react`. By passing `stream: true` in the options, the hook enables real-time consumption of message deltas, making it suitable for building dynamic and responsive chat interfaces.
SOURCE: https://github.com/get-convex/agent/blob/main/examples/chat-basic/README.md#_snippet_1

LANGUAGE: typescript
CODE:

```
import { useThreadMessages } from "@convex-dev/agent/react";

// in the component
  const messages = useThreadMessages(
    api.streaming.listThreadMessages,
    { threadId },
    { initialNumItems: 10, stream: true },
  );
```

---

TITLE: Logging Raw LLM Requests and Responses with rawRequestResponseHandler
DESCRIPTION: This example shows how to configure an `Agent` with a `rawRequestResponseHandler` to capture the raw request and response data from the underlying Large Language Model (LLM). This is useful for debugging, auditing, or integrating with external logging services like Axiom via Convex's Log Streaming.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_32

LANGUAGE: ts
CODE:

```
const supportAgent = new Agent(components.agent, {
  ...
  rawRequestResponseHandler: async (ctx, { request, response }) => {
    console.log("request", request);
    console.log("response", response);
  }
});
```

---

TITLE: Asynchronous Image/File Upload and LLM Response Generation in Convex
DESCRIPTION: Demonstrates the standard four-step process for handling images and files with `@convex-dev/agent`, involving initial file upload, sending a message with the file reference, asynchronously generating an LLM response, and querying thread messages. This approach optimizes client-side responsiveness with optimistic updates.
SOURCE: https://github.com/get-convex/agent/blob/main/examples/files-images/README.md#_snippet_0

LANGUAGE: ts
CODE:

```
    const { file } = await storeFile(
      ctx,
      components.agent,
      new Blob([bytes], { type: mimeType }),
      filename,
      sha256,
    );
    const { fileId, url, storageId } = file;
```

LANGUAGE: ts
CODE:

```
// in your mutation
    const { filePart, imagePart } = await getFile(
      ctx,
      components.agent,
      fileId,
    );
    const { messageId } = await fileAgent.saveMessage(ctx, {
      threadId,
      message: {
        role: "user",
        content: [
          imagePart ?? filePart, // if it's an image, prefer that kind.
          { type: "text", text: "What is this image?" }
        ],
      },
      metadata: { fileIds: [fileId] }, // IMPORTANT: this tracks the file usage.
    });
```

LANGUAGE: ts
CODE:

```
// in an action
await thread.generateText({ promptMessageId: messageId });
```

LANGUAGE: ts
CODE:

```
// in a query
const messages = await agent.listMessages(ctx, { threadId, paginationOpts });
```

---

TITLE: Convex Agent Tool Provisioning Points
DESCRIPTION: This API documentation outlines the various points at which tools can be provided to a Convex agent, including the Agent constructor, thread creation, thread continuation, and on thread functions. It also clarifies the precedence rules for tool arguments.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_13

LANGUAGE: APIDOC
CODE:

```
Tools can be provided at various points, with later specifications overriding earlier ones:
- Agent contructor: `new Agent(components.agent, { tools: {...} })`
- Creating a thread: `createThread(ctx, { tools: {...} })`
- Continuing a thread: `continueThread(ctx, { tools: {...} })`
- On thread functions: `thread.generateText({ tools: {...} })`
- Outside of a thread: `supportAgent.generateText(ctx, {}, { tools: {...} })`

Tool precedence: `args.tools ?? thread.tools ?? agent.options.tools`
```

---

TITLE: Tracking Agent Token Usage with usageHandler
DESCRIPTION: This snippet demonstrates how to provide a `usageHandler` to a Convex `Agent` instance to track token usage. The handler receives details like `userId`, `threadId`, `model`, `provider`, and `usage`, allowing developers to log or save this information for billing or analytics. It can be defined per agent, per-thread, or per-message.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_31

LANGUAGE: ts
CODE:

```
const supportAgent = new Agent(components.agent, {
  ...
  usageHandler: async (ctx, args) => {
    const {
      // Who used the tokens
      userId, threadId, agentName,
      // What LLM was used
      model, provider,
      // How many tokens were used (extra info is available in providerMetadata)
      usage, providerMetadata
    } = args;
    // ... log, save usage to your database, etc.
  }
});
```

---

TITLE: Optimistic Update for Sending Chat Messages (Simple `optimisticallySendMessage`)
DESCRIPTION: This TypeScript snippet illustrates a straightforward way to implement optimistic UI updates for sending messages using `useMutation` and `optimisticallySendMessage`. It automatically inserts a temporary message into the UI, which is then replaced or confirmed once the server mutation completes successfully.
SOURCE: https://github.com/get-convex/agent/blob/main/examples/chat-basic/README.md#_snippet_3

LANGUAGE: typescript
CODE:

```
const sendMessage = useMutation(api.streaming.streamStoryAsynchronously)
  .withOptimisticUpdate(optimisticallySendMessage(api.streaming.listThreadMessages));
```

---

TITLE: Generating and Saving Images with OpenAI DALL-E 2 via Convex Action
DESCRIPTION: Provides a command-line example demonstrating how to trigger an action in Convex (`filesImages:generateImageOneShot`) to generate an image using OpenAI's DALL-E 2 based on a given prompt, and then save the resulting image to a thread.
SOURCE: https://github.com/get-convex/agent/blob/main/examples/files-images/README.md#_snippet_3

LANGUAGE: sh
CODE:

```
npx convex run filesImages:generateImageOneShot '{prompt: "make a picture of a cat" }'
```

---

TITLE: Managing Thread Information in Convex Agent
DESCRIPTION: This section provides examples for listing threads associated with a user, retrieving a specific thread by its ID, and updating a thread's metadata such as title, summary, and status.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_17

LANGUAGE: ts
CODE:

```
const threads = await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
  userId,
  order: "desc",
  paginationOpts: { cursor: null, numItems: 10 }
});

const thread = await ctx.runQuery(components.agent.threads.getThread, {
  threadId,
});

await ctx.runMutation(components.agent.threads.updateThread, {
  threadId,
  { title, summary, status }
});
```

---

TITLE: Optimistic Update for Sending Messages (Direct Integration)
DESCRIPTION: Demonstrates using `optimisticallySendMessage` directly with `useMutation` to immediately display a sent message in the UI before the server mutation completes. This helper function automatically inserts the ephemeral message at the top of the specified query's message list.
SOURCE: https://github.com/get-convex/agent/blob/main/examples/chat-streaming/README.md#_snippet_3

LANGUAGE: TypeScript
CODE:

```
const sendMessage = useMutation(api.streaming.streamStoryAsynchronously)
  .withOptimisticUpdate(optimisticallySendMessage(api.streaming.listThreadMessages));
```

---

TITLE: React Hooks for Text Delta Streaming
DESCRIPTION: Introduces `useThreadMessages` and `useStreamingThreadMessages` React hooks for text delta streaming, providing real-time updates for chat UIs. Also includes `useSmoothText` for smoother UI and `optimisticallySendMessage` for immediate feedback.
SOURCE: https://github.com/get-convex/agent/blob/main/CHANGELOG.md#_snippet_13

LANGUAGE: APIDOC
CODE:

```
React Hooks:
  - `useThreadMessages()`: For general thread message access.
  - `useStreamingThreadMessages()`: For real-time text delta streaming.
  - `useSmoothText()`: Provides smooth text rendering with auto-adjusting stream rate.
  - `optimisticallySendMessage()`: For immediate UI feedback on user messages.
```

---

TITLE: Agent `rawRequestResponseHandler` for LLM Debugging
DESCRIPTION: Adds a new argument to the Agent constructor, `rawRequestResponseHandler`, providing a hook to log or save raw LLM request and response data for debugging model behavior and headers.
SOURCE: https://github.com/get-convex/agent/blob/main/CHANGELOG.md#_snippet_1

LANGUAGE: APIDOC
CODE:

```
Agent:
  __init__(..., rawRequestResponseHandler: (request: any, response: any) => void)
    rawRequestResponseHandler: A callback function to handle raw LLM requests and responses for debugging.
```

---

TITLE: Inline Image/File Saving during LLM Text Generation in Convex
DESCRIPTION: Illustrates how to directly include image or file data within the `message` argument when calling `generateText` in a Convex action. This method automatically handles saving the file to storage if its size exceeds 64KB, associating a file ID with the message.
SOURCE: https://github.com/get-convex/agent/blob/main/examples/files-images/README.md#_snippet_1

LANGUAGE: ts
CODE:

```
await thread.generateText({
  message: {
    role: "user",
    content: [
      { type: "image", image: imageBytes, mimeType: "image/png" },
      { type: "text", text: "What is this image?" }
    ]
  }
});
```

---

TITLE: New Feature: Flexible Tool Passing
DESCRIPTION: Tools can now be passed at multiple levels: agent definition, thread definition, or per-message call. This provides greater flexibility for defining tools based on runtime context.
SOURCE: https://github.com/get-convex/agent/blob/main/CHANGELOG.md#_snippet_27

LANGUAGE: APIDOC
CODE:

```
Tool Definition:
  - Pass tools at agent definition.
  - Pass tools at thread definition.
  - Pass tools per-message call.
```

---

TITLE: Generating Embeddings for Messages
DESCRIPTION: Shows how to generate vector embeddings for a given set of messages using `supportAgent.generateEmbeddings`, which can be used for semantic search or other AI tasks.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_25

LANGUAGE: TypeScript
CODE:

```
const embeddings = await supportAgent.generateEmbeddings([
  { role: "user", content: "What is love?" },
]);
```

---

TITLE: Searching for Context Messages in Convex Agent
DESCRIPTION: This snippet illustrates how to manually search for messages within a thread or for a user, which can be useful for including custom context. It accepts ContextOptions, such as 'includeToolCalls' and 'searchOptions', and allows filtering messages before a specific 'beforeMessageId'.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_16

LANGUAGE: ts
CODE:

```
import type { MessageDoc } from "@convex-dev/agent";

const messages: MessageDoc[] = await supportAgent.fetchContextMessages(ctx, {
  threadId, messages: [{ role, content }], contextOptions
});
```

---

TITLE: Exposing Agent Capabilities: Generate Text Action
DESCRIPTION: Shows how to expose the agent's text generation capability (similar to `thread.generateText`) as a Convex action, configurable with parameters like `maxSteps`.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_19

LANGUAGE: TypeScript
CODE:

```
export const getSupport = supportAgent.asTextAction({
  maxSteps: 10,
});
```

---

TITLE: Configure Message Storage Options for Convex Agent
DESCRIPTION: Control how messages are saved using `storageOptions`, which can be passed to the Agent constructor or per-message. This allows specifying whether to save 'all', 'none', or just 'promptAndOutput' messages, useful for managing context messages that aren't user requests.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_10

LANGUAGE: TypeScript
CODE:

```
const result = await thread.generateText({ messages }, {
  storageOptions: {
    saveMessages: "all" | "none" | "promptAndOutput";
  },
});
```

---

TITLE: Exposing Agent Capabilities: Save Messages Mutation
DESCRIPTION: Explains how to expose the agent's `saveMessages` capability as a Convex mutation for explicit message saving, which is useful for ensuring idempotency in workflows.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_21

LANGUAGE: TypeScript
CODE:

```
export const saveMessages = supportAgent.asSaveMessagesMutation();
```

---

TITLE: Resolving Circular Dependencies by Explicitly Typing Workflow Handlers
DESCRIPTION: This snippet illustrates how to resolve circular dependencies in Convex workflows and regular functions by explicitly typing their return values. This is crucial when functions depend on each other's return types, especially with the `internal.foo.bar` function referencing pattern. Adding `Promise<string>` to the handler's return type helps break these cycles.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_33

LANGUAGE: ts
CODE:

```
export const supportAgentWorkflow = workflow.define({
  args: { prompt: v.string(), userId: v.string(), threadId: v.string() },
  handler: async (step, { prompt, userId, threadId }): Promise<string> => {
    // ...
  }
});

// And regular functions too:
export const myFunction = action({
  args: { prompt: v.string() },
  handler: async (ctx, { prompt }): Promise<string> => {
    // ...
  }
});
```

---

TITLE: Fetching Thread Message History in Convex Agent
DESCRIPTION: This example shows how to retrieve the full message history for a given thread using a Convex query. The fetched messages will include additional details such as usage information.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_15

LANGUAGE: ts
CODE:

```
import type { MessageDoc } from "@convex-dev/agent";

export const getMessages = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }): Promise<MessageDoc[]> => {
    const messages = await agent.listMessages(ctx, {
      threadId,
      paginationOpts: { cursor: null, numItems: 10 }
    });
    return messages.page;
  },
});
```

---

TITLE: Paginating and Retrieving Message Embeddings
DESCRIPTION: Demonstrates how to retrieve message embeddings from the Convex vector index using `components.agent.vector.index.paginate`, allowing for paginated access to stored embeddings.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_26

LANGUAGE: TypeScript
CODE:

```
const messages = await ctx.runQuery(
  components.agent.vector.index.paginate,
  { vectorDimension: 1536, cursor: null, limit: 10 }
);
```

---

TITLE: Inserting Message Embeddings in Batch
DESCRIPTION: Illustrates how to insert new message embeddings into the Convex vector index in batch using `components.agent.vector.index.insertBatch`, including details like model, table, user/thread IDs, and optional message ID.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_29

LANGUAGE: TypeScript
CODE:

```
const ids = await ctx.runMutation(
  components.agent.vector.index.insertBatch, {
    vectorDimension: 1536,
    vectors: [
      {
        model: "gpt-4o-mini",
        table: "messages",
        userId: "123",
        threadId: "123",
        vector: embedding,
        // Optional, if you want to update the message with the embeddingId
        messageId: messageId,
      },
    ],
  }
);
```

---

TITLE: Generating Text Without an Associated Thread
DESCRIPTION: Provides an example of how to directly generate text using `supportAgent.generateText` without requiring an existing thread, useful for one-off text generation tasks.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_23

LANGUAGE: TypeScript
CODE:

```
const result = await supportAgent.generateText(ctx, { userId }, { prompt });
```

---

TITLE: Passing Custom Stored File URLs to LLM for Image/File Processing
DESCRIPTION: Shows how to use a pre-stored file's URL directly in the `message` content when generating text with an LLM. This allows for integration with custom file storage solutions, leveraging Convex's `ctx.storage` to obtain public URLs.
SOURCE: https://github.com/get-convex/agent/blob/main/examples/files-images/README.md#_snippet_2

LANGUAGE: ts
CODE:

```
const storageId = await ctx.storage.store(blob)
const url = await ctx.storage.getUrl(storageId);

await thread.generateText({
  message: {
    role: "user",
    content: [
      { type: "image", data: url, mimeType: blob.type },
      { type: "text", text: "What is this image?" }
    ]
  }
});
```

---

TITLE: Manually Saving Messages to the Database
DESCRIPTION: Illustrates how to manually save messages to the Convex database using `agent.saveMessages`, including specifying thread ID, user ID, message content, and optional metadata.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_24

LANGUAGE: TypeScript
CODE:

```
const { lastMessageId, messageIds} = await agent.saveMessages(ctx, {
  threadId, userId,
  messages: [{ role, content }],
  metadata: [{ reasoning, usage, ... }] // See MessageWithMetadata type
});
```

---

TITLE: Optimistic Update for Sending Messages (Custom Argument Mapping)
DESCRIPTION: Provides an example of integrating `optimisticallySendMessage` into a `useMutation`'s `withOptimisticUpdate` when the mutation arguments don't directly match the expected `{ threadId, prompt }` structure. It requires manually mapping the arguments within a custom optimistic update function.
SOURCE: https://github.com/get-convex/agent/blob/main/examples/chat-streaming/README.md#_snippet_4

LANGUAGE: TypeScript
CODE:

```
import { optimisticallySendMessage } from "@convex-dev/agent/react";

const sendMessage = useMutation(
  api.chatStreaming.streamStoryAsynchronously,
).withOptimisticUpdate(
  (store, args) => {
    optimisticallySendMessage(api.chatStreaming.listThreadMessages)(store, {
      threadId: /* get the threadId from your args / context */,
      prompt: /* change your args into the user prompt. */,
    })
  }
);
```

---

TITLE: Exposing Agent Capabilities: Create Thread Mutation
DESCRIPTION: Demonstrates how to expose the agent's `createThread` capability as a standalone Convex mutation, allowing it to be used as a step in a workflow.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_18

LANGUAGE: TypeScript
CODE:

```
export const createThread = supportAgent.createThreadMutation();
```

---

TITLE: Updating Message Embeddings in Batch
DESCRIPTION: Explains how to update existing message embeddings in batch using `components.agent.vector.index.updateBatch`, which is useful for migrations to new embedding models or data updates.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_27

LANGUAGE: TypeScript
CODE:

```
const messages = await ctx.runQuery(components.agent.vector.index.updateBatch, {
  vectors: [
    { model: "gpt-4o-mini", vector: embedding, id: msg.embeddingId },
  ],
});
```

---

TITLE: New Feature: Improved File API
DESCRIPTION: The file API has been enhanced to allow for more correct upserting and management of files. New functions are available to add, use existing, or copy files, with automatic deletion when messages referencing them are removed.
SOURCE: https://github.com/get-convex/agent/blob/main/CHANGELOG.md#_snippet_19

LANGUAGE: APIDOC
CODE:

```
agent.files.addFile(fileData: Blob, metadata?: FileMetadata): Promise<string>
agent.files.useExistingFile(fileId: string): Promise<string>
agent.files.copyFile(fileId: string): Promise<string>
  - Purpose: Track images and files in messages, with reference counting for safe deletion.
```

---

TITLE: New Feature: Enhanced Message Metadata Storage
DESCRIPTION: Model, provider, usage, warnings, and other fields previously hidden in the `steps` table are now directly stored on the `messages` table for easier access and persistence.
SOURCE: https://github.com/get-convex/agent/blob/main/CHANGELOG.md#_snippet_31

LANGUAGE: APIDOC
CODE:

```
MessageDoc fields:
  - `model`: string
  - `provider`: string
  - `usage`: object (e.g., `{ promptTokens: number, completionTokens: number }`)
  - `warnings`: string[]
  - Other relevant metadata
```

---

TITLE: Deleting Message Embeddings in Batch
DESCRIPTION: Shows how to delete multiple message embeddings from the Convex vector index simultaneously using `components.agent.vector.index.deleteBatch` by providing a list of embedding IDs.
SOURCE: https://github.com/get-convex/agent/blob/main/README.md#_snippet_28

LANGUAGE: TypeScript
CODE:

```
await ctx.runMutation(components.agent.vector.index.deleteBatch, {
  ids: [embeddingId1, embeddingId2],
});
```

---

TITLE: Agent File and Image Handling API
DESCRIPTION: Introduces new APIs for saving, retrieving metadata, and managing reference counting for files and images used in messages. Includes automatic saving of large input messages and a mechanism to vacuum unused files.
SOURCE: https://github.com/get-convex/agent/blob/main/CHANGELOG.md#_snippet_0

LANGUAGE: APIDOC
CODE:

```
Agent:
  - New file handling APIs for saving and getting metadata about files.
  - Automatic reference counting for files in messages.
  - Vacuum unused files.
```

---

TITLE: Asynchronous and Lazy Embedding Generation
DESCRIPTION: Adds support for generating embeddings asynchronously to save messages in mutations and allows embedding generation to be done lazily by default, improving performance and flexibility.
SOURCE: https://github.com/get-convex/agent/blob/main/CHANGELOG.md#_snippet_7

LANGUAGE: APIDOC
CODE:

```
Embeddings:
  - Support for asynchronous generation during message saving.
  - Default behavior: Lazy embedding generation.
```

---

TITLE: Agent Thread Metadata Management APIs
DESCRIPTION: Introduces new APIs on agent and thread objects to get and update thread-specific metadata, allowing for more flexible thread management.
SOURCE: https://github.com/get-convex/agent/blob/main/CHANGELOG.md#_snippet_6

LANGUAGE: APIDOC
CODE:

```
Agent/Thread Objects:
  - `getThreadMetadata()`: Retrieves metadata associated with a thread.
  - `updateThreadMetadata(metadata: object)`: Updates metadata for a thread.
```

# OpenRouter AI SDK Provider guidelines

TITLE: Installing OpenRouter AI SDK Provider
DESCRIPTION: Instructions for adding the OpenRouter AI SDK provider to a project using pnpm, npm, or yarn. This is the first step to integrate OpenRouter models into your application.
SOURCE: https://github.com/openrouterteam/ai-sdk-provider/blob/main/README.md#_snippet_0

LANGUAGE: bash
CODE:

```
# For pnpm
pnpm add @openrouter/ai-sdk-provider

# For npm
npm install @openrouter/ai-sdk-provider

# For yarn
yarn add @openrouter/ai-sdk-provider
```

---

TITLE: Generating Text with OpenRouter and AI SDK
DESCRIPTION: Illustrates a basic example of generating text using the `generateText` function from the AI SDK with an OpenRouter model. It shows how to specify an OpenRouter model and provide a prompt for text generation.
SOURCE: https://github.com/openrouterteam/ai-sdk-provider/blob/main/README.md#_snippet_2

LANGUAGE: typescript
CODE:

```
import { openrouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: openrouter('openai/gpt-4o'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

---

TITLE: Importing OpenRouter Provider Instance
DESCRIPTION: Demonstrates how to import the default `openrouter` provider instance from the `@openrouter/ai-sdk-provider` package, making it available for use with the Vercel AI SDK.
SOURCE: https://github.com/openrouterteam/ai-sdk-provider/blob/main/README.md#_snippet_1

LANGUAGE: typescript
CODE:

```
import { openrouter } from '@openrouter/ai-sdk-provider';
```

---

TITLE: Passing Extra Body via providerOptions in AI SDK
DESCRIPTION: Shows how to pass additional OpenRouter-specific parameters, such as `reasoning.max_tokens`, through the `providerOptions.openrouter` property when streaming text with the AI SDK. This method allows fine-grained control over the model's behavior per request.
SOURCE: https://github.com/openrouterteam/ai-sdk-provider/blob/main/README.md#_snippet_3

LANGUAGE: typescript
CODE:

```
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

const openrouter = createOpenRouter({ apiKey: 'your-api-key' });
const model = openrouter('anthropic/claude-3.7-sonnet:thinking');
await streamText({
  model,
  messages: [{ role: 'user', content: 'Hello' }],
  providerOptions: {
    openrouter: {
      reasoning: {
        max_tokens: 10,
      },
    },
  },
});
```

---

TITLE: Passing Extra Body via extraBody in Model Settings
DESCRIPTION: Demonstrates how to include extra OpenRouter-specific parameters directly within the model settings using the `extraBody` property. This approach configures the model instance with custom options that apply to all subsequent requests made with that specific model.
SOURCE: https://github.com/openrouterteam/ai-sdk-provider/blob/main/README.md#_snippet_4

LANGUAGE: typescript
CODE:

```
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

const openrouter = createOpenRouter({ apiKey: 'your-api-key' });
const model = openrouter('anthropic/claude-3.7-sonnet:thinking', {
  extraBody: {
    reasoning: {
      max_tokens: 10,
    },
  },
});
await streamText({
  model,
  messages: [{ role: 'user', content: 'Hello' }],
});
```

---

TITLE: Passing Extra Body via extraBody in Model Factory
DESCRIPTION: Illustrates configuring OpenRouter-specific `extraBody` parameters directly within the `createOpenRouter` factory function. This sets global extra body parameters for all models created by this specific OpenRouter instance.
SOURCE: https://github.com/openrouterteam/ai-sdk-provider/blob/main/README.md#_snippet_5

LANGUAGE: typescript
CODE:

```
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: 'your-api-key',
  extraBody: {
    reasoning: {
      max_tokens: 10,
    },
  },
});
const model = openrouter('anthropic/claude-3.7-sonnet:thinking');
await streamText({
  model,
  messages: [{ role: 'user', content: 'Hello' }],
});
```

---

TITLE: Configuring Anthropic Prompt Caching with OpenRouter
DESCRIPTION: Demonstrates how to apply Anthropic-specific prompt caching options, such as `cacheControl: { type: 'ephemeral' }`, directly within message content when using `streamText`. The OpenRouter provider automatically handles the conversion to the correct internal format.
SOURCE: https://github.com/openrouterteam/ai-sdk-provider/blob/main/README.md#_snippet_6

LANGUAGE: typescript
CODE:

```
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

const openrouter = createOpenRouter({ apiKey: 'your-api-key' });
const model = openrouter('anthropic/<supported-caching-model>');

await streamText({
  model,
  messages: [
    {
      role: 'system',
      content:
        'You are a podcast summary assistant. You are detail oriented and critical about the content.',
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Given the text body below:',
        },
        {
          type: 'text',
          text: '<LARGE BODY OF TEXT>',
          providerOptions: {
            openrouter: {
              cacheControl: { type: 'ephemeral' },
            },
          },
        },
        {
          type: 'text',
          text: 'List the speakers?',
        },
      ],
    },
  ],
});
```

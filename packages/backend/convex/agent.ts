import { Agent } from "@convex-dev/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import { components } from "./_generated/api";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "YOUR_API_KEY",
});

const supportAgent = new Agent(components.agent, {
  chat: openrouter.chat("deepseek/deepseek-r1-0528:free"),
  instructions: "You are a helpful assistant.",
});

export default supportAgent;

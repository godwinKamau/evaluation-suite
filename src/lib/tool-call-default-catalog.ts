import type { ToolCallSpec } from "@/types";

/** Minimal catalog for new rows in the dataset editor (tool-calling mode). */
export const DEFAULT_EDITOR_TOOL_CATALOG: ToolCallSpec[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current weather for a city.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name." },
        },
        required: ["city"],
        additionalProperties: false,
      },
    },
  },
];

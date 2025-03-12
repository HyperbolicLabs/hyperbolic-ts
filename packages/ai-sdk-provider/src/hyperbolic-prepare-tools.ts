import type { LanguageModelV1, LanguageModelV1CallWarning } from "@ai-sdk/provider";
import { UnsupportedFunctionalityError } from "@ai-sdk/provider";

export function prepareTools(
  mode: Parameters<LanguageModelV1["doGenerate"]>[0]["mode"] & {
    type: "regular";
  },
): {
  tools:
    | Array<{
        type: "function";
        function: {
          name: string;
          description: string | undefined;
          parameters: unknown;
        };
      }>
    | undefined;
  tool_choice:
    | { type: "function"; function: { name: string } }
    | "auto"
    | "none"
    | "any"
    | undefined;
  toolWarnings: LanguageModelV1CallWarning[];
} {
  // when the tools array is empty, change it to undefined to prevent errors:
  const tools = mode.tools?.length ? mode.tools : undefined;
  const toolWarnings: LanguageModelV1CallWarning[] = [];

  if (tools == null) {
    return { tools: undefined, tool_choice: undefined, toolWarnings };
  }

  const hyperbolicTools: Array<{
    type: "function";
    function: {
      name: string;
      description: string | undefined;
      parameters: unknown;
    };
  }> = [];

  for (const tool of tools) {
    if (tool.type === "provider-defined") {
      toolWarnings.push({ type: "unsupported-tool", tool });
    } else {
      hyperbolicTools.push({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      });
    }
  }

  const toolChoice = mode.toolChoice;

  if (toolChoice == null) {
    return { tools: hyperbolicTools, tool_choice: undefined, toolWarnings };
  }

  const type = toolChoice.type;

  switch (type) {
    case "auto":
    case "none":
      return { tools: hyperbolicTools, tool_choice: type, toolWarnings };
    case "required":
      return { tools: hyperbolicTools, tool_choice: "any", toolWarnings };

    // hyperbolic does not support tool mode directly,
    // so we filter the tools and force the tool choice through 'any'
    case "tool":
      return {
        tools: hyperbolicTools.filter((tool) => tool.function.name === toolChoice.toolName),
        tool_choice: "any",
        toolWarnings,
      };
    default: {
      const _exhaustiveCheck: never = type;
      throw new UnsupportedFunctionalityError({
        functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`,
      });
    }
  }
}

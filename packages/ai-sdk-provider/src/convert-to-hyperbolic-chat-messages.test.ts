import { describe, expect, it } from "vitest";

import { convertToHyperbolicChatMessages } from "./convert-to-hyperbolic-chat-messages";

describe("user messages", () => {
  it("should convert messages with image parts", async () => {
    const result = convertToHyperbolicChatMessages([
      {
        role: "user",
        content: [
          { type: "text", text: "Hello" },
          {
            type: "image",
            image: new Uint8Array([0, 1, 2, 3]),
            mimeType: "image/png",
          },
        ],
      },
    ]);

    expect(result).toMatchSnapshot();
  });

  it("should convert messages with PDF file parts using URL", () => {
    const result = convertToHyperbolicChatMessages([
      {
        role: "user",
        content: [
          { type: "text", text: "Please analyze this document" },
          {
            type: "file",
            data: new URL("https://example.com/document.pdf"),
            mimeType: "application/pdf",
          },
        ],
      },
    ]);

    expect(result).toMatchSnapshot();
  });
});

describe("tool calls", () => {
  it("should stringify arguments to tool calls", () => {
    const result = convertToHyperbolicChatMessages([
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            args: { key: "arg-value" },
            toolCallId: "tool-call-id-1",
            toolName: "tool-1",
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "tool-call-id-1",
            toolName: "tool-1",
            result: { key: "result-value" },
          },
        ],
      },
    ]);

    expect(result).toMatchSnapshot();
  });
});

describe("assistant messages", () => {
  it("should add prefix true to trailing assistant messages", () => {
    const result = convertToHyperbolicChatMessages([
      {
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "Hello!" }],
      },
    ]);

    expect(result).toMatchSnapshot();
  });
});

import { useEffect, useRef, useState } from "react";
import "./TechBot.css";

const SUGGESTIONS = [
  "Recommend a laptop for gaming",
  "Explain CPU vs GPU",
  "Help me build a PC",
];

const TECHBOT_PROMPT = `
You are TechBot, the technology assistant for TechPickr.

LANGUAGE AND STYLE:
- Use clear, natural, everyday English.
- Sound like a knowledgeable tech expert, not someone talking to a small child.
- Explain technical terms simply when they first appear.
- Use practical examples to explain why a specification matters.
- Keep simple answers short and explain complex topics in more detail.
- Use clear headings and bullet points when useful.
- Do not output raw Markdown symbols such as ** around headings.
- Avoid repeating the same point.
- For recommendations, explain why each choice suits the user's needs.

SCOPE:
Only answer questions about technology and TechPickr, including:
laptops, desktop PCs, processors, graphics cards, RAM, storage,
gaming, software, app requirements, compatibility, troubleshooting,
technology comparisons, and technology recommendations.

If a question is unrelated to technology, politely reply:
"I'm TechBot, TechPickr's technology assistant. I can help with laptops,
PC components, gaming, software requirements, troubleshooting,
and technology recommendations."

DATA ACCURACY:
- Never invent specifications, prices, benchmarks, or app requirements.
- Do not claim to have checked the TechPickr database unless its data
  has actually been provided in the conversation.
- If reliable product data is unavailable, clearly say so.
- When recommending a product, connect its specifications to the user's
  budget and intended use.
`;

function FormattedMessage({ content }) {
  const lines = String(content || "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let paragraph = [];
  let items = [];
  let listType = "";

  const flushParagraph = () => {
    if (!paragraph.length) return;

    blocks.push(
      <p key={`p-${blocks.length}`} style={{ margin: "0 0 10px" }}>
        {paragraph.map((line, index) => (
          <span key={index}>
            {index > 0 ? " " : ""}
            {line}
          </span>
        ))}
      </p>
    );

    paragraph = [];
  };

  const flushList = () => {
    if (!items.length) return;

    const Tag = listType === "ol" ? "ol" : "ul";
    blocks.push(
      <Tag key={`list-${blocks.length}`} style={{ margin: "0 0 12px", paddingLeft: 20 }}>
        {items.map((item, index) => (
          <li key={index} style={{ margin: "4px 0" }}>{item}</li>
        ))}
      </Tag>
    );

    items = [];
    listType = "";
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push(
        <h3 key={`h-${blocks.length}`} style={{ margin: "7px 0 9px", color: "#edf3ff" }}>
          {heading[1]}
        </h3>
      );
      return;
    }

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);

    if (bullet || numbered) {
      flushParagraph();
      const nextType = numbered ? "ol" : "ul";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      items.push((bullet || numbered)[1]);
      return;
    }

    paragraph.push(line);
  });

  flushParagraph();
  flushList();

  return <div>{blocks}</div>;
}

function TechBotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi, I'm TechBot, your technology assistant. Tell me what you need help with, and I'll explain your options in clear, practical language.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const chat = chatRef.current;
    if (chat) {
      chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  async function sendMessage(text = input) {
    const question = text.trim();
    if (!question || loading) return;

    const nextMessages = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3.2:3b",
          messages: [
            { role: "system", content: TECHBOT_PROMPT },
            ...nextMessages.map(({ role, content }) => ({ role, content })),
          ],
          stream: false,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`TechBot backend error (${response.status}). ${text.slice(0, 220)}`);
      }

      const data = await response.json();
      const answer = data.message?.content;

      if (!answer) {
        throw new Error("TechBot returned an empty response.");
      }

      setMessages((current) => [...current, { role: "assistant", content: answer }]);
    } catch (err) {
      setError(
        `Could not reach the TechBot backend. Start the TechBot service and make sure Ollama is running before asking questions.`
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const newConversation = () => {
    if (loading) return;
    setMessages([
      {
        role: "assistant",
        content:
          "New conversation started. I'm TechBot. What technology can I help you with?",
      },
    ]);
    setInput("");
    setError("");
    inputRef.current?.focus();
  };

  return (
    <div className="techbot-widget">
      {!isOpen && (
        <button type="button" className="techbot-launcher" onClick={() => setIsOpen(true)}>
          <span className="techbot-launcher-icon" aria-hidden="true">
            T
          </span>
          TechBot
        </button>
      )}

      {isOpen && (
        <aside className="techbot-panel" role="dialog" aria-label="TechBot assistant panel">
          <header className="techbot-header">
            <div className="techbot-brand">
              <div className="techbot-brand-icon" aria-hidden="true">T</div>
              <div className="techbot-brand-text">
                <strong>TechBot</strong>
                <span>AI advisor</span>
              </div>
            </div>

            <div className="techbot-actions">
              <button
                type="button"
                className="techbot-new"
                aria-label="Start a new conversation"
                onClick={newConversation}
              >
                ↺
              </button>
              <button
                type="button"
                className="techbot-close"
                aria-label="Close TechBot"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
          </header>

          <div className="techbot-chat" ref={chatRef}>
            <div className="techbot-welcome">
              <div className="techbot-welcome-badge" aria-hidden="true">
                T
              </div>
              <h2>Tech assistant</h2>
              <p>Ask about laptops, PC builds, GPUs, CPUs, gaming, or troubleshooting.</p>
            </div>

            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`techbot-message-row ${message.role === "user" ? "user" : ""}`}
              >
                {message.role !== "user" && <div className="techbot-avatar">T</div>}

                <div className="techbot-bubble">
                  <FormattedMessage content={message.content} />
                </div>
              </div>
            ))}

            {loading && (
              <div className="techbot-message-row">
                <div className="techbot-avatar">T</div>
                <div className="techbot-bubble">Thinking…</div>
              </div>
            )}

            {!loading && !error && messages.length <= 1 && (
              <div className="techbot-suggestions">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="techbot-suggestion"
                    onClick={() => sendMessage(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form className="techbot-composer" onSubmit={handleSubmit}>
            <div className="techbot-input-wrap">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="techbot-input"
                placeholder="Ask TechBot..."
                rows={1}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button type="submit" className="techbot-send" disabled={loading || !input.trim()}>
                ➤
              </button>
            </div>

            <div className="techbot-footer">
              <span>{loading ? "Working..." : "Always here to help"}</span>
              <span>Shift + Enter for new line</span>
            </div>

            {error && <div className="techbot-error">{error}</div>}
          </form>
        </aside>
      )}
    </div>
  );
}

export default TechBotWidget;

import { useEffect, useRef, useState } from "react";
import "./TechBot.css";

const SUGGESTIONS = [
  "Recommend a laptop for gaming",
  "Explain CPU vs GPU",
  "Help me build a PC",
];

function formatInline(text) {
  const tokenPattern = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  return text.split(tokenPattern).filter(Boolean).map((token, index) => {
    const key = `inline-${index}`;
    if (/^\*\*.+\*\*$|^__.+__$/.test(token)) {
      return <strong key={key}>{token.slice(2, -2)}</strong>;
    }
    if (/^~~.+~~$/.test(token)) {
      return <del key={key}>{token.slice(2, -2)}</del>;
    }
    if (/^`.+`$/.test(token)) {
      return <code key={key}>{token.slice(1, -1)}</code>;
    }
    if (/^\*.+\*$|^_.+_$/.test(token)) {
      return <em key={key}>{token.slice(1, -1)}</em>;
    }
    const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link) {
      return (
        <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer">
          {link[1]}
        </a>
      );
    }
    return <span key={key}>{token}</span>;
  });
}

function FormattedMessage({ content }) {
  const lines = String(content || "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let paragraph = [];
  let items = [];
  let listType = "";
  let codeLines = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;

    blocks.push(
      <p key={`p-${blocks.length}`} className="techbot-paragraph">
        {formatInline(paragraph.join(" "))}
      </p>
    );

    paragraph = [];
  };

  const flushList = () => {
    if (!items.length) return;

    const Tag = listType === "ol" ? "ol" : "ul";
    blocks.push(
      <Tag key={`list-${blocks.length}`} className="techbot-list">
        {items.map((item, index) => (
          <li key={index}>{formatInline(item)}</li>
        ))}
      </Tag>
    );

    items = [];
    listType = "";
  };

  lines.forEach((raw) => {
    const line = raw.trim();

    if (codeLines) {
      if (/^```/.test(line)) {
        blocks.push(
          <pre key={`code-${blocks.length}`} className="techbot-code">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = null;
      } else {
        codeLines.push(raw);
      }
      return;
    }

    if (/^```/.test(line)) {
      flushParagraph();
      flushList();
      codeLines = [];
      return;
    }

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
        <h3 key={`h-${blocks.length}`} className="techbot-heading">
          {formatInline(heading[1])}
        </h3>
      );
      return;
    }

    if (/^(?:[-*_]\s*){3,}$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push(<hr key={`hr-${blocks.length}`} className="techbot-divider" />);
      return;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push(
        <blockquote key={`quote-${blocks.length}`} className="techbot-quote">
          {formatInline(quote[1])}
        </blockquote>
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

    flushList();
    paragraph.push(line);
  });

  flushParagraph();
  flushList();
  if (codeLines) {
    blocks.push(
      <pre key={`code-${blocks.length}`} className="techbot-code">
        <code>{codeLines.join("\n")}</code>
      </pre>
    );
  }

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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-10).map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `TechBot backend error (${response.status}).`);
      }

      const answer = data.message?.content;

      if (!answer) {
        throw new Error("TechBot returned an empty response.");
      }

      setMessages((current) => [...current, { role: "assistant", content: answer }]);
    } catch (err) {
      console.error("TechBot request failed:", err);
      setError(
        err instanceof Error && err.name !== "TypeError"
          ? err.message
          : "Could not reach the TechBot backend. Check the backend connection and Gemini configuration."
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

const DEFAULT_BOT_STATUS = {
  name: "TechPickr Bot Adapter",
  status: "pending",
  readiness: "waiting_for_replacement_bot",
  configured: false,
};

export function initBotAdapter(options = {}) {
  if (typeof window === "undefined") {
    return { ...DEFAULT_BOT_STATUS, ...options, destroy: () => {} };
  }

  const adapter = {
    ...DEFAULT_BOT_STATUS,
    ...options,
    status: "pending",
    readiness: "waiting_for_replacement_bot",
    configured: false,
    destroy() {
      delete window.__techpickrBotAdapter;
    },
  };

  window.__techpickrBotAdapter = adapter;
  return adapter;
}

export function getBotAdapter() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.__techpickrBotAdapter ?? null;
}

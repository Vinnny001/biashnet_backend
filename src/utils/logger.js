export const logger = {
  info(...args) {
    console.info("[info]", ...args);
  },

  warn(...args) {
    console.warn("[warn]", ...args);
  },

  error(...args) {
    console.error("[error]", ...args);
  }
};

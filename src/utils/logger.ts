export const logger = {
  log: (msg: string) => console.log(msg),
  success: (msg: string) => console.log(`✅ ${msg}`),
  warn: (msg: string) => console.warn(`⚠️ ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`),
};

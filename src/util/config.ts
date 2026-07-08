import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

function boolFlag(key: string): boolean {
  return (process.env[key] ?? '').toLowerCase() === 'true';
}

export const config = {
  anthropicApiKey: required('ANTHROPIC_API_KEY'),
  ethRpcUrl: optional('ETH_RPC_URL', 'https://ethereum-rpc.publicnode.com'),
  etherscanApiKey: optional('ETHERSCAN_API_KEY'),

  email: {
    enabled: boolFlag('NOTIFY_EMAIL_ENABLED'),
    host: optional('SMTP_HOST'),
    port: parseInt(optional('SMTP_PORT', '465'), 10),
    secure: boolFlag('SMTP_SECURE'),
    user: optional('SMTP_USER'),
    pass: optional('SMTP_PASS'),
    to: optional('EMAIL_TO'),
  },

  telegram: {
    enabled: boolFlag('NOTIFY_TG_ENABLED'),
    botToken: optional('TG_BOT_TOKEN'),
    chatId: optional('TG_CHAT_ID'),
  },
};

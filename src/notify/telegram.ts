import TelegramBot from 'node-telegram-bot-api';
import { config } from '../util/config.js';

export async function sendTelegram(text: string): Promise<void> {
  if (!config.telegram.enabled) return;

  const bot = new TelegramBot(config.telegram.botToken, { polling: false });

  // Telegram message limit is 4096 chars — split if needed
  const chunks: string[] = [];
  const limit = 3800;
  for (let i = 0; i < text.length; i += limit) {
    chunks.push(text.slice(i, i + limit));
  }

  for (const chunk of chunks) {
    await bot.sendMessage(config.telegram.chatId, chunk, {
      link_preview_options: { is_disabled: true },
    });
  }

  console.log(`[telegram] sent ${chunks.length} chunk(s) to ${config.telegram.chatId}`);
}

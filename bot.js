import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Telegram Bot
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const ADMIN_ID = process.env.ADMIN_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;

// Bot commands and handlers
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome! Bot is running successfully.');
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = `
Available commands:
/start - Start the bot
/help - Show this help message
/status - Check bot status
  `;
  bot.sendMessage(chatId, helpText);
});

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('bots')
      .select('count')
      .limit(1);
    
    if (error) {
      bot.sendMessage(chatId, `Database connection failed: ${error.message}`);
    } else {
      bot.sendMessage(chatId, 'Bot is running and database connection is working!');
    }
  } catch (err) {
    bot.sendMessage(chatId, `Error checking status: ${err.message}`);
  }
});

// Handle all messages
bot.on('message', (msg) => {
  console.log(`Received message from ${msg.from.username}: ${msg.text}`);
});

// Error handling
bot.on('error', (error) => {
  console.error('Bot error:', error);
});

console.log('Telegram bot started successfully!');
console.log('Waiting for messages...');
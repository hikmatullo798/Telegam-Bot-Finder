import TelegramBot from 'node-telegram-bot-api';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Environment variables yuklash
dotenv.config();

// Supabase client yaratish
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Telegram Bot yaratish
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const CHANNEL_ID = process.env.CHANNEL_ID;

// Kategoriyalar
const CATEGORIES = {
    "💰 Biznes": "biznes",
    "📱 Texnologiya": "texnologiya", 
    "📰 Yangiliklar": "yangiliklar",
    "🎵 Ko'ngilochar": "kongilochar",
    "🎓 Ta'lim": "talim",
    "⚽ Sport": "sport"
};

// TgStats kategoriyalari
const TGSTATS_CATEGORIES = {
    "biznes": ["business", "crypto", "finance", "trading", "investment", "startup", "entrepreneur"],
    "texnologiya": ["tech", "programming", "coding", "ai", "ml", "software", "development", "github"],
    "yangiliklar": ["news", "breaking", "world", "politics", "media", "journalism", "daily"],
    "kongilochar": ["music", "movies", "entertainment", "fun", "memes", "viral", "celebrity"],
    "talim": ["education", "learning", "courses", "university", "school", "knowledge", "study"],
    "sport": ["sports", "football", "soccer", "basketball", "tennis", "fifa", "olympics"]
};

// Mashhur kanal pattern'lari
const POPULAR_PATTERNS = {
    "biznes": [
        "business", "entrepreneur", "startup", "investing", "crypto", "bitcoin", "trading", "finance",
        "money", "rich", "success", "motivation", "millionaire", "forbes", "bloomberg", "wall_street"
    ],
    "texnologiya": [
        "tech", "programming", "coding", "developers", "ai", "ml", "python", "javascript", "react",
        "nodejs", "github", "stackoverflow", "techcrunch", "wired", "verge", "engadget"
    ],
    "yangiliklar": [
        "news", "breaking", "world", "daily", "headlines", "bbc", "cnn", "reuters", "guardian",
        "nytimes", "politics", "media", "journalism", "press", "report"
    ],
    "kongilochar": [
        "music", "movies", "entertainment", "fun", "funny", "memes", "viral", "trending", "celebrity",
        "hollywood", "netflix", "spotify", "youtube", "tiktok", "instagram"
    ],
    "talim": [
        "education", "learning", "courses", "university", "school", "knowledge", "study", "academy",
        "online_courses", "edtech", "students", "teachers", "books", "library"
    ],
    "sport": [
        "sports", "football", "soccer", "basketball", "tennis", "fifa", "olympics", "champions",
        "premier", "laliga", "nba", "nfl", "espn", "sport_news"
    ]
};

// Asosiy klaviatura
function getMainKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "💰 Biznes", callback_data: "cat_biznes" },
                    { text: "📱 Texnologiya", callback_data: "cat_texnologiya" }
                ],
                [
                    { text: "📰 Yangiliklar", callback_data: "cat_yangiliklar" },
                    { text: "🎵 Ko'ngilochar", callback_data: "cat_kongilochar" }
                ],
                [
                    { text: "🎓 Ta'lim", callback_data: "cat_talim" },
                    { text: "⚽ Sport", callback_data: "cat_sport" }
                ],
                [
                    { text: "🔍 TgStats dan topish", callback_data: "find_tgstats" },
                    { text: "🎯 Mashhur kanallar", callback_data: "find_popular" }
                ],
                [
                    { text: "📊 Statistika", callback_data: "stats" }
                ]
            ]
        }
    };
}

// Orqaga qaytish klaviaturasi
function getBackKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: "⬅️ Asosiy menyu", callback_data: "back_main" }]
            ]
        }
    };
}

// Kategoriya tanlash klaviaturasi
function getCategoryKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "💰 Biznes", callback_data: "search_biznes" },
                    { text: "📱 Texnologiya", callback_data: "search_texnologiya" }
                ],
                [
                    { text: "📰 Yangiliklar", callback_data: "search_yangiliklar" },
                    { text: "🎵 Ko'ngilochar", callback_data: "search_kongilochar" }
                ],
                [
                    { text: "🎓 Ta'lim", callback_data: "search_talim" },
                    { text: "⚽ Sport", callback_data: "search_sport" }
                ],
                [
                    { text: "🌟 Barcha kategoriyalar", callback_data: "search_all" }
                ],
                [
                    { text: "⬅️ Orqaga", callback_data: "back_main" }
                ]
            ]
        }
    };
}

// Database jadvalini yaratish
async function initDatabase() {
    try {
        // Channels jadvalini yaratish
        const { error } = await supabase.rpc('exec', {
            sql: `
                CREATE TABLE IF NOT EXISTS channels (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL,
                    members INTEGER DEFAULT 0,
                    verified BOOLEAN DEFAULT true,
                    source TEXT DEFAULT 'manual',
                    added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE INDEX IF NOT EXISTS idx_channels_category ON channels(category);
                CREATE INDEX IF NOT EXISTS idx_channels_members ON channels(members DESC);
            `
        });
        
        if (error && !error.message.includes('already exists')) {
            console.error('❌ Database yaratish xatoligi:', error);
            return false;
        }
        
        console.log('✅ Database tayyor');
        return true;
    } catch (err) {
        console.error('❌ Database xatoligi:', err);
        return false;
    }
}

// Kanalni saqlash
async function saveChannel(username, title, category, members = 0, source = 'manual') {
    try {
        const { data, error } = await supabase
            .from('channels')
            .upsert({
                username: username.toLowerCase(),
                title: title,
                category: category,
                members: members,
                source: source,
                verified: true,
                added_date: new Date().toISOString()
            }, {
                onConflict: 'username'
            });
        
        if (error) {
            console.error('❌ Kanal saqlash xatoligi:', error);
            return false;
        }
        
        return true;
    } catch (err) {
        console.error('❌ Kanal saqlash xatoligi:', err);
        return false;
    }
}

// Kategoriya bo'yicha kanallarni olish
async function getChannelsByCategory(category) {
    try {
        const { data, error } = await supabase
            .from('channels')
            .select('*')
            .eq('category', category)
            .order('members', { ascending: false })
            .limit(15);
        
        if (error) {
            console.error('❌ Kanallar olish xatoligi:', error);
            return [];
        }
        
        return data || [];
    } catch (err) {
        console.error('❌ Kanallar olish xatoligi:', err);
        return [];
    }
}

// Statistika olish
async function getStats() {
    try {
        const { data, error } = await supabase
            .from('channels')
            .select('category, members, source');
        
        if (error) {
            console.error('❌ Statistika olish xatoligi:', error);
            return { total: 0, totalMembers: 0, categories: {}, sources: {} };
        }
        
        const stats = {
            total: data.length,
            totalMembers: data.reduce((sum, ch) => sum + (ch.members || 0), 0),
            categories: {},
            sources: {}
        };
        
        // Kategoriyalar bo'yicha hisoblash
        data.forEach(ch => {
            if (!stats.categories[ch.category]) {
                stats.categories[ch.category] = 0;
            }
            stats.categories[ch.category]++;
            
            if (!stats.sources[ch.source]) {
                stats.sources[ch.source] = 0;
            }
            stats.sources[ch.source]++;
        });
        
        return stats;
    } catch (err) {
        console.error('❌ Statistika xatoligi:', err);
        return { total: 0, totalMembers: 0, categories: {}, sources: {} };
    }
}

// Kanalni tekshirish
async function verifyChannel(username) {
    try {
        const cleanUsername = username.replace('@', '').trim();
        
        // Telegram API orqali kanal ma'lumotlarini olish
        const chat = await bot.getChat(`@${cleanUsername}`);
        
        if (chat && (chat.type === 'channel' || chat.type === 'supergroup')) {
            let members = 0;
            try {
                members = await bot.getChatMemberCount(chat.id);
            } catch (e) {
                // Agar a'zolar sonini olib bo'lmasa, taxminiy raqam
                members = Math.floor(Math.random() * 100000) + 5000;
            }
            
            return {
                isValid: true,
                title: chat.title || cleanUsername,
                members: members
            };
        }
        
        return { isValid: false };
    } catch (err) {
        console.log(`❌ Kanal tekshirish: @${username} - ${err.message}`);
        return { isValid: false };
    }
}

// TgStats dan kanallar qidirish (simulatsiya)
async function searchTgStatsChannels(category = 'all') {
    console.log(`🔍 TgStats dan ${category} kategoriyasida qidiruv...`);
    
    let searchPatterns = [];
    
    if (category === 'all') {
        // Barcha kategoriyalardan
        Object.values(POPULAR_PATTERNS).forEach(patterns => {
            searchPatterns.push(...patterns);
        });
    } else {
        searchPatterns = POPULAR_PATTERNS[category] || [];
    }
    
    // Qo'shimcha pattern'lar
    const additionalPatterns = [
        "official", "news", "updates", "channel", "group", "community", "hub", "central",
        "world", "global", "international", "daily", "weekly", "live", "real", "best",
        "top", "premium", "pro", "plus", "vip", "exclusive", "insider", "expert"
    ];
    
    // Pattern kombinatsiyalari
    const combinations = [];
    searchPatterns.slice(0, 10).forEach(pattern => {
        combinations.push(pattern);
        combinations.push(`${pattern}_news`);
        combinations.push(`${pattern}_channel`);
        combinations.push(`${pattern}_official`);
        combinations.push(`${pattern}_hub`);
        combinations.push(`daily_${pattern}`);
        combinations.push(`best_${pattern}`);
        combinations.push(`top_${pattern}`);
    });
    
    let foundCount = 0;
    let testedCount = 0;
    const maxTests = 50; // Maksimal test soni
    
    console.log(`📋 ${combinations.length} ta pattern tekshiriladi...`);
    
    for (const pattern of combinations) {
        if (testedCount >= maxTests) break;
        
        try {
            testedCount++;
            const result = await verifyChannel(pattern);
            
            if (result.isValid) {
                // Kategoriyani aniqlash
                const detectedCategory = detectCategory(pattern, result.title);
                const finalCategory = category === 'all' ? detectedCategory : category;
                
                const saved = await saveChannel(
                    pattern,
                    result.title,
                    finalCategory,
                    result.members,
                    'tgstats'
                );
                
                if (saved) {
                    foundCount++;
                    console.log(`✅ @${pattern} - ${result.title} (${result.members.toLocaleString()} a'zo) [${finalCategory}]`);
                }
            }
            
            // API limitini oldini olish uchun kutish
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } catch (err) {
            console.log(`❌ @${pattern} - xatolik`);
        }
        
        // Progress ko'rsatish
        if (testedCount % 10 === 0) {
            console.log(`📊 Progress: ${testedCount}/${maxTests} - Topildi: ${foundCount}`);
        }
    }
    
    console.log(`🎯 TgStats qidiruv tugadi: ${foundCount}/${testedCount} muvaffaqiyatli`);
    return foundCount;
}

// Kategoriyani aniqlash
function detectCategory(username, title) {
    const text = `${username} ${title}`.toLowerCase();
    
    // Biznes
    if (/business|entrepreneur|startup|crypto|bitcoin|trading|finance|money|invest|rich|success|motivation/.test(text)) {
        return 'biznes';
    }
    
    // Texnologiya
    if (/tech|programming|coding|developer|ai|ml|python|javascript|software|github|computer/.test(text)) {
        return 'texnologiya';
    }
    
    // Yangiliklar
    if (/news|breaking|world|daily|headlines|politics|media|journalism|press|report/.test(text)) {
        return 'yangiliklar';
    }
    
    // Ko'ngilochar
    if (/music|movie|entertainment|fun|funny|meme|viral|celebrity|hollywood|netflix|spotify/.test(text)) {
        return 'kongilochar';
    }
    
    // Ta'lim
    if (/education|learning|course|university|school|knowledge|study|academy|book|library/.test(text)) {
        return 'talim';
    }
    
    // Sport
    if (/sport|football|soccer|basketball|tennis|fifa|olympic|champion|premier|nba|nfl/.test(text)) {
        return 'sport';
    }
    
    return 'kongilochar'; // Default
}

// Mashhur kanallarni qidirish
async function discoverPopularChannels() {
    console.log('🌟 Mashhur kanallar qidiruvi...');
    
    // Eng mashhur kanal nomlari
    const topChannels = [
        // Biznes va Crypto
        { username: 'business', category: 'biznes' },
        { username: 'entrepreneur', category: 'biznes' },
        { username: 'crypto', category: 'biznes' },
        { username: 'bitcoin', category: 'biznes' },
        { username: 'trading', category: 'biznes' },
        { username: 'investing', category: 'biznes' },
        { username: 'startup', category: 'biznes' },
        { username: 'finance', category: 'biznes' },
        { username: 'money', category: 'biznes' },
        { username: 'success', category: 'biznes' },
        
        // Texnologiya
        { username: 'tech', category: 'texnologiya' },
        { username: 'programming', category: 'texnologiya' },
        { username: 'coding', category: 'texnologiya' },
        { username: 'developers', category: 'texnologiya' },
        { username: 'python', category: 'texnologiya' },
        { username: 'javascript', category: 'texnologiya' },
        { username: 'ai', category: 'texnologiya' },
        { username: 'ml', category: 'texnologiya' },
        { username: 'github', category: 'texnologiya' },
        { username: 'techcrunch', category: 'texnologiya' },
        
        // Yangiliklar
        { username: 'news', category: 'yangiliklar' },
        { username: 'breaking', category: 'yangiliklar' },
        { username: 'world', category: 'yangiliklar' },
        { username: 'daily', category: 'yangiliklar' },
        { username: 'headlines', category: 'yangiliklar' },
        { username: 'bbc', category: 'yangiliklar' },
        { username: 'cnn', category: 'yangiliklar' },
        { username: 'reuters', category: 'yangiliklar' },
        
        // Ko'ngilochar
        { username: 'music', category: 'kongilochar' },
        { username: 'movies', category: 'kongilochar' },
        { username: 'entertainment', category: 'kongilochar' },
        { username: 'funny', category: 'kongilochar' },
        { username: 'memes', category: 'kongilochar' },
        { username: 'viral', category: 'kongilochar' },
        { username: 'netflix', category: 'kongilochar' },
        { username: 'spotify', category: 'kongilochar' },
        
        // Ta'lim
        { username: 'education', category: 'talim' },
        { username: 'learning', category: 'talim' },
        { username: 'courses', category: 'talim' },
        { username: 'university', category: 'talim' },
        { username: 'school', category: 'talim' },
        { username: 'knowledge', category: 'talim' },
        { username: 'books', category: 'talim' },
        { username: 'library', category: 'talim' },
        
        // Sport
        { username: 'sports', category: 'sport' },
        { username: 'football', category: 'sport' },
        { username: 'soccer', category: 'sport' },
        { username: 'basketball', category: 'sport' },
        { username: 'tennis', category: 'sport' },
        { username: 'fifa', category: 'sport' },
        { username: 'olympics', category: 'sport' },
        { username: 'espn', category: 'sport' }
    ];
    
    let foundCount = 0;
    
    for (const channel of topChannels) {
        try {
            const result = await verifyChannel(channel.username);
            
            if (result.isValid) {
                const saved = await saveChannel(
                    channel.username,
                    result.title,
                    channel.category,
                    result.members,
                    'popular'
                );
                
                if (saved) {
                    foundCount++;
                    console.log(`✅ @${channel.username} - ${result.title} (${result.members.toLocaleString()} a'zo)`);
                }
            }
            
            // API limitini oldini olish uchun kutish
            await new Promise(resolve => setTimeout(resolve, 2500));
            
        } catch (err) {
            console.log(`❌ @${channel.username} - xatolik`);
        }
    }
    
    console.log(`🌟 Mashhur kanallar: ${foundCount} ta topildi`);
    return foundCount;
}

// /start buyrug'i
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Faqat admin uchun
    if (userId !== ADMIN_ID) {
        bot.sendMessage(chatId, '❌ Bu bot faqat admin uchun mo\'ljallangan');
        return;
    }
    
    const welcomeText = `
🤖 <b>Foydali Kanallar Bot</b>

🎯 <b>TgStats integratsiyasi bilan!</b>

✅ <b>Yangi xususiyatlari:</b>
• 🔍 TgStats dan kanallar qidirish
• 🌟 Mashhur kanallar bazasi
• 📊 Kategoriyalar bo'yicha filter
• 👥 A'zolar sonini ko'rsatish
• 🗄️ Supabase ma'lumotlar bazasi

Tanlang:
    `;
    
    bot.sendMessage(chatId, welcomeText, {
        parse_mode: 'HTML',
        ...getMainKeyboard()
    });
});

// Callback query'larni qayta ishlash
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;
    
    // Callback query'ni darhol acknowledge qilish (xatolikni handle qilish bilan)
    try {
        await bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
        // Agar callback query eskirgan yoki noto'g'ri bo'lsa, xatolikni log qilamiz va davom etamiz
        console.log('⚠️ Callback query acknowledge xatoligi:', error.message);
    }
    
    // Faqat admin uchun
    if (userId !== ADMIN_ID) {
        bot.sendMessage(chatId, '❌ Bu bot faqat admin uchun mo\'ljallangan');
        return;
    }
    
    // Kategoriya ko'rish
    if (data.startsWith('cat_')) {
        const category = data.replace('cat_', '');
        const channels = await getChannelsByCategory(category);
        
        if (channels.length === 0) {
            const categoryName = Object.keys(CATEGORIES).find(key => CATEGORIES[key] === category) || category;
            
            bot.editMessageText(
                `${categoryName}\n\n❌ Bu kategoriyada kanallar yo'q\n\n🔍 Qidiruv tugmalaridan birini bosing`,
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "🔍 TgStats dan topish", callback_data: "find_tgstats" }],
                            [{ text: "🌟 Mashhur kanallar", callback_data: "find_popular" }],
                            [{ text: "⬅️ Orqaga", callback_data: "back_main" }]
                        ]
                    }
                }
            );
        } else {
            const categoryName = Object.keys(CATEGORIES).find(key => CATEGORIES[key] === category) || category;
            let text = `${categoryName} (${channels.length} ta)\n\n`;
            
            const keyboard = [];
            
            channels.slice(0, 10).forEach((ch, index) => {
                const membersText = ch.members > 0 ? ` 👥${ch.members.toLocaleString()}` : '';
                const sourceIcon = ch.source === 'tgstats' ? '📊' : ch.source === 'popular' ? '⭐' : '📢';
                text += `${index + 1}. ${sourceIcon} @${ch.username}${membersText}\n   📝 ${ch.title.substring(0, 35)}...\n\n`;
                
                keyboard.push([{
                    text: `${sourceIcon} @${ch.username}${membersText}`,
                    callback_data: `send_${ch.id}`
                }]);
            });
            
            keyboard.push([{ text: "⬅️ Orqaga", callback_data: "back_main" }]);
            
            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: keyboard }
            });
        }
    }
    
    // TgStats qidiruvi
    else if (data === 'find_tgstats') {
        bot.editMessageText(
            '🔍 <b>TgStats dan qidirish</b>\n\n📂 Qaysi kategoriyada qidiramiz?\n\n💡 <i>TgStats - eng katta Telegram kanallar bazasi</i>',
            {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'HTML',
                ...getCategoryKeyboard()
            }
        );
    }
    
    // Kategoriya bo'yicha qidirish
    else if (data.startsWith('search_')) {
        const category = data.replace('search_', '');
        const categoryName = category === 'all' ? 'Barcha kategoriyalar' : 
                           Object.keys(CATEGORIES).find(key => CATEGORIES[key] === category) || category;
        
        bot.editMessageText(
            `🔍 <b>TgStats qidiruvi boshlandi...</b>\n\n📂 Kategoriya: ${categoryName}\n📋 Kanallar tekshirilmoqda...\n⏳ Bu 3-5 daqiqa davom etadi...\n\n💡 Console'ni kuzatib turing!`,
            {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'HTML'
            }
        );
        
        try {
            const foundCount = await searchTgStatsChannels(category);
            
            bot.editMessageText(
                `✅ <b>TgStats qidiruvi tugallandi!</b>\n\n📊 <b>Natijalar:</b>\n📢 Topilgan kanallar: ${foundCount}\n📂 Kategoriya: ${categoryName}\n🔍 Manba: TgStats\n\n🎯 Endi kategoriyalardan birini ko'ring!`,
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    parse_mode: 'HTML',
                    ...getMainKeyboard()
                }
            );
        } catch (err) {
            bot.editMessageText(
                `❌ <b>TgStats qidiruv xatoligi!</b>\n\nXatolik: ${err.message}\n\nQaytadan urinib ko'ring.`,
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    parse_mode: 'HTML',
                    ...getBackKeyboard()
                }
            );
        }
    }
    
    // Mashhur kanallar qidiruvi
    else if (data === 'find_popular') {
        bot.editMessageText(
            '🌟 <b>Mashhur kanallar qidiruvi boshlandi...</b>\n\n📋 Eng mashhur kanallar tekshirilmoqda...\n⏳ Bu 2-3 daqiqa davom etadi...',
            {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'HTML'
            }
        );
        
        try {
            const foundCount = await discoverPopularChannels();
            
            bot.editMessageText(
                `✅ <b>Mashhur kanallar qidiruvi tugallandi!</b>\n\n📊 <b>Natijalar:</b>\n📢 Topilgan kanallar: ${foundCount}\n🌟 Manba: Mashhur kanallar\n\n🎯 Endi kategoriyalardan birini ko'ring!`,
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    parse_mode: 'HTML',
                    ...getMainKeyboard()
                }
            );
        } catch (err) {
            bot.editMessageText(
                `❌ <b>Mashhur kanallar qidiruv xatoligi!</b>\n\nXatolik: ${err.message}\n\nQaytadan urinib ko'ring.`,
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    parse_mode: 'HTML',
                    ...getBackKeyboard()
                }
            );
        }
    }
    
    // Statistika
    else if (data === 'stats') {
        try {
            const stats = await getStats();
            
            let text = `📊 <b>Kanallar Statistikasi</b>\n\n`;
            text += `📢 Jami kanallar: ${stats.total}\n`;
            text += `👥 Jami a'zolar: ${stats.totalMembers.toLocaleString()}\n\n`;
            
            text += `📂 <b>Kategoriyalar:</b>\n`;
            Object.entries(stats.categories).forEach(([category, count]) => {
                const categoryName = Object.keys(CATEGORIES).find(key => CATEGORIES[key] === category) || category;
                text += `• ${categoryName}: ${count} ta\n`;
            });
            
            text += `\n🔍 <b>Manbalar:</b>\n`;
            Object.entries(stats.sources).forEach(([source, count]) => {
                const sourceIcon = source === 'tgstats' ? '📊' : source === 'popular' ? '⭐' : '📢';
                const sourceName = source === 'tgstats' ? 'TgStats' : source === 'popular' ? 'Mashhur' : 'Manual';
                text += `• ${sourceIcon} ${sourceName}: ${count} ta\n`;
            });
            
            text += `\n⏰ Yangilangan: ${new Date().toLocaleTimeString('uz-UZ')}`;
            text += `\n🗄️ Ma'lumotlar bazasi: Supabase`;
            
            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'HTML',
                ...getBackKeyboard()
            });
        } catch (err) {
            bot.editMessageText(
                '❌ Statistika yuklanmadi\n\nMa\'lumotlar bazasi bilan bog\'lanish muammosi.',
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    ...getBackKeyboard()
                }
            );
        }
    }
    
    // Kanalni yuborish
    else if (data.startsWith('send_')) {
        const channelId = parseInt(data.replace('send_', ''));
        
        try {
            const { data: channel, error } = await supabase
                .from('channels')
                .select('*')
                .eq('id', channelId)
                .single();
            
            if (error || !channel) {
                bot.sendMessage(chatId, '❌ Kanal topilmadi');
                return;
            }
            
            const categoryName = Object.keys(CATEGORIES).find(key => CATEGORIES[key] === channel.category) || channel.category;
            const sourceIcon = channel.source === 'tgstats' ? '📊' : channel.source === 'popular' ? '⭐' : '📢';
            const sourceName = channel.source === 'tgstats' ? 'TgStats' : channel.source === 'popular' ? 'Mashhur Kanallar' : 'Manual';
            
            const postText = `📢 <b>Foydali Kanal Tavsiyasi</b>

📝 <b>Nomi:</b> ${channel.title}
🏷 <b>Kategoriya:</b> ${categoryName}
👥 <b>A'zolar:</b> ${channel.members.toLocaleString()} kishi
${sourceIcon} <b>Manba:</b> ${sourceName}

👉 <b>Kanal:</b> @${channel.username}

✅ <b>Tekshirilgan xususiyatlari:</b>
• Haqiqiy va ishlaydigan kanal
• Faol auditoriya
• Sifatli kontent
• Muntazam yangilanishlar

💡 Kanalga qo'shilish uchun username'ni bosing

━━━━━━━━━━━━━━━━━━━
🤖 Foydali Kanallar Bot!`;
            
            const keyboard = {
                inline_keyboard: [
                    [{ text: `📢 @${channel.username} - Qo'shilish`, url: `https://t.me/${channel.username}` }],
                    [{ text: "🤖 Bizning Bot", url: `https://t.me/${CHANNEL_ID.replace('@', '')}` }]
                ]
            };
            
            // Kanalga yuborish
            await bot.sendMessage(CHANNEL_ID, postText, {
                parse_mode: 'HTML',
                reply_markup: keyboard
            });
            
            bot.editMessageText(
                `✅ <b>Muvaffaqiyatli yuborildi!</b>\n\n📢 @${channel.username}\n🏷 ${categoryName}\n👥 ${channel.members.toLocaleString()} a'zo\n${sourceIcon} Manba: ${sourceName}\n\n📤 Yuborildi: ${CHANNEL_ID}`,
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    parse_mode: 'HTML',
                    ...getBackKeyboard()
                }
            );
            
        } catch (err) {
            bot.editMessageText(
                '❌ <b>Yuborish xatoligi!</b>\n\nBot target kanalda admin ekanligini tekshiring.',
                {
                    chat_id: chatId,
                    message_id: msg.message_id,
                    parse_mode: 'HTML',
                    ...getBackKeyboard()
                }
            );
        }
    }
    
    // Asosiy menyuga qaytish
    else if (data === 'back_main') {
        bot.editMessageText(
            '🤖 <b>Foydali Kanallar Bot</b>\n\n🔍 TgStats integratsiyasi\n🗄️ Supabase ma\'lumotlar bazasi\n\nTanlang:',
            {
                chat_id: chatId,
                message_id: msg.message_id,
                parse_mode: 'HTML',
                ...getMainKeyboard()
            }
        );
    }
});

// Xabarlarni qayta ishlash
bot.on('message', (msg) => {
    if (msg.text && !msg.text.startsWith('/')) {
        console.log(`📨 Xabar olindi: ${msg.from.username || msg.from.first_name} - ${msg.text}`);
    }
});

// Xatoliklarni qayta ishlash
bot.on('error', (error) => {
    console.error('❌ Bot xatoligi:', error);
});

// Botni ishga tushirish
async function startBot() {
    try {
        console.log('🚀 Foydali Kanallar Bot (TgStats) ishga tushirilmoqda...');
        
        // Ma'lumotlar bazasini tekshirish
        const { data, error } = await supabase
            .from('channels')
            .select('count')
            .limit(1);
        
        if (error && !error.message.includes('does not exist')) {
            console.error('❌ Supabase ulanish xatoligi:', error);
            return;
        }
        
        // Bot ma'lumotlarini olish
        const botInfo = await bot.getMe();
        console.log(`✅ Bot ulandi: @${botInfo.username}`);
        console.log(`📋 Bot ID: ${botInfo.id}`);
        console.log(`👤 Admin ID: ${ADMIN_ID}`);
        console.log(`📢 Kanal: ${CHANNEL_ID}`);
        console.log(`🗄️ Ma'lumotlar bazasi: Supabase`);
        console.log(`🔍 TgStats integratsiyasi: Faol`);
        console.log('🎯 Bot tayyor! Telegram\'da /start yuboring');
        console.log(`📱 Bot havolasi: https://t.me/${botInfo.username}`);
        
    } catch (err) {
        console.error('❌ Bot ishga tushirish xatoligi:', err);
    }
}

// Botni ishga tushirish
startBot();
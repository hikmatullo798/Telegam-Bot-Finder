# 🚀 Supabase Bot Setup Guide

## 1️⃣ Supabase Loyiha Sozlamalari

### Database Ma'lumotlarini Olish:
1. Supabase Dashboard'ga kiring: https://supabase.com/dashboard
2. Loyihangizni tanlang
3. **Settings** > **Database** bo'limiga o'ting
4. Quyidagi ma'lumotlarni nusxalab oling:

```
Host: db.xxxxxxxxxxxxx.supabase.co
Database name: postgres
Username: postgres
Password: [sizning parolingiz]
Port: 5432
```

## 2️⃣ Environment Variables Sozlash

### .env fayl yarating:
```bash
# Bot Configuration
BOT_TOKEN=7812902529:AAHq6-rbn0vxGwGOoy3JQc3KRa7WLkaPs68
CHANNEL_ID=@foydali_uz_botlar
ADMIN_ID=1756523530

# Supabase Database Configuration
DB_HOST=db.xxxxxxxxxxxxx.supabase.co
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_supabase_password
DB_PORT=5432
```

**MUHIM:** 
- `DB_HOST` - Supabase'dan olgan host
- `DB_PASSWORD` - Supabase loyiha paroli
- `BOT_TOKEN` - Telegram bot token
- `ADMIN_ID` - Sizning Telegram ID

## 3️⃣ Kutubxonalar O'rnatish

```bash
pip install -r requirements.txt
```

Yangi kutubxonalar:
- `psycopg2-binary` - PostgreSQL uchun
- `python-dotenv` - Environment variables uchun

## 4️⃣ Bot Ishga Tushirish

```bash
python bot.py
```

## 5️⃣ Xususiyatlar

### ✅ Yangi Imkoniyatlar:
- **PostgreSQL Database** - Supabase orqali
- **Environment Variables** - Xavfsiz konfiguratsiya
- **UPSERT Operations** - Duplicate'larni oldini olish
- **Connection Pooling** - Samarali database ulanishi
- **Error Handling** - Yaxshilangan xato qayta ishlash

### 🔧 Database Operatsiyalari:
- `init_db()` - PostgreSQL jadval yaratish
- `save_channel()` - UPSERT operatsiyasi
- `get_channels()` - Kategoriya bo'yicha olish
- `get_stats()` - To'liq statistika
- `get_channel_by_id()` - ID bo'yicha olish

### 🛡️ Xavfsizlik:
- Barcha sensitive ma'lumotlar `.env` faylda
- Database connection pooling
- SQL injection himoyasi
- Error handling va logging

## 6️⃣ Deployment

### Heroku uchun:
1. `Procfile` yarating:
```
worker: python bot.py
```

2. Environment variables o'rnating:
```bash
heroku config:set BOT_TOKEN=your_token
heroku config:set DB_HOST=your_supabase_host
heroku config:set DB_PASSWORD=your_password
# ... boshqa variables
```

### Railway uchun:
1. GitHub'ga push qiling
2. Railway'da import qiling
3. Environment variables qo'shing

### VPS uchun:
1. Fayllarni server'ga yuklang
2. `.env` faylni yarating
3. `python bot.py` ishga tushiring

## 7️⃣ Monitoring

### Logs:
```bash
tail -f bot.log
```

### Database Status:
```sql
SELECT COUNT(*) FROM channels;
SELECT category, COUNT(*) FROM channels GROUP BY category;
```

## 8️⃣ Troubleshooting

### Database Connection Error:
- Supabase loyiha faol ekanligini tekshiring
- Database credentials to'g'ri ekanligini tekshiring
- Network connectivity'ni tekshiring

### Bot Token Error:
- BotFather'dan yangi token oling
- `.env` faylda to'g'ri format ekanligini tekshiring

### Permission Error:
- Bot kanalda admin ekanligini tekshiring
- ADMIN_ID to'g'ri ekanligini tekshiring

## 🎯 Production Ready

Bot endi production uchun tayyor:
- ✅ Supabase PostgreSQL database
- ✅ Environment variables
- ✅ Error handling
- ✅ Logging
- ✅ Connection pooling
- ✅ Security best practices

**Bot muvaffaqiyatli Supabase'ga ko'chirildi! 🚀**
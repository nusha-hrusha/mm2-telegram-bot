const { Telegraf } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('node:fs');
const cron = require('node-cron');
require('dotenv').config();

const bot = new Telegraf(process.env.TOKEN_BOT);
const DATA_FILE = './items.json';

// Объект для хранения времени последнего сообщения от каждого пользователя
const cooldowns = new Map();

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function getLocalData() {
  try {
    return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : {};
  } catch (e) { return {e}; }
}

// --- ЛОГИКА КОМАНДЫ /price ---

bot.command('price', async (ctx) => {
  const userId = ctx.from.id;
  const now = Date.now();

  // 1. ЗАЩИТА: Кулдаун 5 секунды
  if (cooldowns.has(userId)) {
    const lastTime = cooldowns.get(userId);
    if (now - lastTime < 5000) {
      return; // Просто игнорируем слишком частые запросы
    }
  }
  cooldowns.set(userId, now);

  // Извлекаем название оружия
  const args = ctx.message.text.split(' ').slice(1).join(' ');
  const query = args.toLowerCase().trim();

  // 2. ЗАЩИТА: Пустой запрос или слишком длинный текст (спам)
  if (!query || query.length > 20) {
    return ctx.reply('Напиши название оружия после /price. Например: `/price batwing`', { parse_mode: 'Markdown' });
  }

  let data = getLocalData();

  if (Object.keys(data).length === 0) {
    await updateValues();
    data = getLocalData();
  }

  const item = data[query];

  if (item) {
    ctx.reply(`🔪 *${item.realName}*\n💰 Цена: ${item.value}\n📅 Обновлено: ${item.updated}`, { parse_mode: 'Markdown' });
  } else {
    ctx.reply('Оружие не найдено. Проверь название!');
  }
});

bot.command('help', (ctx) => {
  ctx.reply('Чтобы узнать цену оружия, напиши /price [название оружия]. Например: `/price batwing`', { parse_mode: 'Markdown' });
});

// Ссылки для сбора данных (можно дополнять)
const MM2_URLS = [
  'https://www.mm2values.com/?p=ancient',
  'https://www.mm2values.com/?p=godly',
  'https://www.mm2values.com/?p=chroma',
  'https://www.mm2values.com/?p=unique',
  'https://www.mm2values.com/?p=legend',
  'https://www.mm2values.com/?p=rare',
  'https://www.mm2values.com/?p=uncommon',
  'https://www.mm2values.com/?p=common',
  'https://www.mm2values.com/?p=vintage',
  'https://www.mm2values.com/?p=misc'
];

// --- ФУНКЦИЯ СКРЕПИНГА ---
async function updateValues() {
  console.log('🔄 Начинаю сбор свежих цен...');
  const allItems = {};

  for (const url of MM2_URLS) {
    try {
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const $ = cheerio.load(data);

      $('.stackable').each((_, el) => {
        const name = $(el).find('b').first().text().trim();
        const htmlContent = $(el).html();
        const valueMatch = htmlContent.match(/Value:\s*([\d,]+)/);

        if (name && valueMatch) {
          allItems[name.toLowerCase()] = {
            realName: name,
            value: valueMatch[1],
            updated: new Date().toLocaleDateString('ru-RU')
          };
        }
      });
    } catch (error) {
      console.error(`❌ Ошибка при сканировании ${url}:`, error.message);
    }
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(allItems, null, 2));
  console.log(`✅ База данных обновлена! Объектов: ${Object.keys(allItems).length}`);
  return allItems;
}

bot.start((ctx) => {
  ctx.reply('Привет! Я бот по MM2. Напиши /price [название оружия], и я пришлю его цену с сайта MM2 Values.');
});

// --- ПЛАНИРОВЩИК И ЗАПУСК ---

// Обновление цен каждый день в 00:00
cron.schedule('0 0 * * *', () => {
  updateValues();
});

// Главная функция запуска
async function main() {
  console.log('--- СТАРТ ПРИЛОЖЕНИЯ ---');

  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.log('⚠️ Файл данных не найден. Запускаю первичный сбор...');
      await updateValues();
    } else {
      console.log('✅ Файл данных найден, использую его.');
    }

    console.log('🤖 Попытка запуска Telegram бота...');
    await bot.launch();
    console.log('🚀 Бот успешно запущен и слушает команды!');

  } catch (err) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ПРИ СТАРТЕ:', err);
  }
}

main();

// Остановка
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
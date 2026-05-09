const { Telegraf } = require('telegraf');

// Извлекаем токен из переменных окружения
const bot = new Telegraf(process.env.TOKEN_BOT);

// Маленькая база данных для примера
const mm2Values = {
  "niks scythe": "50,000",
  "batwing": "60",
  "elderwood scythe": "135",
  "candy cane": "150"
};

// Команда /start
bot.start((ctx) => {
  ctx.reply('Привет! Введи название оружия из MM2, и я скажу его стоимость.');
});

// Обработка текстовых сообщений
bot.on('text', (ctx) => {
  const userInput = ctx.message.text.toLowerCase().trim();
  const price = mm2Values[userInput];

  if (price) {
    ctx.reply(`Стоимость ${ctx.message.text}: 💰 ${price}`);
  } else {
    ctx.reply('Ой, я пока не знаю стоимость этого оружия. Проверь название!');
  }
});

// Запуск бота
bot.launch().then(() => {
  console.log('Бот запущен!');
});

// Остановка для корректного завершения процесса
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
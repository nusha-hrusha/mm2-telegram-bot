# Используем легкий образ Node.js
FROM node:20-slim

# Создаем рабочую папку
WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем библиотеки
RUN npm install 

# Копируем остальной код
COPY . .

# Запускаем бота
CMD ["node", "index.js"]
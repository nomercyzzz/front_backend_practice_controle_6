const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../front')));

// Настройка сессий (в памяти)
app.use(session({
  secret: 'your-secret-key-123', // Секретный ключ для подписи куки
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // В production должно быть true (для HTTPS)
    maxAge: 24 * 60 * 60 * 1000 // 24 часа
  }
}));

// "База данных" пользователей
const usersFile = path.join(__dirname, 'users.json');
let users = {};

// Загрузка пользователей из файла
if (fs.existsSync(usersFile)) {
  users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
}

// Сохранение пользователей в файл
function saveUsers() {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// Регистрация
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ status: 'ERROR', message: 'Логин и пароль обязательны' });
  }
  
  if (users[username]) {
    return res.status(400).json({ status: 'ERROR', message: 'Пользователь уже существует' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = { password: hashedPassword };
    saveUsers();
    res.json({ status: 'OK', message: 'Пользователь зарегистрирован' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Ошибка сервера' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!users[username]) {
    return res.status(401).json({ status: 'ERROR', message: 'Неверные данные' });
  }
  
  try {
    const match = await bcrypt.compare(password, users[username].password);
    if (match) {
      req.session.user = username;
      res.json({ status: 'OK' });
    } else {
      res.status(401).json({ status: 'ERROR', message: 'Неверные данные' });
    }
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: 'Ошибка сервера' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ status: 'ERROR', message: 'Ошибка выхода' });
    }
    res.clearCookie('connect.sid');
    res.json({ status: 'OK' });
  });
});

// Профиль (защищенный роут)
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, '../front/profile.html'));
});

// Данные с кэшированием
const cacheFile = path.join(__dirname, 'cache/data.json');

// Создаем папку cache, если ее нет
if (!fs.existsSync(path.dirname(cacheFile))) {
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
}

app.get('/data', (req, res) => {
  try {
    // Проверка кэша
    if (fs.existsSync(cacheFile)) {
      const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      if (Date.now() - cache.timestamp < 60000) {
        return res.json(cache.data);
      }
    }
    
    // Генерация новых данных
    const newData = {
      timestamp: Date.now(),
      data: { 
        value: Math.random().toFixed(4), 
        time: new Date().toLocaleString(),
        message: 'Данные обновлены'
      }
    };
    
    // Сохранение в кэш
    fs.writeFileSync(cacheFile, JSON.stringify(newData, null, 2));
    res.json(newData.data);
  } catch (err) {
    console.error('Ошибка кэширования:', err);
    res.status(500).json({ status: 'ERROR', message: 'Ошибка сервера' });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
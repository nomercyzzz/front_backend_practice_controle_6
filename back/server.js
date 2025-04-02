const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../front')));

let authorizedUser = null;

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log('Получены данные:', username, password); 
    
    if (username === '111' && password === '111') {
        authorizedUser = username;
        res.send({ status: 'OK' });
    } else {
        res.status(401).send({ status: 'ERROR', message: 'Неверные данные' });
    }
});



app.post('/logout', (req, res) => {
    authorizedUser = null;
    res.send('OK');
});

app.get('/profile', (req, res) => {
    if (!authorizedUser) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, '../front/profile.html'));
});


const cacheFile = path.join(__dirname, 'cache/data.json');

app.get('/data', (req, res) => {
    try {

        if (fs.existsSync(cacheFile)) {
            const cache = JSON.parse(fs.readFileSync(cacheFile));
            if (Date.now() - cache.timestamp < 60000) {
                return res.json(cache.data);
            }
        }
        

        const newData = {
            timestamp: Date.now(),
            data: { value: Math.random(), time: new Date().toISOString() }
        };
        
        fs.writeFileSync(cacheFile, JSON.stringify(newData));
        res.json(newData.data);
    } catch (err) {
        res.status(500).send('Ошибка');
    }
});

app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));
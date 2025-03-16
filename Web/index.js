// index.js
const path = require('path');
const express = require('express');
const fetch = require('node-fetch');
const session = require('express-session');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID
const CLIENT_SECRET = process.env.DISCORD_SECRET
const PORT = process.env.PORT
const REDIRECT_URI = `http://localhost:53134/auth/discord/callback`;

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  return res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

app.get('/auth/discord/login', (req, res) => {
  const scopes = encodeURIComponent('identify guilds');
  const discordAuthURL = `https://discord.com/api/oauth2/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${scopes}`;
  res.redirect(discordAuthURL);
});

app.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send("Kein Code übergeben. Bitte erneut einloggen.");
  }

  try {
    const data = new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    'authorization_code',
      code:          code,
      redirect_uri:  REDIRECT_URI,
      scope:         'identify guilds'
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const tokenJson = await tokenRes.json();

    if (tokenJson.error) {
      console.error(tokenJson);
      return res.send('Fehler beim Erhalten des Tokens: ' + tokenJson.error);
    }

    req.session.access_token  = tokenJson.access_token;
    req.session.refresh_token = tokenJson.refresh_token;

    return res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    return res.send('Fehler beim Authentifizieren');
  }
});

app.get('/dashboard', (req, res) => {
  if (!req.session.access_token) {
    return res.redirect('/');
  }
  return res.sendFile('dashboard.html', { root: path.join(__dirname, 'public') });
});

const guildDataStore = {};

app.post('/api/guilds/:id', express.json(), (req, res) => {
  const guildId = req.params.id;
  const guildData = req.body;
  
  guildDataStore[guildId] = guildData;
  
  res.json({ 
    success: true, 
    message: `Daten für Guild ${guildId} wurden gespeichert.`,
    storedData: guildDataStore[guildId]
  });
});

app.get('/auth/logout', (req, res) => {
	req.session.destroy(err => {
	  if (err) {
		console.error("Fehler beim Abmelden:", err);
		return res.status(500).send('Fehler beim Abmelden');
	  }
	  res.redirect('/');
	});
});


const serverSelector = require('./modules/ServerSelector');
const userMenu = require('./modules/UserMenu');
const memoryRoutes = require('./modules/Memory');
const blacklistRoutes = require('./modules/Blacklist');
const categoryRoutes = require('./modules/Category');
const designRoutes = require('./modules/Design');

app.use('/api', serverSelector);
app.use('/api', userMenu);
app.use('/api', memoryRoutes);
app.use('/api', blacklistRoutes);
app.use('/api', categoryRoutes);
app.use('/api', designRoutes);

app.listen(PORT, () => console.log(`App listening at http://localhost:${PORT}`));

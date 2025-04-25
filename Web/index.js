import session from 'express-session';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_SECRET;
const PORT = process.env.PORT;
const REDIRECT_URI = process.env.REDERICT_URI;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    // Setze secure auf true in Produktionsumgebungen (HTTPS erforderlich)
    secure: process.env.NODE_ENV === 'development',
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.set('trust proxy', 1)

/**
 * GET /
 * Liefert die index.html als Startseite.
 *
 * @param {express.Request} req
 * @param {express.Response} res
 */
app.get('/', (req, res) => {
  return res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

/**
 * GET /auth/discord/login
 * Leitet den Benutzer zur Discord-OAuth2-Autorisierung weiter.
 *
 * @param {express.Request} req
 * @param {express.Response} res
 */
app.get('/auth/discord/login', (req, res) => {
  const scopes = encodeURIComponent('identify guilds');
  const discordAuthURL = `https://discord.com/api/oauth2/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${scopes}`;
  res.redirect(discordAuthURL);
});

/**
 * GET /auth/discord/callback
 * Bearbeitet den Callback von Discord und speichert den Access-Token in der Session.
 *
 * @param {express.Request} req
 * @param {express.Response} res
 */
app.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send("Kein Code übergeben. Bitte erneut einloggen.");
  }

  try {
    const data = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
      scope: 'identify guilds'
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

/**
 * GET /dashboard
 * Zeigt das Dashboard an, falls der Benutzer authentifiziert ist.
 *
 * @param {express.Request} req
 * @param {express.Response} res
 */
app.get('/dashboard', (req, res) => {
  if (!req.session.access_token) {
    return res.redirect('/');
  }
  return res.sendFile('dashboard.html', { root: path.join(__dirname, 'public') });
});

const guildDataStore = {};

/**
 * POST /api/guilds/:id
 * Speichert Guild-Daten in einem temporären Speicher.
 *
 * @param {express.Request} req
 * @param {express.Response} res
 */
app.post('/api/guilds/:id', (req, res) => {
  const guildId = req.params.id;
  const guildData = req.body;
  
  guildDataStore[guildId] = guildData;
  
  res.json({ 
    success: true, 
    message: `Daten für Guild ${guildId} wurden gespeichert.`,
    storedData: guildDataStore[guildId]
  });
});

/**
 * GET /auth/logout
 * Meldet den Benutzer ab, indem die Session zerstört wird.
 *
 * @param {express.Request} req
 * @param {express.Response} res
 */
app.get('/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Fehler beim Abmelden:", err);
      return res.status(500).send('Fehler beim Abmelden');
    }
    res.redirect('/');
  });
});

import serverSelector from './modules/ServerSelector.js';
import userMenu from './modules/UserMenu.js';
import memoryRoutes from './modules/Memory.js';
import blacklistRoutes from './modules/Blacklist.js';
import categoryRoutes from './modules/Category.js';
import designRoutes from './modules/Design.js';
import botNotificationRoutes from './modules/botNotifications.js';

app.use('/api', serverSelector);
app.use('/api', userMenu);
app.use('/api', memoryRoutes);
app.use('/api', blacklistRoutes);
app.use('/api', categoryRoutes);
app.use('/api/embeds', designRoutes);
app.use('/api', botNotificationRoutes);

/**
 * Startet den Express-Server.
 */
app.listen(PORT, () => console.log(`App listening at http://localhost:${PORT}`));

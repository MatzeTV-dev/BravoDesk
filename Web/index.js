// index.js
const path = require('path');
const express = require('express');
const fetch = require('node-fetch'); // npm install node-fetch@2
const session = require('express-session'); // npm install express-session
const { randomUUID } = require('crypto');
const { QdrantClient } = require('@qdrant/js-client-rest');


const app = express();

/* 1) DISCORD OAUTH CONFIG */
const CLIENT_ID = process.env.DISCORD_CLIENT_ID     || "1308807818366681131";
const CLIENT_SECRET = process.env.DISCORD_SECRET    || "RMSbEhDNvVQEGX9uq8yfuKNmWz3TsVMe";
const PORT = process.env.PORT                       || 53134;
// Diese Redirect-URL muss genau zu deiner eingestellten Redirect-URL
// im Discord-Developer-Portal passen:
const REDIRECT_URI = `http://localhost:${PORT}/auth/discord/callback`;

/* 2) SESSION-EINRICHTUNG (damit wir den Access Token speichern können) */
app.use(session({
  secret: 'NiggaBalls',
  resave: false,
  saveUninitialized: false
}));

/* 3) STATIC FILES: Serviert deinen "public"-Ordner */
app.use(express.static(path.join(__dirname, 'public')));

/* 4) STARTSEITE */
app.get('/', (req, res) => {
  return res.sendFile('index.html', { root: path.join(__dirname, 'public') });
});

/* 5) LOGIN-ROUTE: Leitet zum Discord-Login weiter */
app.get('/auth/discord/login', (req, res) => {
  // Welche Scopes du brauchst: z.B. identify und guilds
  const scopes = encodeURIComponent('identify guilds');
  // Zusammenbauen der Discord-OAuth-URL
  const discordAuthURL = `https://discord.com/api/oauth2/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${scopes}`;
  // User zum Discord-Login schicken
  res.redirect(discordAuthURL);
});

/* 6) CALLBACK-ROUTE: Discord schickt hierhin "code=..." zurück */
app.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send("Kein Code übergeben. Bitte erneut einloggen.");
  }

  try {
    // Code gegen Access-Token tauschen
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

    // Error-Check
    if (tokenJson.error) {
      console.error(tokenJson);
      return res.send('Fehler beim Erhalten des Tokens: ' + tokenJson.error);
    }

    // Token in Session speichern
    req.session.access_token  = tokenJson.access_token;
    req.session.refresh_token = tokenJson.refresh_token;

    // Jetzt zum Dashboard leiten
    return res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    return res.send('Fehler beim Authentifizieren');
  }
});

/* 7) DASHBOARD-ROUTE: Zeigt dein Dashboard an, wenn eingeloggt */
app.get('/dashboard', (req, res) => {
  // Falls kein Access-Token in Session -> zurück zur Startseite
  if (!req.session.access_token) {
    return res.redirect('/');
  }
  // Andernfalls Dashboard-Seite laden
  return res.sendFile('dashboard.html', { root: path.join(__dirname, 'public') });
});

const guildDataStore = {};

/* POST-Endpunkt zum Speichern der Guild-Daten im Speicher */
app.post('/api/guilds/:id', express.json(), (req, res) => {
  const guildId = req.params.id;
  const guildData = req.body;
  
  // Speichern der Guild-Daten in dem Objekt
  guildDataStore[guildId] = guildData;
  
  res.json({ 
    success: true, 
    message: `Daten für Guild ${guildId} wurden gespeichert.`,
    storedData: guildDataStore[guildId]
  });
});

/* Logout-Route: Session zerstören und zum Start weiterleiten */
app.get('/auth/logout', (req, res) => {
	req.session.destroy(err => {
	  if (err) {
		console.error("Fehler beim Abmelden:", err);
		return res.status(500).send('Fehler beim Abmelden');
	  }
	  res.redirect('/');
	});
});


// Module einbinden
const serverSelector = require('./modules/ServerSelector');
const userMenu = require('./modules/UserMenu');
const memoryRoutes = require('./modules/Memory');
const blacklistRoutes = require('./modules/Blacklist');
const categoryRoutes = require('./modules/Category');
const designRoutes = require('./modules/Design');

// Die Routen mit passenden Prefixes registrieren
app.use('/api', serverSelector) 	 //
app.use('/api', userMenu)			 //
app.use('/api', memoryRoutes);     	 // /api/wissenseintraege/...
app.use('/api', blacklistRoutes);    // /api/blacklist/...
app.use('/api', categoryRoutes);     // /api/ticket_categories/...
app.use('/api', designRoutes);       // /api/roles/...

/* 9) SERVER STARTEN */
app.listen(PORT, () => console.log(`App listening at http://localhost:${PORT}`));

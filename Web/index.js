// index.js
const path = require('path');
const express = require('express');
const fetch = require('node-fetch'); // npm install node-fetch@2
const session = require('express-session'); // npm install express-session
const { randomUUID } = require('crypto');
const { QdrantClient } = require('@qdrant/js-client-rest');
	  
const qdrantClient = new QdrantClient({
	url: process.env.QDRANT_URL || 'https://134feb5a-5ff2-462e-9a79-6dd5a9e95a9f.us-west-1-0.aws.cloud.qdrant.io:6333',
	apiKey: process.env.QDRANT_API_KEY || 'grzntACUv-HukjpiMGcqYp67rgmdew0hMJa6R9MSHg9TVVWL6iNqvw'
 });

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

/* 8) API-ROUTE: Gibt die Guilds des Users zurück (z.B. fürs Dropdown) */
app.get('/api/guilds', async (req, res) => {
	if (!req.session.access_token) {
	  return res.status(401).json({ error: "Nicht eingeloggt" });
	}
	try {
	  const guildRes = await fetch("https://discord.com/api/users/@me/guilds", {
		headers: {
		  "Authorization": `Bearer ${req.session.access_token}`
		}
	  });
	  let guilds = await guildRes.json();
	  // Filter: Nur Guilds, bei denen der User Administratorrechte hat (permissions enthält das Flag 0x8)
	  guilds = guilds.filter(guild => {
		return (parseInt(guild.permissions) & 0x8) === 0x8;
	  });
	  return res.json(guilds);
	} catch (err) {
	  console.error(err);
	  return res.status(500).json({ error: "Fehler beim Abrufen der Server" });
	}
  });

// Endpoint zum Abrufen der Wissenseinträge für eine bestimmte Guild
app.get('/api/wissenseintraege/:guildId', async (req, res) => {
	const guildId = req.params.guildId;
	const collectionName = `guild_${guildId}`;
	
	try {   
	  const scrollResponse = await qdrantClient.scroll(collectionName, {
		limit: 100,
		with_vectors: true,
		with_payload: true,
	  });
	  console.log('Daten erfolgreich abgerufen.');
	  return res.json(scrollResponse.points);
	} catch (error) {
	  console.error(`Fehler beim Abrufen der Daten: ${error.message}\n${error.stack}`);
	  return res.status(500).json({ error: "Fehler beim Abrufen der Wissenseinträge" });
	}
  });

// Globales Objekt zur Speicherung der Guild-Daten
const guildDataStore = {};

// POST-Endpunkt zum Speichern der Guild-Daten im Speicher
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


// Logout-Route: Session zerstören und zum Start weiterleiten
app.get('/auth/logout', (req, res) => {
	req.session.destroy(err => {
	  if (err) {
		console.error("Fehler beim Abmelden:", err);
		return res.status(500).send('Fehler beim Abmelden');
	  }
	  res.redirect('/');
	});
  });
  
  app.get('/api/user', async (req, res) => {
	if (!req.session.access_token) {
	  return res.status(401).json({ error: "Nicht eingeloggt" });
	}
	try {
	  const userRes = await fetch("https://discord.com/api/users/@me", {
		headers: {
		  "Authorization": `Bearer ${req.session.access_token}`
		}
	  });
	  const userJson = await userRes.json();
	  return res.json(userJson);
	} catch (err) {
	  console.error("Fehler beim Abrufen der User-Daten:", err);
	  return res.status(500).json({ error: "Fehler beim Abrufen der User-Daten" });
	}
  });
  

// POST: Neuen Wissenseintrag erstellen
app.post('/api/wissenseintraege/:guildId', express.json(), async (req, res) => {
	const guildId = req.params.guildId;
	const collectionName = `guild_${guildId}`;
	const { text } = req.body;
	if (!text) {
	  return res.status(400).json({ error: "Text is required" });
	}
	try {
	  // Generiere eine neue Eintrags-ID
	  const entryId = randomUUID();
	  // Erstelle einen Dummy-Vektor der richtigen Dimension (1024)
	  const dummyVector = Array(1024).fill(0);
	  const newPoint = {
		id: entryId,
		vector: dummyVector,
		payload: { guildID: guildId, text }
	  };
	  const upsertResponse = await qdrantClient.upsert(collectionName, { points: [newPoint] });
	  console.log("Neuer Eintrag erstellt:", upsertResponse);
	  res.json(newPoint);
	} catch (error) {
	  console.error("Fehler beim Erstellen des Eintrags:", error);
	  res.status(500).json({ error: "Fehler beim Erstellen des Eintrags" });
	}
  });
  
  // PATCH: Vorhandenen Wissenseintrag aktualisieren
  app.patch('/api/wissenseintraege/:guildId/:entryId', express.json(), async (req, res) => {
	const guildId = req.params.guildId;
	const entryId = req.params.entryId;
	const collectionName = `guild_${guildId}`;
	const { text } = req.body;
	if (!text) {
	  return res.status(400).json({ error: "Text is required for update" });
	}
	try {
	  const dummyVector = Array(1024).fill(0);
	  const updatedPoint = {
		id: entryId,
		vector: dummyVector,
		payload: { guildID: guildId, text }
	  };
	  const upsertResponse = await qdrantClient.upsert(collectionName, { points: [updatedPoint] });
	  console.log("Eintrag aktualisiert:", upsertResponse);
	  res.json(updatedPoint);
	} catch (error) {
	  console.error("Fehler beim Aktualisieren des Eintrags:", error);
	  res.status(500).json({ error: "Fehler beim Aktualisieren des Eintrags" });
	}
  });
  
// DELETE: Einen Wissenseintrag löschen
app.delete('/api/wissenseintraege/:guildId/:entryId', async (req, res) => {
	const guildId = req.params.guildId;
	const entryId = req.params.entryId;
	const collectionName = `guild_${guildId}`;
	try {
	  const qdrantUrl = process.env.QDRANT_URL || 'https://134feb5a-5ff2-462e-9a79-6dd5a9e95a9f.us-west-1-0.aws.cloud.qdrant.io:6333';
	  const qdrantApiKey = process.env.QDRANT_API_KEY || 'grzntACUv-HukjpiMGcqYp67rgmdew0hMJa6R9MSHg9TVVWL6iNqvw';
	  
	  const deleteRes = await fetch(`${qdrantUrl}/collections/${collectionName}/points/delete?wait=true`, {
		method: 'POST',
		headers: {
		   'Content-Type': 'application/json',
		   'api-key': qdrantApiKey
		},
		body: JSON.stringify({ points: [ entryId ] })
	  });
	  const deleteData = await deleteRes.json();
	  console.log("Eintrag gelöscht:", deleteData);
	  res.json({ success: true, entryId });
	} catch (error) {
	  console.error("Fehler beim Löschen des Eintrags:", error);
	  res.status(500).json({ error: "Fehler beim Löschen des Eintrags" });
	}
  });
  


/* 9) SERVER STARTEN */
app.listen(PORT, () => console.log(`App listening at http://localhost:${PORT}`));

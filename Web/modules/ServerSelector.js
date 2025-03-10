const express = require('express');
const fetch = require('node-fetch'); // oder axios, wenn du das bevorzugst
const router = express.Router();

router.get('/guilds', async (req, res) => {
  // Hole den Access Token aus der Session
  const accessToken = req.session.access_token;
  if (!accessToken) {
    return res.status(401).json({ error: "Nicht eingeloggt" });
  }
  try {
    // Abrufen der Gilden, in denen der User Mitglied ist
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    const guilds = await response.json();

    // Überprüfe, ob guilds ein Array ist
    if (!Array.isArray(guilds)) {
      console.error("Unerwartetes Format:", guilds);
      return res.status(500).json({ error: "Unerwartete Antwort vom Discord-API" });
    }
    
    // Filtere die Guilds: Nur jene, bei denen du Administratorrechte hast
    const adminGuilds = guilds.filter(guild => {
      // Das Permissions-Feld ist ein Bitmask, bei dem 0x8 das Administrator-Flag darstellt.
      // Wir wandeln es in eine Zahl um und prüfen, ob das Flag gesetzt ist.
      const perms = parseInt(guild.permissions);
      return (perms & 0x8) === 0x8;
    });

    res.json(adminGuilds);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Abrufen der Server" });
  }
});

module.exports = router;

module.exports = router;
const express = require('express');
const fetch = require('node-fetch'); // oder axios, wenn du das bevorzugst
const router = express.Router();

router.get('/api/guilds', async (req, res) => {
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
  
      // Bot-Informationen (sollten in deinen Umgebungsvariablen oder einer sicheren Konfiguration hinterlegt sein)
      const botId = process.env.BOT_ID;     // Deine Bot-ID
      const botToken = process.env.BOT_TOKEN; // Dein Bot-Token
      
      console.log("aaaaaaaaaaaaaaaaaaaaaaaaaa" + botId)
      console.log("aaaaaaaaaaaaaaaaaaaaaaaaaa" + botToken)

      // Prüfe für jede Gilde, ob der Bot Mitglied ist
      const filteredGuilds = await Promise.all(guilds.map(async (guild) => {
        try {
          const botCheckResponse = await fetch(`https://discord.com/api/v10/guilds/${guild.id}/members/${botId}`, {
            headers: {
              "Authorization": `Bot ${botToken}`
            }
          });
          // Wenn die Antwort OK ist, ist der Bot in der Gilde
          if (botCheckResponse.ok) {
            return guild;
          }
        } catch (error) {
          // Im Fehlerfall (z.B. Rate-Limit, etc.) gib null zurück
        }
        return null;
      }));
  
      // Entferne alle null-Einträge
      const guildsWithBot = filteredGuilds.filter(guild => guild !== null);
  
      res.json(guildsWithBot);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Fehler beim Abrufen der Server" });
    }
  });
  

module.exports = router;

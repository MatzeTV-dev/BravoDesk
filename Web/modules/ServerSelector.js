import fetch from 'node-fetch';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const router = express.Router();

/**
 * GET /api/guilds
 * Ruft alle Gilden ab, in denen der authentifizierte Benutzer Mitglied ist und in denen der Bot vorhanden ist.
 * 
 * - Verwendet den in der Session gespeicherten Access Token, um die Gilden des Benutzers von Discord abzurufen.
 * - Filtert die Gilden, in denen der Benutzer Administratorrechte besitzt.
 * - Prüft für jede gefilterte Gilde, ob der Bot Mitglied ist.
 * - Gibt am Ende nur die Gilden zurück, in denen der Bot gefunden wurde.
 *
 * @param {express.Request} req - Der Request, der den Access Token in der Session enthält.
 * @param {express.Response} res - Die Response, die die gefilterten Gilden als JSON zurückgibt.
 * @returns {Promise<void>}
 */
router.get('/guilds', async (req, res) => {
  const accessToken = req.session && req.session.access_token;
  if (!accessToken) {
    return res.status(401).json({ error: "Nicht eingeloggt" });
  }
  
  try {
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    const guilds = await response.json();

    // Überprüfen, ob die Rückgabe ein Array ist.
    if (!Array.isArray(guilds)) {
      console.error("Unerwartetes Format:", guilds);
      return res.status(500).json({ error: "Unerwartete Antwort vom Discord-API" });
    }
    
    // Filtert nur Gilden, bei denen der Benutzer Administratorrechte (0x8) besitzt.
    const adminGuilds = guilds.filter(guild => {
      const perms = parseInt(guild.permissions, 10);
      return (perms & 0x8) === 0x8;
    });

    // Prüft für jede gefilterte Gilde, ob der Bot Mitglied ist.
    const guildChecks = await Promise.all(
      adminGuilds.map(async guild => {
        try {
          const botResponse = await fetch(`https://discord.com/api/v10/guilds/${guild.id}`, {
            headers: {
              "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`
            }
          });
          if (botResponse.ok) {
            return guild;
          }
        } catch (err) {
          console.error(`Fehler bei der Überprüfung der Guild ${guild.id}:`, err);
        }
        return null;
      })
    );

    // Entfernt null-Werte.
    const finalGuilds = guildChecks.filter(guild => guild !== null);
    res.json(finalGuilds);
  } catch (err) {
    console.error("Fehler beim Abrufen der Server:", err);
    res.status(500).json({ error: "Fehler beim Abrufen der Server" });
  }
});

export default router;

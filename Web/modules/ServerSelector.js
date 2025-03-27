import fetch from 'node-fetch';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const router = express.Router();

router.get('/guilds', async (req, res) => {
  // Hole den Access Token aus der Session
  const accessToken = req.session.access_token;
  if (!accessToken) {
    return res.status(401).json({ error: "Nicht eingeloggt" });
  }
  console.log(`Bot ${process.env.DISCORD_BOT_TOKEN}`);
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
    
    // Filtere zunächst die Guilds, bei denen der User Administratorrechte hat
    const adminGuilds = guilds.filter(guild => {
      const perms = parseInt(guild.permissions);
      return (perms & 0x8) === 0x8;
    });

    // Für jede Guild prüfen, ob der Bot in der Guild ist, indem wir die Discord-API mit dem Bot-Token anfragen.
    // Wenn der Bot in der Guild ist, liefert die API einen erfolgreichen Statuscode (200).
    const guildChecks = await Promise.all(
      adminGuilds.map(async guild => {
        try {
          const botResponse = await fetch(`https://discord.com/api/v10/guilds/${guild.id}`, {
            headers: {
              "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`
            }
          });
          // Wenn die Antwort OK ist, ist der Bot Mitglied der Guild.
          if (botResponse.ok) {
            return guild;
          }
        } catch (err) {
          console.error(`Fehler bei der Überprüfung der Guild ${guild.id}:`, err);
        }
        return null;
      })
    );

    // Entferne alle Guilds, bei denen der Bot nicht gefunden wurde (null)
    const finalGuilds = guildChecks.filter(guild => guild !== null);

    res.json(finalGuilds);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fehler beim Abrufen der Server" });
  }
});

export default router;

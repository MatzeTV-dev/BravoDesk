import { getGuildEmbeds, updateGuildEmbed } from './database.js';
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Mapping der möglichen Embed-Typen zu den DB-Spalten
const columnMap = {
  ticket_creation: 'ticket_creation_embed',
  welcome_message: 'welcome_message_embed'
};

/**
 * Ruft ein spezifisches Embed-Design für eine Guild ab.
 *
 * @route GET /api/embeds/getEmbeds/:guildId/:key
 * @param {express.Request} req - Das Request-Objekt, das `guildId` und `key` als URL-Parameter enthält.
 *                                `key` kann 'ticket_creation' oder 'welcome_message' sein.
 * @param {express.Response} res - Das Response-Objekt.
 * @returns {Promise<void>}
 */
router.get('/getEmbeds/:guildId/:key', async (req, res) => {
  try {
    const { guildId, key } = req.params;
    const row = await getGuildEmbeds(guildId);
    if (!row) return res.status(404).json({ error: 'Guild nicht gefunden' });

    const embedsMap = {
      ticket_creation: row.ticket_creation_embed,
      welcome_message: row.welcome_message_embed
    };

    const embed = embedsMap[key];
    if (!embed) {
      return res.status(400).json({ error: 'Ungültiger Key. Erlaubt: ticket_creation, welcome_message' });
    }

    res.json({ key, embed });
  } catch (err) {
    console.error('Fehler beim GET:', err);
    res.status(500).json({ error: 'Fehler beim Laden der Embeds' });
  }
});

/**
 * Aktualisiert ein spezifisches Embed-Design für eine Guild und benachrichtigt den Bot.
 *
 * @route PUT /api/embeds/:guildId/:key
 * @param {express.Request} req - Das Request-Objekt, das `guildId` und `key` als URL-Parameter
 *                                sowie den Embed-Payload im Body enthält.
 *                                `key` kann 'ticket_creation' oder 'welcome_message' sein.
 * @param {express.Response} res - Das Response-Objekt.
 * @returns {Promise<void>}
 */
router.put('/:guildId/:key', async (req, res) => {
  const { guildId, key } = req.params;
  const embedsPayload = req.body.embeds;
  const col = columnMap[key];

  if (!col || !embedsPayload) {
    return res.status(400).json({ error: 'Ungültiger Key oder Payload' });
  }

  try {
    // Embed in DB speichern
    await updateGuildEmbed(guildId, col, { embeds: embedsPayload });

    // Bot benachrichtigen
    await axios.post(
      `${process.env.WEBSERVER_URL}/api/update-ticket-creation`,
      { guildId },
      {
        headers: {
          Authorization: process.env.DASHBOARD_API_TOKEN
        }
      }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Fehler beim Speichern/Notifizieren:', err);
    return res.status(500).json({ error: 'Fehler beim Speichern oder Notifizieren des Bots' });
  }
});

export default router;

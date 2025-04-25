import { getGuildEmbeds, updateGuildEmbed } from './database.js';
import path from 'path';

import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Map für Spaltennamen
const columnMap = {
  ticket_creation: 'ticket_creation_embed',
  welcome_message: 'welcome_message_embed'
};

// GET /api/embeds/:guildId        → Liste beider Embeds
router.get('/getEmbeds/:guildId/:key', async (req, res) => {
  try {
    const { guildId, key } = req.params;
    const row = await getGuildEmbeds(guildId);
    if (!row) return res.status(404).json({ error: 'Guild nicht gefunden' });

    // Mapping von Param-Keys auf Spalten
    const embedsMap = {
      ticket_creation: row.ticket_creation_embed,
      welcome_message: row.welcome_message_embed
    };

    const embed = embedsMap[key];
    if (!embed) {
      return res.status(400).json({ error: 'Ungültiger Key. Erlaubt: ticket_creation, welcome_message' });
    }

    // Einzelnes Objekt zurückliefern
    res.json({ key, embed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Laden der Embeds' });
  }
});

// PUT /api/embeds/:guildId/:key   → Update eines Embed + Request an den Bot
router.put('/:guildId/:key', async (req, res) => {
  const { guildId, key } = req.params;
  const embedsPayload = req.body.embeds;
  const col = columnMap[key];
  if (!col || !embedsPayload) {
    return res.status(400).json({ error: 'Ungültiger Key oder Payload' });
  }

  await updateGuildEmbed(req.params.guildId, col, req.body);

  try {
    await updateGuildEmbed(guildId, col, { embeds: embedsPayload });

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
 
// PUT /api/embeds/:guildId/:key   → Update eines Embed
/*router.put('/:guildId/:key', async (req, res) => {
  try {
    const col = columnMap[req.params.key];
    if (!col || !req.body.embeds) {
      return res.status(400).json({ error: 'Ungültiger Key oder Payload' });
    }
    await updateGuildEmbed(req.params.guildId, col, req.body);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Speichern des Embeds' });
  }
});*/

export default router;

// routes/design.js
import express from 'express';
import { getGuildEmbeds, updateGuildEmbed } from './database.js';
const router = express.Router();

// Map für Spaltennamen
const columnMap = {
  ticket_creation: 'ticket_creation_embed',
  welcome_message: 'welcome_message_embed'
};

// GET /api/embeds/:guildId        → Liste beider Embeds
router.get('/:guildId', async (req, res) => {
  try {
    const row = await getGuildEmbeds(req.params.guildId);
    if (!row) return res.status(404).json({ error: 'Guild nicht gefunden' });
    res.json([
      { key: 'ticket_creation',     embed: row.ticket_creation_embed },
      { key: 'welcome_message',     embed: row.welcome_message_embed }
    ]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler beim Laden der Embeds' });
  }
});

// GET /api/embeds/:guildId/:key   → Einzelnes Embed
router.get('/:guildId/:key', async (req, res) => {
    try {
      const col = columnMap[req.params.key];
      if (!col) return res.status(400).json({ error: 'Ungültiger Embed-Key' });
  
      const embeds = await getGuildEmbeds(req.params.guildId);
      if (!embeds) return res.status(404).json({ error: 'Guild nicht gefunden' });
  
      // embeds[col] ist jetzt schon ein Objekt, nicht String
      res.json({ embed: embeds[col] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Fehler beim Laden des Embeds' });
    }
  });

// PUT /api/embeds/:guildId/:key   → Update eines Embed
router.put('/:guildId/:key', async (req, res) => {
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
});

export default router;

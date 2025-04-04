import { db } from '../modules/database.js';
import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '../.env' });

const router = express.Router();

/**
 * Ruft alle Ticket-Kategorien für einen bestimmten Server ab.
 *
 * @route GET /ticket_categories/:guildId
 * @param {Request} req - Der Request, der die Server-ID als Parameter enthält.
 * @param {Response} res - Die Response, die das Ergebnis als JSON zurückgibt.
 */
router.get('/ticket_categories/:guildId', (req, res) => {
  const guildId = req.params.guildId;
  
  db.query("CALL sp_GetTicketCategories(?)", [guildId], (err, results) => {
    if (err) {
      console.error("Fehler beim Abrufen der Kategorien:", err);
      return res.status(500).json({ error: "Fehler beim Abrufen der Kategorien" });
    }
    res.json(results[0]);
  });
});

/**
 * Fügt eine neue Ticket-Kategorie für einen Server hinzu.
 *
 * @route POST /ticket_categories/:guildId
 * @param {Request} req - Der Request mit JSON-Body { label, description, emoji, ai_prompt, ai_enabled, permission }.
 * @param {Response} res - Die Response, die das Ergebnis als JSON zurückgibt.
 */
router.post('/ticket_categories/:guildId', express.json(), async (req, res) => {
  const guildId = req.params.guildId;
  const { label, description, emoji, ai_prompt, ai_enabled, permission } = req.body;
  
  const sanitizedText = label.replace(/\s+/g, '_');
  const value = 'category_' + sanitizedText;
  
  if (!label) {
    return res.status(400).json({ error: "label ist erforderlich." });
  }
  
  const emojiArray = [...emoji];
  const lastEmoji = emojiArray.length > 0 ? emojiArray[emojiArray.length - 1] : '';
  
  db.query(
    "CALL sp_AddTicketCategory(?, ?, ?, ?, ?, ?, ?, ?)",
    [guildId, label, description, value, lastEmoji, ai_prompt, ai_enabled, permission],
    (err) => {
      if (err) {
        console.error("Fehler beim Hinzufügen der Kategorie:", err);
        return res.status(500).json({ error: "Fehler beim Hinzufügen der Kategorie." });
      }
    }
  );
  
  try {
    const response = await axios.post(
      `${process.env.BOT_API_URL}/api/update-ticket-message`,
      { guildId },
      {
        headers: {
          'Authorization': process.env.BOT_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log("Bot update response:", response.data);
  } catch (botErr) {
    console.error("Fehler beim Aktualisieren der Ticket-Erstellungsnachricht beim Bot:", botErr);
  }
        
  res.json({ success: true, message: "Kategorie wurde hinzugefügt." });
});

/**
 * Aktualisiert eine Ticket-Kategorie.
 *
 * @route PATCH /ticket_categories/:guildId/:categoryId
 * @param {Request} req - Der Request mit JSON-Body { label, description, emoji, ai_prompt, ai_enabled, permission }.
 * @param {Response} res - Die Response, die das Ergebnis als JSON zurückgibt.
 */
router.patch('/ticket_categories/:guildId/:categoryId', express.json(), async (req, res) => {
  const guildId = req.params.guildId;
  const categoryId = parseInt(req.params.categoryId, 10);
  let { label, description, emoji, ai_prompt, ai_enabled, permission } = req.body;
  
  if (!label) {
    return res.status(400).json({ error: "label ist erforderlich." });
  }
  
  const emojiArray = [...emoji];
  const lastEmoji = emojiArray.length > 0 ? emojiArray[emojiArray.length - 1] : '';
  
  db.query(
    "CALL sp_UpdateTicketCategory(?, ?, ?, ?, ?, ?, ?, ?)",
    [categoryId, guildId, label, description, lastEmoji, ai_prompt, ai_enabled, permission],
    (err) => {
      if (err) {
        console.error("Fehler beim Aktualisieren der Kategorie:", err);
        return res.status(500).json({ error: "Fehler beim Aktualisieren der Kategorie." });
      }
    }
  );
  
  try {
    const response = await axios.post(
      `${process.env.BOT_API_URL}/api/update-ticket-message`,
      { guildId },
      {
        headers: {
          'Authorization': process.env.BOT_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log("Bot update response:", response.data);
  } catch (botErr) {
    console.error("Fehler beim Aktualisieren der Ticket-Erstellungsnachricht beim Bot:", botErr);
  }
        
  res.json({ success: true, message: "Kategorie wurde aktualisiert." });
});

/**
 * Löscht eine Ticket-Kategorie.
 *
 * @route DELETE /ticket_categories/:guildId/:categoryId
 * @param {Request} req - Der Request, der Parameter guildId und categoryId enthält.
 * @param {Response} res - Die Response, die das Ergebnis als JSON zurückgibt.
 */
router.delete('/ticket_categories/:guildId/:categoryId', async (req, res) => {
  const guildId = req.params.guildId;
  const categoryId = parseInt(req.params.categoryId, 10);
  
  db.query("CALL sp_DeleteTicketCategory(?, ?)", [categoryId, guildId], (err) => {
    if (err) {
      console.error("Fehler beim Löschen der Kategorie:", err);
      return res.status(500).json({ error: "Fehler beim Löschen der Kategorie." });
    }
  });
  
  try {
    const response = await axios.post(
      `${process.env.BOT_API_URL}/api/update-ticket-message`,
      { guildId },
      {
        headers: {
          'Authorization': process.env.BOT_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log("Bot update response:", response.data);
  } catch (botErr) {
    console.error("Fehler beim Aktualisieren der Ticket-Erstellungsnachricht beim Bot:", botErr);
  }
        
  res.json({ success: true, message: "Kategorie wurde gelöscht." });
});

/**
 * Ruft alle Rollen eines Servers ab.
 *
 * @route GET /roles/:guildId
 * @param {Request} req - Der Request, der die Server-ID als Parameter enthält.
 * @param {Response} res - Die Response, die die Rollen als JSON zurückgibt.
 */
router.get('/roles/:guildId', async (req, res) => {
  const guildId = req.params.guildId;
  try {
    const rolesRes = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
      headers: {
        "Authorization": `Bot MTMxNDIyNzQ0ODMyOTY2NjU5MQ.GMTqCE.4g-zsjR-vo94dpInBaZYU5PfTcQN4EvD6sUlYA`
      }
    });
    if (!rolesRes.ok) {
      throw new Error(`Fehler beim Abrufen der Rollen: ${rolesRes.statusText}`);
    }
    const roles = await rolesRes.json();
    roles.reverse();
    res.json(roles);
  } catch (err) {
    console.error("Fehler beim Abrufen der Rollen:", err);
    res.status(500).json({ error: "Fehler beim Abrufen der Rollen" });
  }
});

export default router;

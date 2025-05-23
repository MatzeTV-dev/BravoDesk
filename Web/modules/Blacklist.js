import express from 'express';
import { db } from '../modules/database.js';      // dein database.js
import { fetchMemberTag } from '../modules/discordApi.js'; // siehe letzten Vorschlag
const router = express.Router();

// Utility, um Promises aus dem Pool zu bekommen
const pool = db.promise();

/**
 * Middleware, die sicherstellt, dass der Benutzer authentifiziert ist.
 */
function ensureAuthenticated(req, res, next) {
  if (!req.session?.access_token) {
    return res.status(401).json({ error: "Nicht authentifiziert." });
  }
  next();
}

/**
 * Validiert Discord-Snowflakes.
 */
function validateServerId(id) {
  return /^\d{17,19}$/.test(id);
}

// Alle Routen hier brauchen Auth
router.use(ensureAuthenticated);

/**
 * Ruft alle Blacklist-Einträge für einen bestimmten Server ab.
 *
 * @route GET /blacklist/:serverId
 * @param {express.Request} req - Der Request mit der Server-ID als Parameter.
 * @param {express.Response} res - Die Response, die die Blacklist-Einträge als JSON zurückgibt.
 * @returns {Promise<void>}
 */
router.get('/blacklist/:serverId', async (req, res) => {
  const { serverId } = req.params;
  if (!validateServerId(serverId))
    return res.status(400).json({ error: "Ungültige Server ID." });

  try {
    const [resultSets] = await pool.query("CALL sp_GetBlacklist(?)", [serverId]);
    const rows = Array.isArray(resultSets) ? resultSets[0] : [];

    const enriched = await Promise.all(rows.map(async entry => {
      let tag = null;
      try {
        tag = await fetchMemberTag(serverId, entry.user_id);
      } catch (err) {
        console.warn(`Discord-API fetch failed for ${entry.user_id}:`, err.message);
      }
      // Wenn tag null ist, dann war der User nicht greifbar
      const display = tag
        ? `${tag} (${entry.user_id})`
        : entry.user_id; 
      return {
        user_id:    display,
        reason:     entry.reason,
        created_at: entry.created_at
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error("Error GET /blacklist:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Sucht nach einem bestimmten Benutzer in der Blacklist eines Servers.
 *
 * @route GET /blacklist/:serverId/search
 * @param {express.Request} req - Der Request mit Server-ID als Parameter und User-ID als Query-Parameter.
 * @param {express.Response} res - Die Response, die die gefundenen Blacklist-Einträge als JSON zurückgibt.
 * @returns {Promise<void>}
 */
router.get('/blacklist/:serverId/search', async (req, res) => {
  const { serverId } = req.params;
  const userId       = req.query.user_id;
  if (!validateServerId(serverId) || !/^\d{18}$/.test(userId))
    return res.status(400).json({ error: "Ungültige Parameter." });

  try {
    const [resultSets] = await pool.query("CALL sp_SearchBlacklist(?, ?)", [serverId, userId]);
    const rows = Array.isArray(resultSets) ? resultSets[0] : [];

    const enriched = await Promise.all(rows.map(async entry => {
      let tag = null;
      try {
        tag = await fetchMemberTag(serverId, entry.user_id);
      } catch {}
      const display = tag
        ? `${entry.user_id} (${tag})`
        : entry.user_id;
      return {
        user_id:    entry.user_id,
        display,
        reason:     entry.reason,
        created_at: entry.created_at
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error("Error SEARCH /blacklist:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Entfernt einen Benutzer von der Blacklist eines Servers.
 *
 * @route DELETE /blacklist/:serverId/:userId
 * @param {express.Request} req - Der Request mit Server-ID und User-ID als Parameter.
 * @param {express.Response} res - Die Response, die den Erfolg der Operation als JSON zurückgibt.
 * @returns {Promise<void>}
 */
router.delete('/blacklist/:serverId/:userId', async (req, res) => {
  const { serverId, userId } = req.params;
  if (!validateServerId(serverId) || !/^\d{18}$/.test(userId))
    return res.status(400).json({ error: "Ungültige Parameter." });

  try {
    await pool.query("CALL sp_RemoveBlacklist(?, ?)", [serverId, userId]);
    res.json({ success: true, message: "Eintrag entfernt." });
  } catch (err) {
    console.error("Error DELETE /blacklist:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Fügt einen Blacklist-Eintrag für einen bestimmten Server hinzu.
 *
 * @route POST /blacklist/:serverId
 * @param {Request} req - Der Request mit Body { user_id, reason }.
 * @param {Response} res - Die Response.
 */
router.post('/blacklist/:serverId', express.json(), (req, res) => {
  const serverId = req.params.serverId;
  if (!validateServerId(serverId)) {
    return res.status(400).json({ error: "Ungültige Server ID." });
  }
  const { user_id, reason } = req.body;
  
  if (!user_id || !reason) {
    return res.status(400).json({ error: "user_id und reason sind erforderlich." });
  }
  
  if (reason.length > 50) {
    return res.status(400).json({ error: "Der Grund darf maximal 50 Zeichen lang sein." });
  }
  
  if (!/^\d{18}$/.test(user_id)) {
    return res.status(400).json({ error: "Ungültige User ID. Sie muss aus 18 Ziffern bestehen." });
  }
  
  db.query("CALL sp_AddBlacklist(?, ?, ?)", [serverId, user_id, reason], (err) => {
    if (err) {
      console.error("Fehler beim Hinzufügen zur Blacklist:", err);
      return res.status(500).json({ error: "Fehler beim Hinzufügen zur Blacklist." });
    }
    res.json({ success: true, message: "Benutzer wurde zur Blacklist hinzugefügt." });
  });
});


export default router;

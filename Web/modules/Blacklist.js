import { db } from '../modules/database.js';
import express from 'express';

const router = express.Router();

/**
 * Middleware, die sicherstellt, dass der Benutzer authentifiziert ist.
 */
function ensureAuthenticated(req, res, next) {
  if (!req.session || !req.session.access_token) {
    return res.status(401).json({ error: "Nicht authentifiziert." });
  }
  next();
}

/**
 * Helper-Funktion zur Validierung von serverId (Discord Snowflake: 17 bis 19 Ziffern).
 */
function validateServerId(serverId) {
  return /^\d{17,19}$/.test(serverId);
}

// Alle nachfolgenden Routen erfordern Authentifizierung.
router.use(ensureAuthenticated);

/**
 * Ruft Blacklist-Einträge für einen bestimmten Server ab.
 *
 * @route GET /blacklist/:serverId
 * @param {Request} req - Der Request, mit Parameter serverId.
 * @param {Response} res - Die Response.
 */
router.get('/blacklist/:serverId', (req, res) => {
  const serverId = req.params.serverId;
  if (!validateServerId(serverId)) {
    return res.status(400).json({ error: "Ungültige Server ID." });
  }
  db.query("CALL sp_GetBlacklist(?)", [serverId], (err, results) => {
    if (err) {
      console.error("Fehler beim Abrufen der Blacklist:", err);
      return res.status(500).json({ error: "Fehler beim Abrufen der Blacklist" });
    }
    res.json(results[0]);
  });
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

/**
 * Entfernt einen Blacklist-Eintrag für einen bestimmten Server.
 *
 * @route DELETE /blacklist/:serverId/:userId
 * @param {Request} req - Der Request mit Parameter serverId und userId.
 * @param {Response} res - Die Response.
 */
router.delete('/blacklist/:serverId/:userId', (req, res) => {
  const serverId = req.params.serverId;
  if (!validateServerId(serverId)) {
    return res.status(400).json({ error: "Ungültige Server ID." });
  }
  const userId = req.params.userId;
  
  if (!/^\d{18}$/.test(userId)) {
    return res.status(400).json({ error: "Ungültige User ID. Sie muss aus 18 Ziffern bestehen." });
  }
  
  db.query("CALL sp_RemoveBlacklist(?, ?)", [serverId, userId], (err) => {
    if (err) {
      console.error("Fehler beim Entfernen aus der Blacklist:", err);
      return res.status(500).json({ error: "Fehler beim Entfernen aus der Blacklist." });
    }
    res.json({ success: true, message: "Benutzer wurde von der Blacklist entfernt." });
  });
});

/**
 * Sucht nach einem Blacklist-Eintrag für einen bestimmten Server.
 *
 * @route GET /blacklist/:serverId/search
 * @param {Request} req - Der Request mit Parameter serverId und Query user_id.
 * @param {Response} res - Die Response.
 */
router.get('/blacklist/:serverId/search', (req, res) => {
  const serverId = req.params.serverId;
  if (!validateServerId(serverId)) {
    return res.status(400).json({ error: "Ungültige Server ID." });
  }
  const userId = req.query.user_id;
  
  if (!userId) {
    return res.status(400).json({ error: "user_id Query-Parameter ist erforderlich." });
  }
  
  if (!/^\d{18}$/.test(userId)) {
    return res.status(400).json({ error: "Ungültige User ID. Sie muss aus 18 Ziffern bestehen." });
  }
  
  db.query("CALL sp_SearchBlacklist(?, ?)", [serverId, userId], (err, results) => {
    if (err) {
      console.error("Fehler beim Suchen in der Blacklist:", err);
      return res.status(500).json({ error: "Fehler beim Suchen in der Blacklist." });
    }
    res.json(results[0]);
  });
});

export default router;

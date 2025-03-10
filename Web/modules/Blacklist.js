// modules/Blacklist.js
const express = require('express');
const { db } = require('../modules/database');
const router = express.Router();

// Blacklist-Einträge für einen bestimmten Server abrufen
router.get('/blacklist/:serverId', (req, res) => {
  const serverId = req.params.serverId;
  
  db.query("CALL sp_GetBlacklist(?)", [serverId], (err, results) => {
    if (err) {
      console.error("Fehler beim Abrufen der Blacklist:", err);
      return res.status(500).json({ error: "Fehler beim Abrufen der Blacklist" });
    }
    res.json(results[0]);
  });
});
  
// Blacklist-Eintrag hinzufügen
router.post('/blacklist/:serverId', express.json(), (req, res) => {
  const serverId = req.params.serverId;
  const { user_id, reason } = req.body;
  
  if (!user_id || !reason) {
    return res.status(400).json({ error: "user_id und reason sind erforderlich." });
  }
  
  db.query("CALL sp_AddBlacklist(?, ?, ?)", [serverId, user_id, reason], (err) => {
    if (err) {
      console.error("Fehler beim Hinzufügen zur Blacklist:", err);
      return res.status(500).json({ error: "Fehler beim Hinzufügen zur Blacklist." });
    }
    res.json({ success: true, message: "Benutzer wurde zur Blacklist hinzugefügt." });
  });
});
  
// Blacklist-Eintrag entfernen
router.delete('/blacklist/:serverId/:userId', (req, res) => {
  const serverId = req.params.serverId;
  const userId = req.params.userId;
  
  db.query("CALL sp_RemoveBlacklist(?, ?)", [serverId, userId], (err) => {
    if (err) {
      console.error("Fehler beim Entfernen aus der Blacklist:", err);
      return res.status(500).json({ error: "Fehler beim Entfernen aus der Blacklist." });
    }
    res.json({ success: true, message: "Benutzer wurde von der Blacklist entfernt." });
  });
});
  
// Blacklist-Eintrag suchen
router.get('/blacklist/:serverId/search', (req, res) => {
  const serverId = req.params.serverId;
  const userId = req.query.user_id;
  
  if (!userId) {
    return res.status(400).json({ error: "user_id Query-Parameter ist erforderlich." });
  }
  
  db.query("CALL sp_SearchBlacklist(?, ?)", [serverId, userId], (err, results) => {
    if (err) {
      console.error("Fehler beim Suchen in der Blacklist:", err);
      return res.status(500).json({ error: "Fehler beim Suchen in der Blacklist." });
    }
    res.json(results[0]);
  });
});

module.exports = router;

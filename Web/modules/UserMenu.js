const express = require('express');
const router = express.Router();

// API-Route: Gibt die User-Daten zurück
router.get('/user', async (req, res) => {
	if (!req.session.access_token) {
	  return res.status(401).json({ error: "Nicht eingeloggt" });
	}
	try {
	  const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: {
        "Authorization": `Bearer ${req.session.access_token}`
      }
	  });
	  const userJson = await userRes.json();
	  return res.json(userJson);
	} catch (err) {
	  console.error("Fehler beim Abrufen der User-Daten:", err);
	  return res.status(500).json({ error: "Fehler beim Abrufen der User-Daten" });
	}
});

module.exports = router;

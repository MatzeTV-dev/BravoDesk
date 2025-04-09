import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

/**
 * GET /user
 * Ruft die User-Daten des aktuell authentifizierten Benutzers ab.
 *
 * @param {express.Request} req - Der Request, der den Access Token in der Session enthält.
 * @param {express.Response} res - Die Response, die die User-Daten als JSON zurückgibt.
 * @returns {Promise<void>}
 */
router.get('/user', async (req, res) => {
  if (!req.session || !req.session.access_token) {
    return res.status(401).json({ error: "Nicht eingeloggt" });
  }
  try {
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: {
        "Authorization": `Bearer ${req.session.access_token}`
      }
    });
    
    // Überprüft, ob die Antwort der Discord-API erfolgreich war.
    if (!userRes.ok) {
      console.error("Discord API Fehler:", userRes.statusText);
      return res.status(500).json({ error: "Fehler beim Abrufen der User-Daten" });
    }
    
    const userJson = await userRes.json();
    return res.json(userJson);
  } catch (err) {
    console.error("Fehler beim Abrufen der User-Daten:", err);
    return res.status(500).json({ error: "Fehler beim Abrufen der User-Daten" });
  }
});

export default router;

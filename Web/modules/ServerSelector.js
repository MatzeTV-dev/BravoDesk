const express = require('express');
const fetch = require('node-fetch'); // oder axios, wenn du das bevorzugst
const router = express.Router();

router.get('/api/guilds', async (req, res) => {
    // Hier musst du den Access Token aus der Session oder dem Request auslesen:
    const accessToken = req.session.access_token;
    if (!accessToken) {
        return res.status(401).json({ error: "Nicht eingeloggt" });
    }
    try {
        const response = await fetch("https://discord.com/api/users/@me/guilds", {
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });
        const guilds = await response.json();
        res.json(guilds);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Fehler beim Abrufen der Server" });
    }
});

module.exports = router;

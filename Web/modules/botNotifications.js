// modules/botNotifications.js
import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const router = express.Router();

const BOT_API_SECRET = process.env.BOT_API_TOKEN;

/**
 * Authentifiziert Bot-Anfragen basierend auf einem API-Token.
 */
function authenticateBotRequest(req, res, next) {
    if (!BOT_API_SECRET) {
        console.error('BOT_API_TOKEN ist nicht im Webserver konfiguriert!');
        return res.status(500).json({ message: 'Server configuration error.' });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    // Vergleiche die Token mittels timingSafeEqual, um Timing-Angriffe zu vermeiden.
    if (
        token == null ||
        token.length !== BOT_API_SECRET.length ||
        !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(BOT_API_SECRET))
    ) {
        console.warn('Ungültiger oder fehlender Auth-Token vom Bot empfangen.');
        return res.status(403).json({ message: 'Forbidden: Invalid or missing API secret.' });
    }
    console.log('Bot-Authentifizierung erfolgreich.');
    next();
}


router.post('/notify/reset', authenticateBotRequest, async (req, res) => {
    console.log('Reset-Benachrichtigung vom Discord-Bot erhalten.');

    const { guildId } = req.body;

    // Validierung: Discord-Guild IDs sind Snowflakes (17 bis 19 Ziffern)
    if (!guildId || !/^\d{17,19}$/.test(guildId)) {
        console.warn('Ungültige oder keine guildId in der Reset-Benachrichtigung erhalten.');
        return res.status(400).json({ message: 'Bad Request: Missing or invalid guildId.' });
    }

    try {    
       console.log(`Website-Update für Guild ${guildId} erfolgreich ausgelöst.`);
       res.status(200).json({ message: 'Notification received and update triggered.' });
    } catch (error) {
       console.error(`Fehler beim Verarbeiten der Reset-Benachrichtigung für Guild ${guildId}:`, error);
       res.status(500).json({ message: 'Internal Server Error while processing notification.' });
    }
});


export default router;

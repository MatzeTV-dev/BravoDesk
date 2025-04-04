// modules/botNotifications.js
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const BOT_API_SECRET = process.env.BOT_API_TOKEN;

function authenticateBotRequest(req, res, next) {
    if (!BOT_API_SECRET) {
        console.error('WEBSERVER_API_SECRET ist nicht im Webserver konfiguriert!');
        return res.status(500).json({ message: 'Server configuration error.' });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token == null || token !== BOT_API_SECRET) {
        console.warn('Ungültiger oder fehlender Auth-Token vom Bot empfangen.');

        return res.status(403).json({ message: 'Forbidden: Invalid or missing API secret.' });
    }
    console.log('Bot-Authentifizierung erfolgreich.');
    next();
}


router.post('/notify/reset', authenticateBotRequest, async (req, res) => {
    console.log('Reset-Benachrichtigung vom Discord-Bot erhalten.');

    const { guildId } = req.body;

    if (!guildId) {
        console.warn('Keine guildId in der Reset-Benachrichtigung erhalten.');
        return res.status(400).json({ message: 'Bad Request: Missing guildId.' });
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
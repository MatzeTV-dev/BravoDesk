import express from 'express';
import { db } from '../modules/database.js';

const router = express.Router();

/**
 * GET /api/setupstatus/:guild_id
 * Überprüft, ob für eine bestimmte Guild der Setup-Prozess abgeschlossen wurde.
 * Dies wird ermittelt, indem geprüft wird, ob ein entsprechender Eintrag in der
 * `server_information`-Tabelle existiert.
 *
 * @route GET /api/setupstatus/:guild_id
 * @param {express.Request} req - Das Request-Objekt, das `guild_id` als URL-Parameter enthält.
 * @param {express.Response} res - Das Response-Objekt. Gibt JSON zurück: `{ result: boolean }`.
 * @returns {Promise<void>}
 */
router.get('/setupstatus/:guild_id', async (req, res) => {
    try {
      const { guild_id } = req.params;
      const [rows] = await db.promise().query(
        'SELECT 1 FROM server_information WHERE discord_server_id = ? LIMIT 1',
        [guild_id]
      );
      const exists = rows.length > 0;
  
      return res.json({ result: exists });
    } catch (error) {
      console.error('DB-Fehler:', error);
      return res.status(500).json({ error: 'Interner Serverfehler' });
    }
  });

export default router;
import { QdrantClient } from '@qdrant/js-client-rest';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import express from 'express';
import multer from 'multer';
import pdf from 'pdf-parse';
import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const router = express.Router();

// Qdrant-Konfiguration
const QdrantURL = process.env.QDRANT_URL;
const QdrantAPIkey = process.env.QDRANT_API_KEY;
const qdrantClient = new QdrantClient({
  url: QdrantURL,
  apiKey: QdrantAPIkey,
});

// Google-API-Konfiguration für Google Docs Export
const googleAuth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

// Multer für Datei-Uploads (.txt, .pdf)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Nur .txt und .pdf Dateien erlaubt'), false);
    }
  },
  limits: { fileSize: 1024 * 1024 }, // 1 MB
});

/**
 * Splittet Text in Sätze, ohne Abkürzungen und Nummerierungen zu zerstückeln.
 * @param {string} text
 * @returns {string[]}
 */
function splitIntoSentences(text) {
  return text
    .split(/(?<=[\.!?])\s+(?=[A-ZÄÖÜ])/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Zählt Wörter und spezielle Tokens wie "1.", "z.B." oder "etc.".
 * @param {string} text
 * @returns {number}
 */
function countWords(text) {
  const tokenRegex = /(?:\d+\.)|(?:[A-Za-zÄÖÜäöüß]+(?:\.[A-Za-zÄÖÜäöüß]+)*\.?)/g;
  const matches = text.match(tokenRegex);
  return matches ? matches.length : 0;
}

/**
 * POST /api/upload-file/:guildId
 * Hochladen von .txt/.pdf und Einfügen in Qdrant
 */
router.post('/upload-file/:guildId', upload.single('file'), async (req, res) => {
  const guildId = req.params.guildId;
  const collectionName = `guild_${guildId}`;

  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
  }

  let fileContent;
  if (req.file.mimetype === 'application/pdf') {
    const data = await pdf(req.file.buffer);
    fileContent = data.text;
  } else {
    fileContent = req.file.buffer.toString('utf-8');
  }

  const segments = splitIntoSentences(fileContent);

  let invalidEntries = [];
  let points = [];

  for (let segment of segments) {
    if (countWords(segment) > 10) {
      invalidEntries.push(segment);
      continue;
    }
    const entryId = randomUUID();
    const dummyVector = Array(1024).fill(0);
    points.push({ id: entryId, vector: dummyVector, payload: { text: segment } });
  }

  try {
    const response = await qdrantClient.upsert(collectionName, { points });
    console.log('Datei-Upload: Einträge eingefügt:', response);
    return res.json({
      success: true,
      inserted: points.length,
      skipped: invalidEntries.length,
    });
  } catch (error) {
    console.error(`Fehler beim Einfügen der Einträge: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: 'Fehler beim Einfügen der Wissenseintrags aus der Datei' });
  }
});

/**
 * POST /api/docs/import/:guildId
 * Importiert Google Docs über URL und legt Einträge in Qdrant an
 */
router.post('/docs/import/:guildId', express.json(), async (req, res) => {
  const guildId = req.params.guildId;
  const { url } = req.body;
  const collectionName = `guild_${guildId}`;

  if (!url) {
    return res.status(400).json({ error: 'URL ist erforderlich.' });
  }

  const match = url.match(/^https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    return res.status(400).json({ error: 'Ungültiger Google Docs Link.' });
  }
  const docId = match[1];

  try {
    const authClient = await googleAuth.getClient();
    const driveService = google.drive({ version: 'v3', auth: authClient });
    const exportRes = await driveService.files.export(
      { fileId: docId, mimeType: 'text/plain' },
      { responseType: 'stream' }
    );

    let data = '';
    exportRes.data.on('data', chunk => data += chunk);
    await new Promise((resolve, reject) => {
      exportRes.data.on('end', resolve);
      exportRes.data.on('error', reject);
    });
    const fileContent = data;

    const segments = splitIntoSentences(fileContent);

    let invalidEntries = [];
    let points = [];

    for (let segment of segments) {
      if (countWords(segment) > 10) {
        invalidEntries.push(segment);
        continue;
      }
      const entryId = randomUUID();
      const dummyVector = Array(1024).fill(0);
      points.push({ id: entryId, vector: dummyVector, payload: { text: segment } });
    }

    const response = await qdrantClient.upsert(collectionName, { points });
    console.log('Google Docs Import: Einträge eingefügt:', response);
    return res.json({
      success: true,
      inserted: points.length,
      skipped: invalidEntries.length,
    });
  } catch (error) {
    console.error(`Fehler beim Importieren des Dokuments: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: 'Fehler beim Importieren des Google Docs Dokuments.' });
  }
});

/**
 * GET /api/wissenseintraege/:guildId
 * Ruft alle Wissenseinträge einer bestimmten Guild ab.
 */
router.get('/wissenseintraege/:guildId', async (req, res) => {
  const guildId = req.params.guildId;
  const collectionName = `guild_${guildId}`;
  try {
    const scrollResponse = await qdrantClient.scroll(collectionName, {
      limit: 100,
      with_vectors: true,
      with_payload: true,
    });
    console.log('Daten erfolgreich abgerufen.');
    return res.json(scrollResponse.points);
  } catch (error) {
    console.error(`Fehler beim Abrufen der Daten: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: 'Fehler beim Abrufen der Wissenseinträge' });
  }
});

/**
 * POST /api/wissenseintraege/:guildId
 * Fügt einen neuen Wissenseintrag hinzu.
 */
router.post('/wissenseintraege/:guildId', express.json(), async (req, res) => {
  const guildId = req.params.guildId;
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text ist erforderlich.' });
  }
  if (countWords(text) > 10) {
    return res.status(400).json({ error: 'Wissenseintrag darf maximal 10 Wörter enthalten.' });
  }
  const collectionName = `guild_${guildId}`;
  const entryId = randomUUID();
  const dummyVector = Array(1024).fill(0);
  const point = { id: entryId, vector: dummyVector, payload: { text } };
  try {
    const response = await qdrantClient.upsert(collectionName, { points: [point] });
    console.log('Eintrag eingefügt:', response);
    return res.json({ success: true, id: entryId });
  } catch (error) {
    console.error(`Fehler beim Einfügen des Eintrags: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: 'Fehler beim Einfügen des Wissenseintrags' });
  }
});

/**
 * PATCH /api/wissenseintraege/:guildId/:entryId
 */
router.patch('/wissenseintraege/:guildId/:entryId', express.json(), async (req, res) => {
  const guildId = req.params.guildId;
  const entryId = req.params.entryId;
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text ist erforderlich.' });
  }
  if (countWords(text) > 10) {
    return res.status(400).json({ error: 'Wissenseintrag darf maximal 10 Wörter enthalten.' });
  }
  const collectionName = `guild_${guildId}`;
  const dummyVector = Array(1024).fill(0);
  const point = { id: entryId, vector: dummyVector, payload: { text } };
  try {
    const response = await qdrantClient.upsert(collectionName, { points: [point] });
    console.log('Eintrag aktualisiert:', response);
    return res.json({ success: true });
  } catch (error) {
    console.error(`Fehler beim Aktualisieren des Eintrags: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: 'Fehler beim Aktualisieren des Wissenseintrags' });
  }
});

/**
 * DELETE /api/wissenseintraege/:guildId/:entryId
 */
router.delete('/wissenseintraege/:guildId/:entryId', async (req, res) => {
  const guildId = req.params.guildId;
  const entryId = req.params.entryId;
  const collectionName = `guild_${guildId}`;
  try {
    const response = await qdrantClient.delete(collectionName, { points: [entryId] });
    console.log('Eintrag gelöscht:', response);
    return res.json({ success: true });
  } catch (error) {
    console.error(`Fehler beim Löschen des Eintrags: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: 'Fehler beim Löschen des Wissenseintrags' });
  }
});

export default router;

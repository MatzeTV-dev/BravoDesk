import { QdrantClient } from '@qdrant/js-client-rest';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const router = express.Router();

const QdrantURL = process.env.QDRANT_URL;
const QdrantAPIkey = process.env.QDRANT_API_KEY;

const qdrantClient = new QdrantClient({
  url: QdrantURL,
  apiKey: QdrantAPIkey,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Erlaube nur .txt Dateien
    if (file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error("Nur .txt Dateien erlaubt"), false);
    }
  },
  limits: { fileSize: 1024 * 1024 } // 1 MB Größenlimit
});

/**
 * Zählt die Wörter in einem Text.
 * Falls Leerzeichen vorhanden sind, wird der Text anhand dieser getrennt.
 * Falls nicht, werden camelCase-/PascalCase-Übergänge erkannt.
 *
 * @param {string} text - Der zu zählende Text.
 * @returns {number} Die Anzahl der Wörter.
 */
function countWords(text) {
  text = text.trim();
  if (text === "") return 0;
  
  if (/\s/.test(text)) {
    return text.split(/\s+/).length;
  }
  
  if (text === text.toLowerCase() || text === text.toUpperCase()) {
    return 1;
  }
  
  const transitions = text.match(/(?<=[a-zäöüß])(?=[A-ZÄÖÜ])/g);
  return 1 + (transitions ? transitions.length : 0);
}

router.post('/upload-file/:guildId', upload.single('file'), async (req, res) => {
  const guildId = req.params.guildId;
  const collectionName = `guild_${guildId}`;
  
  // Fehlerbehandlung: Datei vorhanden?
  if (!req.file) {
    return res.status(400).json({ error: "Keine Datei hochgeladen." });
  }
  
  // Dateiinhalt als Text auslesen (UTF-8)
  const fileContent = req.file.buffer.toString('utf-8');
  
  // Text an jedem Punkt trennen, trimmen und leere Segmente entfernen
  let segments = fileContent.split('.').map(segment => segment.trim()).filter(segment => segment !== "");
  
  let invalidEntries = [];
  let points = [];
  
  // Prüfe jeden Eintrag: maximal 10 Wörter erlaubt
  for (let segment of segments) {
    if (countWords(segment) > 10) {
      invalidEntries.push(segment);
      continue; // Überspringe Einträge, die das Limit überschreiten
    }
    const entryId = randomUUID();
    const dummyVector = Array(1024).fill(0);
    points.push({
      id: entryId,
      vector: dummyVector,
      payload: { text: segment }
    });
  }
  
  // Optional: Entscheide, ob du den gesamten Upload ablehnen möchtest, wenn ungültige Einträge enthalten sind.
  // Hier fahren wir fort und speichern nur die gültigen Einträge.
  
  try {
    const response = await qdrantClient.upsert(collectionName, { points });
    console.log("Datei-Upload: Einträge eingefügt:", response);
    return res.json({
      success: true,
      inserted: points.length,
      skipped: invalidEntries.length,
      // Bei Bedarf: invalidEntries zur weiteren Information zurückgeben (aber Vorsicht beim Ausgeben von sensiblen Daten)
    });
  } catch (error) {
    console.error(`Fehler beim Einfügen der Einträge: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: "Fehler beim Einfügen der Wissenseintrags aus der Datei" });
  }
});

/**
 * GET /api/wissenseintraege/:guildId
 * Ruft alle Wissenseinträge einer bestimmten Guild ab.
 *
 * @param {Request} req - Der Request, der die Guild-ID als Parameter enthält.
 * @param {Response} res - Die Response mit den abgerufenen Wissenseinträgen.
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
    return res.status(500).json({ error: "Fehler beim Abrufen der Wissenseinträge" });
  }
});

/**
 * POST /api/wissenseintraege/:guildId
 * Fügt einen neuen Wissenseintrag hinzu.
 *
 * @param {Request} req - Der Request mit der Guild-ID als Parameter und JSON-Body { text }.
 * @param {Response} res - Die Response mit dem Erfolg und der generierten Eintrags-ID.
 */
router.post('/wissenseintraege/:guildId', express.json(), async (req, res) => {
  const guildId = req.params.guildId;
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "Text ist erforderlich." });
  }
  
  if (countWords(text) > 10) {
    return res.status(400).json({ error: "Wissenseintrag darf maximal 10 Wörter enthalten." });
  }
  
  const collectionName = `guild_${guildId}`;
  const entryId = randomUUID();
  const dummyVector = Array(1024).fill(0);
  
  const point = {
    id: entryId,
    vector: dummyVector,
    payload: { text }
  };

  try {
    const response = await qdrantClient.upsert(collectionName, { points: [point] });
    console.log("Eintrag eingefügt:", response);
    return res.json({ success: true, id: entryId });
  } catch (error) {
    console.error(`Fehler beim Einfügen des Eintrags: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: "Fehler beim Einfügen des Wissenseintrags" });
  }
});

/**
 * PATCH /api/wissenseintraege/:guildId/:entryId
 * Aktualisiert einen bestehenden Wissenseintrag.
 *
 * @param {Request} req - Der Request mit der Guild-ID und der Eintrags-ID als Parameter sowie JSON-Body { text }.
 * @param {Response} res - Die Response, die den Erfolg bestätigt.
 */
router.patch('/wissenseintraege/:guildId/:entryId', express.json(), async (req, res) => {
  const guildId = req.params.guildId;
  const entryId = req.params.entryId;
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "Text ist erforderlich." });
  }
  
  if (countWords(text) > 10) {
    return res.status(400).json({ error: "Wissenseintrag darf maximal 10 Wörter enthalten." });
  }
  
  const collectionName = `guild_${guildId}`;
  const dummyVector = Array(1024).fill(0);
  
  const point = {
    id: entryId,
    vector: dummyVector,
    payload: { text }
  };

  try {
    const response = await qdrantClient.upsert(collectionName, { points: [point] });
    console.log("Eintrag aktualisiert:", response);
    return res.json({ success: true });
  } catch (error) {
    console.error(`Fehler beim Aktualisieren des Eintrags: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: "Fehler beim Aktualisieren des Wissenseintrags" });
  }
});

/**
 * DELETE /api/wissenseintraege/:guildId/:entryId
 * Löscht einen Wissenseintrag.
 *
 * @param {Request} req - Der Request mit der Guild-ID und der Eintrags-ID als Parameter.
 * @param {Response} res - Die Response, die den Erfolg bestätigt.
 */
router.delete('/wissenseintraege/:guildId/:entryId', async (req, res) => {
  const guildId = req.params.guildId;
  const entryId = req.params.entryId;
  const collectionName = `guild_${guildId}`;

  try {
    const response = await qdrantClient.delete(collectionName, { points: [entryId] });
    console.log("Eintrag gelöscht:", response);
    return res.json({ success: true });
  } catch (error) {
    console.error(`Fehler beim Löschen des Eintrags: ${error.message}\n${error.stack}`);
    return res.status(500).json({ error: "Fehler beim Löschen des Wissenseintrags" });
  }
});

export default router;

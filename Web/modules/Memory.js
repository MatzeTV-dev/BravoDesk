import express from 'express';
import { QdrantClient } from '@qdrant/js-client-rest';
import { randomUUID } from 'crypto';

const router = express.Router();

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || 'https://134feb5a-5ff2-462e-9a79-6dd5a9e95a9f.us-west-1-0.aws.cloud.qdrant.io:6333',
  apiKey: process.env.QDRANT_API_KEY || 'grzntACUv-HukjpiMGcqYp67rgmdew0hMJa6R9MSHg9TVVWL6iNqvw'
});

/**
 * Hilfsfunktion zum Zählen der Wörter im Input.
 * - Enthält der Text Leerzeichen, wird anhand dieser getrennt.
 * - Enthält er keine Leerzeichen, wird versucht, camelCase-/PascalCase-Übergänge zu erkennen.
 */
function countWords(text) {
  text = text.trim();
  if (text === "") return 0;
  
  // Falls Leerzeichen vorhanden sind, anhand der Leerzeichen splitten.
  if (/\s/.test(text)) {
    return text.split(/\s+/).length;
  }
  
  // Wenn der Text keine Leerzeichen enthält, prüfen wir, ob er komplett in Klein- oder Großbuchstaben ist.
  // In diesem Fall gehen wir von einem einzelnen Wort aus.
  if (text === text.toLowerCase() || text === text.toUpperCase()) {
    return 1;
  }
  
  // Zähle Übergänge von Klein- zu Großbuchstaben.
  const transitions = text.match(/(?<=[a-zäöüß])(?=[A-ZÄÖÜ])/g);
  return 1 + (transitions ? transitions.length : 0);
}

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
    return res.status(500).json({ error: "Fehler beim Abrufen der Wissenseinträge" });
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
    return res.status(400).json({ error: "Text ist erforderlich." });
  }
  
  // Überprüfe, ob der Text maximal 10 Wörter enthält.
  if (countWords(text) > 10) {
    return res.status(400).json({ error: "Wissenseintrag darf maximal 10 Wörter enthalten." });
  }
  
  const collectionName = `guild_${guildId}`;
  const entryId = randomUUID(); // Generiere eine eindeutige ID
  
  // Beispiel: Für eine Sammlung mit Dimension 1024
  const dummyVector = Array(1024).fill(0);

  // Erstelle den neuen Punkt.
  const point = {
    id: entryId,
    vector: dummyVector, // Passe die Dimension an deine Sammlung an
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
 */
router.patch('/wissenseintraege/:guildId/:entryId', express.json(), async (req, res) => {
  const guildId = req.params.guildId;
  const entryId = req.params.entryId;
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: "Text ist erforderlich." });
  }
  
  // Überprüfe, ob der Text maximal 10 Wörter enthält.
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

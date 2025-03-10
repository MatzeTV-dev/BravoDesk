const express = require('express');
const { QdrantClient } = require('@qdrant/js-client-rest');
const { randomUUID } = require('crypto');

const router = express.Router();

const qdrantClient = new QdrantClient({
	url: process.env.QDRANT_URL || 'https://134feb5a-5ff2-462e-9a79-6dd5a9e95a9f.us-west-1-0.aws.cloud.qdrant.io:6333',
	apiKey: process.env.QDRANT_API_KEY || 'grzntACUv-HukjpiMGcqYp67rgmdew0hMJa6R9MSHg9TVVWL6iNqvw'
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
  
  const collectionName = `guild_${guildId}`;
  const entryId = randomUUID(); // Generiere eine eindeutige ID
  
  // Beispiel: Für eine Sammlung mit Dimension 128
  const dummyVector = Array(1024).fill(0);

  // Erstelle den neuen Punkt. Hier wird ein Dummy-Vektor ([0]) verwendet.
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
  
  const collectionName = `guild_${guildId}`;
  
  // Zum Aktualisieren wird ebenfalls upsert verwendet. 
  // (Es wird davon ausgegangen, dass der Vektor gleich bleibt. Andernfalls müssten Sie den aktuellen Vektor vorher abrufen.)
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

module.exports = router;

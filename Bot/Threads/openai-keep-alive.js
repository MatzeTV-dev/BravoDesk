import { QdrantClient } from '@qdrant/js-client-rest';
import Logger from '../helper/loggerHelper.js';
import { parentPort } from 'worker_threads';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const openAiApiKey = process.env.OPENAI_API_KEY;
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

/**
 * Führt eine API-Anfrage an die OpenAI API aus und sendet die Antwort über parentPort.
 *
 * @returns {Promise<void>}
 */
const makeApiRequest = async () => {
  try {
    const response = await axios.post(
      process.env.OPENAI_URL,
      {
        model: process.env.MODELL,
        messages: [{ role: 'user', content: "Test" }],
        max_tokens: 1
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiApiKey}`,
        },
      }
    );

    if (
      response.data &&
      response.data.choices &&
      response.data.choices.length > 0 &&
      response.data.choices[0].message &&
      typeof response.data.choices[0].message.content === 'string'
    ) {
      const message = response.data.choices[0].message.content.trim();
      parentPort.postMessage(`API Antwort: ${message}`);
    } else {
      parentPort.postMessage('Fehler: Unerwartetes API-Antwortformat.');
      console.error('Unerwartetes API-Antwortformat:', response.data);
    }
  } catch (error) {
    parentPort.postMessage(`Fehler bei der API-Anfrage: ${error.message}`);
    console.error('Fehlerdetails:', error.response ? error.response.data : error.message);
  }
};

/**
 * Führt einen Verbindungs-Check mit Qdrant durch.
 * Hier nutzen wir getCollections(), um zu prüfen, ob der Client erreichbar ist.
 */
const checkQdrantConnection = async () => {
  try {
    const collectionsResponse = await qdrantClient.getCollections();
    if (collectionsResponse && collectionsResponse.collections) {
      parentPort.postMessage('Qdrant Verbindung: OK');
      Logger.info('Qdrant-Verbindungs-Check erfolgreich: Collections abgerufen.');
    } else {
      parentPort.postMessage('Qdrant Verbindung: Unerwartetes Ergebnis.');
      Logger.warn('Unerwartetes Ergebnis beim Qdrant-Verbindungs-Check:', collectionsResponse);
    }
  } catch (error) {
    parentPort.postMessage(`Fehler beim Qdrant-Verbindungs-Check: ${error.message}`);
    Logger.error('Fehler beim Qdrant-Verbindungs-Check:', error);
  }
};

/**
 * Startet alle 15 Minuten eine API-Anfrage.
 */
setInterval(() => {
  parentPort.postMessage('Starte API-Anfrage openai & Qdrant...');
  makeApiRequest();
  checkQdrantConnection();
}, 1 * 60 * 1000);

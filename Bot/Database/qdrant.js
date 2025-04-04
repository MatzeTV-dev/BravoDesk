import { QdrantClient } from '@qdrant/js-client-rest';
import { HfInference } from '@huggingface/inference';
import Logger from '../helper/loggerHelper.js';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

/**
 * Generiert ein Embedding für den übergebenen Text.
 *
 * @param {string} text - Der Eingabetext.
 * @returns {Promise<Array|null>} Das generierte Embedding oder null bei einem Fehler.
 */
async function getEmbedding(text) {
  try {
    const embedding = await hf.featureExtraction({
      model: "intfloat/multilingual-e5-large",
      inputs: text,
    });
    return embedding;
  } catch (error) {
    Logger.error(`Fehler beim Generieren des Embeddings: ${error.message}\n${error.stack}`);
    return null;
  }
}

/**
 * Stellt sicher, dass eine Collection für die gegebene Guild existiert.
 *
 * @param {string} guildID - Die ID der Guild.
 * @returns {Promise<void>}
 */
async function ensureCollectionExists(guildID) {
  const collectionName = `${guildID}`;
  try {
    const collectionsResponse = await qdrantClient.getCollections();
    const collections = collectionsResponse.collections || [];
    const collectionNames = collections.map((collection) => collection.name);
    if (!collectionNames.includes(collectionName)) {
      Logger.warn(`Collection "${collectionName}" existiert nicht. Erstelle sie...`);
      generateCollection(collectionName);
    } else {
      Logger.info(`Collection "${collectionName}" existiert bereits.`);
    }
  } catch (error) {
    Logger.error(`Fehler beim Überprüfen oder Erstellen der Collection: ${error.message}\n${error.stack}`);
    throw error;
  }
}

/**
 * Lädt den übergebenen Text in die Collection hoch.
 *
 * @param {string} guildID - Die ID der Guild.
 * @param {string} text - Der Text, der hochgeladen werden soll.
 * @returns {Promise<boolean>} true bei Erfolg, false bei einem Fehler.
 */
async function upload(guildID, text) {
  const collectionName = `${guildID}`;
  try {
    await ensureCollectionExists(guildID);
    const embedding = await getEmbedding(text);
    if (!embedding) {
      Logger.error('Embedding konnte nicht generiert werden.');
      return false;
    }
    const id = uuidv4();
    const payload = { guildID, text };
    await qdrantClient.upsert(collectionName, {
      points: [{ id, vector: embedding, payload }],
    });
    Logger.success('Daten erfolgreich hochgeladen.');
    return true;
  } catch (error) {
    Logger.error(`Fehler beim Hochladen der Daten: ${error.message}\n${error.stack}`);
    return false;
  }
}

/**
 * Ruft alle Vektoren einer Collection ab.
 *
 * @param {string} guildID - Die ID der Guild.
 * @returns {Promise<Array|null>} Ein Array von Punkten oder null bei einem Fehler.
 */
async function getEverythingCollection(guildID) {
  const collectionName = `guild_${guildID}`;
  try {
    const scrollResponse = await qdrantClient.scroll(collectionName, {
      limit: 100,
      with_vectors: true,
      with_payload: true,
    });
    Logger.success('Daten erfolgreich abgerufen.');
    return scrollResponse.points;
  } catch (error) {
    Logger.error(`Fehler beim Abrufen der Daten: ${error.message}\n${error.stack}`);
    return null;
  }
}

/**
 * Löscht einen Eintrag in der Collection.
 *
 * @param {string} guildID - Die ID der Guild.
 * @param {string} id - Die ID des Eintrags.
 * @returns {Promise<boolean>} true bei Erfolg, false bei einem Fehler.
 */
async function deleteEntry(guildID, id) {
  const collectionName = `guild_${guildID}`;
  try {
    await qdrantClient.delete(collectionName, { points: [id] });
    Logger.success(`Eintrag mit der ID ${id} erfolgreich gelöscht.`);
    return true;
  } catch (error) {
    Logger.error(`Fehler beim Löschen des Eintrags: ${error.message}\n${error.stack}`);
    return false;
  }
}

/**
 * Aktualisiert einen Eintrag in der Collection.
 *
 * @param {string} guildID - Die ID der Guild.
 * @param {string} id - Die ID des Eintrags.
 * @param {string} description - Der neue Text.
 * @returns {Promise<boolean>} true bei Erfolg, false bei einem Fehler.
 */
async function editEntry(guildID, id, description) {
  const collectionName = `guild_${guildID}`;
  try {
    const embedding = await getEmbedding(description);
    if (!embedding) {
      Logger.error('Fehler beim Generieren des Embeddings für das Update.');
      return false;
    }
    const payload = { guildID, text: description };
    await qdrantClient.upsert(collectionName, {
      points: [{ id, vector: embedding, payload }],
    });
    Logger.success(`Eintrag mit der ID ${id} erfolgreich aktualisiert.`);
    return true;
  } catch (error) {
    Logger.error(`Fehler beim Aktualisieren des Eintrags: ${error.message}\n${error.stack}`);
    return false;
  }
}

/**
 * Ruft einen Eintrag aus der Collection ab.
 *
 * @param {string} entryID - Die ID des Eintrags.
 * @param {string} guildID - Die ID der Guild.
 * @returns {Promise<Object|null>} Das Payload des Eintrags oder null, wenn nichts gefunden wurde.
 */
async function getEntry(entryID, guildID) {
  const collectionName = `guild_${guildID}`;
  try {
    const response = await qdrantClient.retrieve(collectionName, {
      ids: [entryID],
      withPayload: true
    });
    Logger.info('Abfrage erfolgreich abgeschlossen.');
    if (response && response.length > 0) {
      return response[0].payload;
    } else {
      Logger.warn(`Kein Eintrag mit der ID ${entryID} in Collection "${collectionName}" gefunden.`);
      return null;
    }
  } catch (error) {
    Logger.error(`Fehler beim Abrufen des Eintrags mit ID ${entryID}: ${error.message}\n${error.stack}`);
    return null;
  }
}

/**
 * Führt eine Ähnlichkeitssuche in der Collection durch.
 *
 * @param {string} collectionName - Der Name der Collection.
 * @param {string} userQuery - Der Suchbegriff.
 * @returns {Promise<Array|null>} Das Suchergebnis oder null bei einem Fehler.
 */
async function getData(collectionName, userQuery) {
  try {
    const embedding = await getEmbedding(userQuery);
    if (!embedding) {
      Logger.error('Fehler beim Generieren des Embeddings für die Suche.');
      return null;
    }
    const searchResult = await qdrantClient.search(collectionName, {
      vector: embedding,
      limit: 1,
      with_payload: true,
    });
    Logger.success('Ähnlichkeitssuche erfolgreich abgeschlossen.');
    return searchResult;
  } catch (error) {
    Logger.error(`Fehler bei der Suche in Qdrant: ${error.message}\n${error.stack}`);
    return null;
  }
}

/**
 * Löscht alle Daten einer Collection.
 *
 * @param {string} collectionName - Der Name der Collection.
 * @returns {Promise<boolean>} true bei Erfolg, false bei einem Fehler.
 */
async function deleteAll(collectionName) {
  try {
    await qdrantClient.deleteCollection(collectionName);
    Logger.success(`Collection "${collectionName}" erfolgreich gelöscht.`);
    return true;
  } catch (error) {
    Logger.error(`Fehler beim Löschen der Collection "${collectionName}": ${error.message}\n${error.stack}`);
    return false;
  }
}

/**
 * Erstellt eine neue Collection mit vorgegebenen Vektoreigenschaften.
 *
 * @param {string} collectionname - Der Name der Collection.
 * @returns {Promise<void>}
 */
async function generateCollection(collectionname) {
  try {
    await qdrantClient.createCollection(collectionname, {
      vectors: {
        size: 1024,
        distance: 'Cosine',
      },
    });
  } catch (error) {
    Logger.error(error);
  }
}

export {
  getEverythingCollection,
  deleteEntry,
  deleteAll,
  editEntry,
  getEntry,
  getData,
  upload,
  generateCollection,
};

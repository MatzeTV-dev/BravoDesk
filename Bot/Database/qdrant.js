const { QdrantClient } = require("@qdrant/js-client-rest");
const { HfInference } = require('@huggingface/inference');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const Logger = require('../helper/loggerHelper.js');
dotenv.config();

const qdrantURL = process.env.QDRANT_URL;
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const qdrantClient = new QdrantClient({
    url: qdrantURL,
    apiKey: process.env.QDRANT_API_KEY,
});

// Funktion: Generiere Embeddings
async function getEmbedding(text) {
    try {
        const embedding = await hf.featureExtraction({
            model: "intfloat/multilingual-e5-large",
            inputs: text,
        });
        return embedding;
    } catch (error) {
        Logger.error(`Fehler beim Generieren des Embeddings: ${error.message}`);
        return null;
    }
}
  
// Funktion: Überprüfen, ob Collection existiert
async function ensureCollectionExists(guildID) {
    const collectionName = `guild_${guildID}`;
    try {
        const collectionsResponse = await qdrantClient.getCollections();
        const collections = collectionsResponse.collections || [];
        const collectionNames = collections.map((collection) => collection.name);

        if (!collectionNames.includes(collectionName)) {
            Logger.info(`Collection "${collectionName}" existiert nicht. Erstelle sie...`);
            await qdrantClient.createCollection(collectionName, {
                vectors: {
                    size: 1024, // Dimension des Vektorraums
                    distance: 'Cosine', // Ähnlichkeitsmetrik
                },
            });
            Logger.success(`Collection "${collectionName}" erfolgreich erstellt.`);
        } else {
            Logger.info(`Collection "${collectionName}" existiert bereits.`);
        }
    } catch (error) {
        Logger.error(`Fehler beim Überprüfen oder Erstellen der Collection: ${error.message}`);
        throw error;
    }
}

// Funktion: Daten hochladen
async function upload(guildID, text) {
    const collectionName = `guild_${guildID}`;
    try {
        await ensureCollectionExists(guildID);

        const embedding = await getEmbedding(text);
        if (!embedding) {
            Logger.error('Embedding konnte nicht generiert werden.');
            return false; // Rückgabe von `false` bei Fehlern
        }

        const id = uuidv4();
        const payload = { guildID, text };

        await qdrantClient.upsert(collectionName, {
            points: [{ id, vector: embedding, payload }],
        });

        Logger.success('Daten erfolgreich hochgeladen.');
        return true;
    } catch (error) {
        Logger.error(`Fehler beim Hochladen der Daten: ${error.message}`);
        return false;
    }
}

// Funktion: Alle Vektoren eines Namespaces (Collection) abrufen
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
        Logger.error(`Fehler beim Abrufen der Daten: ${error.message}`);
        return null; // Rückgabe von `null` bei Fehlern
    }
}

// Funktion: Löscht einen Eintrag
async function deleteEntry(guildID, id) {
    const collectionName = `guild_${guildID}`;
    try {
        await qdrantClient.delete(collectionName, { points: [id] });
        Logger.success(`Eintrag mit der ID ${id} erfolgreich gelöscht.`);
        return true;
    } catch (error) {
        Logger.error(`Fehler beim Löschen des Eintrags: ${error.message}`);
        return false;
    }
}

// Funktion: Aktualisieren eines Eintrags
async function editEntry(guildID, id, newContent) {
    const collectionName = `guild_${guildID}`;
    try {
        const embedding = await getEmbedding(newContent.description);
        if (!embedding) {
            Logger.error('Fehler beim Generieren des Embeddings für das Update.');
            return false;
        }

        const payload = { guildID, text: newContent };

        await qdrantClient.upsert(collectionName, {
            points: [{ id, vector: embedding, payload }],
        });

        Logger.success(`Eintrag mit der ID ${id} erfolgreich aktualisiert.`);
        return true;
    } catch (error) {
        Logger.error(`Fehler beim Aktualisieren des Eintrags: ${error.message}`);
        return false;
    }
}

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
        Logger.error(`Fehler beim Abrufen des Eintrags mit ID ${entryID}: ${error.message}`);
        return null;
    }
}

// Funktion: Ähnlichkeitssuche
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
        Logger.error(`Fehler bei der Suche in Qdrant: ${error.message}`);
        return null;
    }
}

// Funktion: Löscht alle Daten einer Collection
async function deleteAll(collectionName) {
    try {
        await qdrantClient.deleteCollection(collectionName);
        Logger.success(`Collection "${collectionName}" erfolgreich gelöscht.`);
        return true;
    } catch (error) {
        Logger.error(`Fehler beim Löschen der Collection "${collectionName}": ${error.message}`);
        return false;
    }
}

// Exportiere Funktionen
module.exports = {
    getEverythingCollection,
    deleteEntry,
    deleteAll,
    editEntry,
    getEntry,
    getData,
    upload,
};

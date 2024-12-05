const { QdrantClient } = require("@qdrant/js-client-rest");
const { HfInference } = require('@huggingface/inference');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
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
            model: 'intfloat/multilingual-e5-large',
            inputs: text,
        });
        return embedding; // Liefert Embeddings zurück
    } catch (error) {
        console.error('Fehler beim Generieren des Embeddings:', error);
        throw error;
    }
}

// Funktion: Überprüfen, ob Collection existiert
async function ensureCollectionExists(guildID) {
    const collectionName = `guild_${guildID}`;
    try {
        // Abrufen der Collections
        const collectionsResponse = await qdrantClient.getCollections();
        const collections = collectionsResponse.collections || [];
        const collectionNames = collections.map(collection => collection.name);
        const collectionExists = collectionNames.includes(collectionName);

        if (!collectionExists) {
            console.log(`Collection "${collectionName}" existiert nicht. Erstelle sie...`);

            // Erstelle die Collection
            await qdrantClient.createCollection(collectionName, {
                vectors: {
                    size: 1024, // Dimension des Vektorraums
                    distance: 'Cosine', // Ähnlichkeitsmetrik
                },
            });

            console.log(`Collection "${collectionName}" erfolgreich erstellt.`);
        } else {
            console.log(`Collection "${collectionName}" existiert bereits.`);
        }
    } catch (error) {
        console.error('Fehler beim Überprüfen oder Erstellen der Collection:', error);
        throw error;
    }
}

// Funktion: Daten hochladen
async function upload(guildID, text) {
    const collectionName = `guild_${guildID}`;
    try {
        // Stelle sicher, dass die Collection existiert
        await ensureCollectionExists(guildID);

        // Generiere Embedding
        const embedding = await getEmbedding(text);

        // ID und Payload definieren
        const id = uuidv4(); // Generieren einer gültigen UUID
        const payload = { guildID, text };

        // Senden der Daten an Qdrant
        await qdrantClient.upsert(collectionName, {
            points: [
                {
                    id: id, // Verwenden der generierten UUID
                    vector: embedding,
                    payload: payload,
                },
            ],
        });

        console.log('Daten erfolgreich hochgeladen.');
    } catch (error) {
        console.error('Fehler beim Hochladen der Daten:', error);
    }
}

// Funktion: Alle Vektoren eines Namespaces (Collection) abrufen
async function getEverythingCollection(guildID) {
    const collectionName = `guild_${guildID}`;
    try {
        const scrollResponse = await qdrantClient.scroll(collectionName, {
            limit: 100, // Maximale Anzahl an Ergebnissen
            with_vectors: true,
            with_payload: true,
        });

        return scrollResponse.points;
    } catch (error) {
        console.error('Fehler beim Abrufen der Daten:', error);
        throw error;
    }
}

// Funktion: Löscht einen Eintrag
async function deleteEntry(guildID, id) {
    const collectionName = `guild_${guildID}`; // Name deiner Collection
    try {
        // Verwende die delete-Methode, um den Punkt mit der angegebenen ID zu entfernen
        await qdrantClient.delete(collectionName, {
            points: [id],
        });

        console.log(`Eintrag mit der ID ${id} erfolgreich gelöscht.`);
    } catch (error) {
        console.error('Fehler beim Löschen des Eintrags aus Qdrant:', error);
        throw error;
    }
}

// Funktion: Edetiert ein Eintrag
async function editEntry(guildID, id, newContent) {
    const collectionName = `guild_${guildID}`;
    try {
        const embedding = await getEmbedding(newContent);

        const payload = { guildID, text: newContent };

        // Aktualisiere den Punkt in Qdrant
        await qdrantClient.upsert(collectionName, {
            points: [
                {
                    id,
                    vector: embedding,
                    payload,
                },
            ],
        });

        console.log(`Eintrag mit der ID ${id} erfolgreich aktualisiert.`);
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Eintrags in Qdrant:', error);
        throw error;
    }
}

// Funktion: Fragt Daten an
async function getData(collectionName, userQuery) {
    const embededData = await getEmbedding(userQuery);

    // Führe die Suche in Qdrant durch
    const searchResult = await qdrantClient.search(collectionName, {
        vector: embededData,
        limit: 1,
        with_payload: true,
        with_vectors: false,
    });

    return searchResult;
}

// Funktion: Löscht alles anhand einer discord ID
async function deleteAll(collectionName) {
    try {
        // Collection löschen
        const response = await qdrantClient.deleteCollection(collectionName);
        console.log(`Collection "${collectionName}" erfolgreich gelöscht.`, response);
    } catch (error) {
        console.error(`Fehler beim Löschen der Collection "${collectionName}":`, error.message);
    }
}

// Exportiere Funktionen
module.exports = {
    getEverythingCollection,
    deleteEntry,
    deleteAll,
    editEntry,
    getData,
    upload,
};

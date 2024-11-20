// Importieren Sie die Pinecone-Bibliothek
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

// Lesen Sie die Kommandozeilenargumente
// process.argv[2] ist das erste Argument nach dem Skriptnamen
const indexName = process.env.INDEX_NAME
const namespaceID = process.argv[2];
const question = process.argv[3]

// Überprüfen Sie, ob die erforderlichen Argumente vorhanden sind
if (!namespaceID) {
  console.error('Verwendung: node upload_informations.js <namespaceID> <question>');
  process.exit(1);
}

// Initialisieren Sie einen Pinecone-Client mit Ihrem API-Schlüssel
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const model = process.env.EMBEDDING_MODEL;

// Definieren Sie Ihre Abfrage
const query = [
  question,
];

// Asynchrone Funktion zur Verwendung von await
(async () => {
  try {
    // Konvertieren Sie die Abfrage in einen numerischen Vektor
    const queryEmbedding = await pc.inference.embed(
      model,
      query,
      { inputType: 'query' }
    );

    const index = pc.index(indexName);

    // Durchsuchen Sie den Index nach den drei ähnlichsten Vektoren
    const queryResponse = await index.namespace(namespaceID).query({
      topK: 3,
      vector: queryEmbedding[0].values,
      includeValues: false,
      includeMetadata: true
    });

    console.log(queryResponse);
  } catch (error) {
    console.error('Fehler bei der Verarbeitung:', error);
  }
})();

// Importieren Sie die Pinecone-Bibliothek und andere Module
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

// Lesen Sie die Kommandozeilenargumente
const indexName = process.env.INDEX_NAME;
const namespaceID = process.argv[2];
const dataID = process.argv[3];
const dataText = process.argv[4];

// Überprüfen Sie, ob die erforderlichen Argumente vorhanden sind
if (!namespaceID || !dataID || !dataText) {
  console.error('Verwendung: node script.js <namespaceID> <dataID> <data>');
  process.exit(1);
}

// Initialisieren Sie einen Pinecone-Client mit Ihrem API-Schlüssel
const pc = new Pinecone({ apiKey:  process.env.PINECONE_API_KEY });

// Definieren Sie das zu hochladende Datenelement
const data = [
  { id: dataID, text: dataText }
];

// Verwenden Sie eine asynchrone Funktion, um await zu verwenden
(async () => {
  try {
    // Konvertieren Sie den Text in Vektor-Einbettungen
    const embeddings = await pc.inference.embed(
      model,
      data.map(d => d.text),
      { inputType: 'passage', truncate: 'END' }
    );


    // Zielindex, in dem die Vektor-Einbettungen gespeichert werden
    const index = pc.index(indexName);

    // Bereiten Sie die Datensätze für das Upsert vor
    const records = data.map((d, i) => ({
      id: d.id,
      values: embeddings[i].values,
      metadata: { text: d.text }
    }));

    // Fügen Sie die Vektoren in den Index ein
    await index.namespace(namespaceID).upsert(records);

    // Optional: Beschreiben Sie die Indexstatistiken
    const stats = await index.describeIndexStats();

    console.log(stats);
  } catch (error) {
    console.error('Fehler bei der Verarbeitung:', error);
  }
})();

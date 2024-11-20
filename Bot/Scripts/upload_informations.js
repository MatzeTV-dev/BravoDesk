// Importieren Sie die Pinecone-Bibliothek und andere Module
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

// Lesen Sie die Kommandozeilenargumente
const indexName = process.argv[2];
const namespaceID = process.argv[3];

// Überprüfen Sie, ob die erforderlichen Argumente vorhanden sind
if (!indexName || !namespaceID) {
  console.error('Verwendung: node script.js <indexName> <namespaceID>');
  process.exit(1);
}

// Initialisieren Sie einen Pinecone-Client mit Ihrem API-Schlüssel
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// Konvertieren Sie den Text in numerische Vektoren, die Pinecone indizieren kann
const model = process.env.EMBEDDING_MODEL;

// Definieren Sie ein Beispieldatensatz, wobei jedes Element eine eindeutige ID und einen Text enthält
const data = [
  { id: 'vec1', text: 'Apple is a popular fruit known for its sweetness and crisp texture.' },
  { id: 'vec2', text: 'The tech company Apple is known for its innovative products like the iPhone.' },
  { id: 'vec3', text: 'Many people enjoy eating apples as a healthy snack.' },
  { id: 'vec4', text: 'Apple Inc. has revolutionized the tech industry with its sleek designs and user-friendly interfaces.' },
  { id: 'vec5', text: 'An apple a day keeps the doctor away, as the saying goes.' },
  { id: 'vec6', text: 'Apple Computer Company was founded on April 1, 1976, by Steve Jobs, Steve Wozniak, and Ronald Wayne as a partnership.' }
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

    // Erstellen Sie einen serverlosen Index
    await pc.createIndex({
      name: indexName,
      dimension: 1024,
      metric: 'cosine',
      spec: { 
        serverless: { 
          cloud: 'aws', 
          region: 'us-east-1' 
        }
      } 
    }); 

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

    // Beschreiben Sie die Indexstatistiken
    const stats = await index.describeIndexStats();

    console.log(stats);
  } catch (error) {
    console.error('Fehler bei der Verarbeitung:', error);
  }
})();

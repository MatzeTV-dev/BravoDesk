import { parentPort } from 'worker_threads';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const openAiApiKey = process.env.OPENAI_API_KEY;

// Funktion für die API-Anfrage
const makeApiRequest = async () => {
  try {
    const response = await axios.post(
      process.env.OPENAI_URL,
      {
        model: process.env.MODELL,
        messages: [{ role: 'user', content: "Test" }],
        max_tokens: 1 // Hier wird die Ausgabe auf maximal 1 Token begrenzt
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiApiKey}`,
        },
      }
    );

    // API-Antwort prüfen und extrahieren
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

// Alle 15 Minuten die Anfrage ausführen
setInterval(() => {
  parentPort.postMessage('Starte API-Anfrage...');
  makeApiRequest();
}, 15 * 60 * 1000);

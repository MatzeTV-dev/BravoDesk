import { parentPort } from 'worker_threads';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const openAiApiKey = process.env.OPENAI_API_KEY;

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
 * Startet alle 15 Minuten eine API-Anfrage.
 */
setInterval(() => {
  parentPort.postMessage('Starte API-Anfrage...');
  makeApiRequest();
}, 15 * 60 * 1000);

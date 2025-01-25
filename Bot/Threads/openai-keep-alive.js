const { parentPort } = require('worker_threads');
require('dotenv').config(); 
const axios = require('axios');

const openAiApiKey = process.env.OPENAI_API_KEY;

// Funktion für die API-Anfrage
const makeApiRequest = async () => {
    try {
        const response = await axios.post(
                    process.env.OPENAI_URL,
                    {
                        model: process.env.MODELL,
                        messages: [
                            { role: 'user', content: "Test" },
                        ],
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                        },
                    }
                );

        const message = response.data.choices[0].text.trim();
        parentPort.postMessage(`API Antwort: ${message}`);
    } catch (error) {
        parentPort.postMessage(`Fehler bei der API-Anfrage: ${error.message}`);
    }
};

// Alle 15 Minuten die Anfrage ausführen
setInterval(() => {
    parentPort.postMessage('Starte API-Anfrage...');
    makeApiRequest();
}, 15 * 60 * 1000);

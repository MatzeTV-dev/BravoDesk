const { parentPort } = require('worker_threads');
require('dotenv').config(); 
const axios = require('axios');

const openAiApiKey = process.env.OPENAI_API_KEY;

// Funktion für die API-Anfrage
const makeApiRequest = async () => {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/completions',
            {
                model: 'text-davinci-003',
                prompt: 'Dies ist ein Testaufruf.',
                max_tokens: 50,
            },
            {
                headers: {
                    Authorization: `Bearer ${openAiApiKey}`,
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

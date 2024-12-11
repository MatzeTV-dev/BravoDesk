const { Call } = require('../Database/database.js');

async function activateKey(key, guildID) {
    var result = await Call("CALL activateKey(?, @is_valid, ?)", [key, guildID], "SELECT @is_valid;");
    return result;
}

async function CheckKeyStatus(key) {
    try {
        // Rufe die Stored Procedure auf
        const result = await Call("CALL CheckKeyStatus(?, @exists_in_keys, @is_activated, @is_valid)", [key], "SELECT @exists_in_keys AS exists_in_keys, @is_activated AS is_activated, @is_valid AS is_valid;");
        console.log('Ergebnisse:', result); // Debug-Ausgabe
        return result;
    } catch (error) {
        console.error('Fehler bei CheckKeyStatus:', error);
        return null; // Fehlerfall
    }
}

module.exports = {
    activateKey,
    CheckKeyStatus,
}
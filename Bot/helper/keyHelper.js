const { Call } = require('../Database/database.js');

// Aktivert den Key beim erstenmal
async function activateKey(key, guildID) {
    try {
        var result = await Call("CALL ActivateKey(?, ?)", [key, guildID]);
        return result;
    } catch (erorr) {
        console.erorr(error);
    }
}

// Überprüft ob der Key Überhaupt exsestiert
async function checkKeyExists(key) {
    try {
        // Rufe die Stored Procedure auf
        const result = await Call("CALL CheckKeyExists(?, @exists_in_keys)", [key], "SELECT @exists_in_keys AS exists_in_keys");
        console.log('Ergebnisse:', result); // Debug-Ausgabe
        return result;
    } catch (error) {
        console.error('Fehler bei checkKeyExists:', error);
        return null; // Fehlerfall
    }
}

// Überprüft ob der Key schon einmal aktiviert worden ist
async function checkKeyActivated(key) {
    try {
        // Rufe die Stored Procedure auf
        const result = await Call("CALL checkKeyActivated(?, @is_activated)", [key], "SELECT @is_activated AS is_activated");
        console.log('Ergebnisse:', result); // Debug-Ausgabe
        return result;
    } catch (error) {
        console.error('Fehler bei checkKeyActivated:', error);
        return null; // Fehlerfall
    }
}

// Überprüft ob der Key ausgelaufen ist
async function checkKeyValidity(key) {
    try {
        // Rufe die Stored Procedure auf
        const result = await Call("CALL CheckKeyValidity(?, @is_valid);", [key], "SELECT @is_valid AS is_valid");
        console.log('Ergebnisse:', result); // Debug-Ausgabe
        return result;
    } catch (error) {
        console.error('Fehler bei checkKeyValidity:', error);
        return null; // Fehlerfall
    }
}

// Überprüft ob der Key versucht wird irgendwo auf einem anderne Server einzulösen als bei dem erstmaligen eingelösten.
async function CheckDiscordIDWithKey(activationKey, discord_server_id) {
    try {
        const result = await Call("Call CheckDiscordIDWithKey(?, ?, @is_match)", [activationKey, discord_server_id], "SELECT @is_match AS IsMatch")
        console.log('Ergebnisse:', result); // Debug-Ausgabe
        return result;
    } catch (error) {
        console.error(erorr);
        return null;
    }
}

module.exports = {
    activateKey,
    checkKeyActivated,
    checkKeyValidity,
    checkKeyExists,
    CheckDiscordIDWithKey,
}
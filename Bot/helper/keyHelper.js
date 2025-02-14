const { Call } = require('../Database/database.js');
const Logger = require('../helper/loggerHelper.js');

// Aktiviert den Key beim ersten Mal
async function activateKey(key, guildID) {
    try {
        const result = await Call("CALL ActivateKey(?, ?)", [key, guildID]);
        return result;
    } catch (error) {
        Logger.error(`Fehler bei activateKey: ${error.message}\n${error.stack}`);
    }
}

// Überprüft, ob der Key überhaupt existiert
async function checkKeyExists(key) {
    try {
        // Rufe die Stored Procedure auf
        const result = await Call("CALL CheckKeyExists(?, @exists_in_keys)", [key], "SELECT @exists_in_keys AS exists_in_keys");
        Logger.info(`Ergebnisse von checkKeyExists: ${result}`);
        return result;
    } catch (error) {
        Logger.error(`Fehler bei checkKeyExists: ${error.message}\n${error.stack}`);
        return null; // Fehlerfall
    }
}

// Überprüft, ob der Key schon einmal aktiviert worden ist
async function checkKeyActivated(key) {
    try {
        // Rufe die Stored Procedure auf
        const result = await Call("CALL checkKeyActivated(?, @is_activated)", [key], "SELECT @is_activated AS is_activated");
        Logger.info(`Ergebnisse von checkKeyActivated: ${result}`);
        return result;
    } catch (error) {
        Logger.error(`Fehler bei checkKeyActivated: ${error.message}\n${error.stack}`);
        return null; // Fehlerfall
    }
}

// Überprüft, ob der Key ausgelaufen ist
async function checkKeyValidity(key) {
    try {
        // Rufe die Stored Procedure auf
        const result = await Call("CALL CheckKeyValidity(?, @is_valid);", [key], "SELECT @is_valid AS is_valid");
        Logger.info(`Ergebnisse von checkKeyValidity: ${result}`);
        return result;
    } catch (error) {
        Logger.error(`Fehler bei checkKeyValidity: ${error.message}\n${error.stack}`);
        return null; // Fehlerfall
    }
}

// Überprüft, ob der Key versucht wird, irgendwo auf einem anderen Server eingelöst zu werden als bei der erstmaligen Einlösung
async function CheckDiscordIDWithKey(activationKey, discord_server_id) {
    try {
        const result = await Call("Call CheckDiscordIDWithKey(?, ?, @is_match)", [activationKey, discord_server_id], "SELECT @is_match AS IsMatch");
        Logger.info(`Ergebnisse von CheckDiscordIDWithKey: ${result}`);
        return result;
    } catch (error) {
        Logger.error(`Fehler bei CheckDiscordIDWithKey: ${error.message}\n${error.stack}`);
        return null;
    }
}

async function GetActivationKey(discord_server_id) {
    try {
        const result = await Call("Call GetActivationKey(?, @activation_key)", [discord_server_id], "SELECT @activation_key AS activation_key");
        Logger.info(`Ergebnisse von GetActivationKey: ${result}`);
        return result;
    } catch (error) {
        Logger.error(`Fehler bei GetActivationKey: ${error.message}\n${error.stack}`);
        return null;
    }
}

module.exports = {
    CheckDiscordIDWithKey,
    checkKeyActivated,
    checkKeyValidity,
    GetActivationKey,
    checkKeyExists,
    activateKey,
};

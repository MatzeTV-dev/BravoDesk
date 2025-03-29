import { Call } from '../Database/database.js';
import Logger from '../helper/loggerHelper.js';

/**
 * Aktiviert den Key beim ersten Mal.
 *
 * @param {string} key - Der Aktivierungsschlüssel.
 * @param {string} guildID - Die Guild-ID.
 * @returns {Promise<*>} Das Ergebnis der Aktivierung.
 */
async function activateKey(key, guildID) {
  try {
    const result = await Call("CALL ActivateKey(?, ?)", [key, guildID]);
    return result;
  } catch (error) {
    Logger.error(`Fehler bei activateKey: ${error.message}\n${error.stack}`);
  }
}

/**
 * Überprüft, ob der Key überhaupt existiert.
 *
 * @param {string} key - Der zu überprüfende Key.
 * @returns {Promise<*>} Das Ergebnis der Überprüfung oder null bei Fehler.
 */
async function checkKeyExists(key) {
  try {
    const result = await Call("CALL CheckKeyExists(?, @exists_in_keys)", [key], "SELECT @exists_in_keys AS exists_in_keys");
    Logger.info(`Ergebnisse von checkKeyExists: ${result}`);
    return result;
  } catch (error) {
    Logger.error(`Fehler bei checkKeyExists: ${error.message}\n${error.stack}`);
    return null;
  }
}

/**
 * Überprüft, ob der Key bereits aktiviert wurde.
 *
 * @param {string} key - Der zu überprüfende Key.
 * @returns {Promise<*>} Das Ergebnis der Überprüfung oder null bei Fehler.
 */
async function checkKeyActivated(key) {
  try {
    const result = await Call("CALL checkKeyActivated(?, @is_activated)", [key], "SELECT @is_activated AS is_activated");
    Logger.info(`Ergebnisse von checkKeyActivated: ${result}`);
    return result;
  } catch (error) {
    Logger.error(`Fehler bei checkKeyActivated: ${error.message}\n${error.stack}`);
    return null;
  }
}

/**
 * Überprüft, ob der Key gültig (nicht ausgelaufen) ist.
 *
 * @param {string} key - Der zu überprüfende Key.
 * @returns {Promise<*>} Das Ergebnis der Überprüfung oder null bei Fehler.
 */
async function checkKeyValidity(key) {
  try {
    const result = await Call("CALL CheckKeyValidity(?, @is_valid);", [key], "SELECT @is_valid AS is_valid");
    Logger.info(`Ergebnisse von checkKeyValidity: ${result}`);
    return result;
  } catch (error) {
    Logger.error(`Fehler bei checkKeyValidity: ${error.message}\n${error.stack}`);
    return null;
  }
}

/**
 * Überprüft, ob der Key auf demselben Server eingelöst wird wie bei der erstmaligen Einlösung.
 *
 * @param {string} activationKey - Der Aktivierungsschlüssel.
 * @param {string} discord_server_id - Die Discord-Server-ID.
 * @returns {Promise<*>} Das Ergebnis der Überprüfung oder null bei Fehler.
 */
async function CheckDiscordIDWithKey(activationKey, discord_server_id) {
  try {
    const result = await Call("CALL CheckDiscordIDWithKey(?, ?, @is_match)", [activationKey, discord_server_id], "SELECT @is_match AS IsMatch");
    Logger.info(`Ergebnisse von CheckDiscordIDWithKey: ${result}`);
    return result;
  } catch (error) {
    Logger.error(`Fehler bei CheckDiscordIDWithKey: ${error.message}\n${error.stack}`);
    return null;
  }
}

/**
 * Ruft den Aktivierungsschlüssel für die gegebene Discord-Server-ID ab.
 *
 * @param {string} discord_server_id - Die Discord-Server-ID.
 * @returns {Promise<*>} Das Ergebnis der Abfrage oder null bei Fehler.
 */
async function GetActivationKey(discord_server_id) {
  try {
    const result = await Call("CALL GetActivationKey(?, @activation_key)", [discord_server_id], "SELECT @activation_key AS activation_key");
    Logger.info(`Ergebnisse von GetActivationKey: ${result}`);
    return result;
  } catch (error) {
    Logger.error(`Fehler bei GetActivationKey: ${error.message}\n${error.stack}`);
    return null;
  }
}

export {
  CheckDiscordIDWithKey,
  checkKeyActivated,
  checkKeyValidity,
  GetActivationKey,
  checkKeyExists,
  activateKey,
};

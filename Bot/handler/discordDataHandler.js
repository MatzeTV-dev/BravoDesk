// handler/discordDataHandler.js
const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, '../data/discord_data.json');

/**
 * Lädt alle Discord-Daten aus der JSON-Datei.
 * Falls die Datei nicht existiert, wird ein leeres Objekt zurückgegeben.
 */
function loadAllData() {
  if (!fs.existsSync(dataFilePath)) {
    return { guilds: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
  } catch (error) {
    throw new Error('Fehler beim Parsen der discord_data.json: ' + error.message);
  }
}

/**
 * Speichert das übergebene Datenobjekt in der JSON-Datei.
 */
function saveAllData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Gibt die Server-Informationen für die angegebene Guild-ID zurück.
 * Falls noch keine Daten vorhanden sind, wird ein leeres Objekt angelegt.
 *
 * @param {string} guildId - Die ID des Discord-Servers.
 * @returns {object} Die gespeicherten Daten für den Server.
 */
function getServerInformation(guildId) {
  const data = loadAllData();
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {}; // Initialisiere leere Daten für den Server
    saveAllData(data);
  }
  return data.guilds[guildId];
}

/**
 * Speichert die übergebenen Server-Informationen für die angegebene Guild-ID.
 *
 * @param {string} guildId - Die ID des Discord-Servers.
 * @param {object} info - Die Server-Informationen, die gespeichert werden sollen.
 * @returns {object} Die gespeicherten Informationen.
 */
function setServerInformation(guildId, info) {
  const data = loadAllData();
  data.guilds[guildId] = info;
  saveAllData(data);
  return info;
}

/**
 * Aktualisiert die Server-Informationen für die angegebene Guild-ID mithilfe einer Updater-Funktion.
 *
 * @param {string} guildId - Die ID des Discord-Servers.
 * @param {function} updaterFunction - Eine Funktion, die die aktuellen Daten entgegennimmt
 *                                     und die aktualisierten Daten zurückgibt.
 * @returns {object} Die aktualisierten Server-Informationen.
 */
function updateServerInformation(guildId, updaterFunction) {
  const data = loadAllData();
  const currentInfo = data.guilds[guildId] || {};
  const updatedInfo = updaterFunction(currentInfo);
  data.guilds[guildId] = updatedInfo;
  saveAllData(data);
  return updatedInfo;
}

module.exports = {
  loadAllData,
  saveAllData,
  getServerInformation,
  setServerInformation,
  updateServerInformation,
};

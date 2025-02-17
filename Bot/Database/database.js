const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const Logger = require('../helper/loggerHelper');

dotenv.config();

let pool;

async function initializeDatabaseConnection() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME_SERVER_INFORMATION,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true  // Damit Multi-Statement-Queries (z.B. CALL + SELECT) funktionieren
    });

    pool.on('connection', (connection) => {
      Logger.warn('New database connection established.');
      connection.on('error', (err) => {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
          Logger.warn('Connection lost. Attempting to reconnect...');
          initializeDatabaseConnection();
        } else {
          Logger.error(`Database connection error: ${err.message}`);
        }
      });
    });

    const [result] = await pool.query('SELECT 1');
    Logger.success('Database connection established successfully at startup.');
  } catch (error) {
    Logger.error(`Failed to initialize database connection: ${error.message}`);
    process.exit(1);
  }
}

async function executeQuery(query, params = []) {
  try {
    const [results] = await pool.query(query, params);
    return results;
  } catch (error) {
    Logger.error(`Query execution failed: ${error.message}`);
    throw error;
  }
}

// Bestehende Funktionen...
async function saveServerInformation(server_id, ticket_system_channel_id, ticket_category_id, support_role_ID, kiadmin_role_id, ticket_archiv_category_id) {
  const query = `CALL Save_Server_Information(?, ?, ?, ?, ?, ?)`;
  await executeQuery(query, [server_id, ticket_system_channel_id, ticket_category_id, support_role_ID, kiadmin_role_id, ticket_archiv_category_id]);
  Logger.success('Server information saved successfully!');
}

async function getServerInformation(discord_server_id) {
  try {
    const query = `CALL Get_Server_Information(?)`;
    const data = await executeQuery(query, [discord_server_id]);
    Logger.success('Server information retrieved successfully!');
    return data;
  } catch (error) {
    console.log(error);
  }
}

async function chefIfServerExists(input_id) {
  const queryCheck = `CALL Check_If_Server_Exists(?, @exists_flag)`;
  const queryResult = `SELECT @exists_flag AS exists_flag`;
  await executeQuery(queryCheck, [input_id]);
  const [result] = await executeQuery(queryResult);
  Logger.info(`Server existence check: ${result.exists_flag}`);
  return Boolean(result.exists_flag);
}

async function Select(statement, dataInput) {
  const rows = await executeQuery(statement, dataInput);
  Logger.success('Data retrieved successfully!');
  return rows;
}

async function Delete(statement, dataInput) {
  const result = await executeQuery(statement, dataInput);
  Logger.success('Data deleted successfully!');
  return result;
}

async function Call(statement, dataInput, SelectStatement) {
  await executeQuery(statement, dataInput);
  const rows = await executeQuery(SelectStatement);
  Logger.success('Stored procedure executed successfully!');
  return rows[0];
}

async function Insert(statement, dataInput) {
  const result = await executeQuery(statement, dataInput);
  Logger.success('New record inserted successfully!');
  return result;
}

async function addUserToBlacklist(serverId, userId, reason = '') {
  const query = `CALL Add_User_To_Blacklist(?, ?, ?)`;
  return await executeQuery(query, [serverId, userId, reason]);
}

async function removeUserFromBlacklist(serverId, userId) {
  const query = `CALL Remove_User_From_Blacklist(?, ?)`;
  return await executeQuery(query, [serverId, userId]);
}

async function checkUserBlacklisted(serverId, userId) {
  // Zuerst die Stored Procedure ausführen, die den OUT-Parameter setzt
  await executeQuery(`CALL Check_User_Blacklisted(?, ?, @is_blacklisted)`, [serverId, userId]);
  // Dann den OUT-Parameter abfragen
  const result = await executeQuery(`SELECT @is_blacklisted AS is_blacklisted`);
  return result[0] && result[0].is_blacklisted === 1;
}

// Neue Funktionen für Ticket-Categories

/**
 * Ruft über die Stored Procedure GetCategories alle Kategorien für den angegebenen Guild ab.
 * @param {string} guildId 
 * @returns {Promise<Array>} Liste der Kategorien
 */
async function dbGetCategories(guildId) {
  const results = await executeQuery('CALL GetCategories(?)', [guildId]);
  // MySQL gibt hier möglicherweise mehrere Result-Sets zurück – wir nehmen das erste
  return results[0] || [];
}

/**
 * Legt über die Stored Procedure CreateCategory eine neue Kategorie an.
 * @param {string} guildId 
 * @param {Object} category 
 */
async function dbCreateCategory(guildId, category) {
  // Wenn permission als Array vorliegt, in JSON umwandeln
  const permission = category.permission && Array.isArray(category.permission)
    ? JSON.stringify(category.permission)
    : null;
  await executeQuery('CALL CreateCategory(?, ?, ?, ?, ?, ?, ?, ?)', [
    guildId,
    category.label,
    category.description,
    category.value,
    category.emoji,
    category.aiPrompt,
    category.aiEnabled,
    permission
  ]);
}

/**
 * Löscht über die Stored Procedure DeleteCategory eine Kategorie anhand des Labels.
 * @param {string} guildId 
 * @param {string} label 
 */
async function dbDeleteCategory(guildId, label) {
  await executeQuery('CALL DeleteCategory(?, ?)', [guildId, label]);
}

// Exportiere alle Funktionen
module.exports = {
  initializeDatabaseConnection,
  saveServerInformation,
  getServerInformation,
  chefIfServerExists,
  Select,
  Delete,
  Call,
  Insert,
  addUserToBlacklist,
  removeUserFromBlacklist,
  checkUserBlacklisted,
  dbGetCategories,
  dbCreateCategory,
  dbDeleteCategory
};

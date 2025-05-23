import Logger from '../helper/loggerHelper.js';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool;

/**
 * Initialisiert die Datenbankverbindung beim Start der Anwendung.
 * Erstellt einen Verbindungspool und testet die Verbindung.
 * Bei einem Fehler wird die Anwendung beendet.
 * @async
 * @throws {Error} Wenn die Initialisierung der Datenbankverbindung fehlschlägt.
 */
export async function initializeDatabaseConnection() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME_SERVER_INFORMATION,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true
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

/**
 * Führt eine SQL-Abfrage mit optionalen Parametern aus.
 * @async
 * @param {string} query - Die auszuführende SQL-Abfrage.
 * @param {Array<any>} [params=[]] - Optionale Parameter für die Abfrage.
 * @returns {Promise<Array<any>>} Ein Promise, das zu den Ergebnissen der Abfrage auflöst.
 * @throws {Error} Wenn die Abfrageausführung fehlschlägt.
 */
export async function executeQuery(query, params = []) {
  try {
    const [results] = await pool.query(query, params);
    return results;
  } catch (error) {
    Logger.error(`Query execution failed: ${error.message}`);
    throw error;
  }
}

/**
 * Speichert Serverinformationen in der Datenbank mithilfe einer Stored Procedure.
 * @async
 * @param {string} server_id - Die ID des Servers.
 * @param {string} ticket_system_channel_id - Die ID des Ticket-System-Kanals.
 * @param {string} ticket_category_id - Die ID der Ticket-Kategorie.
 * @param {string} support_role_ID - Die ID der Support-Rolle.
 * @param {string} kiadmin_role_id - Die ID der KI-Admin-Rolle.
 * @param {string} ticket_archiv_category_id - Die ID der Ticket-Archiv-Kategorie.
 * @returns {Promise<void>} Ein Promise, das aufgelöst wird, wenn die Informationen gespeichert wurden.
 */
export async function saveServerInformation(server_id, ticket_system_channel_id, ticket_category_id, support_role_ID, kiadmin_role_id, ticket_archiv_category_id) {
  const query = `CALL Save_Server_Information(?, ?, ?, ?, ?, ?)`;
  await executeQuery(query, [server_id, ticket_system_channel_id, ticket_category_id, support_role_ID, kiadmin_role_id, ticket_archiv_category_id]);
  Logger.success('Server information saved successfully!');
}

/**
 * Ruft Serverinformationen aus der Datenbank mithilfe einer Stored Procedure ab.
 * @async
 * @param {string} discord_server_id - Die Discord-ID des Servers.
 * @returns {Promise<Array<any>>} Ein Promise, das zu den Serverinformationen auflöst.
 */
export async function getServerInformation(discord_server_id) {
  try {
    const query = `CALL Get_Server_Information(?)`;
    const data = await executeQuery(query, [discord_server_id]);
    Logger.success('Server information retrieved successfully!');
    return data;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Überprüft, ob ein Server in der Datenbank existiert, mithilfe einer Stored Procedure.
 * @async
 * @param {string} input_id - Die ID des Servers, der überprüft werden soll.
 * @returns {Promise<boolean>} Ein Promise, das zu `true` auflöst, wenn der Server existiert, andernfalls `false`.
 */
export async function checkIfServerExists(input_id) {
  const queryCheck = `CALL Check_If_Server_Exists(?, @exists_flag)`;
  const queryResult = `SELECT @exists_flag AS exists_flag`;
  await executeQuery(queryCheck, [input_id]);
  const [result] = await executeQuery(queryResult);
  Logger.info(`Server existence check: ${result.exists_flag}`);
  return Boolean(result.exists_flag);
}

/**
 * Führt eine SELECT-Anweisung aus und gibt die Ergebnisse zurück.
 * @async
 * @param {string} statement - Die auszuführende SQL-SELECT-Anweisung.
 * @param {Array<any>} dataInput - Die Parameter für die Anweisung.
 * @returns {Promise<Array<any>>} Ein Promise, das zu den abgerufenen Zeilen auflöst.
 */
export async function Select(statement, dataInput) {
  const rows = await executeQuery(statement, dataInput);
  Logger.success('Data retrieved successfully!');
  return rows;
}

/**
 * Führt eine DELETE-Anweisung aus.
 * @async
 * @param {string} statement - Die auszuführende SQL-DELETE-Anweisung.
 * @param {Array<any>} dataInput - Die Parameter für die Anweisung.
 * @returns {Promise<any>} Ein Promise, das zum Ergebnis der Löschoperation auflöst.
 */
export async function Delete(statement, dataInput) {
  const result = await executeQuery(statement, dataInput);
  Logger.success('Data deleted successfully!');
  return result;
}

/**
 * Führt eine Stored Procedure aus und gibt das Ergebnis einer anschließenden SELECT-Anweisung zurück.
 * @async
 * @param {string} statement - Die auszuführende Stored Procedure-Anweisung.
 * @param {Array<any>} dataInput - Die Parameter für die Stored Procedure.
 * @param {string} SelectStatement - Die SELECT-Anweisung, die nach der Stored Procedure ausgeführt wird.
 * @returns {Promise<any>} Ein Promise, das zum ersten Ergebnis der SELECT-Anweisung auflöst.
 */
export async function Call(statement, dataInput, SelectStatement) {
  await executeQuery(statement, dataInput);
  const rows = await executeQuery(SelectStatement, dataInput);
  Logger.success('Stored procedure executed successfully!');
  return rows[0];
}

/**
 * Führt eine INSERT-Anweisung aus.
 * @async
 * @param {string} statement - Die auszuführende SQL-INSERT-Anweisung.
 * @param {Array<any>} dataInput - Die Parameter für die Anweisung.
 * @returns {Promise<any>} Ein Promise, das zum Ergebnis der Einfügeoperation auflöst.
 */
export async function Insert(statement, dataInput) {
  const result = await executeQuery(statement, dataInput);
  Logger.success('New record inserted successfully!');
  return result;
}

/**
 * Fügt einen Benutzer zur Blacklist einer Guild hinzu mithilfe einer Stored Procedure.
 * @async
 * @param {string} serverId - Die ID des Servers (Guild).
 * @param {string} userId - Die ID des Benutzers.
 * @param {string} [reason=''] - Der optionale Grund für den Blacklist-Eintrag.
 * @returns {Promise<any>} Ein Promise, das zum Ergebnis der Operation auflöst.
 */
export async function addUserToBlacklist(serverId, userId, reason = '') {
  const query = `CALL Add_User_To_Blacklist(?, ?, ?)`;
  return await executeQuery(query, [serverId, userId, reason]);
}

/**
 * Entfernt einen Benutzer von der Blacklist einer Guild mithilfe einer Stored Procedure.
 * @async
 * @param {string} serverId - Die ID des Servers (Guild).
 * @param {string} userId - Die ID des Benutzers.
 * @returns {Promise<any>} Ein Promise, das zum Ergebnis der Operation auflöst.
 */
export async function removeUserFromBlacklist(serverId, userId) {
  const query = `CALL Remove_User_From_Blacklist(?, ?)`;
  return await executeQuery(query, [serverId, userId]);
}

/**
 * Überprüft, ob ein Benutzer auf der Blacklist einer Guild steht, mithilfe einer Stored Procedure.
 * @async
 * @param {string} serverId - Die ID des Servers (Guild).
 * @param {string} userId - Die ID des Benutzers.
 * @returns {Promise<boolean>} Ein Promise, das zu `true` auflöst, wenn der Benutzer auf der Blacklist steht, andernfalls `false`.
 */
export async function checkUserBlacklisted(serverId, userId) {
  await executeQuery(`CALL Check_User_Blacklisted(?, ?, @is_blacklisted)`, [serverId, userId]);
  const result = await executeQuery(`SELECT @is_blacklisted AS is_blacklisted`);
  return result[0] && result[0].is_blacklisted === 1;
}

/**
 * Ruft über die Stored Procedure GetCategories alle Kategorien für den angegebenen Guild ab.
 * @param {string} guildId 
 * @returns {Promise<Array>} Liste der Kategorien
 */
export async function dbGetCategories(guildId) {
  const results = await executeQuery('CALL GetCategories(?)', [guildId]);
  return results[0] || [];
}

/**
 * Legt über die Stored Procedure CreateCategory eine neue Kategorie an.
 * @param {string} guildId - Die ID der Guild.
 * @param {Object} category - Das Kategorieobjekt, das erstellt werden soll.
 * @param {string} category.label - Der Anzeigename der Kategorie.
 * @param {string} category.description - Die Beschreibung der Kategorie.
 * @param {string} category.value - Der interne Wert der Kategorie.
 * @param {string} [category.emoji] - Das Emoji für die Kategorie.
 * @param {string} category.aiPrompt - Der AI-Prompt für die Kategorie.
 * @param {boolean} category.aiEnabled - Gibt an, ob AI für diese Kategorie aktiviert ist.
 * @param {Array<string>} [category.permission] - Array von Rollen-IDs, die Zugriff haben.
 */
export async function dbCreateCategory(guildId, category) {
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
 * @param {string} guildId - Die ID der Guild.
 * @param {string} label - Das Label der zu löschenden Kategorie.
 */
export async function dbDeleteCategory(guildId, label) {
  await executeQuery('CALL DeleteCategory(?, ?)', [guildId, label]);
}

/**
 * Legt das Embed-Design für eine Guild an oder aktualisiert es (Upsert).
 * @async
 * @param {string} guildId - Die ID der Guild.
 * @param {string} ticketEmbedJson - JSON-String des Ticket-Erstellungs-Embeds.
 * @param {string} welcomeEmbedJson - JSON-String des Willkommensnachrichten-Embeds.
 * @returns {Promise<void>}
 */
export async function upsertGuildEmbeds(guildId, ticketEmbedJson, welcomeEmbedJson) {
  const query = `
    INSERT INTO guild_embeds (guild_id, ticket_creation_embed, welcome_message_embed)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      ticket_creation_embed = VALUES(ticket_creation_embed),
      welcome_message_embed = VALUES(welcome_message_embed);
  `;
  await executeQuery(query, [guildId, ticketEmbedJson, welcomeEmbedJson]);
  Logger.success(`Embed‑Designs upserted for guild ${guildId}`);
}

/**
 * Liest das Embed-Design aus der Datenbank für die angegebene Guild.
 * @async
 * @param {string} guildId - Die ID der Guild.
 * @returns {Promise<Object|null>} Ein Promise, das zum Embed-Design-Objekt oder null auflöst, wenn keins gefunden wurde.
 */
export async function getGuildEmbeds(guildId) {
  const rows = await executeQuery(
    'SELECT ticket_creation_embed, welcome_message_embed FROM guild_embeds WHERE guild_id = ?',
    [guildId]
  );
  if (!rows.length) return null;
  return rows[0];
}

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
    });

    // Event-Handler für neue Verbindungen
    pool.on('connection', (connection) => {
      Logger.warn('New database connection established.');
      connection.on('error', (err) => {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
          Logger.warn('Connection lost. Attempting to reconnect...');
          initializeDatabaseConnection(); // Verbindung neu initialisieren
        } else {
          Logger.error(`Database connection error: ${err.message}`);
        }
      });
    });

    // Testen der Verbindung beim Start
    const [result] = await pool.query('SELECT 1');
    Logger.success('Database connection established successfully at startup.');
  } catch (error) {
    Logger.error(`Failed to initialize database connection: ${error.message}`);
    process.exit(1); // Beendet den Prozess, falls die Datenbank nicht erreichbar ist
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

// Funktion: Daten speichern oder aktualisieren
async function saveServerInformation(server_id, ticket_system_channel_id, ticket_category_id, support_role_ID, kiadmin_role_id, ticket_archiv_category_id) {
  const query = `CALL Save_Server_Information(?, ?, ?, ?, ?, ?)`;
  await executeQuery(query, [server_id, ticket_system_channel_id, ticket_category_id, support_role_ID, kiadmin_role_id, ticket_archiv_category_id]);
  Logger.success('Server information saved successfully!');
}

// Funktion: Serverinformationen abrufen
async function getServerInformation(discord_server_id) {
  const query = `CALL Get_Server_Information(?)`;
  const data = await executeQuery(query, [discord_server_id]);
  Logger.success('Server information retrieved successfully!');
  return data;
}

// Funktion: Existenz eines Servers prüfen
async function chefIfServerExists(input_id) {
  const queryCheck = `CALL Check_If_Server_Exists(?, @exists_flag)`;
  const queryResult = `SELECT @exists_flag AS exists_flag`;
  await executeQuery(queryCheck, [input_id]);
  console.log(await executeQuery(queryResult));
  const [result] = await executeQuery(queryResult);
  
  Logger.info(`Server existence check: ${result.exists_flag}`);
  return Boolean(result.exists_flag);
}

// Funktion: Datensätze abrufen
async function Select(statement, dataInput) {
  const rows = await executeQuery(statement, dataInput);
  Logger.success('Data retrieved successfully!');
  return rows;
}

// Funktion: Datensätze löschen
async function Delete(statement, dataInput) {
  const result = await executeQuery(statement, dataInput);
  Logger.success('Data deleted successfully!');
  return result;
}

// Funktion: Stored Procedure aufrufen
async function Call(statement, dataInput, SelectStatement) {
  await executeQuery(statement, dataInput);
  const rows = await executeQuery(SelectStatement, dataInput);
  Logger.success('Stored procedure executed successfully!');
  return rows[0];
}

// Funktion: Daten einfügen (z. B. für Keys)
async function Insert(statement, dataInput) {
  const result = await executeQuery(statement, dataInput);
  Logger.success('New record inserted successfully!');
  return result;
}

// Exportiere Funktionen
module.exports = {
  initializeDatabaseConnection,
  saveServerInformation,
  getServerInformation,
  chefIfServerExists,
  Select,
  Delete,
  Call,
  Insert,
};

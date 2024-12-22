const { exec } = require('child_process');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const Logger = require('../helper/loggerHelper');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME_SERVER_INFORMATION,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function checkDatabaseStatus() {
  try {
    const [result] = await pool.query('SELECT 1'); // Testabfrage
    Logger.success('Database is online.');
    return true; // Gibt `true` zurück, wenn die Abfrage erfolgreich ist
  } catch (error) {
    Logger.error(`Error at database connection test: ${error.message}`);

    // Versuche, die Datenbank durch eine .bat-Datei zu starten
    try {
      Logger.info('Database offline. Trying to start...');
      exec('start C:/xampp/mysql_start.bat', (err, stdout, stderr) => {
        if (err) {
          Logger.error(`Error opening the .bat-File: ${err.message}`);
          return;
        }
        Logger.success(`Database started successfully: ${stdout}`);
      });
    } catch (batError) {
      Logger.error(`Error at starting the Database: ${batError.message}`);
    }

    return false; // Fehler beim Prüfen der Datenbankverbindung
  }
}

// Funktion: Daten speichern oder aktualisieren
async function saveServerInformation(server_id, ticket_system_channel_id, ticket_category_id, support_role_ID, kiadmin_role_id) {
  try {
    await pool.query(
      `CALL Save_Server_Information(?, ?, ?, ?, ?)`,
      [server_id, ticket_system_channel_id, ticket_category_id, support_role_ID, kiadmin_role_id]
    );
    Logger.success('Serverinformationen erfolgreich gespeichert!');
  } catch (error) {
    Logger.error(`Fehler beim Speichern der Serverinformationen: ${error.message}`);
    throw error; // Fehler weiterwerfen, falls benötigt
  }
}

// Funktion: Serverinformationen abrufen
async function getServerInformation(discord_server_id) {
  try {
    const [data] = await pool.query(
      `CALL Get_Server_Information(?)`,
      [discord_server_id]
    );
    Logger.success('Serverinformationen erfolgreich abgerufen!');
    return data;
  } catch (error) {
    Logger.error(`Fehler beim Abrufen der Serverinformationen: ${error.message}`);
    return null; // Rückgabe von `null` bei Fehlern
  }
}

// Funktion: Existenz eines Servers prüfen
async function chefIfServerExists(input_id) {
  try {
    // Führt die Stored Procedure aus
    await pool.query(`CALL Check_If_Server_Exists(?, @exists_flag)`, [input_id]);

    // Liest den Ergebniswert aus
    const [[result]] = await pool.query('SELECT @exists_flag AS exists_flag');
    Logger.info(`Existenzprüfung abgeschlossen: ${result.exists_flag}`);
    return Boolean(result.exists_flag); // Konvertiert zu Boolean
  } catch (error) {
    Logger.error(`Fehler bei der Existenzprüfung des Servers: ${error.message}`);
    return false; // Rückgabe von `false` bei Fehlern
  }
}

// Funktion: Datensätze abrufen
async function Select(statement, dataInput) {
  try {
    const [rows] = await pool.query(statement, dataInput);
    Logger.success('Daten erfolgreich abgerufen!');
    return rows;
  } catch (error) {
    Logger.error(`Fehler beim Abrufen von Daten: ${error.message}`);
    return null; // Rückgabe von `null` bei Fehlern
  }
}

// Funktion: Datensätze löschen
async function Delete(statement, dataInput) {
  try {
    const [result] = await pool.query(statement, dataInput);
    Logger.success('Daten erfolgreich gelöscht!');
    return result; // Gibt das Lösch-Ergebnis zurück
  } catch (error) {
    Logger.error(`Fehler beim Löschen von Daten: ${error.message}`);
    return null; // Rückgabe von `null` bei Fehlern
  }
}

// Funktion: Stored Procedure aufrufen
async function Call(statement, dataInput, SelectStatement) {
  try {
    await pool.query(statement, dataInput);
    Logger.success('Stored Procedure erfolgreich abgerufen!');
    const [rows] = await pool.query(SelectStatement);
    return rows[0]; // Gibt das Ergebnis zurück
  } catch (error) {
    Logger.error(`Fehler beim Aufrufen vom Stored Procedure: ${error.message}`);
    return null; // Rückgabe von `null` bei Fehlern
  }
}

// Exportiere Funktionen
module.exports = {
  saveServerInformation,
  getServerInformation,
  chefIfServerExists,
  checkDatabaseStatus,
  Select,
  Delete,
  Call,
};

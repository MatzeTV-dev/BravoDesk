const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

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

// Funktion: Daten speichern oder aktualisieren
async function saveServerInformation(server_id, ticket_system_channel_id, ticket_category_id) {
    await pool.query(
      `CALL Save_Server_Information(?, ?, ?)`,
      [server_id, ticket_system_channel_id, ticket_category_id]
    );
  }
  

// Funktion: Tabelle initialisieren (falls noch nicht vorhanden)
async function getServerInformation(discord_server_id) {
  await pool.query(
    `CALL Get_Server_Information(?)`,
    [discord_server_id]
  );
  console.log('Tabelle erfolgreich initialisiert!');
}

// Exportiere Funktionen
module.exports = {
  saveServerInformation,
  getServerInformation,
};

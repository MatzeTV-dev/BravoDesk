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
async function saveServerInformation(server_id, ticket_system_channel_id, ticket_category_id, support_role_ID, kiadmin_role_id) {
    await pool.query(
      `CALL Save_Server_Information(?, ?, ?, ?, ?)`,
      [server_id, ticket_system_channel_id, ticket_category_id, support_role_ID, kiadmin_role_id]
    );
  }
  

// Funktion: Tabelle initialisieren (falls noch nicht vorhanden)
async function getServerInformation(discord_server_id) {
  try {
    const data = await pool.query(
      `CALL Get_Server_Information(?)`,
      [discord_server_id]
    );
    console.log('Daten erhalten!');

    return data;
  } catch (error) {
    console.log("Fehler beim Abrufen der Serverinformationen", error);
  }
}

// Funktion, um die Existenz zu überprüfen
async function chefIfServerExists(input_id) {
  try {
      const [rows] = await pool.query(`CALL Check_If_Server_Exists(?, @exists_flag)`, [input_id]);

      const [[result]] = await pool.query('SELECT @exists_flag AS exists_flag');
      
      return result.exists_flag;
  } catch (err) {
      console.error('Fehler beim Aufruf der Stored Procedure:', err);
      throw err;
  }
}

// Exportiere Funktionen
module.exports = {
  saveServerInformation,
  getServerInformation,
  chefIfServerExists,
};

import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mysql from 'mysql2';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Stellt eine Verbindung zur MySQL-Datenbank her.
 * @type {mysql.Connection}
 */
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME_SERVER_INFORMATION
});

db.connect(err => {
  if (err) {
    console.error('Fehler bei der Datenbankverbindung:', err);
  } else {
    console.log('Erfolgreich mit der Datenbank verbunden');
  }
});

/**
 * Blacklist-Funktionen für das Hinzufügen, Entfernen und Suchen von Benutzern.
 * @namespace Blacklist
 */
const Blacklist = {
  /**
   * Fügt einen Benutzer zur Blacklist hinzu.
   * @param {string} userId - Die Benutzer-ID.
   * @param {string} reason - Der Grund für die Blacklist.
   * @param {function(Error|null, any):void} callback - Callback-Funktion.
   */
  add: (userId, reason, callback) => {
    const query = 'INSERT INTO blacklist (user_id, reason, date) VALUES (?, ?, NOW())';
    db.query(query, [userId, reason], (err, results) => {
      if (err) {
        console.error('Fehler beim Hinzufügen zur Blacklist:', err);
        callback(err, null);
      } else {
        console.log(`Benutzer ${userId} wurde zur Blacklist hinzugefügt.`);
        callback(null, results);
      }
    });
  },

  /**
   * Entfernt einen Benutzer von der Blacklist.
   * @param {string} userId - Die Benutzer-ID.
   * @param {function(Error|null, any):void} callback - Callback-Funktion.
   */
  remove: (userId, callback) => {
    const query = 'DELETE FROM blacklist WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('Fehler beim Entfernen aus der Blacklist:', err);
        callback(err, null);
      } else {
        console.log(`Benutzer ${userId} wurde von der Blacklist entfernt.`);
        callback(null, results);
      }
    });
  },

  /**
   * Sucht nach einem Blacklist-Eintrag für einen Benutzer.
   * @param {string} userId - Die Benutzer-ID.
   * @param {function(Error|null, any):void} callback - Callback-Funktion.
   */
  search: (userId, callback) => {
    const query = 'SELECT * FROM blacklist WHERE user_id = ?';
    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('Fehler bei der Blacklist-Suche:', err);
        callback(err, null);
      } else {
        callback(null, results);
      }
    });
  }
};

/**
 * Kategorien-Funktionen für Ticket-Kategorien.
 * @namespace Categories
 */
const Categories = {
  /**
   * Ruft alle Ticket-Kategorien für eine Guild ab.
   * @param {string} guildId - Die Guild-ID.
   * @param {function(Error|null, any):void} callback - Callback-Funktion, gibt das Resultset (results[0]) zurück.
   */
  getAll: (guildId, callback) => {
    db.query('CALL sp_GetTicketCategories(?)', [guildId], (err, results) => {
      if (err) {
        console.error('Fehler beim Abrufen der Kategorien:', err);
        return callback(err, null);
      }
      callback(null, results[0]);
    });
  },

  /**
   * Fügt eine neue Ticket-Kategorie hinzu.
   * @param {string} guildId - Die Guild-ID.
   * @param {string} label - Der Kategoriename.
   * @param {string} description - Die Beschreibung der Kategorie.
   * @param {string} emoji - Das Emoji.
   * @param {string} prompt - Der AI-Prompt.
   * @param {boolean} enabled - Gibt an, ob die KI aktiviert ist.
   * @param {string} permission - Die Berechtigungen.
   * @param {function(Error|null, any):void} callback - Callback-Funktion.
   */
  add: (guildId, label, description, emoji, prompt, enabled, permission, callback) => {
    db.query(
      'CALL sp_AddTicketCategory(?, ?, ?, ?, ?, ?, ?)',
      [guildId, label, description, emoji, prompt, enabled, permission],
      (err, results) => {
        if (err) {
          console.error('Fehler beim Hinzufügen der Kategorie:', err);
          return callback(err, null);
        }
        callback(null, results);
      }
    );
  },

  /**
   * Aktualisiert eine bestehende Ticket-Kategorie.
   * @param {number} id - Die Kategorien-ID.
   * @param {string} guildId - Die Guild-ID.
   * @param {string} label - Der Kategoriename.
   * @param {string} description - Die Beschreibung der Kategorie.
   * @param {string} emoji - Das Emoji.
   * @param {string} prompt - Der AI-Prompt.
   * @param {boolean} enabled - Gibt an, ob die KI aktiviert ist.
   * @param {string} permission - Die Berechtigungen.
   * @param {function(Error|null, any):void} callback - Callback-Funktion.
   */
  update: (id, guildId, label, description, emoji, prompt, enabled, permission, callback) => {
    console.log("Permission is: " + permission);
    if (!permission) {
      console.log("Permission is: " + permission);
      permission = null;
    }
    db.query(
      'CALL sp_UpdateTicketCategory(?, ?, ?, ?, ?, ?, ?, ?)',
      [id, guildId, label, description, emoji, prompt, enabled, permission],
      (err, results) => {
        if (err) {
          console.error('Fehler beim Aktualisieren der Kategorie:', err);
          return callback(err, null);
        }
        callback(null, results);
      }
    );
  },

  /**
   * Löscht eine Ticket-Kategorie.
   * @param {number} id - Die Kategorien-ID.
   * @param {string} guildId - Die Guild-ID.
   * @param {function(Error|null, any):void} callback - Callback-Funktion.
   */
  delete: (id, guildId, callback) => {
    db.query('CALL sp_DeleteTicketCategory(?, ?)', [id, guildId], (err, results) => {
      if (err) {
        console.error('Fehler beim Löschen der Kategorie:', err);
        return callback(err, null);
      }
      callback(null, results);
    });
  }
};

export { db, Blacklist, Categories };

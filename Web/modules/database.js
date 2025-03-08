const mysql = require('mysql2');

// Datenbankverbindung herstellen
const db = mysql.createConnection({
    host: '45.88.109.38', // Ändere dies je nach deiner Datenbankkonfiguration
    user: 'bot-development', // Dein Datenbankbenutzer
    password: '$G^Ht3bVLX$#8W983YeK', // Dein Datenbankpasswort
    database: 'customer_server_information_development' // Dein Datenbankname
});

// Verbindung testen
db.connect(err => {
    if (err) {
        console.error('Fehler bei der Datenbankverbindung:', err);
    } else {
        console.log('Erfolgreich mit der Datenbank verbunden');
    }
});

// Blacklist-Funktionen
const Blacklist = {
    // Benutzer zur Blacklist hinzufügen
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
    
    // Benutzer von der Blacklist entfernen
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
    
    // Überprüfen, ob ein Benutzer auf der Blacklist steht
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

// ---------------------------------------------
// KATEGORIEN-FUNKTIONEN (Ticket-Kategorien)
// ---------------------------------------------
const Categories = {
    // Alle Kategorien für eine Guild abrufen (ruft z. B. sp_GetTicketCategories auf)
    getAll: (guildId, callback) => {
        db.query('CALL sp_GetTicketCategories(?)', [guildId], (err, results) => {
            if (err) {
                console.error('Fehler beim Abrufen der Kategorien:', err);
                return callback(err, null);
            }
            // Stored Procedure gibt Resultset in results[0] zurück
            callback(null, results[0]);
        });
    },

    // Neue Kategorie hinzufügen (ruft sp_AddTicketCategory auf)
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

    // Kategorie aktualisieren (ruft sp_UpdateTicketCategory auf)
    update: (id, guildId, label, description, emoji, prompt, enabled, permission, callback) => {
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

    // Kategorie löschen (ruft sp_DeleteTicketCategory auf)
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

// ---------------------------------------------
// EXPORT
// ---------------------------------------------
module.exports = {
    db,
    Blacklist,
    Categories
};
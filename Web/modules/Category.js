const express = require('express');
const { db } = require('../modules/database');
const router = express.Router();

// Alle Kategorien für einen Server abrufen
router.get('/ticket_categories/:guildId', (req, res) => {
	const guildId = req.params.guildId;
  
	db.query("CALL sp_GetTicketCategories(?)", [guildId], (err, results) => {
	  if (err) {
		console.error("Fehler beim Abrufen der Kategorien:", err);
		return res.status(500).json({ error: "Fehler beim Abrufen der Kategorien" });
	  }
	  // Stored Procedure gibt das Ergebnis in results[0] zurück
	  res.json(results[0]);
	});
});
  
// Neue Kategorie hinzufügen
router.post('/ticket_categories/:guildId', express.json(), (req, res) => {
	const guildId = req.params.guildId;
	const { label, description, emoji, ai_prompt, ai_enabled, permission } = req.body;
  
	const sanitizedText = label.replace(/\s+/g, '_');
	const value = 'category_' + sanitizedText;
  
	if (!label) {
	  return res.status(400).json({ error: "label ist erforderlich." });
	}
  
	db.query(
	  "CALL sp_AddTicketCategory(?, ?, ?, ?, ?, ?, ?, ?)",
	  [guildId, label, description, value, emoji, ai_prompt, ai_enabled, permission],
	  async (err) => {
		if (err) {
		  console.error("Fehler beim Hinzufügen der Kategorie:", err);
		  return res.status(500).json({ error: "Fehler beim Hinzufügen der Kategorie." });
		}
		
		// Nach erfolgreichem DB-Aufruf wird ein HTTP-Request an den Bot gesendet,
		// damit dieser z.B. die Ticket-Erstellungsnachricht aktualisiert.
		try {
		  const response = await axios.post(
			`${process.env.BOT_API_URL}/api/update-ticket-message`, // Die URL des Bot-Endpoints, z.B. http://bot-server:3000/update-ticket-message
			{
			  guildId,
			  label,
			  description,
			  value,
			  emoji,
			  ai_prompt,
			  ai_enabled,
			  permission
			},
			{
			  headers: {
				'Authorization': process.env.BOT_API_TOKEN,
				'Content-Type': 'application/json'
			  }
			}
		  );
		  console.log("Bot update response:", response.data);
		} catch (botErr) {
		  console.error("Fehler beim Aktualisieren der Ticket-Erstellungsnachricht beim Bot:", botErr);
		}
		
		res.json({ success: true, message: "Kategorie wurde hinzugefügt." });
	  }
	);
  });

// Kategorie aktualisieren
router.patch('/ticket_categories/:guildId/:categoryId', express.json(), (req, res) => {
	const guildId = req.params.guildId;
	const categoryId = parseInt(req.params.categoryId, 10);
	let { label, description, emoji, ai_prompt, enabled, permission } = req.body;

	if (!label) {
	  return res.status(400).json({ error: "label ist erforderlich." });
	}
	
	/*if (permission === "") {
		permission = null
	}*/

	db.query(
	  "CALL sp_UpdateTicketCategory(?, ?, ?, ?, ?, ?, ?, ?)",
	  [categoryId, guildId, label, description, emoji, ai_prompt, enabled, permission],
	  (err) => {
		if (err) {
		  console.error("Fehler beim Aktualisieren der Kategorie:", err);
		  return res.status(500).json({ error: "Fehler beim Aktualisieren der Kategorie." });
		}
		res.json({ success: true, message: "Kategorie wurde aktualisiert." });
	  }
	);
});
  
// Kategorie löschen
router.delete('/ticket_categories/:guildId/:categoryId', (req, res) => {
	const guildId = req.params.guildId;
	const categoryId = parseInt(req.params.categoryId, 10);
  
	db.query("CALL sp_DeleteTicketCategory(?, ?)", [categoryId, guildId], (err) => {
	  if (err) {
		console.error("Fehler beim Löschen der Kategorie:", err);
		return res.status(500).json({ error: "Fehler beim Löschen der Kategorie." });
	  }
	  res.json({ success: true, message: "Kategorie wurde gelöscht." });
	});
});

router.get('/roles/:guildId', async (req, res) => {
  const guildId = req.params.guildId;
  try {
    const rolesRes = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
      headers: {
        "Authorization": `Bot MTMxNDIyNzQ0ODMyOTY2NjU5MQ.GMTqCE.4g-zsjR-vo94dpInBaZYU5PfTcQN4EvD6sUlYA`
      }
    });
    if (!rolesRes.ok) {
      throw new Error(`Fehler beim Abrufen der Rollen: ${rolesRes.statusText}`);
    }
    const roles = await rolesRes.json();
	roles.reverse();

    res.json(roles);
  } catch (err) {
    console.error("Fehler beim Abrufen der Rollen:", err);
    res.status(500).json({ error: "Fehler beim Abrufen der Rollen" });
  }
});

module.exports = router;
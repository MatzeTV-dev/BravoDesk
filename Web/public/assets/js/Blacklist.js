/**
 * Escaped HTML-Sonderzeichen in einem String, um XSS-Schwachstellen vorzubeugen.
 * Ersetzt Zeichen wie <, >, &, ", ' durch ihre entsprechenden HTML-Entitäten.
 *
 * @param {string} str - Der zu escapende String.
 * @returns {string} Der String mit escapeden HTML-Zeichen.
 */
function escapeHTML(str) {
  var div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}

/**
 * Lädt die Blacklist-Einträge für eine gegebene Guild-ID vom Server und zeigt sie in der Tabelle an.
 *
 * @param {string} guildId - Die ID der Guild, für die die Blacklist-Einträge geladen werden sollen.
 */
function loadBlacklistEntries(guildId) {
  currentGuildId = guildId;
  fetch(`/api/blacklist/${guildId}`)
    .then(response => response.json())
    .then(data => {
      console.log("Blacklist-Einträge erhalten:", data);
      const tbody = document.querySelector("#blacklist table tbody");
      tbody.innerHTML = "";

      if (data && data.length) {
        data.forEach(entry => {
          const tr = document.createElement("tr");
          tr.setAttribute("data-entry-id", entry.user_id);

          const tdUserId = document.createElement("td");
          tdUserId.innerText = entry.user_id;

          const tdReason = document.createElement("td");
          tdReason.innerText = entry.reason || "Kein Grund";

          const tdDate = document.createElement("td");
          tdDate.innerText = new Date(entry.created_at).toLocaleString();

          tr.appendChild(tdUserId);
          tr.appendChild(tdReason);
          tr.appendChild(tdDate);
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = `<tr><td colspan="3">Keine Einträge gefunden.</td></tr>`;
      }
    })
    .catch(err => console.error("Fehler beim Laden der Blacklist-Einträge:", err));
}

/**
 * Öffnet das Modal zum Hinzufügen eines neuen Blacklist-Eintrags.
 */
function openBlacklistAddModal() {
  document.getElementById("blacklistAddModal").classList.add("show");
}

/**
 * Schließt das Modal zum Hinzufügen eines neuen Blacklist-Eintrags.
 */
function closeBlacklistAddModal() {
  document.getElementById("blacklistAddModal").classList.remove("show");
}

/**
 * Speichert einen neuen Blacklist-Eintrag. Sendet die User-ID und den Grund an den Server.
 * Aktualisiert nach Erfolg die Blacklist-Anzeige und schließt das Modal.
 */
function saveBlacklistEntry() {
  const userId = document.getElementById("blacklistAddUserId").value.trim();
  const reason = document.getElementById("blacklistAddReason").value.trim();
  if (!userId || !currentGuildId) return;

  fetch(`/api/blacklist/${currentGuildId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, reason: reason })
  })
    .then(async response => {
      const text = await response.text();
      // Versuche, das Ergebnis als JSON zu parsen, wenn’s JSON ist
      let data;
      try { data = JSON.parse(text); }
      catch   { throw new Error(`Server antwortete nicht mit JSON:\n${text}`); }

      if (!response.ok) {
        // zieh dir die Error-Message
        throw new Error(data.error || JSON.stringify(data));
      }
      return data;
    })
    .then(data => {
      console.log("Blacklist-Eintrag gespeichert:", data);
      loadBlacklistEntries(currentGuildId);
      document.getElementById("blacklistAddUserId").value   = "";
      document.getElementById("blacklistAddReason").value = "";
      closeBlacklistAddModal();
      notify("User wurde zur Blacklist hinzugefügt", 3000, "success");
    })
    .catch(err => {
      console.error("Fehler beim Speichern des Blacklist-Eintrags:", err);
      notify(`Fehler: ${err.message}`, 5000, "error");
    });
}

/**
 * Öffnet das Modal zum Entfernen eines Blacklist-Eintrags.
 */
function openBlacklistRemoveModal() {
  document.getElementById("blacklistRemoveModal").classList.add("show");
}

/**
 * Schließt das Modal zum Entfernen eines Blacklist-Eintrags.
 */
function closeBlacklistRemoveModal() {
  document.getElementById("blacklistRemoveModal").classList.remove("show");
}

/**
 * Bestätigt und führt das Entfernen eines Blacklist-Eintrags für die angegebene User-ID durch.
 * Aktualisiert nach Erfolg die Blacklist-Anzeige und schließt das Modal.
 */
function confirmBlacklistRemoval() {
  const userId = document.getElementById("blacklistRemoveUserId").value.trim();
  if (userId !== "" && currentGuildId) {
    fetch(`/api/blacklist/${currentGuildId}/${encodeURIComponent(userId)}`, {
      method: "DELETE"
    })
      .then(response => response.json())
      .then(data => {
        console.log("Blacklist-Eintrag entfernt:", data);
        loadBlacklistEntries(currentGuildId);
        document.getElementById("blacklistRemoveUserId").value = "";
        closeBlacklistRemoveModal();
        notify("User wurde von der Blacklist entfernt", 3000, "success")
      })
      .catch(err => console.error("Fehler beim Entfernen des Blacklist-Eintrags:", err));
  }
}

/**
 * Öffnet das Modal zur Suche nach Blacklist-Einträgen.
 * Leert vorherige Suchergebnisse.
 */
function openBlacklistSearchModal() {
  document.getElementById("blacklistSearchModal").classList.add("show");
  document.getElementById("blacklistSearchResults").innerHTML = "";
}

/**
 * Schließt das Modal zur Suche nach Blacklist-Einträgen.
 */
function closeBlacklistSearchModal() {
  document.getElementById("blacklistSearchModal").classList.remove("show");
}

/**
 * Führt eine Suche nach Blacklist-Einträgen für die angegebene User-ID durch.
 * Zeigt die Ergebnisse im Suchmodal an.
 */
function performBlacklistSearch() {
  const userId = document.getElementById("blacklistSearchUserId").value.trim();
  if (userId !== "" && currentGuildId) {
    fetch(`/api/blacklist/${currentGuildId}/search?user_id=${encodeURIComponent(userId)}`)
      .then(response => response.json())
      .then(data => {
        let resultsHtml = "";
        if (data && data.length) {
          data.forEach(entry => {
            resultsHtml += `
              <p>
                <strong>User ID:</strong> ${escapeHTML(entry.user_id)}<br>
                <strong>Grund:</strong> ${escapeHTML(entry.reason)}<br>
                <strong>Datum:</strong> ${escapeHTML(new Date(entry.created_at).toLocaleString())}
              </p>`;
          });
        } else {
          resultsHtml = "<p>Keine Einträge gefunden.</p>";
        }
        document.getElementById("blacklistSearchResults").innerHTML = resultsHtml;
      })
      .catch(err => console.error("Fehler beim Suchen des Blacklist-Eintrags:", err));
  }
}

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("btnBlacklistAdd").addEventListener("click", openBlacklistAddModal);
  document.getElementById("btnBlacklistRemove").addEventListener("click", openBlacklistRemoveModal);
  document.getElementById("btnBlacklistSearch").addEventListener("click", openBlacklistSearchModal);
});

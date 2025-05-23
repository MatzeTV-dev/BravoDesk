/**
 * Öffnet das Popup-Modal zum Erstellen eines neuen Wissenseintrags.
 */
function openPopup() {
  document.getElementById("popupModal").classList.add("show");
}

/**
 * Schließt das Popup-Modal zum Erstellen eines neuen Wissenseintrags.
 */
function closePopup() {
  document.getElementById("popupModal").classList.remove("show");
}

/**
 * Speichert einen neuen Wissenseintrag.
 * Liest den Text aus dem Eingabefeld, sendet ihn an den Server
 * und lädt bei Erfolg die Wissenseinträge neu.
 */
function saveEntry() {
  const newEntryText = document.getElementById("newEntryText").value.trim();
  if (newEntryText !== "" && currentGuildId) {
    fetch(`/api/wissenseintraege/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newEntryText })
    })
      .then(response => response.json())
      .then(data => {
        console.log("Eintrag gespeichert:", data);
        loadKnowledgeEntries(currentGuildId);
        document.getElementById("newEntryText").value = "";
        closePopup();
      })
      .catch(err => console.error("Fehler beim Speichern des Eintrags:", err));
  }
}

/**
 * Öffnet das Popup-Modal zur Bearbeitung eines vorhandenen Wissenseintrags.
 * Füllt das Bearbeitungsfeld mit dem aktuellen Text des Eintrags.
 *
 * @param {HTMLElement} el - Das HTML-Element (z.B. ein Button), das das Öffnen des Popups ausgelöst hat.
 *                           Es wird erwartet, dass dieses Element Teil einer Tabellenzeile ist,
 *                           die das Attribut 'data-entry-id' und den Text des Eintrags enthält.
 */
function openEditPopup(el) {
  const row = el.parentElement.parentElement;
  currentEditRow = row;
  currentEditEntryId = row.getAttribute("data-entry-id");
  const currentText = row.cells[0].innerText;
  document.getElementById("editEntryText").value = currentText;
  document.getElementById("editPopupModal").classList.add("show");
}

/**
 * Schließt das Popup-Modal zur Bearbeitung eines Wissenseintrags.
 */
function closeEditPopup() {
  document.getElementById("editPopupModal").classList.remove("show");
}

/**
 * Speichert die Änderungen an einem bearbeiteten Wissenseintrag.
 * Liest den neuen Text aus dem Bearbeitungsfeld, sendet ihn an den Server
 * und lädt bei Erfolg die Wissenseinträge neu.
 */
function saveEditEntry() {
  const newText = document.getElementById("editEntryText").value.trim();
  if (currentEditRow && currentEditEntryId && newText !== "" && currentGuildId) {
    fetch(`/api/wissenseintraege/${currentGuildId}/${currentEditEntryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText })
    })
      .then(response => response.json())
      .then(data => {
        console.log("Eintrag aktualisiert:", data);
        loadKnowledgeEntries(currentGuildId);
        closeEditPopup();
        currentEditRow = null;
        currentEditEntryId = null;
      })
      .catch(err => console.error("Fehler beim Aktualisieren des Eintrags:", err));
  }
}

/**
 * Löscht einen Wissenseintrag nach Bestätigung durch den Benutzer.
 * Sendet eine Anfrage an den Server, um den Eintrag zu löschen,
 * und lädt bei Erfolg die Wissenseinträge neu.
 *
 * @param {HTMLElement} el - Das HTML-Element (z.B. ein Button), das das Löschen ausgelöst hat.
 *                           Es wird erwartet, dass dieses Element Teil einer Tabellenzeile ist,
 *                           die das Attribut 'data-entry-id' enthält.
 */
function deleteEntry(el) {
  if (confirm("Eintrag wirklich löschen?") && currentGuildId) {
    const row = el.parentElement.parentElement;
    const entryId = row.getAttribute("data-entry-id");
    fetch(`/api/wissenseintraege/${currentGuildId}/${entryId}`, {
      method: "DELETE"
    })
      .then(async response => {
        console.log("Status:", response.status, response.statusText);
        const text = await response.text();
        console.log("Raw response:", text);
        // Versuche anschließend erst, es als JSON zu interpretieren
        return JSON.parse(text);
      })
      .then(data => {
        console.log("Parsed JSON:", data);
        loadKnowledgeEntries(currentGuildId);
        notify("Wissenseinträge wurde erfolgreich gelöscht", 3000, "success");
      })
      .catch(err => console.error("Fehler beim Löschen des Eintrags:", err));
  }
}

/**
 * Lädt alle Wissenseinträge für die angegebene Guild-ID vom Server
 * und stellt sie in der Tabelle dar.
 *
 * @param {string} guildId - Die ID der Guild, für die die Wissenseinträge geladen werden sollen.
 */
function loadKnowledgeEntries(guildId) {
  currentGuildId = guildId;
  fetch(`/api/wissenseintraege/${guildId}`)
    .then(response => response.json())
    .then(data => {
      console.log("Wissenseinträge erhalten:", data);
      const tbody = document.querySelector('#wissenseintraege tbody');
      tbody.innerHTML = "";

      if (data && data.length) {
        data.forEach(point => {
          const tr = document.createElement("tr");
          tr.dataset.entryId = point.id;

          // Inhalt
          const tdContent = document.createElement("td");
          tdContent.classList.add("wissen-cell");
          tdContent.dataset.fulltext = point.payload.text || "";
          tdContent.innerText = point.payload.text || "Kein Inhalt";
          tr.appendChild(tdContent);

          // Aktionen
          const tdActions = document.createElement("td");
          tdActions.style.verticalAlign = "middle";

          // Edit-Button
          const btnEdit = document.createElement("span");
          btnEdit.style.cursor = "pointer";
          btnEdit.textContent = "✏️";
          btnEdit.addEventListener("click", () => openEditPopup(btnEdit));
          tdActions.appendChild(btnEdit);

          // Abstand
          const spacer = document.createElement("span");
          spacer.style.marginLeft = "10px";
          tdActions.appendChild(spacer);

          // Delete-Button
          const btnDelete = document.createElement("span");
          btnDelete.style.cursor = "pointer";
          btnDelete.textContent = "❌";
          btnDelete.addEventListener("click", () => deleteEntry(btnDelete));
          tdActions.appendChild(btnDelete);

          tr.appendChild(tdActions);
          tbody.appendChild(tr);
        });
      } else {
        const trEmpty = document.createElement("tr");
        const tdEmpty = document.createElement("td");
        tdEmpty.colSpan = 2;
        tdEmpty.innerText = "Keine Einträge gefunden.";
        trEmpty.appendChild(tdEmpty);
        tbody.appendChild(trEmpty);
      }
    })
    .catch(err => console.error("Fehler beim Laden der Wissenseinträge:", err));
}

/**
 * Öffnet das Modal für den Datei-Upload.
 */
function openFileUploadModal() {
  document.getElementById("fileUploadModal").classList.add("show");
}

/**
 * Schließt das Modal für den Datei-Upload.
 */
function closeFileUploadModal() {
  document.getElementById("fileUploadModal").classList.remove("show");
}

/**
 * Lädt die ausgewählte Datei auf den Server hoch, um daraus Wissenseinträge zu erstellen.
 * Sendet die Datei als FormData an den API-Endpunkt.
 * Benachrichtigt den Benutzer über Erfolg oder Fehler und lädt ggf. die Wissenseinträge neu.
 */
function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files || fileInput.files.length === 0) {
    notify("Bitte wählen sie eine Datei aus", 3000, "warn")
    return;
  }
  
  const file = fileInput.files[0];
  const formData = new FormData();
  formData.append("file", file);
  
  // Stelle sicher, dass currentGuildId gesetzt ist (so wie in deinen anderen Funktionen)
  fetch(`/api/upload-file/${currentGuildId}`, {
    method: "POST",
    body: formData
  })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        //alert("Fehler: " + data.error);
        notify("Fehler", 3000, "error")
      } else {
        notify("Datei erfolgreich hochgeladen. Eingefüge Einträge: " + data.inserted + ", Übersprungen: " + data.skipped, 3000, "success");
        //alert("Datei erfolgreich hochgeladen. Eingefügte Einträge: " +
        //      data.inserted + ", Übersprungene: " + data.skipped);
        // Optional: Liste der Wissenseinträge neu laden
        loadKnowledgeEntries(currentGuildId);
      }
      closeFileUploadModal();
    })
    .catch(err => {
      console.error("Fehler beim Datei Upload:", err);
      notify("Fehler beim Datei Uploade", 3000, "error")
    });
}

// Globale Variablen für den aktuellen Guild-Kontext und Editierstatus.
let currentGuildId = null; // Hält die ID der aktuell ausgewählten Guild.
let currentEditRow = null; // Referenz auf die Tabellenzeile des aktuell bearbeiteten Eintrags.
let currentEditEntryId = null; // ID des aktuell bearbeiteten Wissenseintrags.

/**
 * Event-Listener, der nach dem vollständigen Laden des DOMs ausgeführt wird.
 * Initialisiert Event-Handler, z.B. für das Ändern der Auswahl im Wissenseinträge-Dropdown.
 */
document.addEventListener("DOMContentLoaded", function() {
  // Bindet den Änderungs-Event für das Dropdown zur Kategorieauswahl.
  // Hinweis: Das Element mit der ID "wissenseintraege" scheint hier als Dropdown für Guilds/Server zu fungieren,
  // basierend auf `loadKnowledgeEntries(this.value)`.
  document.getElementById("wissenseintraege").addEventListener("change", function() {
    loadKnowledgeEntries(this.value);
  });
});

/**
 * Öffnet das Modal für den Google Docs Import.
 */
function openDocUploadModal() {
  document.getElementById('docUploadModal').classList.add('show');
}

/**
 * Schließt das Modal für den Google Docs Import.
 */
function closeDocUploadModal() {
  document.getElementById('docUploadModal').classList.remove('show');
}

/**
 * Importiert ein Google Docs Dokument über dessen URL.
 * Sendet die URL an den Server, der das Dokument verarbeitet und Wissenseinträge erstellt.
 * Benachrichtigt den Benutzer über Erfolg oder Fehler und lädt ggf. die Wissenseinträge neu.
 * @async
 */
async function importDoc() {
  const url = document.getElementById('docUrl').value.trim();
  if (!url) {
    notfiy("Bitte gültiges Google Docs angeben", 3000, "warn");
    //alert('Bitte gültigen Google Docs Link angeben.');
    return;
  }
  const match = url.match(/^https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9_-]+/);
  if (!match) {
    notify("Üngülitger Google Docs Link", 3000, "error");
    //alert('Ungültiger Google Docs Link.');
    return;
  }
  try {
    const res = await fetch(`/api/docs/import/${currentGuildId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (data.error) {
      //alert('Fehler: ' + data.error);
      notify("Fehler", 3000, "error")
    } else {
      notify(`Import erfolgreich. Eingefügte Einträge: ${data.inserted}, Übersprungene: ${data.skipped}`, 3000, "success");
      //alert(`Import erfolgreich. Eingefügte Einträge: ${data.inserted}, Übersprungene: ${data.skipped}`);
      loadKnowledgeEntries(currentGuildId);
    }
  } catch (err) {
    console.error('Fehler beim Importieren:', err);
    notify(`Fehlerb eim Google Docs impotieren`, 3000, "error");
  }
  closeDocUploadModal();
}
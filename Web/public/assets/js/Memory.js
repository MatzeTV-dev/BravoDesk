// Memory.js

// Öffnet das Popup zum Erstellen eines neuen Wissenseintrags
function openPopup() {
  document.getElementById("popupModal").classList.add("show");
}

// Schließt das Popup zum Erstellen eines neuen Wissenseintrags
function closePopup() {
  document.getElementById("popupModal").classList.remove("show");
}

// Speichert einen neuen Wissenseintrag und fügt ihn der Tabelle hinzu
function saveEntry() {
  var newEntry = document.getElementById("newEntryText").value.trim();
  if (newEntry !== "") {
    var tbody = document.querySelector("table tbody");
    var newRow = document.createElement("tr");
    newRow.innerHTML = `
      <td class="wissen-cell" data-fulltext="${newEntry.replace(/"/g, '&quot;')}">
        ${newEntry}
      </td>
      <td style="vertical-align: middle;">
        <span style="cursor: pointer;" onclick="openEditPopup(this)">✏️</span>
        <span style="cursor: pointer; margin-left: 10px;" onclick="deleteEntry(this)">❌</span>
      </td>
    `;
    tbody.appendChild(newRow);
    document.getElementById("newEntryText").value = "";
    closePopup();
    notify("Wissenseintrag wurde hinzugefügt!", 3000, "success")
  }
}

// Öffnet das Popup zum Editieren eines Eintrags
function openEditPopup(el) {
  var row = el.parentElement.parentElement;
  currentEditRow = row;
  var currentText = row.cells[0].innerText;
  document.getElementById("editEntryText").value = currentText;
  document.getElementById("editPopupModal").classList.add("show");
}

// Schließt das Edit-Popup
function closeEditPopup() {
  document.getElementById("editPopupModal").classList.remove("show");
}

// Speichert den bearbeiteten Eintrag
function saveEditEntry() {
  var newText = document.getElementById("editEntryText").value.trim();
  if (currentEditRow && newText !== "") {
    currentEditRow.cells[0].innerText = newText;
    currentEditRow.cells[0].setAttribute("data-fulltext", newText);
    closeEditPopup();
    currentEditRow = null;
    notify("Wissenseintrage wrude erfolgreich gespeichert!", 3000, "success")
  }
}

// Löscht einen Eintrag nach Bestätigung
function deleteEntry(el) {
  if (confirm("Eintrag wirklich löschen?")) {
    var row = el.parentElement.parentElement;
    row.remove();
  }
}

// -------------------------------------------------
// Neue Funktion: Wissenseinträge aus Qdrant laden
// -------------------------------------------------
// Diese Funktion ruft deinen API-Endpunkt (/api/wissenseintraege/:guildId) auf,
// um die Wissenseinträge für die gegebene Guild-ID zu laden und den Tab "Wissenseinträge" zu befüllen.
function loadKnowledgeEntries(guildId) {
  fetch(`/api/wissenseintraege/${guildId}`)
    .then(response => response.json())
    .then(data => {
      console.log("Wissenseinträge erhalten:", data);
      const tbody = document.querySelector('#wissenseintraege tbody');
      tbody.innerHTML = ''; // Vorherige Einträge löschen

      if (data && data.length) {
        data.forEach(point => {
          const tr = document.createElement('tr');

          const tdContent = document.createElement('td');
          tdContent.classList.add('wissen-cell');
          // Nutze hier "text" statt "content"
          tdContent.setAttribute('data-fulltext', point.payload.text || '');
          tdContent.innerText = point.payload.text || 'Kein Inhalt';

          const tdActions = document.createElement('td');
          tdActions.style.verticalAlign = 'middle';
          tdActions.innerHTML = `<span style="cursor:pointer;" onclick="openEditPopup(this)">✏️</span>
                                 <span style="cursor:pointer; margin-left:10px;" onclick="deleteEntry(this)">❌</span>`;

          tr.appendChild(tdContent);
          tr.appendChild(tdActions);
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = `<tr><td colspan="2">Keine Einträge gefunden.</td></tr>`;
      }
    })
    .catch(err => console.error("Fehler beim Laden der Wissenseinträge:", err));
}


// Memory.js

// Globale Variable, in der die aktuell ausgewählte Guild-ID gespeichert wird
let currentGuildId = null;

// ------------------------
// Wissenseinträge: Neu erstellen
// ------------------------

// Öffnet das Popup zum Erstellen eines neuen Wissenseintrags
function openPopup() {
  document.getElementById("popupModal").classList.add("show");
}

// Schließt das Popup zum Erstellen eines neuen Wissenseintrags
function closePopup() {
  document.getElementById("popupModal").classList.remove("show");
}

// Speichert einen neuen Wissenseintrag, indem er per POST an den Server gesendet wird
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
        // Nach erfolgreichem Speichern die Einträge neu laden
        loadKnowledgeEntries(currentGuildId);
        document.getElementById("newEntryText").value = "";
        closePopup();
      })
      .catch(err => console.error("Fehler beim Speichern des Eintrags:", err));
  }
}

// ------------------------
// Wissenseinträge: Editieren
// ------------------------

// Variablen zum Speichern des aktuell zu bearbeitenden Eintrags
let currentEditRow = null;
let currentEditEntryId = null;

// Öffnet das Popup zum Bearbeiten eines Eintrags und speichert die zu bearbeitenden Informationen
function openEditPopup(el) {
  const row = el.parentElement.parentElement;
  currentEditRow = row;
  currentEditEntryId = row.getAttribute("data-entry-id"); // Annahme: Das <tr> hat ein Attribut "data-entry-id"
  const currentText = row.cells[0].innerText;
  document.getElementById("editEntryText").value = currentText;
  document.getElementById("editPopupModal").classList.add("show");
}

// Schließt das Edit-Popup
function closeEditPopup() {
  document.getElementById("editPopupModal").classList.remove("show");
}

// Speichert die Bearbeitung eines Eintrags per PATCH-Anfrage an den Server
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
        // Nach der Aktualisierung die Einträge neu laden
        loadKnowledgeEntries(currentGuildId);
        closeEditPopup();
        currentEditRow = null;
        currentEditEntryId = null;
      })
      .catch(err => console.error("Fehler beim Aktualisieren des Eintrags:", err));
  }
}

// ------------------------
// Wissenseinträge: Löschen
// ------------------------

// Löscht einen Eintrag per DELETE-Anfrage an den Server
function deleteEntry(el) {
  if (confirm("Eintrag wirklich löschen?") && currentGuildId) {
    const row = el.parentElement.parentElement;
    const entryId = row.getAttribute("data-entry-id");
    fetch(`/api/wissenseintraege/${currentGuildId}/${entryId}`, {
      method: "DELETE"
    })
      .then(response => response.json())
      .then(data => {
        console.log("Eintrag gelöscht:", data);
        // Nach dem Löschen die Einträge neu laden
        loadKnowledgeEntries(currentGuildId);
        notify("Wissenseintrage wurde erfolgreich gelöscht", 3000, "success")
      })
      .catch(err => console.error("Fehler beim Löschen des Eintrags:", err));
  }
}

// ------------------------
// Wissenseinträge: Laden und Anzeigen
// ------------------------

// Lädt alle Wissenseinträge für eine bestimmte Guild und befüllt den Wissenseinträge-Tab
function loadKnowledgeEntries(guildId) {
  // Speichere die aktuelle Guild-ID global
  currentGuildId = guildId;
  fetch(`/api/wissenseintraege/${guildId}`)
    .then(response => response.json())
    .then(data => {
      console.log("Wissenseinträge erhalten:", data);
      const tbody = document.querySelector('#wissenseintraege tbody');
      tbody.innerHTML = ""; // Vorherige Einträge löschen

      if (data && data.length) {
        data.forEach(point => {
          const tr = document.createElement("tr");
          // Speichere die Eintrags-ID im <tr>-Attribut, um sie später für Edit/Delete zu verwenden
          tr.setAttribute("data-entry-id", point.id);
          
          const tdContent = document.createElement("td");
          tdContent.classList.add("wissen-cell");
          // Verwende hier das Feld "text" aus dem Payload
          tdContent.setAttribute("data-fulltext", point.payload.text || "");
          tdContent.innerText = point.payload.text || "Kein Inhalt";
          
          const tdActions = document.createElement("td");
          tdActions.style.verticalAlign = "middle";
          tdActions.innerHTML = `<span style="cursor:pointer;" onclick="openEditPopup(this)">✏️</span>
                                  <span style="cursor:pointer; margin-left:10px;" onclick="deleteEntry(this)">❌</span>`;
          
          tr.appendChild(tdContent);
          tr.appendChild(tdActions);
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = `<tr><td colspan="2">Keine Einträge gefunden.</td></tr>`;
      }
    })
    .catch(err => console.error("Fehler beim Laden der Wissenseinträge:", err));
}

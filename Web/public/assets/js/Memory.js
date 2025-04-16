// Öffnet das Popup zum Erstellen eines Wissenseintrags.
function openPopup() {
  document.getElementById("popupModal").classList.add("show");
}

// Schließt das Popup zum Erstellen eines Wissenseintrags.
function closePopup() {
  document.getElementById("popupModal").classList.remove("show");
}

// Speichert einen neuen Wissenseintrag über den API-Endpunkt.
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

// Öffnet das Popup zur Bearbeitung eines bestehenden Wissenseintrags.
function openEditPopup(el) {
  const row = el.parentElement.parentElement;
  currentEditRow = row;
  currentEditEntryId = row.getAttribute("data-entry-id");
  const currentText = row.cells[0].innerText;
  document.getElementById("editEntryText").value = currentText;
  document.getElementById("editPopupModal").classList.add("show");
}

// Schließt das Bearbeitungs-Popup.
function closeEditPopup() {
  document.getElementById("editPopupModal").classList.remove("show");
}

// Speichert die Änderungen eines bearbeiteten Wissenseintrags über den API-Endpunkt.
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

// Löscht einen Wissenseintrag über den API-Endpunkt.
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
        loadKnowledgeEntries(currentGuildId);
        notify("Wissenseintrage wurde erfolgreich gelöscht", 3000, "success");
      })
      .catch(err => console.error("Fehler beim Löschen des Eintrags:", err));
  }
}

// Lädt alle Wissenseinträge für die angegebene Guild von der API.
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
          tr.setAttribute("data-entry-id", point.id);
          
          const tdContent = document.createElement("td");
          tdContent.classList.add("wissen-cell");
          tdContent.setAttribute("data-fulltext", point.payload.text || "");
          tdContent.innerText = point.payload.text || "Kein Inhalt";
          
          const tdActions = document.createElement("td");
          tdActions.style.verticalAlign = "middle";
          // Da dies statischer HTML-Code mit fixen Inhalten ist (keine Nutzereingaben), ist die Verwendung von innerHTML hier vertretbar.
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

function openFileUploadModal() {
  document.getElementById("fileUploadModal").classList.add("show");
}

function closeFileUploadModal() {
  document.getElementById("fileUploadModal").classList.remove("show");
}

function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files || fileInput.files.length === 0) {
    alert("Bitte wählen Sie eine Datei aus.");
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
        alert("Fehler: " + data.error);
      } else {
        alert("Datei erfolgreich hochgeladen. Eingefügte Einträge: " +
              data.inserted + ", Übersprungene: " + data.skipped);
        // Optional: Liste der Wissenseinträge neu laden
        loadKnowledgeEntries(currentGuildId);
      }
      closeFileUploadModal();
    })
    .catch(err => {
      console.error("Fehler beim Datei Upload:", err);
      alert("Fehler beim Datei Upload.");
    });
}


// Globale Variablen für den aktuellen Guild-Kontext und Editierstatus.
let currentGuildId = null;
let currentEditRow = null;
let currentEditEntryId = null;

document.addEventListener("DOMContentLoaded", function() {
  // Bindet den Änderungs-Event für das Dropdown zur Kategorieauswahl.
  document.getElementById("wissenseintraege").addEventListener("change", function() {
    loadKnowledgeEntries(this.value);
  });
});

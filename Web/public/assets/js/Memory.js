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

// Öffnet das Modal zum Google Docs Import
function openDocUploadModal() {
  document.getElementById('docUploadModal').classList.add('show');
}

// Schließt das Modal zum Google Docs Import
function closeDocUploadModal() {
  document.getElementById('docUploadModal').classList.remove('show');
}

// Importiert Google Docs per URL und legt Einträge an
async function importDoc() {
  const url = document.getElementById('docUrl').value.trim();
  if (!url) {
    alert('Bitte gültigen Google Docs Link angeben.');
    return;
  }
  const match = url.match(/^https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9_-]+/);
  if (!match) {
    alert('Ungültiger Google Docs Link.');
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
      alert('Fehler: ' + data.error);
    } else {
      alert(`Import erfolgreich. Eingefügte Einträge: ${data.inserted}, Übersprungene: ${data.skipped}`);
      loadKnowledgeEntries(currentGuildId);
    }
  } catch (err) {
    console.error('Fehler beim Importieren:', err);
    alert('Fehler beim Importieren des Google Docs.');
  }
  closeDocUploadModal();
}
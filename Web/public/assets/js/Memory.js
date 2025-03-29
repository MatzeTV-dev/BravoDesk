function openPopup() {
  document.getElementById("popupModal").classList.add("show");
}

function closePopup() {
  document.getElementById("popupModal").classList.remove("show");
}

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

function openEditPopup(el) {
  var row = el.parentElement.parentElement;
  currentEditRow = row;
  var currentText = row.cells[0].innerText;
  document.getElementById("editEntryText").value = currentText;
  document.getElementById("editPopupModal").classList.add("show");
}

function closeEditPopup() {
  document.getElementById("editPopupModal").classList.remove("show");
}

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

function deleteEntry(el) {
  if (confirm("Eintrag wirklich löschen?")) {
    var row = el.parentElement.parentElement;
    row.remove();
  }
}

function loadKnowledgeEntries(guildId) {
  fetch(`/api/wissenseintraege/${guildId}`)
    .then(response => response.json())
    .then(data => {
      console.log("Wissenseinträge erhalten:", data);
      const tbody = document.querySelector('#wissenseintraege tbody');
      tbody.innerHTML = '';

      if (data && data.length) {
        data.forEach(point => {
          const tr = document.createElement('tr');

          const tdContent = document.createElement('td');
          tdContent.classList.add('wissen-cell');
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

let currentGuildId = null;

function openPopup() {
  document.getElementById("popupModal").classList.add("show");
}

function closePopup() {
  document.getElementById("popupModal").classList.remove("show");
}

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

let currentEditRow = null;
let currentEditEntryId = null;

function openEditPopup(el) {
  const row = el.parentElement.parentElement;
  currentEditRow = row;
  currentEditEntryId = row.getAttribute("data-entry-id");
  const currentText = row.cells[0].innerText;
  document.getElementById("editEntryText").value = currentText;
  document.getElementById("editPopupModal").classList.add("show");
}

function closeEditPopup() {
  document.getElementById("editPopupModal").classList.remove("show");
}

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
        notify("Wissenseintrage wurde erfolgreich gelöscht", 3000, "success")
      })
      .catch(err => console.error("Fehler beim Löschen des Eintrags:", err));
  }
}

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

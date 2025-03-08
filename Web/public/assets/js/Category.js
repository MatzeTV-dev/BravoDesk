// category.js

// Global: Aktuelle Guild-ID (wird aus der globalen Variable "guild" übernommen)
let currentCategoryId = null;  // Aktuell ausgewählte Kategorie-ID
let guildID = null;
// ------------------------
// Ticket-Kategorien laden und Dropdown füllen
// ------------------------
function loadTicketCategories(guildId) {
  console.log("Test1" + guildId)
  guildID = guildId;
  fetch(`/api/ticket_categories/${guildId}`)
    .then(response => response.json())
    .then(data => {
      console.log("Ticket-Kategorien erhalten:", data);
      const select = document.getElementById("kategorieSelect");
      select.innerHTML = "";
      if (data && data.length) {
        data.forEach(cat => {
          const opt = document.createElement("option");
          opt.value = cat.id;
          opt.textContent = cat.label;
          select.appendChild(opt);
        });
        currentCategoryId = data[0].id;
        select.value = data[0].id;
        fillCategoryFields(data[0]);
      } else {
        currentCategoryId = null;
        select.innerHTML = `<option value="">Keine Kategorien vorhanden</option>`;
        document.getElementById("kategorieEmoji").value = "";
        document.getElementById("kategorieBeschreibung").value = "";
        document.getElementById("kategorieAIPrompt").value = "";
        document.getElementById("kategoriePermission").innerHTML = "";
      }
    })
    .catch(err => console.error("Fehler beim Laden der Ticket-Kategorien:", err));
}

// ------------------------
// Beim Wechsel im Dropdown: Kategorie-Daten laden
// ------------------------
function loadCategoryData(categoryId) {
  fetch(`/api/ticket_categories/${guildID}`)
    .then(response => response.json())
    .then(data => {
      const found = data.find(cat => cat.id == categoryId);
      if (found) {
        currentCategoryId = found.id;
        fillCategoryFields(found);
      }
    })
    .catch(err => console.error("Fehler beim Laden der Kategorie:", err));
}

// ------------------------
// Füllt die Eingabefelder mit den Daten der ausgewählten Kategorie
// ------------------------
function fillCategoryFields(cat) {
  document.getElementById("kategorieEmoji").value = cat.emoji || "";
  document.getElementById("kategorieBeschreibung").value = cat.description || "";
  document.getElementById("kategorieAIPrompt").value = cat.ai_prompt || "";
  document.getElementById("kategorieEnabled").checked = (cat.enabled == 1);
  if (cat.permission) {
    document.getElementById("kategoriePermission").value = cat.permission;
  } else {
    document.getElementById("kategoriePermission").value = "";
  }
}

// ------------------------
// Speichert Änderungen an der aktuell ausgewählten Kategorie (PATCH)
// ------------------------
function saveCategoryChanges() {
  if (!currentCategoryId) {
    alert("Keine Kategorie ausgewählt.");
    return;
  }
  const select = document.getElementById("kategorieSelect");
  const label = select.selectedOptions[0].textContent;
  const emoji = document.getElementById("kategorieEmoji").value.trim();
  const description = document.getElementById("kategorieBeschreibung").value.trim();
  const ai_prompt = document.getElementById("kategorieAIPrompt").value.trim();
  const enabled = document.getElementById("kategorieEnabled").checked ? 1 : 0;
  const permission = document.getElementById("kategoriePermission").value;
  
  fetch(`/api/ticket_categories/${guildID}/${currentCategoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      label,
      description,
      emoji,
      ai_prompt,
      enabled,
      permission
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert("Kategorie aktualisiert!");
        loadTicketCategories(guildID);
      } else {
        console.error(data.error);
        alert("Fehler beim Aktualisieren: " + data.error);
      }
    })
    .catch(err => console.error("Fehler beim Aktualisieren der Kategorie:", err));
}

// ------------------------
// Löscht die aktuell ausgewählte Kategorie (DELETE)
// ------------------------
function deleteCategory() {
  if (!currentCategoryId) {
    alert("Keine Kategorie ausgewählt.");
    return;
  }
  const label = document.getElementById("kategorieSelect").selectedOptions[0].textContent;
  if (!confirm(`Kategorie "${label}" wirklich löschen?`)) return;
  fetch(`/api/ticket_categories/${guildID}/${currentCategoryId}`, {
    method: "DELETE"
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert("Kategorie gelöscht!");
        loadTicketCategories(guildID);
      } else {
        console.error(data.error);
        alert("Fehler beim Löschen: " + data.error);
      }
    })
    .catch(err => console.error("Fehler beim Löschen der Kategorie:", err));
}

// ------------------------
// Popup: Neue Kategorie erstellen
// ------------------------
function openCreateCategoryPopup() {
  document.getElementById("createCategoryPopup").classList.add("show");
}

function closeCreateCategoryPopup() {
  document.getElementById("createCategoryPopup").classList.remove("show");
  document.getElementById("newCategoryName").value = "";
  document.getElementById("newCategoryEmoji").value = "";
  document.getElementById("newCategoryDescription").value = "";
  document.getElementById("newCategoryAIPrompt").value = "";
  document.getElementById("newCategoryEnabled").checked = true;
  // Leere zunächst das Dropdown
  document.getElementById("newCategoryPermission").innerHTML = "";
}

// ------------------------
// Erstellt eine neue Kategorie (POST)
// ------------------------
function createCategory() {
  const label = document.getElementById("newCategoryName").value.trim();
  const emoji = document.getElementById("newCategoryEmoji").value.trim();
  const description = document.getElementById("newCategoryDescription").value.trim();
  const ai_prompt = document.getElementById("newCategoryAIPrompt").value.trim();
  const enabled = document.getElementById("newCategoryEnabled").checked ? 1 : 0;
  const permission = document.getElementById("newCategoryPermission").value;
  
  if (!label) {
    alert("Bitte einen Kategorienamen eingeben.");
    return;
  }
  
  fetch(`/api/ticket_categories/${guildID}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      label,
      description,
      emoji,
      ai_prompt,
      enabled,
      permission
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert("Kategorie wurde erstellt!");
        closeCreateCategoryPopup();
        loadTicketCategories(guildID);
      } else {
        console.error(data.error);
        alert("Fehler beim Erstellen: " + data.error);
      }
    })
    .catch(err => console.error("Fehler beim Erstellen der Kategorie:", err));
}

// ------------------------
// Lädt die Rollen des aktuellen Guilds und füllt das Permission-Dropdown
// ------------------------
function loadGuildRoles() {
  fetch(`/api/roles/${guildID}`)
    .then(response => response.json())
    .then(data => {
      console.log("Guild Rollen erhalten:", data);
      const permissionSelect = document.getElementById("kategoriePermission");
      permissionSelect.innerHTML = "";
      // Optional: Eine Standardoption
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Keine";
      permissionSelect.appendChild(defaultOption);
      if (data && data.length) {
        data.forEach(role => {
          const opt = document.createElement("option");
          opt.value = role.id;
          opt.textContent = role.name;
          permissionSelect.appendChild(opt);
        });
      } else {
        permissionSelect.innerHTML = `<option value="">Keine Rollen gefunden</option>`;
      }


      const permissionSelect2 = document.getElementById("newCategoryPermission");
      permissionSelect.innerHTML = "";
      // Optional: Eine Standardoption
      const defaultOption2 = document.createElement("option");
      defaultOption2.value = "";
      defaultOption2.textContent = "Keine";
      permissionSelect2.appendChild(defaultOption);
      if (data && data.length) {
        data.forEach(role => {
          const opt = document.createElement("option");
          opt.value = role.id;
          opt.textContent = role.name;
          permissionSelect2.appendChild(opt);
        });
      } else {
        permissionSelect2.innerHTML = `<option value="">Keine Rollen gefunden</option>`;
      }

    })
    .catch(err => console.error("Fehler beim Laden der Guild Rollen:", err));
}

// ------------------------
// Event Listener setzen
// ------------------------
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("kategorieSelect").addEventListener("change", function() {
    loadCategoryData(this.value);
  });
  // Rollen laden und Permission-Dropdown füllen
  loadGuildRoles();
});

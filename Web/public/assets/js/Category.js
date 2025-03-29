let currentCategoryId = null;
let guildID = null;

function loadTicketCategories(guildId) {
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

function fillCategoryFields(cat) {
  document.getElementById("kategorieEmoji").value = cat.emoji || "";
  document.getElementById("kategorieBeschreibung").value = cat.description || "";
  document.getElementById("kategorieAIPrompt").value = cat.ai_prompt || "";
  
  if (cat.ki_aktiviert && cat.ki_aktiviert == 1) {
    document.getElementById("kategorieEnabled").checked = true;
  } else {
    document.getElementById("kategorieEnabled").checked = false;
  }
    
  if (cat.permission) {
    document.getElementById("kategoriePermission").value = cat.permission;
  } else {
    document.getElementById("kategoriePermission").value = "";
  }
}

function saveCategoryChanges() {
  if (!currentCategoryId) {
    notify("Keine Kategorie ausgewählt", 3000, "warn")
    return;
  }
  const select = document.getElementById("kategorieSelect");
  const label = select.selectedOptions[0].textContent;
  const emoji = document.getElementById("kategorieEmoji").value.trim();
  const description = document.getElementById("kategorieBeschreibung").value.trim();
  const ai_prompt = document.getElementById("kategorieAIPrompt").value.trim();
  const ai_enabled = document.getElementById("kategorieEnabled").checked ? 1 : 0;
  const permission = document.getElementById("kategoriePermission").value;
  
  fetch(`/api/ticket_categories/${guildID}/${currentCategoryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      label,
      description,
      emoji,
      ai_prompt,
      ai_enabled,
      permission
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        notify("Kategorie aktualisiert", 3000, "success")
        loadTicketCategories(guildID);
        return;
      } else {
        console.error(data.error);
        notify("Fehler beim Aktualisieren", 3000, "error")
      }
    })
    .catch(err => console.error("Fehler beim Aktualisieren der Kategorie:", err));
}

function deleteCategory() {
  if (!currentCategoryId) {
    notify("Keine Kategorie ausgewählt", 3000, "error")
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
        notify("Kategorie gelöscht", 3000, "success")
        loadTicketCategories(guildID);
      } else {
        console.error(data.error);
        notify("Fehler beim Löschen", 3000, "error")
      }
    })
    .catch(err => console.error("Fehler beim Löschen der Kategorie:", err));
}

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
  document.getElementById("newCategoryPermission").innerHTML = "";
}

function createCategory() {
  const label = document.getElementById("newCategoryName").value.trim();
  const emoji = document.getElementById("newCategoryEmoji").value.trim();
  const description = document.getElementById("newCategoryDescription").value.trim();
  const ai_prompt = document.getElementById("newCategoryAIPrompt").value.trim();
  const ai_enabled = document.getElementById("newCategoryEnabled").checked ? 1 : 0;
  const permission = document.getElementById("newCategoryPermission").value;
  
  if (!label) {
    notify("Bitte einen Kategorienamen eingeben.", 3000, "warn")
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
      ai_enabled,
      permission
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        notify("Kategorie wurde erstellt.", 3000, "success")
        closeCreateCategoryPopup();
        loadTicketCategories(guildID);
      } else {
        console.error(data.error);
        notify("Fehler beim Erstellen.", 3000, "error")
      }
    })
    .catch(err => console.error("Fehler beim Erstellen der Kategorie:", err));
}

function loadGuildRoles() {
  fetch(`/api/roles/${guildID}`)
    .then(response => response.json())
    .then(data => {
      console.log("Guild Rollen erhalten:", data);

      const permissionSelect = document.getElementById("kategoriePermission");
      permissionSelect.innerHTML = "";
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
      permissionSelect2.innerHTML = "";

      const defaultOption2 = document.createElement("option");
      defaultOption2.value = "";
      defaultOption2.textContent = "Keine";
      permissionSelect2.appendChild(defaultOption2);

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

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("kategorieSelect").addEventListener("change", function() {
    loadCategoryData(this.value);
  });
  loadGuildRoles();
});

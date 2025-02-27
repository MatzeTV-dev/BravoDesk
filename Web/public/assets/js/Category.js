/* Beispiel-Datenstruktur für Kategorien */
var categoriesData = {
    "bugreport": {
        name: "Bug Report",
        emoji: "🐛",
        description: "Haben Sie einen Fehler gefunden?"
    },
    "featurerequest": {
        name: "Feature Request",
        emoji: "💡",
        description: "Teile deine Ideen mit uns."
    },
    "question": {
        name: "Question",
        emoji: "❓",
        description: "Stelle deine Fragen."
    }
};
    
var currentCategoryKey = null; // Aktuell ausgewählte Kategorie
var currentEditRow = null;     // Für Wissenseinträge-Edit
    
  
  /* Kategorien-Logik */
  function populateCategoryDropdown() {
    var select = document.getElementById("kategorieSelect");
    select.innerHTML = "";
    var keys = Object.keys(categoriesData);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var opt = document.createElement("option");
      opt.value = key;
      opt.textContent = categoriesData[key].name;
      select.appendChild(opt);
    }
    // Wähle automatisch das erste Element (falls vorhanden)
    if (keys.length > 0) {
      select.value = keys[0];
      loadCategoryData(keys[0]);
    }
  }

  function loadCategoryData(key) {
    if (!categoriesData[key]) return;
    currentCategoryKey = key;
    document.getElementById("kategorieEmoji").value = categoriesData[key].emoji;
    document.getElementById("kategorieBeschreibung").value = categoriesData[key].description;
  }

  function saveCategoryChanges() {
    if (!currentCategoryKey) {
      alert("Bitte zuerst eine Kategorie auswählen.");
      return;
    }
    var newEmoji = document.getElementById("kategorieEmoji").value;
    var newDesc = document.getElementById("kategorieBeschreibung").value;
    categoriesData[currentCategoryKey].emoji = newEmoji;
    categoriesData[currentCategoryKey].description = newDesc;
    alert("Kategorie aktualisiert!");
  }

  function deleteCategory() {
    if (!currentCategoryKey) {
      alert("Keine Kategorie ausgewählt.");
      return;
    }
    if (confirm("Kategorie '" + categoriesData[currentCategoryKey].name + "' wirklich löschen?")) {
      delete categoriesData[currentCategoryKey];
      currentCategoryKey = null;
      populateCategoryDropdown();
      document.getElementById("kategorieEmoji").value = "";
      document.getElementById("kategorieBeschreibung").value = "";
      alert("Kategorie gelöscht!");
    }
  }

  /* Popup: Neue Kategorie erstellen */
  function openCreateCategoryPopup() {
    document.getElementById("createCategoryPopup").classList.add("show");
  }
  
  function closeCreateCategoryPopup() {
    document.getElementById("createCategoryPopup").classList.remove("show");
    document.getElementById("newCategoryName").value = "";
    document.getElementById("newCategoryEmoji").value = "";
    document.getElementById("newCategoryDescription").value = "";
  }

  function createCategory() {
    var name = document.getElementById("newCategoryName").value.trim();
    var emoji = document.getElementById("newCategoryEmoji").value.trim();
    var desc = document.getElementById("newCategoryDescription").value.trim();
    if (!name) {
      alert("Bitte einen Kategorienamen eingeben.");
      return;
    }
    var key = name.replace(/\s+/g, '').toLowerCase();
    if (categoriesData[key]) {
      alert("Kategorie existiert bereits!");
      return;
    }
    categoriesData[key] = {
      name: name,
      emoji: emoji || "",
      description: desc || ""
    };
    populateCategoryDropdown();
    document.getElementById("kategorieSelect").value = key;
    loadCategoryData(key);
    closeCreateCategoryPopup();
    alert("Neue Kategorie '" + name + "' wurde erstellt!");
  }
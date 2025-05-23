// assets/js/events.js

/**
 * Haupt-Event-Listener, der nach dem vollständigen Laden des DOMs (DOMContentLoaded) aktiv wird.
 * Initialisiert alle Event-Handler für die interaktiven Elemente der Benutzeroberfläche des Dashboards,
 * wie z.B. Buttons, Dropdown-Menüs und Navigationselemente.
 * Bindet Aktionen wie das Laden von Serverdaten, Anzeigen von Sektionen, Öffnen/Schließen von Modals
 * und das Speichern von Änderungen an die entsprechenden UI-Elemente.
 */
document.addEventListener("DOMContentLoaded", () => {
  /**
   * Wird ausgeführt, wenn das gesamte Fenster (inklusive aller Ressourcen wie Bilder) geladen wurde.
   * Ruft `loadServers()` auf, um die Serverliste zu initialisieren, und blendet den Preloader aus.
   */
  function loadAll() {
    loadServers();
    const pre = document.getElementById("preloader");
    pre.style.transition = "opacity 0.3s ease";
    pre.style.opacity = "0";
    pre.style.pointerEvents = "none";
    setTimeout(() => pre.style.display = "none", 300);
  }
  window.addEventListener("load", loadAll);

  // Initialisiert Event-Listener für das Server-Auswahl-Dropdown.
  document.getElementById("serverButton")
    .addEventListener("click", () => toggleMenu("serverDropdown"));

  // Initialisiert Event-Listener für die Navigation in der Seitenleiste.
  // Setzt die aktive Klasse und zeigt die entsprechende Sektion an.
  document.querySelectorAll(".nav li").forEach(li => {
    li.addEventListener("click", () => {
      document.querySelectorAll(".nav li").forEach(x => x.classList.remove("active"));
      li.classList.add("active");
      showSection(li.dataset.section, li);
    });
  });

  // Initialisiert Event-Listener für das Benutzermenü (Öffnen) und den Logout-Button.
  document.getElementById("userInfo")
    .addEventListener("click", () => toggleMenu("userMenu", "userArrow"));
  document.getElementById("logoutBtn")
    .addEventListener("click", logout);

  // Initialisiert Event-Listener für Aktionen im Bereich Wissenseinträge:
  // - Öffnen der Popups zum Erstellen von Einträgen, Datei-Upload und Google Docs Import.
  // - Bestätigen des Imports und Abbrechen des Imports für Google Docs.
  document.getElementById("btnOpenPopup")
    .addEventListener("click", openPopup);
  document.getElementById("btnOpenFileUpload")
    .addEventListener("click", openFileUploadModal);
  document.getElementById("btnOpenDocUpload")
    .addEventListener("click", openDocUploadModal);
  document.getElementById("btnImportDoc")
    .addEventListener("click", importDoc);
  document.getElementById("btnCancelDocImport")
    .addEventListener("click", closeDocUploadModal);

  // Initialisiert Event-Listener für Aktionen im Bereich Ticket-Kategorien bearbeiten:
  // - Laden der Kategoriedaten bei Auswahl.
  // - Öffnen des Popups zum Erstellen einer neuen Kategorie.
  // - Speichern und Löschen von Kategorien.
  document.getElementById("kategorieSelect")
    .addEventListener("change", e => loadCategoryData(e.target.value));
  document.getElementById("btnOpenCreateCategory")
    .addEventListener("click", openCreateCategoryPopup);
  document.getElementById("btnSaveCategory")
    .addEventListener("click", saveCategoryChanges);
  document.getElementById("btnDeleteCategory")
    .addEventListener("click", deleteCategory);

  // Initialisiert Event-Listener für das Erstellen einer neuen Kategorie im entsprechenden Popup.
  document.getElementById("btnCreateCategorySave")
    .addEventListener("click", createCategory);
  document.getElementById("btnCreateCategoryCancel")
    .addEventListener("click", closeCreateCategoryPopup);

  // Initialisiert Event-Listener für die Blacklist-Verwaltung (Hinzufügen, Entfernen, Suchen).
  // Öffnen der jeweiligen Modals und Ausführen/Abbrechen der Aktionen.
  document.getElementById("btnBlacklistAdd")
    .addEventListener("click", () => toggleModal("blacklistAddModal"));
  document.getElementById("btnBlacklistRemove")
    .addEventListener("click", () => toggleModal("blacklistRemoveModal"));
  document.getElementById("btnBlacklistSearch")
    .addEventListener("click", () => toggleModal("blacklistSearchModal"));

  document.getElementById("btnBlacklistSaveAdd")
    .addEventListener("click", saveBlacklistEntry);
  document.getElementById("btnBlacklistCancelAdd")
    .addEventListener("click", closeBlacklistAddModal);

  document.getElementById("btnBlacklistConfirmRemove")
    .addEventListener("click", confirmBlacklistRemoval);
  document.getElementById("btnBlacklistCancelRemove")
    .addEventListener("click", closeBlacklistRemoveModal);

  document.getElementById("btnBlacklistPerformSearch")
    .addEventListener("click", performBlacklistSearch);
  document.getElementById("btnBlacklistCancelSearch")
    .addEventListener("click", closeBlacklistSearchModal);

  // Initialisiert Event-Listener für den Datei-Upload von Wissensdaten.
  document.getElementById("btnUploadFile")
    .addEventListener("click", uploadFile);
  document.getElementById("btnCancelUploadFile")
    .addEventListener("click", closeFileUploadModal);

  // Initialisiert Event-Listener für die Auswahl und Bearbeitung von Embed-Designs.
  document.querySelectorAll(".embed-list li").forEach(li => {
    li.addEventListener("click", () => openDesignModal(li.dataset.embedId));
  });

  document.getElementById("btnSaveDesignModal")
    .addEventListener("click", saveDesignModal);
  document.getElementById("btnCancelDesignModal")
    .addEventListener("click", closeDesignModal);

  // Initialisiert Event-Listener für das Speichern und Abbrechen beim Erstellen
  // und Bearbeiten von einzelnen Wissenseinträgen.
  document.getElementById("btnSaveEntry")
    .addEventListener("click", saveEntry);
  document.getElementById("btnCancelEntry")
    .addEventListener("click", closePopup);

  document.getElementById("btnSaveEditEntry")
    .addEventListener("click", saveEditEntry);
  document.getElementById("btnCancelEditEntry")
    .addEventListener("click", closeEditPopup);
});

// assets/js/events.js

document.addEventListener("DOMContentLoaded", () => {
  // 1) Preloader & Initial Load
  function loadAll() {
    loadServers();
    const pre = document.getElementById("preloader");
    pre.style.transition = "opacity 0.3s ease";
    pre.style.opacity = "0";
    pre.style.pointerEvents = "none";
    setTimeout(() => pre.style.display = "none", 300);
  }
  window.addEventListener("load", loadAll);

  // 2) Server Dropdown
  document.getElementById("serverButton")
    .addEventListener("click", () => toggleMenu("serverDropdown"));

  // 3) Sidebar Navigation
  document.querySelectorAll(".nav li").forEach(li => {
    li.addEventListener("click", () => {
      document.querySelectorAll(".nav li").forEach(x => x.classList.remove("active"));
      li.classList.add("active");
      showSection(li.dataset.section, li);
    });
  });

  // 4) User Menu & Logout
  document.getElementById("userInfo")
    .addEventListener("click", () => toggleMenu("userMenu", "userArrow"));
  document.getElementById("logoutBtn")
    .addEventListener("click", logout);

  // 5) Wissenseinträge
  document.getElementById("btnOpenPopup")
    .addEventListener("click", openPopup);
  document.getElementById("btnOpenFileUpload")
    .addEventListener("click", openFileUploadModal);

  // 6) Kategorie bearbeiten
  document.getElementById("kategorieSelect")
    .addEventListener("change", e => loadCategoryData(e.target.value));
  document.getElementById("btnOpenCreateCategory")
    .addEventListener("click", openCreateCategoryPopup);
  document.getElementById("btnSaveCategory")
    .addEventListener("click", saveCategoryChanges);
  document.getElementById("btnDeleteCategory")
    .addEventListener("click", deleteCategory);

  // 7) Neue Kategorie erstellen
  document.getElementById("btnCreateCategorySave")
    .addEventListener("click", createCategory);
  document.getElementById("btnCreateCategoryCancel")
    .addEventListener("click", closeCreateCategoryPopup);

  // 8) Blacklist Controls
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

  // 9) Datei Upload
  document.getElementById("btnUploadFile")
    .addEventListener("click", uploadFile);
  document.getElementById("btnCancelUploadFile")
    .addEventListener("click", closeFileUploadModal);

  // 10) Design Embeds
  document.querySelectorAll(".embed-list li").forEach(li => {
    li.addEventListener("click", () => openDesignModal(li.dataset.embedId));
  });

  document.getElementById("btnSaveDesignModal")
    .addEventListener("click", saveDesignModal);
  document.getElementById("btnCancelDesignModal")
    .addEventListener("click", closeDesignModal);

  // 11) Wissenseintrag bearbeiten
  document.getElementById("btnSaveEntry")
    .addEventListener("click", saveEntry);
  document.getElementById("btnCancelEntry")
    .addEventListener("click", closePopup);

  document.getElementById("btnSaveEditEntry")
    .addEventListener("click", saveEditEntry);
  document.getElementById("btnCancelEditEntry")
    .addEventListener("click", closeEditPopup);
});

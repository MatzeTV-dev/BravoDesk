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
    }
  }

    /* Wissenseinträge: Editieren */
    var currentEditRow = null;
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
    }
  }

  /* Wissenseinträge: Löschen */
  function deleteEntry(el) {
    if (confirm("Eintrag wirklich löschen?")) {
      var row = el.parentElement.parentElement;
      row.remove();
    }
  }
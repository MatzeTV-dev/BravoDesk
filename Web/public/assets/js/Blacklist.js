function loadBlacklistEntries(guildId) {
  currentGuildId = guildId;
  fetch(`/api/blacklist/${guildId}`)
    .then(response => response.json())
    .then(data => {
      console.log("Blacklist-Einträge erhalten:", data);
      const tbody = document.querySelector("#blacklist table tbody");
      tbody.innerHTML = "";

      if (data && data.length) {
        data.forEach(entry => {
          const tr = document.createElement("tr");
          tr.setAttribute("data-entry-id", entry.user_id);

          const tdUserId = document.createElement("td");
          tdUserId.innerText = entry.user_id;

          const tdReason = document.createElement("td");
          tdReason.innerText = entry.reason || "Kein Grund";

          const tdDate = document.createElement("td");
          tdDate.innerText = new Date(entry.created_at).toLocaleString();

          tr.appendChild(tdUserId);
          tr.appendChild(tdReason);
          tr.appendChild(tdDate);
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = `<tr><td colspan="3">Keine Einträge gefunden.</td></tr>`;
      }
    })
    .catch(err => console.error("Fehler beim Laden der Blacklist-Einträge:", err));
}

function openBlacklistAddModal() {
  document.getElementById("blacklistAddModal").classList.add("show");
}

function closeBlacklistAddModal() {
  document.getElementById("blacklistAddModal").classList.remove("show");
}

function saveBlacklistEntry() {
  const userId = document.getElementById("blacklistAddUserId").value.trim();
  const reason = document.getElementById("blacklistAddReason").value.trim();
  console.log("saveBlacklistEntry invoked", { userId, reason, currentGuildId });
  if (userId !== "" && currentGuildId) {
    fetch(`/api/blacklist/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, reason: reason })
    })
      .then(response => response.json())
      .then(data => {
        console.log("Blacklist-Eintrag gespeichert:", data);
        loadBlacklistEntries(currentGuildId);
        document.getElementById("blacklistAddUserId").value = "";
        document.getElementById("blacklistAddReason").value = "";
        closeBlacklistAddModal();
        notify("User wurde zur Blacklist hinzugefügt", 3000, "success")
      })
      .catch(err => console.error("Fehler beim Speichern des Blacklist-Eintrags:", err));
  }
}

function openBlacklistRemoveModal() {
  document.getElementById("blacklistRemoveModal").classList.add("show");
}

function closeBlacklistRemoveModal() {
  document.getElementById("blacklistRemoveModal").classList.remove("show");
}

function confirmBlacklistRemoval() {
  const userId = document.getElementById("blacklistRemoveUserId").value.trim();
  if (userId !== "" && currentGuildId) {
    fetch(`/api/blacklist/${currentGuildId}/${encodeURIComponent(userId)}`, {
      method: "DELETE"
    })
      .then(response => response.json())
      .then(data => {
        console.log("Blacklist-Eintrag entfernt:", data);
        loadBlacklistEntries(currentGuildId);
        document.getElementById("blacklistRemoveUserId").value = "";
        closeBlacklistRemoveModal();
        notify("User wurde von der Blacklist entfernt", 3000, "success")
      })
      .catch(err => console.error("Fehler beim Entfernen des Blacklist-Eintrags:", err));
  }
}

function openBlacklistSearchModal() {
  document.getElementById("blacklistSearchModal").classList.add("show");
  document.getElementById("blacklistSearchResults").innerHTML = "";
}

function closeBlacklistSearchModal() {
  document.getElementById("blacklistSearchModal").classList.remove("show");
}

function performBlacklistSearch() {
  const userId = document.getElementById("blacklistSearchUserId").value.trim();
  if (userId !== "" && currentGuildId) {
    fetch(`/api/blacklist/${currentGuildId}/search?user_id=${encodeURIComponent(userId)}`)
      .then(response => response.json())
      .then(data => {
        let resultsHtml = "";
        if (data && data.length) {
          data.forEach(entry => {
            resultsHtml += `
              <p>
                <strong>User ID:</strong> ${entry.user_id}<br>
                <strong>Grund:</strong> ${entry.reason}<br>
                <strong>Datum:</strong> ${new Date(entry.created_at).toLocaleString()}
              </p>`;
          });
        } else {
          resultsHtml = "<p>Keine Einträge gefunden.</p>";
        }
        document.getElementById("blacklistSearchResults").innerHTML = resultsHtml;
      })
      .catch(err => console.error("Fehler beim Suchen des Blacklist-Eintrags:", err));
  }
}

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("btnBlacklistAdd").addEventListener("click", openBlacklistAddModal);
  document.getElementById("btnBlacklistRemove").addEventListener("click", openBlacklistRemoveModal);
  document.getElementById("btnBlacklistSearch").addEventListener("click", openBlacklistSearchModal);
});

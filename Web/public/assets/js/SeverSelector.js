// Beim Laden der Server:
function loadServers() {
  fetch('/api/guilds')
    .then(response => response.json())
    .then(guilds => {
      console.log("Server-Daten erhalten:", guilds);
      const serverDropdown = document.getElementById('serverDropdown');
      serverDropdown.innerHTML = ''; // Vorherige Einträge löschen

      guilds.forEach(guild => {
        const div = document.createElement('div');
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.padding = "10px";
        div.style.cursor = "pointer";
        div.style.borderBottom = "1px solid #3a3a3a";

        const img = document.createElement('img');
        // Falls ein Icon vorhanden ist, wird dieses angezeigt; ansonsten ein Fallback-Bild
        if (guild.icon) {
          img.src = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
        } else {
          img.src = '/assets/img/avatar.jpg'; // Pfad zu deinem Fallback-Bild
        }
        img.alt = `${guild.name} Icon`;
        img.style.width = "24px";
        img.style.height = "24px";
        img.style.borderRadius = "50%";
        img.style.marginRight = "8px";
        div.appendChild(img);

        const span = document.createElement('span');
        span.innerText = guild.name;
        div.appendChild(span);

        // Beim Klick wird der Server ausgewählt und die Daten werden gespeichert
        div.onclick = () => {
          selectServer(guild);
        };

        serverDropdown.appendChild(div);
      });
    })
    .catch(err => console.error("Fehler beim Laden der Server:", err));
}



function selectServer(guild) {
  // Aktualisiere den im Dropdown angezeigten Namen
  document.getElementById("selectedServer").innerText = guild.name;
  toggleMenu("serverDropdown");
  // Lade die Wissenseinträge für den ausgewählten Server
  loadKnowledgeEntries(guild.id);
  loadBlacklistEntries(guild.id);
  loadTicketCategories(guild.id);
  loadGuildRoles();
}
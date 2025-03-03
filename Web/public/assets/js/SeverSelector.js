function saveGuildData(guild) {
    fetch(`/api/guilds/${guild.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(guild)
    })
    .then(response => response.json())
    .then(data => {
      console.log("Guild data saved:", data);
    })
    .catch(err => console.error("Fehler beim Speichern der Guild-Daten:", err));
  }
  
  // Beim Laden der Server:
  function loadServers() {
    fetch('/api/guilds')
      .then(response => response.json())
      .then(guilds => {
        const serverDropdown = document.getElementById('serverDropdown');
        serverDropdown.innerHTML = ''; // Vorherige Einträge löschen
  
        guilds.forEach(guild => {
          const div = document.createElement('div');
          div.innerText = guild.name;
          div.style.padding = "10px";
          div.style.cursor = "pointer";
          div.style.borderBottom = "1px solid #3a3a3a";
  
          // Beim Klick wird der Server ausgewählt und die Daten werden gespeichert
          div.onclick = () => {
            selectServer(guild);
            saveGuildData(guild);
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
  }
  
  

  window.addEventListener("load", loadServers);
  
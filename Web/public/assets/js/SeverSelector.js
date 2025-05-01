function loadServers() {
  fetch('/api/guilds')
    .then(response => response.json())
    .then(guilds => {
      console.log("Server-Daten erhalten:", guilds);
      const serverDropdown = document.getElementById('serverDropdown');
      serverDropdown.innerHTML = '';

      guilds.forEach(guild => {
        const div = document.createElement('div');
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.padding = "10px";
        div.style.cursor = "pointer";
        div.style.borderBottom = "1px solid #3a3a3a";

        const img = document.createElement('img');
        if (guild.icon) {
          // URL-Komponenten werden sicher encodiert
          img.src = `https://cdn.discordapp.com/icons/${encodeURIComponent(guild.id)}/${encodeURIComponent(guild.icon)}.png`;
        } else {
          img.src = '/assets/img/avatar.jpg';
        }
        img.alt = `${guild.name} Icon`;
        img.style.width = "24px";
        img.style.height = "24px";
        img.style.borderRadius = "50%";
        img.style.marginRight = "8px";
        div.appendChild(img);

        const span = document.createElement('span');
        // Nutzung von textContent, um sicherzustellen, dass keine HTML-Injektionen erfolgen
        span.textContent = guild.name;
        div.appendChild(span);

        div.onclick = () => {
          selectServer(guild, true);
        };

        serverDropdown.appendChild(div);
      });

      if (guilds.length > 0) {
        selectServer(guilds[0], false);
      }
      
      const inviteButton = document.createElement('button');
      inviteButton.textContent = '+ Server Hinzufügen';
      inviteButton.style.display = 'block';
      inviteButton.style.width = '100%';
      inviteButton.style.padding = '10px';
      inviteButton.style.marginTop = '10px';
      inviteButton.style.cursor = 'pointer';
      inviteButton.style.backgroundColor = '#1c6b3e';
      inviteButton.style.color = '#fff';
      inviteButton.style.border = 'none';
      inviteButton.style.borderRadius = '4px';
      inviteButton.style.fontSize = '16px';
      
      const inviteLink = 'https://discord.com/oauth2/authorize?client_id=1308807818366681131&permissions=268463120&integration_type=0&scope=bot';
      
      inviteButton.onclick = () => {
        window.location.href = inviteLink;
      };

      serverDropdown.appendChild(inviteButton);
    })
    .catch(err => console.error("Fehler beim Laden der Server:", err));
}

function selectServer(guild, automatic_open) {
  // textContent statt innerText verwenden, um sicherzustellen, dass unerwünschte HTML-Interpretation unterbunden wird
  document.getElementById("selectedServer").textContent = guild.name;

  if (automatic_open) {
    toggleMenu("serverDropdown");
  }

  if (checkServerStatus(guild.id)) {
    
  } else {
    loadKnowledgeEntries(guild.id);
    loadBlacklistEntries(guild.id);
    loadTicketCategories(guild.id);
    loadGuildRoles();
  }
}

function showOverlay() {
  document.getElementById('setupOverlay').style.display = 'flex';
}

function hideOverlay() {
  document.getElementById('setupOverlay').style.display = 'none';
}

function checkServerStatus(guildid) {
  let check = null;
  fetch(`/api/setupstatus/${guildid}`)
    .then(r => r.json())
    .then(data => {
      const layout = document.querySelector('.layout');
      check = data.result;
      if (data.result) {
        layout.classList.remove('blurred');
        hideOverlay();
      } else {
        layout.classList.add('blurred');
        showOverlay();
      }
    })
    .catch(err => console.error('Fehler beim Abfragen des Setup Status:', err));

    return check;
}

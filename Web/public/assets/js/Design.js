// Wird von deinem loadAll(guild) aufgerufen:
function initDesign(guild) {
  currentGuildId = guild.id;
}

// Klick auf “Design” im Sidebar
document.getElementById('navDesign').addEventListener('click', () => {
  loadDesignList();
  showList();
});

// Liste statisch (2 Einträge)
function loadDesignList() {
  const list = document.querySelector('.design-list ul');
  list.innerHTML = '';
  [
    { key: 'ticket_creation', name: 'Ticket Creation Embed' },
    { key: 'welcome_message', name: 'Welcome Message Embed' }
  ].forEach(({key,name}) => {
    const li = document.createElement('li');
    li.textContent = name;
    li.addEventListener('click', () => openEmbedEditor(key));
    list.appendChild(li);
  });
}

function openEmbedEditor(key) {
  currentKey = key;
  document.querySelector('.design-list').classList.add('hidden');
  document.querySelector('.design-editor').classList.add('active');

  fetch(`/api/embeds/${currentGuildId}/${key}`)
    .then(res => {
      if (!res.ok) throw res;
      return res.json();
    })
    .then(data => {
      console.log('Roh-Response:', data);

      // 1) data.embed ist ein STRING, kein Objekt → parsen:
      let parsed;
      try {
        parsed = JSON.parse(data.embed);
      } catch (err) {
        throw new Error('Fehler beim Parsen des Embed-JSON: ' + err.message);
      }

      // 2) Sicherstellen, dass embeds ein Array mit mindestens einem Eintrag ist:
      if (!Array.isArray(parsed.embeds) || parsed.embeds.length === 0) {
        throw new Error('Keine Embeds gefunden im JSON');
      }

      // 3) Erst jetzt das erste Embed-Objekt herausziehen:
      const embed = parsed.embeds[0];
      console.log('Embed-Objekt:', embed);
      console.log('Title:',       embed.title);
      console.log('Description:', embed.description);
      console.log('Color:',       embed.color);
      console.log('Footer-Text:', embed.footer?.text);

      // 4) Inputs erst befüllen, **wenn** sie wirklich existieren:
      const titleEl = document.getElementById('embedTitle');
      const descEl  = document.getElementById('embedDescription');
      const colEl   = document.getElementById('embedColor');
      const footEl  = document.getElementById('embedFooter');

      if (!titleEl || !descEl || !colEl || !footEl) {
        console.warn('Ein oder mehrere Embed‑Felder fehlen im DOM:', {
          titleEl, descEl, colEl, footEl
        });
        return; // oder: throw new Error('DOM-Inputs fehlen');
      }

      titleEl.value       = embed.title       || '';
      descEl.value        = embed.description || '';
      colEl.value         = '#' + (embed.color || 0)
                                  .toString(16)
                                  .padStart(6,'0');
      footEl.value        = embed.footer?.text || '';
    })
    .catch(err => {
      alert('Fehler beim Laden: ' + (err.message || err.statusText || err));
      showList();
    });
}


function showList() {
  document.querySelector('.design-editor').classList.remove('active');
  document.querySelector('.design-list').classList.remove('hidden');
}

document.querySelector('.design-editor form').addEventListener('submit', saveDesign);
function saveDesign(e) {
  e.preventDefault();
  const title       = document.getElementById('embedTitle').value.trim();
  const description = document.getElementById('embedDescription').value.trim();
  const colorHex    = document.getElementById('embedColor').value;
  const footerText  = document.getElementById('embedFooter').value.trim();
  const colorInt    = parseInt(colorHex.replace('#',''),16);

  const payload = { embeds: [{ title, description, color: colorInt, footer: { text: footerText } }] };

  fetch(`/api/embeds/${currentGuildId}/${currentKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => {
      if (!res.ok) return res.json().then(j=>Promise.reject(j.error||res.statusText));
      alert('Embed gespeichert!');
      showList();
    })
    .catch(msg => alert('Fehler beim Speichern: ' + msg));
}

function uploadImage() {
  alert("Hier könntest du einen Datei‑Dialog öffnen.");
}

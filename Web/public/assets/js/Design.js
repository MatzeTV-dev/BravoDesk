// assets/js/DesignModal.js
let currentDesignKey;

// Wird von loadAll(guild) aufgerufen:
function initDesign(guild) {
  currentGuildId = guild.id;
}

// Öffnet das Modal, lädt die Daten, füllt das Formular und zeigt es an
function openDesignModal(key) {
  currentDesignKey = key;
  const modal = document.getElementById('editEmbedModal');
  fetch(`/api/embeds/getEmbeds/${currentGuildId}/${currentDesignKey}`)
    .then(res => {
      if (!res.ok) throw res;
      return res.json();
    })
    .then(data => {
      console.log(data)
      const parsed = JSON.parse(data.embed);
      const embed = Array.isArray(parsed.embeds) && parsed.embeds.length
        ? parsed.embeds[0]
        : {};
      document.getElementById('modalEmbedTitle').value       = embed.title       || '';
      document.getElementById('modalEmbedDescription').value = embed.description || '';
      document.getElementById('modalEmbedColor').value       = '#' + (embed.color || 0)
        .toString(16).padStart(6, '0');
      document.getElementById('modalEmbedFooter').value      = embed.footer?.text || '';
      modal.classList.add('show');
    })
    .catch(err => {
      alert('Fehler beim Laden des Embeds: ' + (err.message || err.statusText || err));
    });
}

// Schließt das Modal
function closeDesignModal() {
  document.getElementById('editEmbedModal').classList.remove('show');
}

// Sammelt die Formularwerte, sendet PUT und schließt das Modal
function saveDesignModal() {
  const title       = document.getElementById('modalEmbedTitle').value.trim();
  const description = document.getElementById('modalEmbedDescription').value.trim();
  const colorHex    = document.getElementById('modalEmbedColor').value;
  const footerText  = document.getElementById('modalEmbedFooter').value.trim();
  const colorInt    = parseInt(colorHex.replace('#',''), 16);

  const payload = {
    embeds: [
      { title, description, color: colorInt, footer: { text: footerText } }
    ]
  };

  console.log(currentGuildId, currentDesignKey)

  fetch(`/api/embeds/${currentGuildId}/${currentDesignKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => {
      if (!res.ok) return res.json().then(j => Promise.reject(j.error || res.statusText));
      alert('Embed gespeichert!');
      closeDesignModal();
    })
    .catch(err => {
      alert('Fehler beim Speichern: ' + (err.message || err));
    });
}


// assets/js/DesignModal.js
let currentDesignKey;
//let currentGuildId;

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
      console.log(data);
      const parsed = JSON.parse(data.embed);
      const embed = Array.isArray(parsed.embeds) && parsed.embeds.length
        ? parsed.embeds[0]
        : {};

      document.getElementById('modalEmbedTitle').value       = embed.title       || '';
      document.getElementById('modalEmbedDescription').value = embed.description || '';
      document.getElementById('modalEmbedColor').value       = '#' + (embed.color || 0)
        .toString(16).padStart(6, '0');
      document.getElementById('modalEmbedFooter').value      = embed.footer?.text || '';
      document.getElementById('modalEmbedThumbnail').value   = embed.thumbnail?.url || '';

      const thumbnailPreview = document.getElementById('modalEmbedThumbnailPreview');
      if (embed.thumbnail?.url) {
        thumbnailPreview.src = embed.thumbnail.url;
        thumbnailPreview.style.display = 'block';
      } else {
        thumbnailPreview.style.display = 'none';
      }

      modal.classList.add('show');
    })
    .catch(err => {
      //alert('Fehler beim Laden des Embeds: ' + (err.message || err.statusText || err));
      notify("Fehler beim Laden des Embeds", 3000, "error")
    });
}

// Schließt das Modal
function closeDesignModal() {
  document.getElementById('editEmbedModal').classList.remove('show');
}

// Sammelt die Formularwerte, sendet PUT und schließt das Modal
function saveDesignModal() {
  const title         = document.getElementById('modalEmbedTitle').value.trim();
  const description   = document.getElementById('modalEmbedDescription').value.trim();
  const colorHex      = document.getElementById('modalEmbedColor').value;
  const footerText    = document.getElementById('modalEmbedFooter').value.trim();
  const thumbnailUrl  = document.getElementById('modalEmbedThumbnail').value.trim();
  const colorInt      = parseInt(colorHex.replace('#',''), 16);

  const embed = {
    title,
    description,
    color: colorInt,
    footer: { text: footerText }
  };

  if (thumbnailUrl) {
    embed.thumbnail = { url: thumbnailUrl };
  }

  const payload = {
    embeds: [embed]
  };

  fetch(`/api/embeds/${currentGuildId}/${currentDesignKey}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(res => {
      if (!res.ok) return res.json().then(j => Promise.reject(j.error || res.statusText));
      notify("Embed gespeichert", 3000, "success")
      closeDesignModal();
    })
    .catch(err => {
      notify("Fehler beim Speichern", 3000, "error")
    });
}

// Live-Vorschau bei Thumbnail-Link-Eingabe
document.getElementById('modalEmbedThumbnail').addEventListener('input', (e) => {
  const url = e.target.value;
  const preview = document.getElementById('modalEmbedThumbnailPreview');

  preview.style.display = 'none';
  if (url && url.startsWith('http')) {
    const img = new Image();
    img.onload = () => {
      preview.src = url;
      preview.style.display = 'block';
    };
    img.onerror = () => {
      preview.style.display = 'none';
    };
    img.src = url;
  }
});

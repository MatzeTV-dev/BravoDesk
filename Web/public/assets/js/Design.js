// assets/js/DesignModal.js
let currentDesignKey;
//let currentGuildId; // Globale Variable für die aktuelle Guild-ID, wird in initDesign gesetzt.

/**
 * Initialisiert die Design-Bearbeitung für eine spezifische Guild.
 * Setzt die globale `currentGuildId` Variable, die von anderen Funktionen in diesem Skript verwendet wird.
 * Diese Funktion wird typischerweise aufgerufen, wenn die Hauptseite oder der Bereich für eine Guild geladen wird.
 *
 * @param {object} guild - Das Guild-Objekt, das mindestens eine `id`-Eigenschaft enthält.
 * @param {string} guild.id - Die ID der aktuellen Guild.
 */
function initDesign(guild) {
  currentGuildId = guild.id;
}

/**
 * Öffnet das Modal zur Bearbeitung eines Embed-Designs.
 * Lädt die aktuellen Embed-Daten für den gegebenen Schlüssel (key) und die currentGuildId,
 * füllt die Formularfelder im Modal und zeigt das Modal an.
 *
 * @param {string} key - Der Schlüssel des zu bearbeitenden Embed-Designs (z.B. 'ticket_creation', 'welcome_message').
 */
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

/**
 * Schließt das Modal zur Bearbeitung des Embed-Designs.
 */
function closeDesignModal() {
  document.getElementById('editEmbedModal').classList.remove('show');
}

/**
 * Sammelt die Werte aus dem Embed-Design-Formular, erstellt ein Embed-Objekt,
 * sendet dieses per PUT-Request an den Server, um das Design zu speichern,
 * und schließt das Modal bei Erfolg. Benachrichtigt den Benutzer über Erfolg oder Fehler.
 */
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

/**
 * Event-Listener für das Eingabefeld der Thumbnail-URL im Embed-Design-Modal.
 * Aktualisiert die Vorschau des Thumbnails live, während der Benutzer tippt.
 * Zeigt das Vorschaubild an, wenn eine gültige URL eingegeben wird, die zu einem Bild führt.
 * Versteckt die Vorschau, wenn die URL ungültig ist oder kein Bild geladen werden kann.
 */
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

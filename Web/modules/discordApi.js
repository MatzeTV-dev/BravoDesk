// modules/discordApi.js
import fetch from 'node-fetch';
const API_BASE = 'https://discord.com/api/v10';
const TOKEN    = process.env.DISCORD_BOT_TOKEN;

/**
 * Interne Hilfsfunktion zum Abrufen von Daten von einer URL mit Bot-Autorisierung.
 * Fängt Fehler ab und gibt null zurück, wenn der Abruf fehlschlägt oder die Antwort nicht OK ist.
 *
 * @async
 * @param {string} url - Die URL, von der die Daten abgerufen werden sollen.
 * @returns {Promise<Object|null>} Ein Promise, das zum JSON-Objekt der Antwort auflöst, oder null bei einem Fehler.
 */
async function tryFetch(url) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bot ${TOKEN}` }
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      return null;
    }
  }

/**
 * Versucht erst, den Member in der Guild zu holen,
 * fällt dann auf /users/:id zurück.
 * Gibt den Tag ("Name#1234") oder null zurück – niemals wirft es.
 */
export async function fetchMemberTag(guildId, userId) {
  const user = await tryFetch(`${API_BASE}/users/${userId}`);

  if (user) {
    return `${user.username}`;
  }

  // 3) Nichts gefunden
  return null;
}

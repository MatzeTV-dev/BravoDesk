import { EmbedBuilder } from 'discord.js';

/**
 * Erzeugt ein Error-Embed.
 *
 * @param {string} title - Der Titel des Error-Embeds.
 * @param {string} text - Die Beschreibung des Fehlers.
 * @returns {EmbedBuilder} Das erstellte Error-Embed.
 */
function error(title, text) {
  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle(title)
    .setDescription(text)
    .setTimestamp();
  return embed;
}

/**
 * Erzeugt ein Success-Embed.
 *
 * @param {string} title - Der Titel des Success-Embeds.
 * @param {string} text - Die Beschreibung des Erfolgs.
 * @returns {EmbedBuilder} Das erstellte Success-Embed.
 */
function success(title, text) {
  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle(title)
    .setDescription(text)
    .setTimestamp();
  return embed;
}

/**
 * Erzeugt ein Warning-Embed.
 *
 * @param {string} title - Der Titel des Warning-Embeds.
 * @param {string} text - Die Warnbeschreibung.
 * @returns {EmbedBuilder} Das erstellte Warning-Embed.
 */
function warning(title, text) {
  const embed = new EmbedBuilder()
    .setColor('#F7FF33')
    .setTitle(title)
    .setDescription(text)
    .setTimestamp();
  return embed;
}

/**
 * Erzeugt ein Info-Embed.
 *
 * @param {string} title - Der Titel des Info-Embeds.
 * @param {string} text - Die Informationsbeschreibung.
 * @returns {EmbedBuilder} Das erstellte Info-Embed.
 */
function info(title, text) {
  const embed = new EmbedBuilder()
    .setColor('#6B8F71')
    .setTitle(title)
    .setDescription(text)
    .setTimestamp();
  return embed;
}

export { error, success, warning, info };

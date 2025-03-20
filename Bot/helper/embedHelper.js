import { EmbedBuilder } from 'discord.js';

function error(title, text) {
  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle(title)
    .setDescription(text)
    .setTimestamp();
  return embed;
}

function success(title, text) {
  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle(title)
    .setDescription(text)
    .setTimestamp();
  return embed;
}

function warning(title, text) {
  const embed = new EmbedBuilder()
    .setColor('#F7FF33')
    .setTitle(title)
    .setDescription(text)
    .setTimestamp();
  return embed;
}

function info(title, text) {
  const embed = new EmbedBuilder()
    .setColor('#6B8F71')
    .setTitle(title)
    .setDescription(text)
    .setTimestamp();
  return embed;
}

export { error, success, warning, info };

import { info } from '../helper/embedHelper.js';
import Logger from '../helper/loggerHelper.js';
import { EmbedBuilder } from 'discord.js';

export default {
  data: { name: 'talk_to_human' },
  /**
   * Führt den "talk_to_human" Button-Handler aus, um den menschlichen Support zu benachrichtigen.
   * Dabei wird geprüft, ob bereits ein Supporter informiert wurde, und falls nicht,
   * wird die erste Nachricht im Ticket-Channel aktualisiert und eine Benachrichtigung gesendet.
   *
   * @param {ButtonInteraction} interaction - Die Interaktion, die den Button-Klick repräsentiert.
   * @returns {Promise<void>} Ein Promise, das resolved, wenn der Vorgang abgeschlossen ist.
   */
  async execute(interaction) {
    const channel = interaction.channel;
    const guild = interaction.guild;

    if (!channel) {
      Logger.warn('Kanal nicht gefunden. Möglicherweise wurde er gelöscht.');
      await interaction.reply({
        content: 'Es scheint, als wäre dieses Ticket nicht mehr verfügbar.',
        ephemeral: true,
      });
      return;
    }

    try {
      const fetchedMessages = await channel.messages.fetch({ limit: 100 });
      const existingMessage = fetchedMessages.find((msg) =>
        msg.content.includes('Alles klar, ein menschlicher')
      );

      if (existingMessage) {
        await interaction.reply({
          embeds: [info('Achtung', 'Es wurde bereits ein menschlicher Supporter informiert, bitte habe etwas geduld!')],
          ephemeral: true,
        });
        return;
      }

      const oldestMessage = fetchedMessages.last();

      if (oldestMessage && oldestMessage.embeds && oldestMessage.embeds.length > 0) {
        const oldEmbed = oldestMessage.embeds[0];
        const embedData = oldEmbed.toJSON();

        if (embedData.fields) {
          const supportFieldIndex = embedData.fields.findIndex(
            (field) => field.name === 'Support'
          );
          if (supportFieldIndex !== -1) {
            embedData.fields[supportFieldIndex].value = 'Mensch';
          }
        }

        const newEmbed = new EmbedBuilder(embedData);
        await oldestMessage.edit({ embeds: [newEmbed] });
      }

      const role = guild.roles.cache.find(r => r.name === 'Supporter');

      await channel.send(`Alles klar, ein menschlicher <@&${role.id}> wird das Ticket übernehmen!`);
      await interaction.update({});
    } catch (error) {
      Logger.error(`Fehler beim Senden der Nachricht an den menschlichen Support: ${error.message}\n${error.stack}`);
      try {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.reply({
            content: 'Es gab einen Fehler beim Weiterleiten an den menschlichen Support.',
            ephemeral: true,
          });
        }
      } catch (replyError) {
        Logger.error(`Fehler beim Senden der Fehlermeldung: ${replyError.message}\n${replyError.stack}`);
      }
    }
  },
};

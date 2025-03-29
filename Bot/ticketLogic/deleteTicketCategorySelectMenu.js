import { getCategories, deleteCategory, updateTicketCreationMessage } from '../helper/ticketCategoryHelper.js';
import { error, success } from '../helper/embedHelper.js';
import Logger from '../helper/loggerHelper.js';

/**
 * Führt das Löschen einer Ticket-Kategorie durch.
 * Überprüft, ob der ausführende Benutzer über die Berechtigung "ManageChannels" verfügt,
 * sucht anhand des ausgewählten Wertes die entsprechende Kategorie, löscht diese und aktualisiert anschließend das Dropdown-Menü.
 *
 * @param {CommandInteraction} interaction - Das Interaktionsobjekt von Discord.
 * @returns {Promise<void>} Ein Promise, das resolved, wenn die Ausführung abgeschlossen ist.
 */
export default {
  data: { customId: 'delete_ticket_category' },
  async execute(interaction) {
    await interaction.deferUpdate();

    if (!interaction.member.permissions.has('ManageChannels')) {
      return interaction.followUp({ 
        embeds: [error('Error!', 'Du hast keine Berechtigung dafür.')],
        ephemeral: true 
      });
    }
    
    const selectedValues = interaction.values;
    const labelToDelete = selectedValues[0];
    const guildId = interaction.guild.id;
    
    const categories = await getCategories(guildId);
    const category = categories.find(cat => cat.value.trim().toLowerCase() === labelToDelete.trim().toLowerCase());
    if (!category) {
      return interaction.followUp({ 
        embeds: [error('Error!', `Kategorie \`${labelToDelete}\` wurde nicht gefunden.`)],
        ephemeral: true 
      });
    }
    
    await deleteCategory(guildId, labelToDelete);
    updateTicketCreationMessage(interaction.guild).catch(err => {
      Logger.error(`Fehler beim Aktualisieren des Dropdown-Menüs: ${err.message}`);
    });
    
    await interaction.editReply({ 
      embeds: [success('Erfolg!', `Kategorie \`${labelToDelete}\` wurde erfolgreich gelöscht.`)],
      components: [] 
    });
  }
};

// delete_ticket_category handler (z. B. in components/delete_ticket_category.js)
const { getCategories, deleteCategory, updateTicketCreationMessage } = require('../helper/ticketCategoryHelper');
const Logger = require('../helper/loggerHelper');
const { error, success } = require('../helper/embedHelper');

module.exports = {
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
    const category = categories.find(cat => cat.label.trim().toLowerCase() === labelToDelete.trim().toLowerCase());
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

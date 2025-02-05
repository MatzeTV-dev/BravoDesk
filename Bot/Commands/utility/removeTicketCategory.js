const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getCategories } = require('../../helper/ticketCategoryHelper');
const Logger = require('../../helper/loggerHelper');
const { error, info } = require('../../helper/embedHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('deletecategory')
    .setDescription('Löscht eine Ticket-Kategorie über ein Dropdown-Menü.'),
  async execute(interaction) {

    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has('ManageChannels')) {
      await interaction.editReply({ 
        embeds: [error('Error!', 'Du hast keine Berechtigung dafür!')],
        ephemeral: true 
      });

      return;
    }
    
    const categories = getCategories(interaction.guild.id);
    if (!categories || categories.length === 0) {
      await interaction.editReply({ 
        embeds: [info('Info', 'Es gibt keine Kategorie zum löschen.')],
        ephemeral: true 
      });

      return;
    }
    
    // Erstelle die Options für das Dropdown-Menü – hier wird als value der Label genutzt.
    const options = categories.map(cat => ({
      label: cat.label,
      description: cat.description,
      value: cat.label  // Verwende den Kategorienamen als eindeutigen Schlüssel
    }));
    
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('delete_ticket_category')
      .setPlaceholder('Wähle die Kategorie, die gelöscht werden soll')
      .addOptions(options);
    
    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    await interaction.editReply({ 
      embeds: [info('Info', 'Wähle die Kategorie, die gelöscht werden soll:')],
      components: [row], 
      ephemeral: true 
    });
  },
};

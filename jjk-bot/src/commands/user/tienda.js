const { SlashCommandBuilder } = require("discord.js");
const { query } = require("../../database/db");
const { embedTienda, embedError } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tienda")
    .setDescription("Muestra la tienda general (usa monedas). Compra con /comprar."),

  async execute(interaction) {
    const discordId = interaction.user.id;

    const { rows: userRows } = await query(
      "SELECT dinero FROM usuarios WHERE discord_id = $1",
      [discordId]
    );
    if (!userRows.length) {
      return interaction.reply({
        embeds: [embedError("No tienes un personaje registrado. Usa `/registro` primero.")],
        ephemeral: true,
      });
    }

    const { rows: items } = await query(
      "SELECT * FROM items WHERE precio_dinero IS NOT NULL ORDER BY precio_dinero ASC"
    );

    if (!items.length) {
      return interaction.reply({
        embeds: [embedError("La tienda está vacía en este momento.")],
      });
    }

    await interaction.reply({
      embeds: [embedTienda(items, userRows[0].dinero, "dinero")],
    });
  },
};

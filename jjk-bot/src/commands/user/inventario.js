const { SlashCommandBuilder } = require("discord.js");
const { query } = require("../../database/db");
const { embedInventario, embedError } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventario")
    .setDescription("Muestra los ítems que tienes en tu inventario."),

  async execute(interaction) {
    const discordId = interaction.user.id;

    const { rows: userRows } = await query(
      "SELECT id, nombre_personaje FROM usuarios WHERE discord_id = $1",
      [discordId]
    );

    if (!userRows.length) {
      return interaction.reply({
        embeds: [embedError("No tienes un personaje registrado. Usa `/registro` primero.")],
        ephemeral: true,
      });
    }

    const usuarioId     = userRows[0].id;
    const nombrePersonaje = userRows[0].nombre_personaje;

    const { rows: entradas } = await query(
      `SELECT i.nombre, i.descripcion, i.tipo, inv.cantidad
       FROM inventario inv
       JOIN items i ON inv.item_id = i.id
       WHERE inv.usuario_id = $1
       ORDER BY i.nombre ASC`,
      [usuarioId]
    );

    await interaction.reply({
      embeds: [embedInventario(nombrePersonaje, entradas)],
      ephemeral: true,
    });
  },
};

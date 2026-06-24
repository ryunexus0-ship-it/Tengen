const { SlashCommandBuilder } = require("discord.js");
const { query } = require("../../database/db");
const { embedExito, embedError } = require("../../utils/embeds");
const { esStaff } = require("../../utils/roleManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dar-pm")
    .setDescription("[STAFF] Da Puntos Malditos (PM) a un usuario.")
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Usuario que recibirá los PM").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("cantidad")
        .setDescription("Cantidad de PM a dar (positivo o negativo para quitar)")
        .setRequired(true)
        .setMinValue(-999999)
        .setMaxValue(999999)
    ),

  async execute(interaction) {
    if (!esStaff(interaction.member)) {
      return interaction.reply({
        embeds: [embedError("No tienes permisos. Se requiere el rol **Staff**.")],
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("usuario");
    const cantidad   = interaction.options.getInteger("cantidad");

    const { rows } = await query(
      "SELECT id, nombre_personaje, pm FROM usuarios WHERE discord_id = $1",
      [targetUser.id]
    );

    if (!rows.length) {
      return interaction.reply({
        embeds: [embedError(`El usuario ${targetUser.tag} no tiene personaje registrado.`)],
        ephemeral: true,
      });
    }

    const usuario  = rows[0];
    const nuevoPM  = Math.max(0, usuario.pm + cantidad);

    await query(
      "UPDATE usuarios SET pm = $1 WHERE discord_id = $2",
      [nuevoPM, targetUser.id]
    );

    await query(
      "INSERT INTO transacciones (usuario_id, tipo, cantidad, descripcion) VALUES ($1, 'staff_pm', $2, $3)",
      [usuario.id, cantidad, `[Staff] PM ajustados por ${interaction.user.tag}`]
    );

    const accion = cantidad >= 0 ? `recibió **${cantidad} PM**` : `perdió **${Math.abs(cantidad)} PM**`;

    await interaction.reply({
      embeds: [
        embedExito(
          "PM ajustados",
          `**${usuario.nombre_personaje}** (${targetUser.tag}) ${accion}.\n` +
          `PM anterior: **${usuario.pm}** → PM nuevo: **${nuevoPM}**`
        ),
      ],
    });
  },
};

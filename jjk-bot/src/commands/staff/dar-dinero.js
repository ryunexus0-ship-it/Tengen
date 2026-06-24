const { SlashCommandBuilder } = require("discord.js");
const { query } = require("../../database/db");
const { embedExito, embedError } = require("../../utils/embeds");
const { esStaff } = require("../../utils/roleManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dar-dinero")
    .setDescription("[STAFF] Da monedas a un usuario.")
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Usuario que recibirá las monedas").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("cantidad")
        .setDescription("Cantidad de monedas a dar (positivo o negativo para quitar)")
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
      "SELECT id, nombre_personaje, dinero FROM usuarios WHERE discord_id = $1",
      [targetUser.id]
    );

    if (!rows.length) {
      return interaction.reply({
        embeds: [embedError(`El usuario ${targetUser.tag} no tiene personaje registrado.`)],
        ephemeral: true,
      });
    }

    const usuario      = rows[0];
    const nuevoSaldo   = Math.max(0, usuario.dinero + cantidad);

    await query(
      "UPDATE usuarios SET dinero = $1 WHERE discord_id = $2",
      [nuevoSaldo, targetUser.id]
    );

    await query(
      "INSERT INTO transacciones (usuario_id, tipo, cantidad, descripcion) VALUES ($1, 'staff_dinero', $2, $3)",
      [usuario.id, cantidad, `[Staff] Dinero ajustado por ${interaction.user.tag}`]
    );

    const accion = cantidad >= 0 ? `recibió **${cantidad}** monedas` : `perdió **${Math.abs(cantidad)}** monedas`;

    await interaction.reply({
      embeds: [
        embedExito(
          "Monedas ajustadas",
          `**${usuario.nombre_personaje}** (${targetUser.tag}) ${accion}.\n` +
          `Saldo anterior: **${usuario.dinero}** → Saldo nuevo: **${nuevoSaldo}**`
        ),
      ],
    });
  },
};

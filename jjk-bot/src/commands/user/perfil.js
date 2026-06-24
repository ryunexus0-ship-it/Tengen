const { SlashCommandBuilder } = require("discord.js");
const { query } = require("../../database/db");
const { embedPerfil, embedError } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("perfil")
    .setDescription("Muestra la ficha completa de un personaje.")
    .addUserOption((opt) =>
      opt
        .setName("usuario")
        .setDescription("Usuario cuyo perfil quieres ver (omite para ver el tuyo)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const target     = interaction.options.getUser("usuario") ?? interaction.user;
    const discordId  = target.id;

    // Obtener usuario + técnica en un solo JOIN
    const { rows } = await query(
      `SELECT u.*, t.nombre AS tecnica_nombre, t.rareza AS tecnica_rareza,
              t.descripcion AS tecnica_descripcion
       FROM usuarios u
       LEFT JOIN tecnicas t ON u.tecnica_id = t.id
       WHERE u.discord_id = $1`,
      [discordId]
    );

    if (!rows.length) {
      const mensaje =
        target.id === interaction.user.id
          ? "No tienes un personaje registrado. Usa `/registro` para comenzar."
          : "Ese usuario no tiene un personaje registrado.";
      return interaction.reply({ embeds: [embedError(mensaje)], ephemeral: true });
    }

    const usuario = rows[0];
    const tecnica = usuario.tecnica_id
      ? {
          nombre:      usuario.tecnica_nombre,
          rareza:      usuario.tecnica_rareza,
          descripcion: usuario.tecnica_descripcion,
        }
      : null;

    // Obtener el miembro para el avatar
    const member = await interaction.guild.members.fetch(discordId).catch(() => null);
    const avatarUrl = member?.displayAvatarURL({ size: 128 }) ?? target.displayAvatarURL({ size: 128 });

    await interaction.reply({
      embeds: [embedPerfil(usuario, tecnica, target.tag, avatarUrl)],
    });
  },
};

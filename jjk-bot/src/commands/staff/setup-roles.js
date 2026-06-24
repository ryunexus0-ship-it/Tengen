const { SlashCommandBuilder } = require("discord.js");
const { embedExito, embedError, COLORS } = require("../../utils/embeds");
const { esStaff, setupTodosLosRoles } = require("../../utils/roleManager");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-roles")
    .setDescription("[STAFF] Crea todos los roles necesarios para el servidor JJK Rol."),

  async execute(interaction) {
    if (!esStaff(interaction.member)) {
      return interaction.reply({
        embeds: [embedError("No tienes permisos. Se requiere el rol **Staff**.")],
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const resumen = await setupTodosLosRoles(interaction.guild);

      const embed = new EmbedBuilder()
        .setColor(COLORS.exito)
        .setTitle("✅ Setup de Roles Completado")
        .setDescription("Se procesaron todos los roles del servidor JJK Rol.")
        .addFields(
          {
            name: `🆕 Roles creados (${resumen.creados.length})`,
            value: resumen.creados.length
              ? resumen.creados.map((r) => `• ${r}`).join("\n").slice(0, 1024)
              : "_Ninguno nuevo_",
            inline: false,
          },
          {
            name: `✔️ Roles ya existentes (${resumen.existentes.length})`,
            value: resumen.existentes.length
              ? resumen.existentes.map((r) => `• ${r}`).join("\n").slice(0, 1024)
              : "_Ninguno_",
            inline: false,
          }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("[setup-roles] Error:", err);
      await interaction.editReply({
        embeds: [embedError(`Hubo un error al crear los roles: ${err.message}`)],
      });
    }
  },
};

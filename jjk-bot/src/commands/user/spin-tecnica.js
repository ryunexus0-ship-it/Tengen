const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { query } = require("../../database/db");
const { spinTecnica } = require("../../utils/spinSystem");
const { asignarRolTecnica } = require("../../utils/roleManager");
const { embedSpin, embedError } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spin-tecnica")
    .setDescription("Spinea tu técnica maldita. Puedes usar Rerolls para volver a tirar."),

  async execute(interaction) {
    const discordId = interaction.user.id;

    const { rows } = await query(
      `SELECT u.tecnica_id, u.rerolls, t.nombre AS tecnica_nombre
       FROM usuarios u
       LEFT JOIN tecnicas t ON u.tecnica_id = t.id
       WHERE u.discord_id = $1`,
      [discordId]
    );

    if (!rows.length) {
      return interaction.reply({
        embeds: [embedError("No tienes un personaje registrado. Usa `/registro` primero.")],
        ephemeral: true,
      });
    }

    const { tecnica_id, rerolls, tecnica_nombre } = rows[0];

    // Spin inicial gratuito
    if (!tecnica_id) {
      const resultado = await spinTecnica(discordId, false);
      if (!resultado.ok) {
        return interaction.reply({ embeds: [embedError(resultado.error)], ephemeral: true });
      }

      const member = await interaction.guild.members.fetch(discordId).catch(() => null);
      if (member) await asignarRolTecnica(member, resultado.tecnica).catch(() => {});

      return interaction.reply({
        embeds: [
          embedSpin(
            "tecnica",
            resultado.tecnica.nombre,
            resultado.tecnica.rareza,
            resultado.tecnica.descripcion,
            false
          ),
        ],
      });
    }

    // Ya tiene técnica → verificar rerolls
    if (rerolls < 1) {
      return interaction.reply({
        embeds: [embedError(`Ya tienes la técnica **${tecnica_nombre}** y no te quedan Rerolls.`)],
        ephemeral: true,
      });
    }

    const fila = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirmar_reroll_tecnica")
        .setLabel(`Gastar 1 RR (tienes ${rerolls})`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancelar_reroll_tecnica")
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Secondary)
    );

    const respuesta = await interaction.reply({
      content: `Tu técnica actual es **${tecnica_nombre}**. ¿Quieres gastar **1 Reroll** para volver a tirar?`,
      components: [fila],
      ephemeral: true,
    });

    const collector = respuesta.createMessageComponentCollector({
      filter: (i) => i.user.id === discordId,
      time: 30_000,
      max: 1,
    });

    collector.on("collect", async (btnInteraction) => {
      if (btnInteraction.customId === "cancelar_reroll_tecnica") {
        return btnInteraction.update({ content: "Reroll cancelado.", components: [], embeds: [] });
      }

      const resultado = await spinTecnica(discordId, true);
      if (!resultado.ok) {
        return btnInteraction.update({
          content: "",
          embeds: [embedError(resultado.error)],
          components: [],
        });
      }

      const member = await interaction.guild.members.fetch(discordId).catch(() => null);
      if (member) await asignarRolTecnica(member, resultado.tecnica).catch(() => {});

      await btnInteraction.update({
        content: "",
        embeds: [
          embedSpin(
            "tecnica",
            resultado.tecnica.nombre,
            resultado.tecnica.rareza,
            resultado.tecnica.descripcion,
            true
          ),
        ],
        components: [],
      });
    });

    collector.on("end", async (_, reason) => {
      if (reason === "time") {
        await interaction.editReply({ content: "Tiempo agotado. Reroll cancelado.", components: [] }).catch(() => {});
      }
    });
  },
};

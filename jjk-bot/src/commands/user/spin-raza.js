const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { query } = require("../../database/db");
const { spinRaza } = require("../../utils/spinSystem");
const { asignarRolRaza } = require("../../utils/roleManager");
const { embedSpin, embedError, RAZA_EMOJI } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spin-raza")
    .setDescription("Spinea tu raza. Puedes usar Rerolls para volver a tirar."),

  async execute(interaction) {
    const discordId = interaction.user.id;

    // Verificar registro
    const { rows } = await query(
      "SELECT raza, rerolls FROM usuarios WHERE discord_id = $1",
      [discordId]
    );

    if (!rows.length) {
      return interaction.reply({
        embeds: [embedError("No tienes un personaje registrado. Usa `/registro` primero.")],
        ephemeral: true,
      });
    }

    const { raza: razaActual, rerolls } = rows[0];

    // Si no tiene raza, tirar gratis
    if (!razaActual) {
      const resultado = await spinRaza(discordId, false);
      if (!resultado.ok) {
        return interaction.reply({ embeds: [embedError(resultado.error)], ephemeral: true });
      }

      // Asignar rol en Discord
      const member = await interaction.guild.members.fetch(discordId).catch(() => null);
      if (member) await asignarRolRaza(member, resultado.raza).catch(() => {});

      const desc = `Tu raza ha sido determinada por el destino del jujutsu.`;
      return interaction.reply({
        embeds: [embedSpin("raza", `${RAZA_EMOJI[resultado.raza] ?? ""} ${resultado.raza}`, null, desc, false)],
      });
    }

    // Ya tiene raza → ofrecer reroll si tiene RRs
    if (rerolls < 1) {
      return interaction.reply({
        embeds: [embedError(`Ya tienes la raza **${razaActual}** y no te quedan Rerolls.`)],
        ephemeral: true,
      });
    }

    // Mostrar botón de confirmación para gastar 1 RR
    const fila = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirmar_reroll_raza")
        .setLabel(`Gastar 1 RR (tienes ${rerolls})`)
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("cancelar_reroll_raza")
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Secondary)
    );

    const respuesta = await interaction.reply({
      content: `Tu raza actual es **${razaActual}**. ¿Quieres gastar **1 Reroll** para volver a tirar?`,
      components: [fila],
      ephemeral: true,
    });

    // Esperar respuesta del botón
    const collector = respuesta.createMessageComponentCollector({
      filter: (i) => i.user.id === discordId,
      time: 30_000,
      max: 1,
    });

    collector.on("collect", async (btnInteraction) => {
      if (btnInteraction.customId === "cancelar_reroll_raza") {
        return btnInteraction.update({
          content: "Reroll cancelado.",
          components: [],
          embeds: [],
        });
      }

      // Hacer el reroll
      const resultado = await spinRaza(discordId, true);
      if (!resultado.ok) {
        return btnInteraction.update({
          content: "",
          embeds: [embedError(resultado.error)],
          components: [],
        });
      }

      const member = await interaction.guild.members.fetch(discordId).catch(() => null);
      if (member) await asignarRolRaza(member, resultado.raza).catch(() => {});

      const desc = `Reemplazaste **${razaActual}** por tu nueva raza.`;
      await btnInteraction.update({
        content: "",
        embeds: [embedSpin("raza", `${RAZA_EMOJI[resultado.raza] ?? ""} ${resultado.raza}`, null, desc, true)],
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

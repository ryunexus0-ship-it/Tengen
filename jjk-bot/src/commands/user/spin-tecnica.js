const { SlashCommandBuilder } = require("discord.js");
const { query } = require("../../database/db");
const { spinTecnica } = require("../../utils/spinSystem");
const { asignarRolTecnica } = require("../../utils/roleManager");
const { embedSpin, embedError } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spin-tecnica")
    .setDescription("Spinea tu técnica maldita. Usa reroll:true para gastar 1 Reroll y volver a tirar.")
    .addBooleanOption((opt) =>
      opt
        .setName("reroll")
        .setDescription("¿Gastar 1 Reroll para volver a tirar? (solo si ya tienes técnica)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const discordId  = interaction.user.id;
    const usarReroll = interaction.options?.getBoolean("reroll") ?? false;

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

    // ── Spin inicial gratuito ───────────────────────────────────────────────
    if (!tecnica_id) {
      const resultado = await spinTecnica(discordId, false);
      if (!resultado.ok) {
        return interaction.reply({ embeds: [embedError(resultado.error)], ephemeral: true });
      }

      const member = await interaction.guild?.members.fetch(discordId).catch(() => null);
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

    // ── Ya tiene técnica ────────────────────────────────────────────────────
    if (!usarReroll) {
      return interaction.reply({
        embeds: [
          embedError(
            `Ya tienes la técnica **${tecnica_nombre}**.\n\nPara rerollear, usa:\n\`/spin-tecnica reroll:True\`  o  \`+spin-tecnica reroll\``
          ),
        ],
        ephemeral: true,
      });
    }

    if (rerolls < 1) {
      return interaction.reply({
        embeds: [embedError("No te quedan **Rerolls**. Puedes comprar más en la tienda.")],
        ephemeral: true,
      });
    }

    // ── Ejecutar reroll ─────────────────────────────────────────────────────
    const resultado = await spinTecnica(discordId, true);
    if (!resultado.ok) {
      return interaction.reply({ embeds: [embedError(resultado.error)], ephemeral: true });
    }

    const member = await interaction.guild?.members.fetch(discordId).catch(() => null);
    if (member) await asignarRolTecnica(member, resultado.tecnica).catch(() => {});

    return interaction.reply({
      embeds: [
        embedSpin(
          "tecnica",
          resultado.tecnica.nombre,
          resultado.tecnica.rareza,
          resultado.tecnica.descripcion,
          true
        ),
      ],
    });
  },
};

const { SlashCommandBuilder } = require("discord.js");
const { query } = require("../../database/db");
const { spinRaza } = require("../../utils/spinSystem");
const { asignarRolRaza } = require("../../utils/roleManager");
const { embedSpin, embedError, RAZA_EMOJI } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("spin-raza")
    .setDescription("Spinea tu raza. Usa reroll:true para gastar 1 Reroll y volver a tirar.")
    .addBooleanOption((opt) =>
      opt
        .setName("reroll")
        .setDescription("¿Gastar 1 Reroll para volver a tirar? (solo si ya tienes raza)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const discordId  = interaction.user.id;
    const usarReroll = interaction.options?.getBoolean("reroll") ?? false;

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

    // ── Spin inicial gratuito ───────────────────────────────────────────────
    if (!razaActual) {
      const resultado = await spinRaza(discordId, false);
      if (!resultado.ok) {
        return interaction.reply({ embeds: [embedError(resultado.error)], ephemeral: true });
      }

      const member = await interaction.guild?.members.fetch(discordId).catch(() => null);
      if (member) await asignarRolRaza(member, resultado.raza).catch(() => {});

      return interaction.reply({
        embeds: [
          embedSpin(
            "raza",
            `${RAZA_EMOJI[resultado.raza] ?? ""} ${resultado.raza}`,
            null,
            "Tu raza ha sido determinada por el destino del jujutsu.",
            false
          ),
        ],
      });
    }

    // ── Ya tiene raza ───────────────────────────────────────────────────────
    if (!usarReroll) {
      return interaction.reply({
        embeds: [
          embedError(
            `Ya tienes la raza **${razaActual}**.\n\nPara rerollear, usa:\n\`/spin-raza reroll:True\`  o  \`+spin-raza reroll\``
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
    const resultado = await spinRaza(discordId, true);
    if (!resultado.ok) {
      return interaction.reply({ embeds: [embedError(resultado.error)], ephemeral: true });
    }

    const member = await interaction.guild?.members.fetch(discordId).catch(() => null);
    if (member) await asignarRolRaza(member, resultado.raza).catch(() => {});

    return interaction.reply({
      embeds: [
        embedSpin(
          "raza",
          `${RAZA_EMOJI[resultado.raza] ?? ""} ${resultado.raza}`,
          null,
          `Reemplazaste **${razaActual}** por tu nueva raza.`,
          true
        ),
      ],
    });
  },
};

const { SlashCommandBuilder } = require("discord.js");
const { query } = require("../../database/db");
const { embedExito, embedError } = require("../../utils/embeds");

// Columna en BD → nombre visible → incremento
const STATS = {
  fuerza:          { label: "Fuerza",          col: "fuerza",          inc: 5  },
  velocidad:       { label: "Velocidad",        col: "velocidad",       inc: 5  },
  resistencia:     { label: "Resistencia",      col: "resistencia",     inc: 5  },
  energia_maldita: { label: "Energía Maldita",  col: "energia_maldita", inc: 50 },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("usar-skillpoint")
    .setDescription("Gasta 1 Skill Point para mejorar un stat de tu personaje.")
    .addStringOption((opt) =>
      opt
        .setName("stat")
        .setDescription("Stat que quieres mejorar")
        .setRequired(true)
        .addChoices(
          { name: "Fuerza (+5)",           value: "fuerza"          },
          { name: "Velocidad (+5)",         value: "velocidad"       },
          { name: "Resistencia (+5)",       value: "resistencia"     },
          { name: "Energía Maldita (+50)",  value: "energia_maldita" }
        )
    ),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const statKey   = interaction.options.getString("stat");
    const statInfo  = STATS[statKey];

    if (!statInfo) {
      return interaction.reply({
        embeds: [embedError("Stat no válido.")],
        ephemeral: true,
      });
    }

    const { rows } = await query(
      "SELECT id, skill_points, fuerza, velocidad, resistencia, energia_maldita FROM usuarios WHERE discord_id = $1",
      [discordId]
    );

    if (!rows.length) {
      return interaction.reply({
        embeds: [embedError("No tienes un personaje registrado. Usa `/registro` primero.")],
        ephemeral: true,
      });
    }

    const usuario = rows[0];

    if (usuario.skill_points < 1) {
      return interaction.reply({
        embeds: [embedError("No tienes Skill Points disponibles.")],
        ephemeral: true,
      });
    }

    const valorActual = usuario[statInfo.col];
    const nuevoValor  = valorActual + statInfo.inc;

    await query(
      `UPDATE usuarios SET skill_points = skill_points - 1, ${statInfo.col} = $1 WHERE discord_id = $2`,
      [nuevoValor, discordId]
    );

    await query(
      "INSERT INTO transacciones (usuario_id, tipo, descripcion) VALUES ($1, 'uso_skillpoint', $2)",
      [usuario.id, `Skill Point usado en ${statInfo.label}: ${valorActual} → ${nuevoValor}`]
    );

    await interaction.reply({
      embeds: [
        embedExito(
          "Stat mejorado",
          `**${statInfo.label}** subió de **${valorActual}** a **${nuevoValor}** (+${statInfo.inc}).\n` +
          `Skill Points restantes: **${usuario.skill_points - 1}**`
        ),
      ],
    });
  },
};

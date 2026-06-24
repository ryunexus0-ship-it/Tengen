const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { query } = require("../../database/db");
const { embedExito, embedError } = require("../../utils/embeds");
const { esStaff } = require("../../utils/roleManager");

const COLUMNAS_VALIDAS = ["fuerza", "velocidad", "resistencia", "energia_maldita"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ajustar-stats")
    .setDescription("[STAFF] Ajusta directamente un stat de un usuario.")
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Usuario a modificar").setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("stat")
        .setDescription("Stat a modificar")
        .setRequired(true)
        .addChoices(
          { name: "Fuerza",          value: "fuerza"          },
          { name: "Velocidad",       value: "velocidad"       },
          { name: "Resistencia",     value: "resistencia"     },
          { name: "Energía Maldita", value: "energia_maldita" }
        )
    )
    .addIntegerOption((opt) =>
      opt
        .setName("valor")
        .setDescription("Nuevo valor para el stat")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(99999)
    ),

  async execute(interaction) {
    if (!esStaff(interaction.member)) {
      return interaction.reply({
        embeds: [embedError("No tienes permisos para usar este comando. Se requiere el rol **Staff**.")],
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("usuario");
    const stat       = interaction.options.getString("stat");
    const valor      = interaction.options.getInteger("valor");

    if (!COLUMNAS_VALIDAS.includes(stat)) {
      return interaction.reply({ embeds: [embedError("Stat no válido.")], ephemeral: true });
    }

    const { rows } = await query(
      `SELECT id, nombre_personaje, ${stat} FROM usuarios WHERE discord_id = $1`,
      [targetUser.id]
    );

    if (!rows.length) {
      return interaction.reply({
        embeds: [embedError(`El usuario ${targetUser.tag} no tiene personaje registrado.`)],
        ephemeral: true,
      });
    }

    const valorAnterior = rows[0][stat];

    await query(
      `UPDATE usuarios SET ${stat} = $1 WHERE discord_id = $2`,
      [valor, targetUser.id]
    );

    await query(
      "INSERT INTO transacciones (usuario_id, tipo, descripcion) VALUES ($1, 'ajuste_staff', $2)",
      [rows[0].id, `[Staff] ${stat}: ${valorAnterior} → ${valor} (por ${interaction.user.tag})`]
    );

    const nombres = {
      fuerza: "Fuerza", velocidad: "Velocidad",
      resistencia: "Resistencia", energia_maldita: "Energía Maldita",
    };

    await interaction.reply({
      embeds: [
        embedExito(
          "Stat ajustado",
          `**${nombres[stat]}** de **${rows[0].nombre_personaje}** (${targetUser.tag}) ` +
          `fue ajustado de **${valorAnterior}** a **${valor}**.`
        ),
      ],
    });
  },
};

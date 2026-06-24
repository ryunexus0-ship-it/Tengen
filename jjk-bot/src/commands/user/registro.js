const { SlashCommandBuilder } = require("discord.js");
const { query } = require("../../database/db");
const { embedRegistro, embedError } = require("../../utils/embeds");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("registro")
    .setDescription("Registra tu personaje en el mundo del jujutsu.")
    .addStringOption((opt) =>
      opt
        .setName("nombre")
        .setDescription("Nombre de tu personaje")
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(50)
    ),

  async execute(interaction) {
    const discordId     = interaction.user.id;
    const nombrePersonaje = interaction.options.getString("nombre").trim();

    // Verificar si ya está registrado
    const { rows } = await query(
      "SELECT id FROM usuarios WHERE discord_id = $1",
      [discordId]
    );

    if (rows.length > 0) {
      return interaction.reply({
        embeds: [embedError("Ya tienes un personaje registrado. Usa `/perfil` o `+perfil` para verlo.")],
        ephemeral: true,
      });
    }

    // Crear usuario — raza/técnica NULL, stats en 0, 6 rerolls
    await query(
      `INSERT INTO usuarios
        (discord_id, nombre_personaje, raza, tecnica_id, rango, nivel, xp, dinero, pm,
         skill_points, rerolls, fuerza, velocidad, resistencia, energia_maldita)
       VALUES ($1, $2, NULL, NULL, 'Grade 4', 1, 0, 500, 0, 0, 6, 0, 0, 0, 0)`,
      [discordId, nombrePersonaje]
    );

    await interaction.reply({
      embeds: [embedRegistro(nombrePersonaje, interaction.user.tag)],
    });
  },
};

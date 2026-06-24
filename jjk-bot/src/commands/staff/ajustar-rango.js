const { SlashCommandBuilder } = require("discord.js");
const { query } = require("../../database/db");
const { embedExito, embedError } = require("../../utils/embeds");
const { esStaff, asignarRolRango, RANGOS } = require("../../utils/roleManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ajustar-rango")
    .setDescription("[STAFF] Cambia el rango de un usuario.")
    .addUserOption((opt) =>
      opt.setName("usuario").setDescription("Usuario a modificar").setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("rango")
        .setDescription("Nuevo rango")
        .setRequired(true)
        .addChoices(
          { name: "Grade 4",          value: "Grade 4"          },
          { name: "Grade 3",          value: "Grade 3"          },
          { name: "Grade 2",          value: "Grade 2"          },
          { name: "Grade 1",          value: "Grade 1"          },
          { name: "Semi-Special Grade", value: "Semi-Special Grade" },
          { name: "Special Grade",    value: "Special Grade"    }
        )
    ),

  async execute(interaction) {
    if (!esStaff(interaction.member)) {
      return interaction.reply({
        embeds: [embedError("No tienes permisos. Se requiere el rol **Staff**.")],
        ephemeral: true,
      });
    }

    const targetUser = interaction.options.getUser("usuario");
    const nuevoRango = interaction.options.getString("rango");

    const { rows } = await query(
      "SELECT id, nombre_personaje, rango FROM usuarios WHERE discord_id = $1",
      [targetUser.id]
    );

    if (!rows.length) {
      return interaction.reply({
        embeds: [embedError(`El usuario ${targetUser.tag} no tiene personaje registrado.`)],
        ephemeral: true,
      });
    }

    const rangoAnterior = rows[0].rango;

    await query(
      "UPDATE usuarios SET rango = $1 WHERE discord_id = $2",
      [nuevoRango, targetUser.id]
    );

    await query(
      "INSERT INTO transacciones (usuario_id, tipo, descripcion) VALUES ($1, 'ajuste_rango', $2)",
      [rows[0].id, `[Staff] Rango: ${rangoAnterior} → ${nuevoRango} (por ${interaction.user.tag})`]
    );

    // Actualizar rol de Discord
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (member) await asignarRolRango(member, nuevoRango).catch(() => {});

    await interaction.reply({
      embeds: [
        embedExito(
          "Rango actualizado",
          `**${rows[0].nombre_personaje}** (${targetUser.tag}) ` +
          `ahora es **${nuevoRango}** (antes: ${rangoAnterior}).`
        ),
      ],
    });
  },
};

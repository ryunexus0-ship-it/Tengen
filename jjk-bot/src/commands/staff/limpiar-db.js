const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { query } = require("../../database/db");
const { embedExito, embedError, COLORS } = require("../../utils/embeds");
const { esStaff } = require("../../utils/roleManager");

const OPCIONES_LIMPIEZA = {
  usuarios:      { label: "Usuarios",      desc: "Borra todos los personajes registrados." },
  tecnicas:      { label: "Técnicas",      desc: "Borra todas las técnicas (y sus referencias en usuarios)." },
  items:         { label: "Ítems",         desc: "Borra todos los ítems de tienda e inventarios." },
  transacciones: { label: "Transacciones", desc: "Borra el historial de transacciones." },
  todo:          { label: "TODO",          desc: "Limpia absolutamente toda la base de datos." },
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("limpiar-db")
    .setDescription("[STAFF] Limpia tablas de la base de datos.")
    .addStringOption((opt) =>
      opt
        .setName("tabla")
        .setDescription("Qué tabla limpiar")
        .setRequired(true)
        .addChoices(
          { name: "Usuarios",      value: "usuarios"      },
          { name: "Técnicas",      value: "tecnicas"      },
          { name: "Ítems",         value: "items"         },
          { name: "Transacciones", value: "transacciones" },
          { name: "⚠️ TODO",       value: "todo"          }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName("confirmar")
        .setDescription('Escribe "CONFIRMAR" para ejecutar la limpieza (irreversible)')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!esStaff(interaction.member)) {
      return interaction.reply({
        embeds: [embedError("No tienes permisos para usar este comando. Se requiere el rol **Staff**.")],
        ephemeral: true,
      });
    }

    const tabla      = interaction.options.getString("tabla");
    const confirmar  = interaction.options.getString("confirmar")?.trim() ?? "";
    const opcion     = OPCIONES_LIMPIEZA[tabla];

    // ── Tabla inválida (puede pasar por prefijo) ────────────────────────────
    if (!opcion) {
      return interaction.reply({
        embeds: [embedError(
          "Tabla no válida. Opciones: `usuarios`, `tecnicas`, `items`, `transacciones`, `todo`."
        )],
        ephemeral: true,
      });
    }

    // ── Verificar confirmación ──────────────────────────────────────────────
    if (confirmar !== "CONFIRMAR") {
      const embed = new EmbedBuilder()
        .setColor(COLORS.advertencia)
        .setTitle("⚠️ Acción cancelada")
        .setDescription(
          [
            `Para limpiar **${opcion.label}** debes escribir exactamente \`CONFIRMAR\`.`,
            "",
            `› Tabla:   **${opcion.label}**`,
            `› Efecto:  ${opcion.desc}`,
            "",
            "Esta acción **no se puede deshacer**.",
          ].join("\n")
        )
        .setFooter({ text: "Tengen" })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ── Ejecutar limpieza ───────────────────────────────────────────────────
    try {
      if (tabla === "todo") {
        await query("TRUNCATE TABLE transacciones, inventario, usuarios, items, tecnicas RESTART IDENTITY CASCADE");
      } else if (tabla === "usuarios") {
        await query("TRUNCATE TABLE transacciones, inventario, usuarios RESTART IDENTITY CASCADE");
      } else if (tabla === "items") {
        await query("TRUNCATE TABLE inventario, items RESTART IDENTITY CASCADE");
      } else if (tabla === "tecnicas") {
        await query("UPDATE usuarios SET tecnica_id = NULL");
        await query("TRUNCATE TABLE tecnicas RESTART IDENTITY CASCADE");
      } else if (tabla === "transacciones") {
        await query("TRUNCATE TABLE transacciones RESTART IDENTITY CASCADE");
      }

      await interaction.reply({
        embeds: [
          embedExito(
            "Base de datos limpiada",
            [
              `› Tabla(s): **${opcion.label}**`,
              `› ${opcion.desc}`,
              `› Ejecutado por: ${interaction.user.tag}`,
            ].join("\n")
          ),
        ],
        ephemeral: true,
      });

    } catch (err) {
      console.error("[limpiar-db]", err);
      await interaction.reply({
        embeds: [embedError(`Error al limpiar la tabla: \`${err.message}\``)],
        ephemeral: true,
      });
    }
  },
};

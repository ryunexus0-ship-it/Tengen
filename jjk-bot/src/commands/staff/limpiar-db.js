const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { query } = require("../../database/db");
const { embedExito, embedError, COLORS } = require("../../utils/embeds");
const { esStaff } = require("../../utils/roleManager");
const { EmbedBuilder } = require("discord.js");

const OPCIONES_LIMPIEZA = {
  usuarios:       { label: "Usuarios",       desc: "Borra todos los personajes registrados." },
  tecnicas:       { label: "Técnicas",       desc: "Borra todas las técnicas (y sus referencias)." },
  items:          { label: "Ítems",          desc: "Borra todos los ítems de tienda e inventarios." },
  transacciones:  { label: "Transacciones",  desc: "Borra el historial de transacciones." },
  todo:           { label: "TODO",           desc: "Limpia absolutamente toda la base de datos." },
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
    ),

  async execute(interaction) {
    if (!esStaff(interaction.member)) {
      return interaction.reply({
        embeds: [embedError("No tienes permisos para usar este comando. Se requiere el rol **Staff**.")],
        ephemeral: true,
      });
    }

    const tabla  = interaction.options.getString("tabla");
    const opcion = OPCIONES_LIMPIEZA[tabla];

    // ── Pedir confirmación con botones ──────────────────────────────────────
    const embedConfirm = new EmbedBuilder()
      .setColor(COLORS.advertencia)
      .setTitle("⚠️ Confirmación requerida")
      .setDescription(
        [
          `Estás a punto de limpiar: **${opcion.label}**`,
          `› ${opcion.desc}`,
          "",
          "**Esta acción es irreversible.**",
          "¿Confirmas?",
        ].join("\n")
      )
      .setFooter({ text: "Tengen · Esta acción no se puede deshacer" })
      .setTimestamp();

    const fila = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("limpiar_confirmar")
        .setLabel("Confirmar")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("limpiar_cancelar")
        .setLabel("Cancelar")
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({ embeds: [embedConfirm], components: [fila], ephemeral: true });

    // ── Esperar respuesta (30s) ─────────────────────────────────────────────
    const filter = (i) => i.user.id === interaction.user.id;
    let btnInteraction;

    try {
      btnInteraction = await interaction.channel.awaitMessageComponent({ filter, time: 30_000 });
    } catch {
      return interaction.editReply({
        embeds: [embedError("Tiempo agotado. La operación fue cancelada.")],
        components: [],
      });
    }

    if (btnInteraction.customId === "limpiar_cancelar") {
      return btnInteraction.update({
        embeds: [embedError("Operación cancelada.")],
        components: [],
      });
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
        // Desvincula técnicas de usuarios antes de borrar
        await query("UPDATE usuarios SET tecnica_id = NULL");
        await query("TRUNCATE TABLE tecnicas RESTART IDENTITY CASCADE");
      } else if (tabla === "transacciones") {
        await query("TRUNCATE TABLE transacciones RESTART IDENTITY CASCADE");
      }

      await btnInteraction.update({
        embeds: [
          embedExito(
            "Base de datos limpiada",
            `› Tabla(s) **${opcion.label}** limpiada(s) correctamente.\n› Ejecutado por: ${interaction.user.tag}`
          ),
        ],
        components: [],
      });
    } catch (err) {
      console.error("[limpiar-db]", err);
      await btnInteraction.update({
        embeds: [embedError(`Error al limpiar: ${err.message}`)],
        components: [],
      });
    }
  },
};

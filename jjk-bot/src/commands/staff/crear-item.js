const { SlashCommandBuilder } = require("discord.js");
const { query } = require("../../database/db");
const { embedExito, embedError, COLORS } = require("../../utils/embeds");
const { esStaff } = require("../../utils/roleManager");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("crear-item")
    .setDescription("[STAFF] Crea un nuevo ítem en la tienda.")
    .addStringOption((opt) =>
      opt
        .setName("nombre")
        .setDescription("Nombre del ítem")
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(100)
    )
    .addStringOption((opt) =>
      opt
        .setName("tienda")
        .setDescription("En qué tienda aparece")
        .setRequired(true)
        .addChoices(
          { name: "Tienda Normal (monedas)", value: "dinero" },
          { name: "Tienda PM",              value: "pm"     }
        )
    )
    .addIntegerOption((opt) =>
      opt
        .setName("precio")
        .setDescription("Precio del ítem (en la moneda de la tienda elegida)")
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption((opt) =>
      opt
        .setName("tipo")
        .setDescription("Tipo de ítem")
        .setRequired(true)
        .addChoices(
          { name: "Consumible",   value: "consumible"   },
          { name: "Equipamiento", value: "equipamiento" },
          { name: "Cosmético",    value: "cosmetico"    }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName("descripcion")
        .setDescription("Descripción del ítem")
        .setRequired(false)
        .setMaxLength(300)
    )
    .addStringOption((opt) =>
      opt
        .setName("efecto")
        .setDescription("Efecto interno del ítem (ej: reroll:1, tecnica:Black Flash)")
        .setRequired(false)
        .setMaxLength(100)
    ),

  async execute(interaction) {
    if (!esStaff(interaction.member)) {
      return interaction.reply({
        embeds: [embedError("No tienes permisos para usar este comando. Se requiere el rol **Staff**.")],
        ephemeral: true,
      });
    }

    const nombre      = interaction.options.getString("nombre").trim();
    const tienda      = interaction.options.getString("tienda");   // "dinero" | "pm"
    const precio      = interaction.options.getInteger("precio");
    const tipo        = interaction.options.getString("tipo");
    const descripcion = interaction.options.getString("descripcion") ?? null;
    const efecto      = interaction.options.getString("efecto") ?? null;

    const precio_dinero = tienda === "dinero" ? precio : null;
    const precio_pm     = tienda === "pm"     ? precio : null;

    // Verificar duplicado por nombre
    const { rows: existe } = await query(
      "SELECT id FROM items WHERE LOWER(nombre) = LOWER($1)",
      [nombre]
    );

    if (existe.length > 0) {
      return interaction.reply({
        embeds: [embedError(`Ya existe un ítem con el nombre **${nombre}**.\nUsa un nombre diferente.`)],
        ephemeral: true,
      });
    }

    const { rows } = await query(
      `INSERT INTO items (nombre, descripcion, precio_dinero, precio_pm, tipo, efecto)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [nombre, descripcion, precio_dinero, precio_pm, tipo, efecto]
    );

    const tiendaLabel  = tienda === "dinero" ? "Tienda Normal" : "Tienda PM";
    const precioLabel  = tienda === "dinero" ? `${precio} monedas` : `${precio} PM`;

    const embed = new EmbedBuilder()
      .setColor(COLORS.exito)
      .setTitle("✅ Ítem creado")
      .setDescription(
        [
          `› **Nombre:**       ${nombre}`,
          `› **Tienda:**       ${tiendaLabel}`,
          `› **Precio:**       ${precioLabel}`,
          `› **Tipo:**         ${tipo}`,
          `› **Descripción:**  ${descripcion ?? "_Sin descripción_"}`,
          `› **Efecto:**       ${efecto ?? "_Sin efecto_"}`,
          `› **ID en DB:**     ${rows[0].id}`,
        ].join("\n")
      )
      .setFooter({ text: `Tengen · Creado por ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};

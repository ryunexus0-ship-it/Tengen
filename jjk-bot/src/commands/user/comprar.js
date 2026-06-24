const { SlashCommandBuilder } = require("discord.js");
const { query, getClient } = require("../../database/db");
const { embedExito, embedError } = require("../../utils/embeds");
const { asignarRolTecnica } = require("../../utils/roleManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("comprar")
    .setDescription("Compra un ítem de la tienda.")
    .addStringOption((opt) =>
      opt
        .setName("item")
        .setDescription("Nombre exacto del ítem (como aparece en la tienda)")
        .setRequired(true)
        .setMaxLength(100)
    ),

  async execute(interaction) {
    const discordId  = interaction.user.id;
    const nombreItem = interaction.options.getString("item").trim();

    // ── Verificar registro ──────────────────────────────────────────────────
    const { rows: userRows } = await query(
      "SELECT id, dinero, pm, rerolls FROM usuarios WHERE discord_id = $1",
      [discordId]
    );
    if (!userRows.length) {
      return interaction.reply({
        embeds: [embedError("No tienes un personaje registrado. Usa `/registro` primero.")],
        ephemeral: true,
      });
    }

    // ── Buscar ítem (case-insensitive) ──────────────────────────────────────
    const { rows: itemRows } = await query(
      "SELECT * FROM items WHERE LOWER(nombre) = LOWER($1)",
      [nombreItem]
    );
    if (!itemRows.length) {
      return interaction.reply({
        embeds: [embedError(`No se encontró el ítem **${nombreItem}**.\nVerifica el nombre en la tienda.`)],
        ephemeral: true,
      });
    }

    const item    = itemRows[0];
    const usuario = userRows[0];

    // ── Determinar moneda ───────────────────────────────────────────────────
    const esPM     = item.precio_pm !== null;
    const esMoneda = item.precio_dinero !== null;

    if (!esPM && !esMoneda) {
      return interaction.reply({
        embeds: [embedError("Este ítem no está disponible para compra.")],
        ephemeral: true,
      });
    }

    const moneda    = esPM ? "pm" : "dinero";
    const precio    = esPM ? item.precio_pm : item.precio_dinero;
    const saldo     = esPM ? usuario.pm : usuario.dinero;
    const simbolo   = esPM ? "PM" : "monedas";
    const columna   = esPM ? "pm" : "dinero";

    if (saldo < precio) {
      return interaction.reply({
        embeds: [
          embedError(
            [
              `No tienes suficientes **${simbolo}**.`,
              `› Precio:  \`${precio} ${simbolo}\``,
              `› Tu saldo: \`${saldo} ${simbolo}\``,
              `› Faltan:   \`${precio - saldo} ${simbolo}\``,
            ].join("\n")
          ),
        ],
        ephemeral: true,
      });
    }

    // ── Transacción ─────────────────────────────────────────────────────────
    const client = await getClient();
    try {
      await client.query("BEGIN");

      // Re-leer saldo con lock
      const { rows: locked } = await client.query(
        `SELECT id, ${columna} AS saldo FROM usuarios WHERE discord_id = $1 FOR UPDATE`,
        [discordId]
      );
      const saldoActual = locked[0].saldo;
      const usuarioId   = locked[0].id;

      if (saldoActual < precio) {
        await client.query("ROLLBACK");
        return interaction.reply({
          embeds: [embedError(`No tienes suficientes **${simbolo}** (saldo actual: ${saldoActual}).`)],
          ephemeral: true,
        });
      }

      // Descontar
      await client.query(
        `UPDATE usuarios SET ${columna} = ${columna} - $1 WHERE discord_id = $2`,
        [precio, discordId]
      );

      // ── Aplicar efecto del ítem ───────────────────────────────────────────
      let mensajeExtra = "";

      if (item.efecto?.startsWith("reroll:")) {
        const cantidad = parseInt(item.efecto.split(":")[1], 10);
        await client.query(
          "UPDATE usuarios SET rerolls = rerolls + $1 WHERE discord_id = $2",
          [cantidad, discordId]
        );
        mensajeExtra = `› +${cantidad} Reroll(s) añadido(s) a tu cuenta.`;

      } else if (item.efecto?.startsWith("tecnica:")) {
        const nombreTecnica = item.efecto.replace("tecnica:", "").trim();
        const { rows: tecnicas } = await client.query(
          "SELECT * FROM tecnicas WHERE nombre = $1",
          [nombreTecnica]
        );
        if (tecnicas.length) {
          const tecnica = tecnicas[0];
          await client.query(
            "UPDATE usuarios SET tecnica_id = $1 WHERE discord_id = $2",
            [tecnica.id, discordId]
          );
          const member = await interaction.guild?.members.fetch(discordId).catch(() => null);
          if (member) await asignarRolTecnica(member, tecnica).catch(() => {});
          mensajeExtra = `› Técnica **${tecnica.nombre}** (${tecnica.rareza}) asignada a tu personaje.`;
        }

      } else {
        // Añadir al inventario
        await client.query(
          `INSERT INTO inventario (usuario_id, item_id, cantidad)
           VALUES ($1, $2, 1)
           ON CONFLICT (usuario_id, item_id)
           DO UPDATE SET cantidad = inventario.cantidad + 1`,
          [usuarioId, item.id]
        );
        mensajeExtra = `› Ítem añadido a tu inventario.`;
      }

      // Log
      await client.query(
        "INSERT INTO transacciones (usuario_id, tipo, cantidad, descripcion) VALUES ($1, $2, $3, $4)",
        [usuarioId, `compra_${moneda}`, precio, `Compra: ${item.nombre}`]
      );

      await client.query("COMMIT");

      // Saldo nuevo
      const { rows: updated } = await query(
        `SELECT ${columna} AS saldo FROM usuarios WHERE discord_id = $1`,
        [discordId]
      );

      await interaction.reply({
        embeds: [
          embedExito(
            "Compra exitosa",
            [
              `› **Ítem:**    ${item.nombre}`,
              `› **Precio:**  ${precio} ${simbolo}`,
              `› **Saldo:**   ${updated[0].saldo} ${simbolo} restantes`,
              mensajeExtra,
            ].filter(Boolean).join("\n")
          ),
        ],
      });

    } catch (err) {
      await client.query("ROLLBACK");
      console.error("[comprar]", err);
      return interaction.reply({
        embeds: [embedError("Hubo un error al procesar la compra. Intenta de nuevo.")],
        ephemeral: true,
      });
    } finally {
      client.release();
    }
  },
};

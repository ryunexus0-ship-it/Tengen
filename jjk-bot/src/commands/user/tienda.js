const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { query } = require("../../database/db");
const { embedTienda, embedError, embedExito } = require("../../utils/embeds");

const ITEMS_POR_PAGINA = 4;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tienda")
    .setDescription("Muestra la tienda general donde comprar ítems con monedas."),

  async execute(interaction) {
    const discordId = interaction.user.id;

    // Verificar registro
    const { rows: userRows } = await query(
      "SELECT id, dinero, rerolls FROM usuarios WHERE discord_id = $1",
      [discordId]
    );
    if (!userRows.length) {
      return interaction.reply({
        embeds: [embedError("No tienes un personaje registrado. Usa `/registro` primero.")],
        ephemeral: true,
      });
    }

    // Obtener ítems de tienda normal (tienen precio_dinero)
    const { rows: items } = await query(
      "SELECT * FROM items WHERE precio_dinero IS NOT NULL ORDER BY precio_dinero ASC"
    );

    if (!items.length) {
      return interaction.reply({
        embeds: [embedError("La tienda está vacía en este momento.")],
        ephemeral: true,
      });
    }

    let pagina = 0;
    const totalPaginas = Math.ceil(items.length / ITEMS_POR_PAGINA);

    const getEmbed = (p) => {
      const slice = items.slice(p * ITEMS_POR_PAGINA, (p + 1) * ITEMS_POR_PAGINA);
      return embedTienda(slice, p, totalPaginas, "dinero");
    };

    const getComponentes = (p) => {
      const fila = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("tienda_prev")
          .setLabel("◀ Anterior")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === 0),
        new ButtonBuilder()
          .setCustomId("tienda_next")
          .setLabel("Siguiente ▶")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p >= totalPaginas - 1)
      );

      // Botones de compra para los ítems en la página actual
      const slice = items.slice(p * ITEMS_POR_PAGINA, (p + 1) * ITEMS_POR_PAGINA);
      const filaCompra = new ActionRowBuilder().addComponents(
        slice.map((item, idx) =>
          new ButtonBuilder()
            .setCustomId(`comprar_dinero_${item.id}`)
            .setLabel(`Comprar ${idx + 1}`)
            .setStyle(ButtonStyle.Primary)
        )
      );

      return [fila, filaCompra];
    };

    const respuesta = await interaction.reply({
      content: `💴 Tu saldo: **${userRows[0].dinero} monedas**`,
      embeds:     [getEmbed(pagina)],
      components: getComponentes(pagina),
      ephemeral:  true,
    });

    const collector = respuesta.createMessageComponentCollector({
      filter: (i) => i.user.id === discordId,
      time: 120_000,
    });

    collector.on("collect", async (btnInteraction) => {
      const id = btnInteraction.customId;

      if (id === "tienda_prev") {
        pagina = Math.max(0, pagina - 1);
        return btnInteraction.update({
          embeds:     [getEmbed(pagina)],
          components: getComponentes(pagina),
        });
      }

      if (id === "tienda_next") {
        pagina = Math.min(totalPaginas - 1, pagina + 1);
        return btnInteraction.update({
          embeds:     [getEmbed(pagina)],
          components: getComponentes(pagina),
        });
      }

      if (id.startsWith("comprar_dinero_")) {
        const itemId = parseInt(id.replace("comprar_dinero_", ""), 10);
        const item = items.find((i) => i.id === itemId);
        if (!item) return btnInteraction.reply({ content: "Ítem no encontrado.", ephemeral: true });

        // Transacción de compra
        const client = await require("../../database/db").getClient();
        try {
          await client.query("BEGIN");

          const { rows: userActual } = await client.query(
            "SELECT id, dinero, rerolls FROM usuarios WHERE discord_id = $1 FOR UPDATE",
            [discordId]
          );

          if (userActual[0].dinero < item.precio_dinero) {
            await client.query("ROLLBACK");
            return btnInteraction.reply({
              content: `❌ No tienes suficientes monedas. Necesitas **${item.precio_dinero}** y tienes **${userActual[0].dinero}**.`,
              ephemeral: true,
            });
          }

          const usuarioId = userActual[0].id;

          // Descontar monedas
          await client.query(
            "UPDATE usuarios SET dinero = dinero - $1 WHERE discord_id = $2",
            [item.precio_dinero, discordId]
          );

          // Efecto del ítem
          if (item.efecto?.startsWith("reroll:")) {
            const cantidad = parseInt(item.efecto.split(":")[1], 10);
            await client.query(
              "UPDATE usuarios SET rerolls = rerolls + $1 WHERE discord_id = $2",
              [cantidad, discordId]
            );
          } else {
            // Añadir al inventario
            await client.query(
              `INSERT INTO inventario (usuario_id, item_id, cantidad)
               VALUES ($1, $2, 1)
               ON CONFLICT (usuario_id, item_id)
               DO UPDATE SET cantidad = inventario.cantidad + 1`,
              [usuarioId, itemId]
            );
          }

          // Log de transacción
          await client.query(
            "INSERT INTO transacciones (usuario_id, tipo, cantidad, descripcion) VALUES ($1, 'compra_tienda', $2, $3)",
            [usuarioId, item.precio_dinero, `Compra: ${item.nombre}`]
          );

          await client.query("COMMIT");

          // Obtener dinero actualizado
          const { rows: updatedUser } = await require("../../database/db").query(
            "SELECT dinero FROM usuarios WHERE discord_id = $1",
            [discordId]
          );

          return btnInteraction.reply({
            embeds: [embedExito("Compra exitosa", `Compraste **${item.nombre}** por **${item.precio_dinero} monedas**.\nSaldo restante: **${updatedUser[0].dinero} monedas**.`)],
            ephemeral: true,
          });
        } catch (err) {
          await client.query("ROLLBACK");
          console.error("[Tienda] Error en compra:", err);
          return btnInteraction.reply({
            content: "❌ Hubo un error al procesar la compra. Intenta de nuevo.",
            ephemeral: true,
          });
        } finally {
          client.release();
        }
      }
    });

    collector.on("end", async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};

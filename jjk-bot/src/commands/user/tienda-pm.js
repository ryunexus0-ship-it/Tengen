const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { query, getClient } = require("../../database/db");
const { embedTienda, embedError, embedExito } = require("../../utils/embeds");
const { asignarRolTecnica } = require("../../utils/roleManager");

const ITEMS_POR_PAGINA = 4;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tienda-pm")
    .setDescription("Tienda especial donde puedes comprar técnicas con Puntos Malditos (PM)."),

  async execute(interaction) {
    const discordId = interaction.user.id;

    const { rows: userRows } = await query(
      "SELECT id, pm FROM usuarios WHERE discord_id = $1",
      [discordId]
    );
    if (!userRows.length) {
      return interaction.reply({
        embeds: [embedError("No tienes un personaje registrado. Usa `/registro` primero.")],
        ephemeral: true,
      });
    }

    const { rows: items } = await query(
      "SELECT * FROM items WHERE precio_pm IS NOT NULL ORDER BY precio_pm ASC"
    );

    if (!items.length) {
      return interaction.reply({
        embeds: [embedError("La tienda de PM está vacía en este momento.")],
        ephemeral: true,
      });
    }

    let pagina = 0;
    const totalPaginas = Math.ceil(items.length / ITEMS_POR_PAGINA);

    const getEmbed = (p) => {
      const slice = items.slice(p * ITEMS_POR_PAGINA, (p + 1) * ITEMS_POR_PAGINA);
      return embedTienda(slice, p, totalPaginas, "pm");
    };

    const getComponentes = (p) => {
      const fila = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("pmtienda_prev")
          .setLabel("◀ Anterior")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === 0),
        new ButtonBuilder()
          .setCustomId("pmtienda_next")
          .setLabel("Siguiente ▶")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p >= totalPaginas - 1)
      );

      const slice = items.slice(p * ITEMS_POR_PAGINA, (p + 1) * ITEMS_POR_PAGINA);
      const filaCompra = new ActionRowBuilder().addComponents(
        slice.map((item, idx) =>
          new ButtonBuilder()
            .setCustomId(`comprar_pm_${item.id}`)
            .setLabel(`Comprar ${idx + 1}`)
            .setStyle(ButtonStyle.Primary)
        )
      );

      return [fila, filaCompra];
    };

    const respuesta = await interaction.reply({
      content: `🔮 Tus PM: **${userRows[0].pm}**`,
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

      if (id === "pmtienda_prev") {
        pagina = Math.max(0, pagina - 1);
        return btnInteraction.update({
          embeds:     [getEmbed(pagina)],
          components: getComponentes(pagina),
        });
      }

      if (id === "pmtienda_next") {
        pagina = Math.min(totalPaginas - 1, pagina + 1);
        return btnInteraction.update({
          embeds:     [getEmbed(pagina)],
          components: getComponentes(pagina),
        });
      }

      if (id.startsWith("comprar_pm_")) {
        const itemId = parseInt(id.replace("comprar_pm_", ""), 10);
        const item = items.find((i) => i.id === itemId);
        if (!item) return btnInteraction.reply({ content: "Ítem no encontrado.", ephemeral: true });

        const client = await getClient();
        try {
          await client.query("BEGIN");

          const { rows: userActual } = await client.query(
            "SELECT id, pm FROM usuarios WHERE discord_id = $1 FOR UPDATE",
            [discordId]
          );

          if (userActual[0].pm < item.precio_pm) {
            await client.query("ROLLBACK");
            return btnInteraction.reply({
              content: `❌ No tienes suficientes PM. Necesitas **${item.precio_pm}** y tienes **${userActual[0].pm}**.`,
              ephemeral: true,
            });
          }

          const usuarioId = userActual[0].id;

          await client.query(
            "UPDATE usuarios SET pm = pm - $1 WHERE discord_id = $2",
            [item.precio_pm, discordId]
          );

          // Si el efecto es una técnica específica, asignarla
          if (item.efecto?.startsWith("tecnica:")) {
            const nombreTecnica = item.efecto.replace("tecnica:", "");
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

              // Asignar rol en Discord
              const member = await interaction.guild.members.fetch(discordId).catch(() => null);
              if (member) await asignarRolTecnica(member, tecnica).catch(() => {});
            }
          } else {
            await client.query(
              `INSERT INTO inventario (usuario_id, item_id, cantidad)
               VALUES ($1, $2, 1)
               ON CONFLICT (usuario_id, item_id)
               DO UPDATE SET cantidad = inventario.cantidad + 1`,
              [usuarioId, itemId]
            );
          }

          await client.query(
            "INSERT INTO transacciones (usuario_id, tipo, cantidad, descripcion) VALUES ($1, 'compra_pm', $2, $3)",
            [usuarioId, item.precio_pm, `Compra PM: ${item.nombre}`]
          );

          await client.query("COMMIT");

          const { rows: updatedUser } = await query(
            "SELECT pm FROM usuarios WHERE discord_id = $1",
            [discordId]
          );

          return btnInteraction.reply({
            embeds: [embedExito("Compra con PM exitosa", `Compraste **${item.nombre}** por **${item.precio_pm} PM**.\nPM restantes: **${updatedUser[0].pm}**.`)],
            ephemeral: true,
          });
        } catch (err) {
          await client.query("ROLLBACK");
          console.error("[TiendaPM] Error en compra:", err);
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

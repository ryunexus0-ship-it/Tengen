const { EmbedBuilder } = require("discord.js");

// ─── Colores temáticos ──────────────────────────────────────────────────────
const COLORS = {
  principal:   0x1a0a2e,
  Comun:       0x95a5a6,
  Rara:        0x3498db,
  Epica:       0x9b59b6,
  Legendaria:  0xf39c12,
  Mitica:      0xe74c3c,
  exito:       0x2ecc71,
  error:       0xe74c3c,
  advertencia: 0xf39c12,
};

// ─── Emojis de rareza ───────────────────────────────────────────────────────
const RAREZA_EMOJI = {
  Comun:      "⚪",
  Rara:       "🔵",
  Epica:      "🟣",
  Legendaria: "🟡",
  Mitica:     "🔴",
};

const RAZA_EMOJI = {
  Humano:    "🧑",
  Maldicion: "👹",
  Hibrido:   "⚡",
};

/**
 * Embed de perfil completo de un usuario.
 */
function embedPerfil(usuario, tecnica, memberTag, avatarUrl) {
  const rarezaColor = tecnica ? COLORS[tecnica.rareza] ?? COLORS.principal : COLORS.principal;

  const embed = new EmbedBuilder()
    .setColor(rarezaColor)
    .setTitle(`📋 Ficha de ${usuario.nombre_personaje}`)
    .setThumbnail(avatarUrl ?? null)
    .addFields(
      {
        name: "👤 Jugador",
        value: memberTag,
        inline: true,
      },
      {
        name: `${RAZA_EMOJI[usuario.raza] ?? "❓"} Raza`,
        value: usuario.raza ?? "_Sin definir_",
        inline: true,
      },
      {
        name: "🏅 Rango",
        value: usuario.rango,
        inline: true,
      },
      {
        name: `${tecnica ? RAREZA_EMOJI[tecnica.rareza] : "❓"} Técnica Maldita`,
        value: tecnica
          ? `**${tecnica.nombre}**\n*${tecnica.rareza}*\n${tecnica.descripcion}`
          : "_Sin técnica asignada_",
        inline: false,
      },
      {
        name: "📊 Stats",
        value: [
          `⚔️ Fuerza:          **${usuario.fuerza}**`,
          `💨 Velocidad:       **${usuario.velocidad}**`,
          `🛡️ Resistencia:     **${usuario.resistencia}**`,
          `🌀 Energía Maldita: **${usuario.energia_maldita}**`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "💰 Recursos",
        value: [
          `💴 Dinero:       **${usuario.dinero}**`,
          `🔮 PM:           **${usuario.pm}**`,
          `🎯 Skill Points: **${usuario.skill_points}**`,
          `🎲 Rerolls:      **${usuario.rerolls}**`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "📈 Progresión",
        value: [
          `⭐ Nivel: **${usuario.nivel}**`,
          `✨ XP:    **${usuario.xp}**`,
        ].join("\n"),
        inline: true,
      }
    )
    .setFooter({ text: "JJK Rol Bot" })
    .setTimestamp();

  return embed;
}

/**
 * Embed de resultado de spin.
 */
function embedSpin(tipo, resultado, rareza, descripcion, esReroll) {
  const color = rareza ? COLORS[rareza] ?? COLORS.principal : COLORS.principal;
  const emoji = rareza ? RAREZA_EMOJI[rareza] ?? "🎲" : "🎲";
  const tipoLabel = tipo === "raza" ? "Raza" : "Técnica Maldita";

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${esReroll ? "🔄 Re-Spin" : "🎰 Spin"} de ${tipoLabel}`)
    .setDescription(
      `${emoji} **${resultado}**${rareza ? `\n*Rareza: ${rareza}*` : ""}\n\n${descripcion ?? ""}`
    )
    .setFooter({ text: esReroll ? "Gastaste 1 Reroll" : "Spin inicial usado" })
    .setTimestamp();
}

/**
 * Embed de error genérico.
 */
function embedError(mensaje) {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle("❌ Error")
    .setDescription(mensaje)
    .setTimestamp();
}

/**
 * Embed de éxito genérico.
 */
function embedExito(titulo, mensaje) {
  return new EmbedBuilder()
    .setColor(COLORS.exito)
    .setTitle(`✅ ${titulo}`)
    .setDescription(mensaje)
    .setTimestamp();
}

/**
 * Embed de tienda con paginación.
 * @param {Array}  items       - Array de objetos item
 * @param {number} pagina      - Página actual (0-indexed)
 * @param {number} totalPaginas
 * @param {'dinero'|'pm'}  moneda
 */
function embedTienda(items, pagina, totalPaginas, moneda) {
  const esPM = moneda === "pm";
  const simbolo = esPM ? "🔮 PM" : "💴 Monedas";
  const titulo = esPM ? "🏪 Tienda de Puntos Malditos" : "🏪 Tienda General";

  const camposItems = items.map((item) => {
    const precio = esPM ? item.precio_pm : item.precio_dinero;
    return {
      name: `${item.nombre}`,
      value: `${item.descripcion ?? "_Sin descripción_"}\n💰 Precio: **${precio} ${simbolo}**\n🏷️ Tipo: ${item.tipo}`,
      inline: false,
    };
  });

  return new EmbedBuilder()
    .setColor(COLORS.principal)
    .setTitle(titulo)
    .addFields(camposItems)
    .setFooter({ text: `Página ${pagina + 1} de ${totalPaginas} | JJK Rol Bot` })
    .setTimestamp();
}

/**
 * Embed de inventario.
 */
function embedInventario(nombrePersonaje, entradas) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.principal)
    .setTitle(`🎒 Inventario de ${nombrePersonaje}`)
    .setTimestamp()
    .setFooter({ text: "JJK Rol Bot" });

  if (!entradas || entradas.length === 0) {
    embed.setDescription("_El inventario está vacío._");
  } else {
    const valor = entradas
      .map((e) => `• **${e.nombre}** x${e.cantidad}\n  _${e.descripcion ?? "Sin descripción"}_`)
      .join("\n\n");
    embed.setDescription(valor);
  }

  return embed;
}

/**
 * Embed de registro exitoso.
 */
function embedRegistro(nombrePersonaje, discord_tag) {
  return new EmbedBuilder()
    .setColor(COLORS.exito)
    .setTitle("📝 ¡Registro Completado!")
    .setDescription(
      `Bienvenido/a al mundo del jujutsu, **${nombrePersonaje}**.\n\n` +
      `Usa \`/spin-raza\` para descubrir tu raza y \`/spin-tecnica\` para obtener tu técnica maldita.\n` +
      `Empiezas con **6 Rerolls**, **500 monedas** y los stats base.`
    )
    .addFields(
      { name: "👤 Jugador",    value: discord_tag,   inline: true },
      { name: "🏅 Rango",      value: "Grade 4",     inline: true },
      { name: "🎲 Rerolls",    value: "6",           inline: true },
      { name: "💴 Dinero",     value: "500",         inline: true },
      { name: "⚔️ Fuerza",     value: "10",          inline: true },
      { name: "💨 Velocidad",  value: "10",          inline: true },
      { name: "🛡️ Resistencia","value": "10",        inline: true },
      { name: "🌀 En. Maldita","value": "600",       inline: true }
    )
    .setTimestamp();
}

module.exports = {
  COLORS,
  RAREZA_EMOJI,
  RAZA_EMOJI,
  embedPerfil,
  embedSpin,
  embedError,
  embedExito,
  embedTienda,
  embedInventario,
  embedRegistro,
};

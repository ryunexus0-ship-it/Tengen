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

const FOOTER = { text: "Tengen" };

/**
 * Embed de perfil completo de un usuario — formato lista.
 */
function embedPerfil(usuario, tecnica, memberTag, avatarUrl) {
  const rarezaColor = tecnica ? (COLORS[tecnica.rareza] ?? COLORS.principal) : COLORS.principal;

  const razaLine    = usuario.raza    ? `${RAZA_EMOJI[usuario.raza] ?? "❓"} ${usuario.raza}`   : "❓ Sin asignar";
  const tecnicaLine = tecnica         ? `${RAREZA_EMOJI[tecnica.rareza]} ${tecnica.nombre} *(${tecnica.rareza})*` : "❓ Sin asignar";

  return new EmbedBuilder()
    .setColor(rarezaColor)
    .setTitle(`📋 ${usuario.nombre_personaje}`)
    .setThumbnail(avatarUrl ?? null)
    .setDescription(
      [
        `👤 **Jugador:** ${memberTag}`,
        `${razaLine.startsWith("❓") ? "❓" : RAZA_EMOJI[usuario.raza]} **Raza:** ${usuario.raza ?? "Sin asignar"}`,
        `🏅 **Rango:** ${usuario.rango}`,
        `⭐ **Nivel:** ${usuario.nivel}  ✨ **XP:** ${usuario.xp}`,
        "",
        "**⚔️ Stats**",
        `› Fuerza:          \`${usuario.fuerza}\``,
        `› Velocidad:       \`${usuario.velocidad}\``,
        `› Resistencia:     \`${usuario.resistencia}\``,
        `› Energía Maldita: \`${usuario.energia_maldita}\``,
        "",
        "**💰 Recursos**",
        `› Dinero:       \`${usuario.dinero}\``,
        `› PM:           \`${usuario.pm}\``,
        `› Skill Points: \`${usuario.skill_points}\``,
        `› Rerolls:      \`${usuario.rerolls}\``,
        "",
        "**🌀 Técnica Maldita**",
        `› ${tecnicaLine}`,
        tecnica ? `› ${tecnica.descripcion}` : "",
      ].filter((l) => l !== undefined).join("\n")
    )
    .setFooter(FOOTER)
    .setTimestamp();
}

/**
 * Embed de resultado de spin — formato lista.
 */
function embedSpin(tipo, resultado, rareza, descripcion, esReroll) {
  const color = rareza ? (COLORS[rareza] ?? COLORS.principal) : COLORS.principal;
  const emoji = rareza ? (RAREZA_EMOJI[rareza] ?? "🎲") : "🎲";
  const tipoLabel = tipo === "raza" ? "Raza" : "Técnica Maldita";

  const lineas = [
    `${emoji} **Resultado:** ${resultado}`,
    rareza ? `📊 **Rareza:** ${rareza}` : null,
    descripcion ? `📖 ${descripcion}` : null,
  ].filter(Boolean);

  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${esReroll ? "🔄 Re-Spin" : "🎰 Spin"} de ${tipoLabel}`)
    .setDescription(lineas.join("\n"))
    .setFooter({ text: esReroll ? "Tengen · Gastaste 1 Reroll" : "Tengen · Spin inicial usado" })
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
    .setFooter(FOOTER)
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
    .setFooter(FOOTER)
    .setTimestamp();
}

/**
 * Embed de tienda — formato lista completa sin paginación.
 * @param {Array}  items   - Todos los ítems disponibles
 * @param {number} saldo   - Saldo actual del usuario
 * @param {'dinero'|'pm'} moneda
 */
function embedTienda(items, saldo, moneda) {
  const esPM    = moneda === "pm";
  const simbolo = esPM ? "PM" : "monedas";
  const titulo  = esPM ? "🏪 Tienda de Puntos Malditos" : "🏪 Tienda General";
  const icono   = esPM ? "🔮" : "💴";

  const lineas = [
    `${icono} **Tu saldo: ${saldo} ${simbolo}**`,
    `*Compra con* \`/comprar item:<nombre>\``,
    "",
    "─────────────────────────",
    "",
  ];

  items.forEach((item, i) => {
    const precio = esPM ? item.precio_pm : item.precio_dinero;
    lineas.push(
      `**${i + 1}. ${item.nombre}**`,
      `› ${item.descripcion ?? "Sin descripción"}`,
      `› 💰 \`${precio} ${simbolo}\`  🏷️ ${item.tipo}`,
      ""
    );
  });

  return new EmbedBuilder()
    .setColor(COLORS.principal)
    .setTitle(titulo)
    .setDescription(lineas.join("\n").trim())
    .setFooter({ text: `Tengen · ${items.length} ítem(s) disponible(s)` })
    .setTimestamp();
}

/**
 * Embed de inventario — formato lista.
 */
function embedInventario(nombrePersonaje, entradas) {
  let descripcion;

  if (!entradas || entradas.length === 0) {
    descripcion = "_El inventario está vacío._";
  } else {
    descripcion = entradas
      .map((e, i) => [
        `**${i + 1}. ${e.nombre}** — x${e.cantidad}`,
        `› ${e.descripcion ?? "Sin descripción"}`,
      ].join("\n"))
      .join("\n\n");
  }

  return new EmbedBuilder()
    .setColor(COLORS.principal)
    .setTitle(`🎒 Inventario de ${nombrePersonaje}`)
    .setDescription(descripcion)
    .setFooter(FOOTER)
    .setTimestamp();
}

/**
 * Embed de registro exitoso — formato lista.
 */
function embedRegistro(nombrePersonaje, discordTag) {
  return new EmbedBuilder()
    .setColor(COLORS.exito)
    .setTitle("📝 ¡Registro Completado!")
    .setDescription(
      [
        `Bienvenido/a al mundo del jujutsu, **${nombrePersonaje}**.`,
        "",
        "**📋 Tu ficha inicial**",
        `› 👤 Jugador:      ${discordTag}`,
        `› 🏅 Rango:        Grade 4`,
        `› 🎲 Rerolls:      6`,
        `› 💴 Dinero:       500`,
        `› ⚔️ Stats:        0 / 0 / 0 / 600`,
        `› 🌀 Raza:         Sin asignar`,
        `› 🔮 Técnica:      Sin asignar`,
        "",
        "Usa `+spin-raza` o `/spin-raza` para obtener tu raza.",
        "Usa `+spin-tecnica` o `/spin-tecnica` para obtener tu técnica maldita.",
      ].join("\n")
    )
    .setFooter(FOOTER)
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

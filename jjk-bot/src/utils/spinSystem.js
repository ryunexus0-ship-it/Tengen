const { query } = require("../database/db");
const { razas: PROB_RAZAS, tecnicas: PROB_TECNICAS } = require("../../config/probabilities");

/**
 * Realiza una tirada ponderada dado un objeto { clave: peso }.
 * @param {Object} pesos
 * @returns {string}
 */
function tiradaPonderada(pesos) {
  const total = Object.values(pesos).reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (const [clave, peso] of Object.entries(pesos)) {
    rand -= peso;
    if (rand <= 0) return clave;
  }
  // Fallback: devuelve la última clave
  return Object.keys(pesos).at(-1);
}

/**
 * Spinea la raza de un usuario.
 * @param {string} discordId
 * @param {boolean} esReroll - Si true, consume 1 reroll
 * @returns {{ ok: boolean, raza?: string, error?: string }}
 */
async function spinRaza(discordId, esReroll = false) {
  // Obtener usuario
  const { rows } = await query(
    "SELECT id, raza, rerolls FROM usuarios WHERE discord_id = $1",
    [discordId]
  );
  if (!rows.length) return { ok: false, error: "Usuario no registrado." };

  const usuario = rows[0];

  // Si ya tiene raza y no es reroll, error
  if (usuario.raza && !esReroll) {
    return { ok: false, error: "Ya tienes una raza asignada. Usa un Reroll para volver a tirar." };
  }

  // Si es reroll, verificar que tenga rerolls disponibles
  if (esReroll && usuario.rerolls < 1) {
    return { ok: false, error: "No tienes Rerolls disponibles." };
  }

  const nuevaRaza = tiradaPonderada(PROB_RAZAS);

  // Actualizar en base de datos
  if (esReroll) {
    await query(
      "UPDATE usuarios SET raza = $1, rerolls = rerolls - 1 WHERE discord_id = $2",
      [nuevaRaza, discordId]
    );
    await query(
      "INSERT INTO transacciones (usuario_id, tipo, descripcion) VALUES ($1, 'reroll_raza', $2)",
      [usuario.id, `Reroll de raza → ${nuevaRaza}`]
    );
  } else {
    await query(
      "UPDATE usuarios SET raza = $1 WHERE discord_id = $2",
      [nuevaRaza, discordId]
    );
  }

  return { ok: true, raza: nuevaRaza, esReroll };
}

/**
 * Spinea la técnica de un usuario.
 * @param {string} discordId
 * @param {boolean} esReroll
 * @returns {{ ok: boolean, tecnica?: Object, error?: string }}
 */
async function spinTecnica(discordId, esReroll = false) {
  const { rows } = await query(
    "SELECT id, tecnica_id, rerolls FROM usuarios WHERE discord_id = $1",
    [discordId]
  );
  if (!rows.length) return { ok: false, error: "Usuario no registrado." };

  const usuario = rows[0];

  if (usuario.tecnica_id && !esReroll) {
    return { ok: false, error: "Ya tienes una técnica asignada. Usa un Reroll para volver a tirar." };
  }

  if (esReroll && usuario.rerolls < 1) {
    return { ok: false, error: "No tienes Rerolls disponibles." };
  }

  // Elegir rareza ponderada
  const rareza = tiradaPonderada(PROB_TECNICAS);

  // Obtener todas las técnicas de esa rareza
  const { rows: tecnicas } = await query(
    "SELECT * FROM tecnicas WHERE rareza = $1",
    [rareza]
  );

  if (!tecnicas.length) {
    return { ok: false, error: `No hay técnicas de rareza ${rareza} en la base de datos.` };
  }

  // Elegir una aleatoria
  const tecnica = tecnicas[Math.floor(Math.random() * tecnicas.length)];

  // Actualizar usuario
  if (esReroll) {
    await query(
      "UPDATE usuarios SET tecnica_id = $1, rerolls = rerolls - 1 WHERE discord_id = $2",
      [tecnica.id, discordId]
    );
    await query(
      "INSERT INTO transacciones (usuario_id, tipo, descripcion) VALUES ($1, 'reroll_tecnica', $2)",
      [usuario.id, `Reroll de técnica → ${tecnica.nombre} (${rareza})`]
    );
  } else {
    await query(
      "UPDATE usuarios SET tecnica_id = $1 WHERE discord_id = $2",
      [tecnica.id, discordId]
    );
  }

  return { ok: true, tecnica, esReroll };
}

module.exports = { spinRaza, spinTecnica, tiradaPonderada };

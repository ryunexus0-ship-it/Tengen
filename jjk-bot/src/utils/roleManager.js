const { query } = require("../database/db");

const RANGOS = ["Grade 4", "Grade 3", "Grade 2", "Grade 1", "Semi-Special Grade", "Special Grade"];
const RAZAS  = ["Humano", "Maldicion", "Hibrido"];
const RAREZAS_TECNICA = ["Comun", "Rara", "Epica", "Legendaria", "Mitica"];

// Colores para los roles de rareza
const RAREZA_COLORS = {
  Comun:      0x95a5a6,
  Rara:       0x3498db,
  Epica:      0x9b59b6,
  Legendaria: 0xf39c12,
  Mitica:     0xe74c3c,
};

/**
 * Crea o busca un rol en el servidor.
 * @param {Guild}  guild
 * @param {string} nombre
 * @param {number} color  (hex int)
 * @returns {Role}
 */
async function obtenerOCrearRol(guild, nombre, color = 0x1a0a2e) {
  let rol = guild.roles.cache.find((r) => r.name === nombre);
  if (!rol) {
    rol = await guild.roles.create({
      name:   nombre,
      color:  color,
      reason: "JJK Bot — setup automático de roles",
    });
    console.log(`[Roles] Creado rol: ${nombre}`);
  }
  return rol;
}

/**
 * Crea todos los roles necesarios para el servidor JJK.
 * @param {Guild} guild
 * @returns {Object} resumen de roles creados/existentes
 */
async function setupTodosLosRoles(guild) {
  const resumen = { creados: [], existentes: [] };

  // Roles de raza
  for (const raza of RAZAS) {
    const nombre = `Raza: ${raza}`;
    const existia = guild.roles.cache.find((r) => r.name === nombre);
    await obtenerOCrearRol(guild, nombre);
    existia ? resumen.existentes.push(nombre) : resumen.creados.push(nombre);
  }

  // Roles de rango
  for (const rango of RANGOS) {
    const existia = guild.roles.cache.find((r) => r.name === rango);
    await obtenerOCrearRol(guild, rango);
    existia ? resumen.existentes.push(rango) : resumen.creados.push(rango);
  }

  // Roles de rareza de técnica
  for (const rareza of RAREZAS_TECNICA) {
    const nombre = `Técnica: ${rareza}`;
    const existia = guild.roles.cache.find((r) => r.name === nombre);
    await obtenerOCrearRol(guild, nombre, RAREZA_COLORS[rareza]);
    existia ? resumen.existentes.push(nombre) : resumen.creados.push(nombre);
  }

  // Roles individuales de cada técnica en la BD
  const { rows: tecnicas } = await query("SELECT id, nombre, rareza, rol_discord_id FROM tecnicas");
  for (const tecnica of tecnicas) {
    const nombreRol = `Técnica: ${tecnica.nombre}`;
    const existia = guild.roles.cache.find((r) => r.name === nombreRol);
    const rol = await obtenerOCrearRol(guild, nombreRol, RAREZA_COLORS[tecnica.rareza] ?? 0x1a0a2e);

    // Guardar el ID del rol en la BD si no está guardado
    if (!tecnica.rol_discord_id || tecnica.rol_discord_id !== rol.id) {
      await query("UPDATE tecnicas SET rol_discord_id = $1 WHERE id = $2", [rol.id, tecnica.id]);
    }

    existia ? resumen.existentes.push(nombreRol) : resumen.creados.push(nombreRol);
  }

  return resumen;
}

/**
 * Asigna la raza a un miembro del servidor.
 * Elimina roles de otras razas antes de asignar la nueva.
 * @param {GuildMember} member
 * @param {string}      raza
 */
async function asignarRolRaza(member, raza) {
  const guild = member.guild;

  // Quitar todos los roles de raza actuales
  for (const r of RAZAS) {
    const rolExistente = guild.roles.cache.find((rol) => rol.name === `Raza: ${r}`);
    if (rolExistente && member.roles.cache.has(rolExistente.id)) {
      await member.roles.remove(rolExistente).catch(() => {});
    }
  }

  // Asignar nuevo rol de raza
  const nuevoRol = await obtenerOCrearRol(guild, `Raza: ${raza}`);
  await member.roles.add(nuevoRol);
}

/**
 * Asigna la técnica y su rareza a un miembro.
 * Elimina roles de técnicas anteriores.
 * @param {GuildMember} member
 * @param {Object}      tecnica  - { id, nombre, rareza, rol_discord_id }
 */
async function asignarRolTecnica(member, tecnica) {
  const guild = member.guild;

  // Quitar roles de rareza de técnica anteriores
  for (const rareza of RAREZAS_TECNICA) {
    const rolRareza = guild.roles.cache.find((r) => r.name === `Técnica: ${rareza}`);
    if (rolRareza && member.roles.cache.has(rolRareza.id)) {
      await member.roles.remove(rolRareza).catch(() => {});
    }
  }

  // Quitar roles de técnicas individuales anteriores (todos los que empiecen con "Técnica: ")
  const rolesTecnica = member.roles.cache.filter(
    (r) => r.name.startsWith("Técnica: ") && !RAREZAS_TECNICA.some((ra) => r.name === `Técnica: ${ra}`)
  );
  for (const [, rol] of rolesTecnica) {
    await member.roles.remove(rol).catch(() => {});
  }

  // Obtener o crear el rol de la técnica específica
  const rolTecnica = await obtenerOCrearRol(
    guild,
    `Técnica: ${tecnica.nombre}`,
    RAREZA_COLORS[tecnica.rareza] ?? 0x1a0a2e
  );

  // Guardar rol_discord_id en BD si cambió
  if (!tecnica.rol_discord_id || tecnica.rol_discord_id !== rolTecnica.id) {
    await query("UPDATE tecnicas SET rol_discord_id = $1 WHERE id = $2", [rolTecnica.id, tecnica.id]);
  }

  // Rol de rareza
  const rolRareza = await obtenerOCrearRol(
    guild,
    `Técnica: ${tecnica.rareza}`,
    RAREZA_COLORS[tecnica.rareza] ?? 0x1a0a2e
  );

  await member.roles.add([rolTecnica, rolRareza]);
}

/**
 * Asigna el rango a un miembro, removiendo el rango anterior.
 * @param {GuildMember} member
 * @param {string}      rango
 */
async function asignarRolRango(member, rango) {
  const guild = member.guild;

  for (const r of RANGOS) {
    const rolExistente = guild.roles.cache.find((rol) => rol.name === r);
    if (rolExistente && member.roles.cache.has(rolExistente.id)) {
      await member.roles.remove(rolExistente).catch(() => {});
    }
  }

  const nuevoRol = await obtenerOCrearRol(guild, rango);
  await member.roles.add(nuevoRol);
}

/**
 * Verifica si un miembro es Staff o administrador.
 * @param {GuildMember} member
 * @returns {boolean}
 */
function esStaff(member) {
  if (member.permissions.has("Administrator")) return true;
  return member.roles.cache.some((r) => r.name === "Staff");
}

module.exports = {
  RANGOS,
  RAZAS,
  RAREZAS_TECNICA,
  obtenerOCrearRol,
  setupTodosLosRoles,
  asignarRolRaza,
  asignarRolTecnica,
  asignarRolRango,
  esStaff,
};

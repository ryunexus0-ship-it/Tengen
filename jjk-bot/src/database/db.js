require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

pool.on("error", (err) => {
  console.error("Error inesperado en el cliente de PostgreSQL:", err);
});

/**
 * Ejecuta una query con parámetros opcionales.
 * @param {string} text  - Consulta SQL
 * @param {Array}  params - Parámetros de la consulta
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DB] query ejecutada en ${duration}ms:`, text.slice(0, 80));
    }
    return res;
  } catch (err) {
    console.error("[DB] Error en query:", text, "\nParams:", params, "\n", err);
    throw err;
  }
}

/**
 * Obtiene un cliente del pool para transacciones manuales.
 */
async function getClient() {
  return pool.connect();
}

/**
 * Inicializa las tablas ejecutando el schema.sql si no existen.
 */
async function initDb() {
  const fs = require("fs");
  const path = require("path");
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  try {
    await pool.query(sql);
    console.log("[DB] Schema inicializado correctamente.");
  } catch (err) {
    console.error("[DB] Error al inicializar el schema:", err);
    throw err;
  }
}

module.exports = { query, getClient, initDb };

# ⚡ JJK Rol Bot

Bot de Discord para servidores de rol basados en el universo de **Jujutsu Kaisen**. Gestiona personajes, técnicas malditas, razas, rangos, tiendas y roles de Discord de forma automática.

---

## Características

- Registro de personajes con stats base
- Sistema de spin para raza y técnica maldita con probabilidades configurables
- Rerolls (tiradas extra) comprables en la tienda
- Tienda normal (monedas) y tienda de Puntos Malditos (PM)
- Inventario por usuario
- Skill Points para mejorar stats
- Roles de Discord automáticos (razas, rangos, técnicas, rarezas)
- Comandos de staff para gestionar usuarios
- Base de datos PostgreSQL con transacciones seguras

---

## Variables de entorno

Crea un archivo `.env` basado en `.env.example`:

```env
DISCORD_TOKEN=tu_token_de_discord
CLIENT_ID=id_de_tu_aplicacion
GUILD_ID=id_de_tu_servidor
DATABASE_URL=postgresql://usuario:password@host:5432/jjk_bot
```

| Variable       | Descripción                                              |
|----------------|----------------------------------------------------------|
| `DISCORD_TOKEN`| Token del bot desde Discord Developer Portal            |
| `CLIENT_ID`    | ID de la aplicación (mismo portal)                       |
| `GUILD_ID`     | ID del servidor donde registrar los slash commands       |
| `DATABASE_URL` | URL de conexión a PostgreSQL                             |

---

## Instalación local

```bash
# 1. Clona el repositorio
git clone https://github.com/tu-usuario/jjk-rol-bot.git
cd jjk-rol-bot

# 2. Instala dependencias
npm install

# 3. Copia y rellena las variables de entorno
cp .env.example .env

# 4. Registra los slash commands en tu servidor
npm run deploy

# 5. Inicia el bot
npm start
```

---

## Deploy en Railway

1. Crea una cuenta en [railway.app](https://railway.app)
2. Haz clic en **New Project → Deploy from GitHub repo** y conecta tu repositorio
3. Agrega un plugin **PostgreSQL** desde el dashboard del proyecto
4. En la sección **Variables** del servicio, añade:
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
   - `DATABASE_URL` — Railway la genera automáticamente al añadir PostgreSQL; cópiala desde la pestaña **Connect** del plugin
5. En **Settings → Start Command**, asegúrate de que sea `npm start`
6. El bot inicializará las tablas y sincronizará las técnicas automáticamente al arrancar
7. Ejecuta `npm run deploy` una vez localmente (con el `.env` configurado) para registrar los slash commands

---

## Configurar probabilidades

Edita `config/probabilities.js`:

```js
module.exports = {
  razas: {
    Humano:    60,   // 60% de probabilidad
    Hibrido:   30,   // 30%
    Maldicion: 10,   // 10%
  },
  tecnicas: {
    Comun:      50,
    Rara:       25,
    Epica:      15,
    Legendaria:  8,
    Mitica:      2,
  },
};
```

Los valores son pesos relativos (no tienen que sumar 100, pero es más fácil entenderlos así).

---

## Agregar nuevas técnicas

Añade objetos al array en `config/tecnicas.js`:

```js
{
  nombre:      "Nombre de la Técnica",
  rareza:      "Comun",   // Comun | Rara | Epica | Legendaria | Mitica
  descripcion: "Descripción de la técnica.",
},
```

Al reiniciar el bot (o al hacer deploy), las nuevas técnicas se sincronizan automáticamente con la base de datos.

---

## Lista de comandos

### Comandos de usuario

| Comando | Descripción |
|---------|-------------|
| `/registro nombre:<nombre>` | Crea tu personaje con stats base y 6 Rerolls |
| `/perfil [usuario]` | Muestra la ficha completa del personaje |
| `/spin-raza` | Obtén o rerollea tu raza |
| `/spin-tecnica` | Obtén o rerollea tu técnica maldita |
| `/tienda` | Tienda general con paginación (usa monedas) |
| `/tienda-pm` | Tienda de Puntos Malditos |
| `/inventario` | Muestra tus ítems |
| `/usar-skillpoint stat:<stat>` | Mejora un stat con 1 Skill Point |

### Comandos de staff (requiere rol "Staff" o Administrador)

| Comando | Descripción |
|---------|-------------|
| `/ajustar-stats usuario:<@> stat:<stat> valor:<n>` | Modifica un stat directamente |
| `/ajustar-rango usuario:<@> rango:<rango>` | Cambia el rango y rol de Discord |
| `/dar-dinero usuario:<@> cantidad:<n>` | Da/quita monedas |
| `/dar-pm usuario:<@> cantidad:<n>` | Da/quita Puntos Malditos |
| `/setup-roles` | Crea todos los roles necesarios en el servidor |

---

## Estructura del proyecto

```
jjk-bot/
├── src/
│   ├── commands/
│   │   ├── user/          # Comandos de todos los usuarios
│   │   └── staff/         # Comandos restringidos a Staff
│   ├── events/            # Eventos de Discord.js
│   ├── database/          # Conexión y schema de PostgreSQL
│   └── utils/             # Utilidades (embeds, spins, roles)
├── config/
│   ├── probabilities.js   # Probabilidades de spin
│   └── tecnicas.js        # Catálogo de técnicas
├── deploy-commands.js     # Script de registro de slash commands
└── package.json
```

---

## Permisos del bot

El bot necesita los siguientes permisos en el servidor:

- `Manage Roles` — para crear y asignar roles
- `Send Messages`
- `Use Application Commands`
- `Read Message History`

Asegúrate de que el rol del bot esté **por encima** de los roles que va a gestionar en la jerarquía del servidor.

---

## Tecnologías

- [discord.js v14](https://discord.js.org)
- [PostgreSQL](https://postgresql.org) vía [node-postgres (pg)](https://node-postgres.com)
- [dotenv](https://github.com/motdotla/dotenv)
- [Railway](https://railway.app) para hosting

---

## Licencia

MIT — Libre para usar y modificar.

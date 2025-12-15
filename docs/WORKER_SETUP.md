# Configuración y Despliegue del Worker de NexGalia

Esta guía detalla los pasos para configurar, probar y desplegar el Cloudflare Worker encargado de procesar el formulario de contacto.

## Prerrequisitos

- Node.js instalado.
- Una cuenta de Cloudflare.
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) instalado globalmente:
  ```bash
  npm install -g wrangler
  ```

## 1. Configuración Inicial

Sitúate en el directorio `worker`:
```bash
cd worker
```

Instala las dependencias (si las hubiera, aunque este worker usa API nativa):
```bash
npm install
```

## 2. Base de Datos (Cloudflare D1)

El worker utiliza D1 para almacenar los leads.

1. **Crear la base de datos:**
   ```bash
   wrangler d1 create nexgalia-db
   ```
   *Copia el `database_id` que te devuelve este comando.*

2. **Actualizar `wrangler.toml`:**
   Abre `worker/wrangler.toml` y reemplaza `database_id` con el ID copiado.

3. **Crear las tablas:**
   Ejecuta el esquema SQL para crear la tabla `contacts`:
   ```bash
   wrangler d1 execute nexgalia-db --file=./schema.sql
   ```
   *(Para producción, añade `--remote` al final).*

## 3. Variables de Entorno (Telegram)

Para que el bot de Telegram funcione, necesitas configurar los secretos. No los escribas directamente en el código ni en `wrangler.toml` si vas a subirlo a un repo público.

1. **Configurar Token del Bot:**
   ```bash
   wrangler secret put TELEGRAM_BOT_TOKEN
   ```
   *Te pedirá que introduzcas el valor de forma segura.*

2. **Configurar Chat ID:**
   ```bash
   wrangler secret put TELEGRAM_CHAT_ID
   ```

## 4. Desarrollo Local

Puedes probar el worker localmente antes de desplegar:

```bash
wrangler dev
```
Esto levantará un servidor local (usualmente en `http://localhost:8787`).

**Prueba con cURL:**
```bash
curl -X POST http://localhost:8787 \
   -H "Content-Type: application/json" \
   -d '{"name": "Juan Perez", "company": "Mi Empresa", "contact": "juan@example.com", "team_size": "10"}'
```

## 5. Despliegue a Producción

Una vez verificado:

1. **Desplegar Worker:**
   ```bash
   wrangler deploy
   ```
   Esto te devolverá la URL pública de tu worker (ej: `https://nexgalia-contact-worker.tu-usuario.workers.dev`).

2. **Aplicar Schema en Producción:**
   Si no lo hiciste antes:
   ```bash
   wrangler d1 execute nexgalia-db --file=./schema.sql --remote
   ```

## 6. Conectar Frontend

Finalmente, toma la URL de producción obtenida en el paso 5 y actualiza el archivo `js/contacto-handler.js` en el frontend:

```javascript
const workerUrl = 'https://nexgalia-contact-worker.tu-usuario.workers.dev';
```

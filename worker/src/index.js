export default {
  async fetch(request, env, ctx) {
    // 1. Manejo de CORS (Permitir peticiones desde el frontend)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    try {
      const data = await request.json();
      const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";

      // 2. Validación de Datos
      const errors = [];

      // Validar Nombre (Max 100 caracteres)
      if (!data.name || typeof data.name !== 'string' || data.name.length > 100) {
        errors.push("El nombre es inválido o excede los 100 caracteres.");
      }

      // Validar Empresa (Max 100 caracteres)
      if (!data.company || typeof data.company !== 'string' || data.company.length > 100) {
        errors.push("El nombre de la empresa es inválido o excede los 100 caracteres.");
      }

      // Validar Tamaño del Equipo (1 - 5000)
      const teamSize = parseInt(data.team_size);
      if (isNaN(teamSize) || teamSize < 1 || teamSize > 5000) {
        errors.push("El tamaño del equipo debe estar entre 1 y 5000.");
      }

      // Validar Contacto (Email o Teléfono)
      const contactInput = data.contact ? data.contact.trim() : "";
      let email = null;
      let phone = null;
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[\d\+\-\s\(\)]{9,20}$/; // Validación básica de teléfono internacional

      if (emailRegex.test(contactInput)) {
        email = contactInput;
      } else if (phoneRegex.test(contactInput)) {
        phone = contactInput;
      } else {
        errors.push("El contacto debe ser un email o teléfono válido.");
      }

      if (errors.length > 0) {
        return new Response(JSON.stringify({ success: false, errors }), {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          }
        });
      }

      // 3. Rate Limiting (Máximo 5 registros por IP)
      // Consultamos cuántos registros existen ya para esta IP
      const rateLimitQuery = await env.DB.prepare(
        "SELECT COUNT(*) as count FROM contacts WHERE ip_address = ?"
      ).bind(ip).first();

      if (rateLimitQuery.count >= 5) {
        return new Response(JSON.stringify({ success: false, message: "Has excedido el límite de registros permitidos." }), {
          status: 429,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*" 
          }
        });
      }

      // 4. Guardar en Base de Datos D1
      const insertResult = await env.DB.prepare(
        "INSERT INTO contacts (name, company, email, phone, team_size, ip_address) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(data.name, data.company, email, phone, teamSize, ip).run();

      if (!insertResult.success) {
        throw new Error("Error al guardar en base de datos.");
      }

      // 5. Notificación a Telegram (Ejecutar en background para no bloquear respuesta)
      ctx.waitUntil(sendTelegramNotification(env, {
        name: data.name,
        company: data.company,
        email: email,
        phone: phone,
        teamSize: teamSize,
        ip: ip
      }));

      // 6. Respuesta Exitosa
      return new Response(JSON.stringify({ success: true, message: "Registro completado con éxito." }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }
      });

    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ success: false, message: "Error interno del servidor." }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*" 
        }
      });
    }
  },
};

// Función auxiliar para enviar a Telegram
async function sendTelegramNotification(env, data) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("Telegram credentials not found.");
    return;
  }

  const message = `
🚀 *Nuevo Lead en NexGalia*

👤 *Nombre:* ${data.name}
🏢 *Empresa:* ${data.company}
📧 *Email:* ${data.email || "No especificado"}
📞 *Teléfono:* ${data.phone || "No especificado"}
👥 *Equipo:* ${data.teamSize}
🌐 *IP:* ${data.ip}
  `;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown"
      })
    });
  } catch (err) {
    console.error("Error sending Telegram message:", err);
  }
}

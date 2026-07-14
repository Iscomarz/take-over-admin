# 🧪 Guía de Verificación - Recordatorios Automáticos

Esta guía contiene los pasos necesarios para probar y verificar el correcto funcionamiento del sistema de recordatorios automáticos tanto de forma local como en producción.

---

## 1. Verificación del Despliegue en Supabase

Asegúrate de que la Edge Function esté activa en tu panel de Supabase:

1. Ve al panel de control de **Supabase** -> **Edge Functions**.
2. Deberías ver listada la función `send-event-reminders`.
3. En la pestaña de **Secrets**, verifica que las variables `RESEND_API_KEY` y `RESEND_FROM_EMAIL` estén cargadas.

---

## 2. Ejecución Manual (Prueba de Envío)

Puedes disparar la Edge Function manualmente en cualquier momento para forzar el envío de recordatorios (útil para pruebas).

### Opción A: Desde el panel de Supabase

1. Ve a la Edge Function `send-event-reminders` en el dashboard web.
2. Usa la herramienta de pruebas integrada del panel para lanzar una petición POST con un body vacío `{}`.

### Opción B: Mediante cURL

Corre el siguiente comando desde tu terminal reemplazando `TU_SERVICE_ROLE_KEY` con la clave service_role de tu proyecto:

```bash
curl -i --location --request POST 'https://koubjdnhazjtykkmalfw.supabase.co/functions/v1/send-event-reminders' \
  --header 'Authorization: Bearer TU_SERVICE_ROLE_KEY' \
  --header 'Content-Type: application/json' \
  --data '{}'
```

---

## 3. Pruebas Locales con la Supabase CLI

Si deseas debugear y correr la Edge Function en tu máquina local:

1. Levanta las funciones de Supabase de forma local:
   ```bash
   npx supabase functions serve --env-file .env
   ```
2. Realiza un llamado HTTP a la función local que corre por defecto en el puerto 54321:
   ```bash
   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-event-reminders' \
     --header 'Authorization: Bearer TU_ANON_KEY_LOCAL' \
     --header 'Content-Type: application/json' \
     --data '{}'
   ```

---

## 4. Escenario de Prueba Paso a Paso (E2E)

Para validar que la interpolación y el filtro de fechas funcionan correctamente:

1. **Crear una Plantilla de Prueba:**

   - Entra al dashboard administrador en tu frontend -> **Difusión** -> **Recordatorios**.
   - Haz clic en **Nueva Plantilla**.
   - Crea una plantilla con nombre "Plantilla Test" y asunto `¡Hola {{nombre}}! Recordatorio para {{evento}}`.
   - En el cuerpo HTML, incluye las variables: `{{nombre}}`, `{{evento}}`, `{{fecha}}`, `{{hora}}`, `{{ubicacion}}`, `{{link_maps}}`, `{{link_ticket}}`.
   - Guarda la plantilla.

2. **Crear un Evento para Hoy:**

   - Ve a **Eventos** -> **Crear Nuevo**.
   - Crea un evento cuyo inicio sea el **día de hoy**.

3. **Vincular el Recordatorio:**

   - En **Recordatorios**, localiza el evento que acabas de crear y haz clic en **Configurar**.
   - Selecciona la "Plantilla Test" en el dropdown.
   - Activa el interruptor de **Envío Automático Activo** y presiona **Guardar**.

4. **Registrar una Venta de Prueba:**

   - Ve a **Venta Taquilla** o **Nuevo Ticket**.
   - Emite un ticket para ese evento utilizando tu correo personal (para que te llegue el mail de prueba).

5. **Lanzar el Envío:**

   - Ejecuta manualmente la Edge Function (siguiendo los pasos del punto 2 o 3).
   - Revisa la terminal/logs de la función en Supabase: verás que detecta tu evento de hoy y tu venta de prueba, interpola los datos y realiza el envío por Resend.
   - Revisa tu bandeja de entrada de correo electrónico y verifica el formato.

6. **Validar Deduplicación (Anti-Spam):**
   - Vuelve a ejecutar la Edge Function por segunda vez consecutiva.
   - Revisa los logs: verás que indica que el cliente ya fue notificado y no realiza ningún segundo envío (evitando spam).

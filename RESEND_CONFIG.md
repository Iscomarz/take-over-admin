# 🚀 Configuración de Resend para Campañas de Email

## ✅ ¡Resend Instalado Correctamente!

La librería `resend` ha sido instalada y configurada en tu proyecto.

---

## 📝 Configuración de Variables de Entorno

### 1. **Obtén tu API Key de Resend**

1. Ve a [https://resend.com/api-keys](https://resend.com/api-keys)
2. Inicia sesión con tu cuenta
3. Crea una nueva API Key o copia la existente
4. Copia la key (empieza con `re_`)

### 2. **Configura tu Dominio de Envío**

En Resend necesitas verificar un dominio:

1. Ve a [https://resend.com/domains](https://resend.com/domains)
2. Agrega tu dominio
3. Configura los registros DNS requeridos
4. Espera la verificación (5-15 minutos)

**Nota:** Mientras verificas tu dominio, puedes usar el dominio de prueba de Resend:

- `onboarding@resend.dev` (solo para testing, no para producción)

### 3. **Agrega las Variables de Entorno**

Crea o actualiza tu archivo `.env` en la raíz del proyecto:

```env
# Resend Configuration
RESEND_API_KEY=re_tu_api_key_aqui
RESEND_FROM_EMAIL=Take Over <noreply@tudominio.com>
```

**Ejemplos de FROM_EMAIL:**

- Con dominio verificado: `Take Over <noreply@tudominio.com>`
- Para testing: `Take Over <onboarding@resend.dev>`
- Solo email: `noreply@tudominio.com`

---

## 🔧 Configuración Completa del Archivo `.env`

Tu archivo `.env` completo debería verse así:

```env
# Supabase
SUPABASE_PROJECT_URL=https://tu-proyecto.supabase.co
SUPABASE_API_KEY=tu_api_key_de_supabase

# Gmail (para tickets individuales)
GMAIL_ADDRESS=tu-email@gmail.com
GMAIL_APP_PASSWORD=tu-contraseña-app-de-gmail

# Resend (para campañas de marketing)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Take Over <noreply@tudominio.com>
```

---

## 🧪 Testing de Configuración

### Prueba 1: Verificar Variables de Entorno

Crea un archivo temporal `test-resend.js` en la raíz:

```javascript
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
	try {
		const { data, error } = await resend.emails.send({
			from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
			to: 'tu-email-personal@gmail.com', // Cambia esto por tu email
			subject: 'Prueba de Resend - TakeOver',
			html: '<h1>¡Funciona!</h1><p>Tu configuración de Resend está correcta.</p>'
		});

		if (error) {
			console.error('❌ Error:', error);
		} else {
			console.log('✅ Correo enviado correctamente!');
			console.log('📧 ID del correo:', data.id);
		}
	} catch (err) {
		console.error('❌ Error general:', err);
	}
}

test();
```

Ejecuta:

```bash
node test-resend.js
```

### Prueba 2: Crear Campaña de Prueba

1. Inicia tu servidor: `npm run dev`
2. Ve a `/newCampaign`
3. Crea una campaña de prueba
4. Selecciona solo TU correo como destinatario
5. Diseña un HTML simple
6. Envía la campaña
7. Verifica tu bandeja de entrada

---

## 📊 Código Implementado

El endpoint `/api/enviarCampania` ahora usa Resend:

```javascript
// Enviar correo con Resend
const { data, error } = await resend.emails.send({
	from: process.env.RESEND_FROM_EMAIL || 'Take Over <onboarding@resend.dev>',
	to: cliente.correo,
	subject: campania.asunto,
	html: htmlFinal
});
```

---

## 🎯 Ventajas de Resend vs Gmail

| Característica       | Gmail (Nodemailer) | Resend                             |
| -------------------- | ------------------ | ---------------------------------- |
| **Límite de envíos** | ~500/día           | 100/día (gratis), ilimitado (pago) |
| **Velocidad**        | Media              | Muy rápida                         |
| **Configuración**    | SMTP complejo      | API simple                         |
| **Tracking**         | Manual             | Incluido                           |
| **Deliverability**   | Baja-Media         | Alta                               |
| **Escalabilidad**    | Limitada           | Excelente                          |

---

## ⚠️ Notas Importantes

### Límites del Plan Gratuito de Resend:

- ✅ 100 correos/día
- ✅ 3,000 correos/mes
- ✅ 1 dominio verificado
- ✅ APIs y tracking básico

### Para Producción:

1. **Verifica tu dominio** (no uses `onboarding@resend.dev`)
2. **Agrega enlace de "Unsubscribe"** en tus plantillas
3. **Monitorea los bounces** y quejas de spam
4. **Respeta las regulaciones** (CAN-SPAM, GDPR)

### Recomendaciones:

- 🔐 Nunca compartas tu `RESEND_API_KEY`
- 📁 Agrega `.env` a tu `.gitignore`
- 🧪 Siempre prueba con emails de prueba primero
- 📊 Monitorea tus envíos en el dashboard de Resend

---

## 🔗 Enlaces Útiles

- Dashboard: [https://resend.com/home](https://resend.com/home)
- API Keys: [https://resend.com/api-keys](https://resend.com/api-keys)
- Dominios: [https://resend.com/domains](https://resend.com/domains)
- Logs de Emails: [https://resend.com/emails](https://resend.com/emails)
- Documentación: [https://resend.com/docs](https://resend.com/docs)

---

## 🐛 Troubleshooting

### Error: "Missing API key"

```
Solución: Verifica que RESEND_API_KEY esté en tu .env
```

### Error: "Unverified domain"

```
Solución:
- Para testing: usa onboarding@resend.dev
- Para producción: verifica tu dominio en Resend
```

### Error: "Rate limit exceeded"

```
Solución: Estás en el límite del plan gratuito (100/día)
- Espera 24 horas
- Upgrade a plan de pago
```

### Los correos no llegan

```
Solución:
1. Revisa la carpeta de spam
2. Verifica el email en Resend dashboard
3. Confirma que el dominio esté verificado
```

---

## ✅ Checklist Final

- [ ] Instalar Resend: `npm install resend` ✓ (Ya hecho)
- [ ] Obtener API key de Resend
- [ ] Agregar variables a `.env`:
  - [ ] `RESEND_API_KEY`
  - [ ] `RESEND_FROM_EMAIL`
- [ ] Verificar dominio en Resend (opcional para testing)
- [ ] Ejecutar prueba con `test-resend.js`
- [ ] Crear campaña de prueba en `/newCampaign`
- [ ] Verificar recepción del correo
- [ ] Eliminar archivo `test-resend.js`

---

**¡Todo listo para enviar campañas con Resend! 🎉**

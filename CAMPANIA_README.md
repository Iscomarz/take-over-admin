# 📧 Módulo de Email Marketing - Guía de Uso

## 🎯 Descripción
Sistema completo para crear y enviar campañas de email marketing personalizadas a tus clientes que han comprado tickets en tus eventos.

---

## 📁 Archivos Creados

### **Stores**
- `/src/lib/stores/campaniaStore.js` - Store de Svelte para mantener estado entre pantallas

### **Servicios**
- `/src/services/campania-service.js` - Lógica de negocio y conexión con base de datos

### **Rutas (Páginas)**
- `/src/routes/newCampaign/+page.svelte` - Paso 1: Datos básicos de la campaña
- `/src/routes/newCampaign/emailBody/+page.svelte` - Paso 2: Contenido del correo
- `/src/routes/campanias/+page.svelte` - Historial de campañas enviadas

### **API**
- `/src/routes/api/enviarCampania/+server.js` - Endpoint para envío de correos

### **Documentación**
- `/DATABASE_CAMPANIA.md` - Estructura completa de base de datos

---

## 🚀 Flujo de Uso

### 1️⃣ **Crear Nueva Campaña**
```
/newCampaign → Paso 1: Datos Básicos
```
- Ingresa título de la campaña
- Define asunto del correo
- Filtra por evento (opcional)
- Selecciona destinatarios (individual o todos)
- Click en "Continuar"

### 2️⃣ **Diseñar Contenido**
```
/newCampaign/emailBody → Paso 2: Contenido
```
- Escribe o pega tu HTML
- Activa "Usar variable de nombre" para personalizar
- Usa `{{nombre}}` donde quieras el nombre del cliente
- Alterna entre "Editor" y "Vista Previa"
- Guarda como borrador o envía inmediatamente

### 3️⃣ **Ver Historial**
```
/campanias → Historial
```
- Lista todas las campañas
- Click en una campaña para ver detalles
- Revisa estadísticas de envío
- Visualiza el HTML enviado

---

## 🗄️ Base de Datos

### Tablas a Crear en Supabase:

#### 1. **mCampania**
```sql
CREATE TABLE mCampania (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(100) NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    cuerpo_html TEXT NOT NULL,
    usar_variable_nombre BOOLEAN DEFAULT true,
    todos_los_clientes BOOLEAN DEFAULT false,
    estado VARCHAR(20) DEFAULT 'borrador',
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_envio TIMESTAMP WITH TIME ZONE,
    total_enviados INTEGER DEFAULT 0,
    total_errores INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. **mCampaniaDestinatario**
```sql
CREATE TABLE mCampaniaDestinatario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campania_id UUID NOT NULL REFERENCES mCampania(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL,
    enviado BOOLEAN DEFAULT false,
    fecha_envio TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campania_id, cliente_id)
);
```

Ver `DATABASE_CAMPANIA.md` para más detalles e índices.

---

## 📮 Configurar Servicio de Correo

El código está preparado pero **necesitas configurar un servicio de email**. Opciones:

### **Opción 1: Nodemailer (SMTP)**
```bash
npm install nodemailer
```

```javascript
// En +server.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'tu-email@gmail.com',
    pass: 'tu-contraseña-app'
  }
});

// Reemplazar en el endpoint:
await transporter.sendMail({
  from: '"Take Over" <noreply@takeover.com>',
  to: cliente.correo,
  subject: campania.asunto,
  html: htmlFinal
});
```

### **Opción 2: Resend (Moderno y Fácil)**
```bash
npm install resend
```

```javascript
import { Resend } from 'resend';
const resend = new Resend('tu_api_key');

await resend.emails.send({
  from: 'TakeOver <noreply@takeover.com>',
  to: cliente.correo,
  subject: campania.asunto,
  html: htmlFinal
});
```

### **Opción 3: SendGrid**
```bash
npm install @sendgrid/mail
```

```javascript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey('tu_api_key');

await sgMail.send({
  to: cliente.correo,
  from: 'noreply@takeover.com',
  subject: campania.asunto,
  html: htmlFinal
});
```

---

## 🎨 Personalización

### Variables Disponibles
Por defecto solo está `{{nombre}}`, pero puedes agregar más:

```javascript
// En emailBody/+page.svelte
htmlFinal = htmlFinal
  .replace(/\{\{nombre\}\}/g, cliente.nombre)
  .replace(/\{\{correo\}\}/g, cliente.correo)
  .replace(/\{\{evento\}\}/g, evento.nombre);
```

### Plantilla HTML Incluida
El sistema incluye una plantilla por defecto moderna y responsive. Puedes:
- Usarla como base
- Reemplazarla completamente
- Crear múltiples plantillas

---

## 🔒 Seguridad

### Variables de Entorno
Crea `.env` con tus credenciales:
```env
# Para Nodemailer
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-app

# Para Resend
RESEND_API_KEY=re_xxxxxxxxxxxx

# Para SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
```

### Políticas RLS en Supabase
Ejecuta las políticas en `DATABASE_CAMPANIA.md` para seguridad de datos.

---

## ✅ Checklist de Implementación

- [ ] Ejecutar scripts SQL en Supabase
- [ ] Configurar políticas de seguridad (RLS)
- [ ] Instalar dependencia de email (nodemailer/resend/sendgrid)
- [ ] Configurar credenciales en `.env`
- [ ] Actualizar `/api/enviarCampania/+server.js` con tu servicio de email
- [ ] Probar con correos de prueba
- [ ] Agregar enlaces al menú de navegación
- [ ] Opcional: Agregar enlace "Unsubscribe" en plantilla HTML

---

## 🎯 Agregar al Menú

Edita tu menú de navegación para agregar:

```svelte
<a href="/newCampaign" class="menu-item">
  📧 Nueva Campaña
</a>

<a href="/campanias" class="menu-item">
  📊 Historial de Campañas
</a>
```

---

## 🧪 Testing

### Flujo de Prueba:
1. Crear campaña de prueba
2. Seleccionar solo tu correo como destinatario
3. Diseñar un HTML simple
4. Enviar
5. Verificar recepción y formato
6. Revisar en historial

---

## 📈 Mejoras Futuras Sugeridas

### Funcionalidades Extra:
- [ ] **Programar envíos** (enviar en fecha/hora específica)
- [ ] **Plantillas guardadas** (reutilizar diseños)
- [ ] **Tracking de apertura** (pixel de seguimiento)
- [ ] **Tracking de clicks** (URLs con parámetros)
- [ ] **Segmentación avanzada** (filtros personalizados)
- [ ] **A/B Testing** (probar diferentes versiones)
- [ ] **Rate limiting** (control de envíos masivos)
- [ ] **Editor visual** (drag & drop como Mailchimp)
- [ ] **Lista de cancelación** (unsubscribe)
- [ ] **Reportes detallados** (gráficos de rendimiento)

### Validaciones Extra:
- [ ] Validar formato de correos
- [ ] Evitar correos duplicados
- [ ] Limitar tamaño del HTML
- [ ] Comprobar spam score del contenido
- [ ] Confirmar envío con doble verificación

---

## 🆘 Solución de Problemas

### Error: "No hay destinatarios"
- Verifica que la tabla mVenta tenga correos válidos
- Revisa que los clientes tengan campo `correo` no vacío

### Error al enviar correos
- Verifica credenciales del servicio de email
- Revisa logs en consola del servidor
- Comprueba límites de tu servicio de correo

### Preview no se actualiza
- Haz click en "Vista Previa" después de editar
- Verifica que el HTML sea válido

### Correos no personalizados
- Asegúrate de activar "Usar variable de nombre"
- Verifica que usas `{{nombre}}` en el HTML (con llaves dobles)

---

## 📞 Soporte

Para más información, revisa:
- `DATABASE_CAMPANIA.md` - Estructura de base de datos completa
- Código comentado en archivos `.svelte` y `.js`
- Documentación de tu servicio de email elegido

---

**¡Listo para enviar tus primeras campañas! 🚀**

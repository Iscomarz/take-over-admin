# 📧 Estructura de Base de Datos - Módulo de Campañas de Email Marketing

## 📋 Tablas Necesarias

### 1. **mCampania** - Tabla principal de campañas
Almacena la información general de cada campaña de email marketing.

```sql
CREATE TABLE mCampania (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo VARCHAR(100) NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    cuerpo_html TEXT NOT NULL,
    usar_variable_nombre BOOLEAN DEFAULT true,
    todos_los_clientes BOOLEAN DEFAULT false,
    estado VARCHAR(20) DEFAULT 'borrador', -- borrador, enviada, programada, error
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_envio TIMESTAMP WITH TIME ZONE,
    total_enviados INTEGER DEFAULT 0,
    total_errores INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_campania_estado ON mCampania(estado);
CREATE INDEX idx_campania_fecha_creacion ON mCampania(fecha_creacion DESC);
```

**Campos:**
- `id`: Identificador único de la campaña
- `titulo`: Título interno de la campaña (máx 100 caracteres)
- `asunto`: Asunto del correo (máx 200 caracteres)
- `cuerpo_html`: Contenido HTML completo del correo
- `usar_variable_nombre`: Si se usa {{nombre}} en el correo
- `todos_los_clientes`: Indica si se envió a todos los clientes
- `estado`: Estado actual (borrador/enviada/programada/error)
- `fecha_creacion`: Fecha de creación de la campaña
- `fecha_envio`: Fecha cuando se envió la campaña
- `total_enviados`: Contador de correos enviados exitosamente
- `total_errores`: Contador de errores en el envío

---

### 2. **mCampaniaDestinatario** - Relación campaña-destinatarios
Tabla intermedia que relaciona campañas con los destinatarios específicos.

```sql
CREATE TABLE mCampaniaDestinatario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campania_id UUID NOT NULL REFERENCES mCampania(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL, -- ID de mVenta (referencia al cliente)
    enviado BOOLEAN DEFAULT false,
    fecha_envio TIMESTAMP WITH TIME ZONE,
    error TEXT, -- Mensaje de error si el envío falló
    abierto BOOLEAN DEFAULT false, -- Para tracking (opcional)
    fecha_apertura TIMESTAMP WITH TIME ZONE, -- Para tracking (opcional)
    click BOOLEAN DEFAULT false, -- Para tracking de clicks (opcional)
    fecha_click TIMESTAMP WITH TIME ZONE, -- Para tracking (opcional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Evitar duplicados
    UNIQUE(campania_id, cliente_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_campania_destinatario_campania ON mCampaniaDestinatario(campania_id);
CREATE INDEX idx_campania_destinatario_cliente ON mCampaniaDestinatario(cliente_id);
CREATE INDEX idx_campania_destinatario_enviado ON mCampaniaDestinatario(enviado);
```

**Campos:**
- `id`: Identificador único
- `campania_id`: Referencia a la campaña
- `cliente_id`: ID del registro en mVenta (el cliente)
- `enviado`: Indica si ya se envió el correo
- `fecha_envio`: Cuándo se envió el correo
- `error`: Mensaje de error si falló el envío
- `abierto`: Para tracking de apertura (requiere pixel de seguimiento)
- `fecha_apertura`: Cuándo se abrió el correo
- `click`: Si se hizo click en algún enlace
- `fecha_click`: Cuándo se hizo el click

---

### 3. **mCampaniaEvento** (Opcional) - Filtro por eventos
Si quieres relacionar campañas con eventos específicos.

```sql
CREATE TABLE mCampaniaEvento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campania_id UUID NOT NULL REFERENCES mCampania(id) ON DELETE CASCADE,
    evento_id UUID NOT NULL, -- Referencia a mEvento
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(campania_id, evento_id)
);

CREATE INDEX idx_campania_evento_campania ON mCampaniaEvento(campania_id);
CREATE INDEX idx_campania_evento_evento ON mCampaniaEvento(evento_id);
```

---

## 🔐 Row Level Security (RLS) - Supabase

Si usas Supabase, aquí están las políticas de seguridad recomendadas:

```sql
-- Habilitar RLS
ALTER TABLE mCampania ENABLE ROW LEVEL SECURITY;
ALTER TABLE mCampaniaDestinatario ENABLE ROW LEVEL SECURITY;

-- Políticas para mCampania (solo usuarios autenticados)
CREATE POLICY "Usuarios pueden ver sus campañas" ON mCampania
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden crear campañas" ON mCampania
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden actualizar campañas" ON mCampania
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Políticas para mCampaniaDestinatario
CREATE POLICY "Usuarios pueden ver destinatarios" ON mCampaniaDestinatario
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden crear destinatarios" ON mCampaniaDestinatario
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden actualizar destinatarios" ON mCampaniaDestinatario
    FOR UPDATE
    USING (auth.role() = 'authenticated');
```

---

## 📊 Consultas Útiles

### Ver campañas con estadísticas
```sql
SELECT 
    c.*,
    COUNT(cd.id) as total_destinatarios,
    COUNT(CASE WHEN cd.enviado = true THEN 1 END) as enviados,
    COUNT(CASE WHEN cd.error IS NOT NULL THEN 1 END) as errores
FROM mCampania c
LEFT JOIN mCampaniaDestinatario cd ON c.id = cd.campania_id
GROUP BY c.id
ORDER BY c.fecha_creacion DESC;
```

### Clientes únicos de mVenta
```sql
SELECT DISTINCT ON (LOWER(correo)) 
    id, 
    correo, 
    nombre, 
    evento_id
FROM mVenta
WHERE correo IS NOT NULL AND correo != ''
ORDER BY LOWER(correo), created_at DESC;
```

### Destinatarios de una campaña con info del cliente
```sql
SELECT 
    cd.*,
    mv.correo,
    mv.nombre
FROM mCampaniaDestinatario cd
JOIN mVenta mv ON cd.cliente_id = mv.id
WHERE cd.campania_id = 'ID_DE_LA_CAMPANIA';
```

---

## 🚀 Mejoras Futuras (Opcionales)

### 1. **Plantillas Predefinidas**
Tabla para guardar plantillas HTML reutilizables:

```sql
CREATE TABLE mPlantillaEmail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    html_template TEXT NOT NULL,
    thumbnail_url TEXT, -- Imagen de preview
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. **Programación de Envíos**
Para enviar campañas en el futuro:

```sql
ALTER TABLE mCampania 
ADD COLUMN fecha_programada TIMESTAMP WITH TIME ZONE;
```

### 3. **Segmentación Avanzada**
Tabla para guardar segmentos de clientes:

```sql
CREATE TABLE mSegmento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    filtro_json JSONB, -- Criterios de filtrado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE mCampaniaSegmento (
    campania_id UUID REFERENCES mCampania(id),
    segmento_id UUID REFERENCES mSegmento(id),
    PRIMARY KEY (campania_id, segmento_id)
);
```

### 4. **Historial de Interacciones**
Para tracking avanzado:

```sql
CREATE TABLE mCampaniaInteraccion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    destinatario_id UUID REFERENCES mCampaniaDestinatario(id),
    tipo VARCHAR(20), -- apertura, click, unsubscribe
    url TEXT, -- Para clicks
    user_agent TEXT,
    ip_address INET,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 📝 Notas Importantes

1. **Servicio de Correo**: Necesitarás configurar un servicio como:
   - **Nodemailer** (SMTP)
   - **SendGrid** (API)
   - **AWS SES** (Amazon)
   - **Resend** (Moderno y fácil)

2. **Variables del Sistema**: Para el reemplazo de `{{nombre}}`, puedes extender a:
   - `{{nombre}}`
   - `{{correo}}`
   - `{{evento}}`
   - `{{fecha_evento}}`

3. **Rate Limiting**: Implementa límites para evitar spam:
   - Máximo X correos por minuto
   - Delays entre envíos
   - Validación de correos

4. **Compliance**: 
   - Agregar enlace de "Unsubscribe"
   - Almacenar consentimiento de marketing
   - Cumplir con GDPR/leyes locales

5. **Testing**: Siempre prueba con correos de prueba antes de enviar masivamente

---

## 🔧 Configuración Recomendada en Supabase

1. Ve a SQL Editor en Supabase
2. Ejecuta los scripts de creación de tablas
3. Configura las políticas de seguridad (RLS)
4. Verifica los índices para rendimiento
5. Prueba las consultas básicas

---

**Creado para TakeOver Admin - Módulo de Email Marketing**

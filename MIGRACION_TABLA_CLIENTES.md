# 🔄 Migración: Normalización de Base de Datos - Tabla de Clientes

## 📋 Resumen
Este documento contiene las instrucciones completas para normalizar la base de datos agregando una tabla dedicada de clientes (`mCliente`), eliminando la duplicación de datos de clientes en `mVenta`.

**⚠️ IMPORTANTE**: Realizar esta migración cuando NO haya eventos activos. La migración puede tomar tiempo dependiendo del volumen de datos.

---

## 📊 Estructura Actual vs Nueva

### Antes (Problemático)
```
mVenta
├── idventa (PK)
├── nombre ❌ Duplicado por cada compra
├── correo ❌ Duplicado por cada compra
├── idevento
├── cantidad
├── total
└── fecha
```

### Después (Normalizado)
```
mCliente (NUEVA)
├── id (PK)
├── nombre
├── correo (UNIQUE)
├── telefono
├── desuscrito
├── fecha_registro
└── ultima_compra

mVenta (MODIFICADA)
├── idventa (PK)
├── cliente_id (FK → mCliente.id) ✅
├── idevento
├── cantidad
├── total
└── fecha
```

---

## 🚀 PASO 1: Crear Tabla mCliente

Ejecutar en **Supabase → SQL Editor**:

```sql
-- Crear tabla de clientes
CREATE TABLE mCliente (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    correo VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    desuscrito BOOLEAN DEFAULT FALSE,
    fecha_registro TIMESTAMP DEFAULT NOW(),
    ultima_compra TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Comentario de tabla
COMMENT ON TABLE mCliente IS 'Tabla maestra de clientes únicos';

-- Comentarios de columnas
COMMENT ON COLUMN mCliente.id IS 'ID único del cliente';
COMMENT ON COLUMN mCliente.correo IS 'Email único del cliente';
COMMENT ON COLUMN mCliente.desuscrito IS 'Indica si el cliente se desuscribió de correos promocionales';
COMMENT ON COLUMN mCliente.fecha_registro IS 'Fecha de primera compra/registro';
COMMENT ON COLUMN mCliente.ultima_compra IS 'Fecha de última compra';

-- Crear índices para optimizar búsquedas
CREATE INDEX idx_cliente_correo ON mCliente(correo);
CREATE INDEX idx_cliente_desuscrito ON mCliente(desuscrito);
CREATE INDEX idx_cliente_nombre ON mCliente(nombre);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mcliente_updated_at BEFORE UPDATE ON mCliente
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 📝 PASO 2: Modificar Tabla mVenta

```sql
-- Agregar columna cliente_id a mVenta
ALTER TABLE mVenta 
ADD COLUMN cliente_id INTEGER;

-- Crear índice (antes de agregar FK para mejor rendimiento)
CREATE INDEX idx_venta_cliente ON mVenta(cliente_id);

-- Después de la migración de datos, agregar la foreign key
-- (No ejecutar ahora, ejecutar después del PASO 3)
-- ALTER TABLE mVenta 
-- ADD CONSTRAINT fk_venta_cliente 
-- FOREIGN KEY (cliente_id) REFERENCES mCliente(id) ON DELETE RESTRICT;
```

---

## 🔄 PASO 3: Migración de Datos Existentes

### 3.1 Insertar Clientes Únicos desde mVenta

```sql
-- Insertar clientes únicos basándose en el correo
INSERT INTO mCliente (nombre, correo, fecha_registro, ultima_compra)
SELECT 
    -- Usar el nombre más reciente para cada correo
    FIRST_VALUE(nombre) OVER (PARTITION BY correo ORDER BY fecha DESC) as nombre,
    correo,
    MIN(fecha) OVER (PARTITION BY correo) as fecha_registro,
    MAX(fecha) OVER (PARTITION BY correo) as ultima_compra
FROM mVenta
WHERE correo IS NOT NULL AND correo != ''
GROUP BY correo, nombre, fecha
ON CONFLICT (correo) DO NOTHING;

-- Verificar cuántos clientes se insertaron
SELECT COUNT(*) as total_clientes FROM mCliente;
```

### 3.2 Actualizar mVenta con IDs de Cliente

```sql
-- Actualizar todas las ventas con el ID del cliente correspondiente
UPDATE mVenta v
SET cliente_id = c.id
FROM mCliente c
WHERE v.correo = c.correo;

-- Verificar que todas las ventas tienen cliente_id
SELECT 
    COUNT(*) as total_ventas,
    COUNT(cliente_id) as ventas_con_cliente,
    COUNT(*) - COUNT(cliente_id) as ventas_sin_cliente
FROM mVenta;

-- Si hay ventas sin cliente_id, revisarlas
SELECT idventa, nombre, correo, fecha 
FROM mVenta 
WHERE cliente_id IS NULL 
LIMIT 10;
```

### 3.3 Agregar Constraint de Foreign Key

```sql
-- Solo ejecutar si todas las ventas tienen cliente_id
ALTER TABLE mVenta 
ADD CONSTRAINT fk_venta_cliente 
FOREIGN KEY (cliente_id) REFERENCES mCliente(id) ON DELETE RESTRICT;

-- Hacer cliente_id NOT NULL (opcional, recomendado)
ALTER TABLE mVenta 
ALTER COLUMN cliente_id SET NOT NULL;
```

---

## 🔧 PASO 4: Modificar Tabla mCampaniaDestinatario

```sql
-- Opción A: Renombrar columna (si ya usas venta_id)
ALTER TABLE mCampaniaDestinatario 
RENAME COLUMN venta_id TO cliente_id;

-- Opción B: Crear nueva columna y migrar
ALTER TABLE mCampaniaDestinatario 
ADD COLUMN cliente_id INTEGER REFERENCES mCliente(id);

-- Migrar datos de venta_id a cliente_id
UPDATE mCampaniaDestinatario cd
SET cliente_id = v.cliente_id
FROM mVenta v
WHERE cd.venta_id = v.idventa;

-- Verificar migración
SELECT 
    COUNT(*) as total,
    COUNT(cliente_id) as con_cliente_id
FROM mCampaniaDestinatario;

-- Eliminar columna antigua (solo después de verificar)
-- ALTER TABLE mCampaniaDestinatario DROP COLUMN venta_id;
```

---

## 📂 PASO 5: Cambios en el Código - Admin Panel

### Archivos a Modificar:

#### 5.1 `src/services/campania-service.js`

**Función `obtenerClientesUnicos()`** (Línea ~15):
```javascript
// ANTES
const { data, error } = await supabase
    .from('mVenta')
    .select('correo, nombre, idventa, idEvento')
    .order('nombre');

// DESPUÉS
const { data, error } = await supabase
    .from('mCliente')
    .select('id, correo, nombre')
    .eq('desuscrito', false)
    .order('nombre');
```

**Función `obtenerClientesPorEvento()`** (Línea ~100):
```javascript
// ANTES
const { data, error } = await supabase
    .from('mVenta')
    .select('correo, nombre, idventa, idEvento')
    .eq('idEvento', eventoId)
    .order('nombre');

// DESPUÉS
// Necesitas hacer un JOIN
const { data, error } = await supabase
    .from('mVenta')
    .select(`
        cliente_id,
        mCliente!inner (
            id,
            correo,
            nombre
        )
    `)
    .eq('idEvento', eventoId);

// Transformar los datos
const clientesUnicos = data.reduce((acc, venta) => {
    const clienteId = venta.mCliente.id;
    if (!acc.find(c => c.id === clienteId)) {
        acc.push({
            id: clienteId,
            correo: venta.mCliente.correo,
            nombre: venta.mCliente.nombre
        });
    }
    return acc;
}, []);
```

#### 5.2 `src/routes/newCampaign/emailBody/+page.svelte`

**Línea ~290** - Cambiar query de obtención de clientes:
```javascript
// ANTES
const { data: clientesCompletos, error: errorClientes } = await supabase
    .from('mVenta')
    .select('idventa, correo, nombre')
    .in('idventa', datosCompletos.destinatarios);

// DESPUÉS
const { data: clientesCompletos, error: errorClientes } = await supabase
    .from('mCliente')
    .select('cliente_id, correo, nombre')
    .in('cliente_id', datosCompletos.destinatarios);

// Y en el map:
const destinatariosParaEnviar = clientesCompletos.map(c => ({
    id: c.cliente_id, // Cambiar de c.idventa a c.id
    correo: c.correo,
    nombre: c.nombre
}));
```

#### 5.3 `src/routes/reenviarTickets/+page.svelte`

**Línea ~26**:
```javascript
// ANTES
const { data, error } = await supabase
    .from('mVenta')
    .select('idventa, nombre, correo, idevento')
    .order('nombre');

// DESPUÉS
// Obtener ventas con información del cliente
const { data, error } = await supabase
    .from('mVenta')
    .select(`
        idventa,
        idevento,
        mCliente!inner (
            cliente_id,
            nombre,
            correo
        )
    `)
    .order('mCliente(nombre)');

// Transformar datos
const ventasConCliente = data.map(v => ({
    idventa: v.idventa,
    idevento: v.idevento,
    nombre: v.mCliente.nombre,
    correo: v.mCliente.correo
}));
```

#### 5.4 `src/routes/events/event/[id]/+page.svelte`

**Línea ~135**:
```javascript
// ANTES
const { data: ventas, error: errorVentas } = await supabase
    .from('mVenta')
    .select('*')
    .eq('idevento', eventoId);

// DESPUÉS (agregar JOIN con cliente)
const { data: ventas, error: errorVentas } = await supabase
    .from('mVenta')
    .select(`
        *,
        mCliente (
            id,
            nombre,
            correo,
            telefono
        )
    `)
    .eq('idevento', eventoId);

// Nota: Ahora accede a los datos del cliente con: venta.mCliente.nombre
```

#### 5.5 `src/routes/newTicket/+page.svelte`

**Línea ~95** - Al crear nueva venta:
```javascript
// ANTES
const { data, error } = await supabase
    .from('mVenta')
    .insert([{
        nombre: formData.nombre,
        correo: formData.correo,
        // ... otros campos
    }])
    .select();

// DESPUÉS
// Primero: Buscar o crear cliente
let clienteId;

// Buscar cliente existente
const { data: clienteExistente } = await supabase
    .from('mCliente')
    .select('id')
    .eq('correo', formData.correo)
    .single();

if (clienteExistente) {
    clienteId = clienteExistente.id;
} else {
    // Crear nuevo cliente
    const { data: nuevoCliente, error: errorCliente } = await supabase
        .from('mCliente')
        .insert([{
            nombre: formData.nombre,
            correo: formData.correo,
            telefono: formData.telefono || null,
            fecha_registro: new Date().toISOString()
        }])
        .select()
        .single();
    
    if (errorCliente) throw errorCliente;
    clienteId = nuevoCliente.id;
}

// Luego: Crear venta con cliente_id
const { data, error } = await supabase
    .from('mVenta')
    .insert([{
        cliente_id: clienteId,
        // ... otros campos (NO incluir nombre ni correo)
    }])
    .select();
```

---

## 🌐 PASO 6: Cambios en Web de Ventas

### Archivos a modificar en el proyecto de ventas:

1. **Formulario de compra** - Al crear venta:
   ```javascript
   // Buscar o crear cliente primero
   const { data: cliente } = await supabase
       .from('mCliente')
       .select('id')
       .eq('correo', email)
       .single();
   
   let clienteId;
   if (cliente) {
       clienteId = cliente.id;
   } else {
       const { data: nuevoCliente } = await supabase
           .from('mCliente')
           .insert([{ nombre, correo: email, telefono }])
           .select()
           .single();
       clienteId = nuevoCliente.id;
   }
   
   // Crear venta con cliente_id
   await supabase.from('mVenta').insert([{
       cliente_id: clienteId,
       idevento: eventoId,
       cantidad: cantidad,
       total: total
   }]);
   ```

2. **Consultas de ventas existentes**:
   - Cambiar queries que buscan por `nombre` o `correo` en mVenta
   - Usar JOIN con mCliente para obtener información del cliente

---

## ✅ PASO 7: Verificación Post-Migración

### Scripts de verificación:

```sql
-- 1. Verificar integridad de datos
SELECT 
    (SELECT COUNT(*) FROM mCliente) as total_clientes,
    (SELECT COUNT(DISTINCT cliente_id) FROM mVenta) as clientes_con_ventas,
    (SELECT COUNT(*) FROM mVenta WHERE cliente_id IS NULL) as ventas_sin_cliente;

-- 2. Verificar clientes con múltiples compras
SELECT 
    c.id,
    c.nombre,
    c.correo,
    COUNT(v.idventa) as total_compras,
    SUM(v.total) as total_gastado
FROM mCliente c
LEFT JOIN mVenta v ON v.cliente_id = c.id
GROUP BY c.id, c.nombre, c.correo
ORDER BY total_compras DESC
LIMIT 10;

-- 3. Verificar campañas
SELECT 
    COUNT(*) as total_destinatarios,
    COUNT(cliente_id) as con_cliente_id
FROM mCampaniaDestinatario;

-- 4. Buscar duplicados (no debería haber)
SELECT correo, COUNT(*) as duplicados
FROM mCliente
GROUP BY correo
HAVING COUNT(*) > 1;
```

---

## 🔄 PASO 8: Limpieza Opcional (Después de validar)

Una vez que todo funcione correctamente, puedes eliminar columnas redundantes:

```sql
-- SOLO DESPUÉS DE VALIDAR QUE TODO FUNCIONA

-- Eliminar columnas de nombre y correo de mVenta
ALTER TABLE mVenta DROP COLUMN IF EXISTS nombre;
ALTER TABLE mVenta DROP COLUMN IF EXISTS correo;

-- Nota: Esto es opcional y puede hacerse semanas después
-- de validar que todo funciona correctamente
```

---

## 📋 Checklist de Migración

### Pre-Migración
- [ ] Evento actual terminado
- [ ] Backup completo de la base de datos
- [ ] Notificar al equipo de la migración
- [ ] Poner sitio en modo mantenimiento (opcional)

### Migración
- [ ] PASO 1: Crear tabla mCliente
- [ ] PASO 2: Modificar tabla mVenta (agregar cliente_id)
- [ ] PASO 3.1: Insertar clientes únicos
- [ ] PASO 3.2: Actualizar mVenta con IDs
- [ ] PASO 3.3: Agregar foreign key
- [ ] PASO 4: Modificar mCampaniaDestinatario
- [ ] PASO 5: Actualizar código Admin Panel
- [ ] PASO 6: Actualizar código Web Ventas
- [ ] PASO 7: Ejecutar scripts de verificación

### Post-Migración
- [ ] Probar flujo completo de compra
- [ ] Probar envío de tickets
- [ ] Probar creación de campaña
- [ ] Probar filtrado por evento
- [ ] Verificar desuscripciones
- [ ] Monitorear por 1-2 semanas
- [ ] PASO 8: Limpieza de columnas (opcional)

---

## 🆘 Rollback (En caso de problemas)

Si algo sale mal, puedes revertir:

```sql
-- 1. Eliminar foreign key
ALTER TABLE mVenta DROP CONSTRAINT IF EXISTS fk_venta_cliente;

-- 2. Eliminar columna cliente_id
ALTER TABLE mVenta DROP COLUMN IF EXISTS cliente_id;

-- 3. Eliminar tabla mCliente
DROP TABLE IF EXISTS mCliente CASCADE;

-- 4. Restaurar backup
-- (Usar herramientas de Supabase para restaurar)
```

---

## 📞 Notas Finales

- **Tiempo estimado**: 30-60 minutos dependiendo del volumen de datos
- **Downtime**: 0-5 minutos si todo va bien
- **Riesgo**: Bajo si sigues los pasos en orden
- **Beneficio**: Base de datos normalizada, sin duplicados, más eficiente

**Recomendación**: Prueba primero en un ambiente de staging/desarrollo si es posible.

---

## 📚 Referencias

- [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [Supabase Database Design](https://supabase.com/docs/guides/database/overview)
- [Normalización de Bases de Datos](https://en.wikipedia.org/wiki/Database_normalization)

---

**Fecha de creación**: Enero 30, 2026  
**Versión**: 1.0  
**Autor**: Sistema de Migración TakeOver

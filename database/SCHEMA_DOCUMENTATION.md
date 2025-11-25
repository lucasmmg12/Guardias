# 📊 Documentación del Esquema de Base de Datos

## Sistema de Liquidaciones de Guardias Médicas (S.L.G.)

---

## 🎯 Visión General

El esquema está diseñado para procesar liquidaciones de guardias médicas con reglas de negocio complejas:

---

## ⚠️ IMPORTANTE: Base de Datos Compartida

Este sistema **comparte la base de datos** con el Sistema de Instrumentadores. Ambos sistemas coexisten en el mismo proyecto de Supabase.

### Tablas Compartidas

- **`feriados`**: Compartida entre ambos sistemas. Contiene feriados nacionales/provinciales usados por Instrumentadores y Guardias.

### Separación de Sistemas

Las tablas están claramente separadas por nombre:

**Sistema de Instrumentadores**:
- `instrumentadores`
- `liquidaciones`
- `detalle`
- `nomenclador`
- `perfiles_personales`
- `plus_horario_config`

**Sistema de Guardias** (este documento):
- `medicos`
- `tarifas_guardia`
- `configuracion_adicionales`
- `liquidaciones_guardia` (diferente de `liquidaciones`)
- `detalle_guardia` (diferente de `detalle`)
- `logs_procesamiento`

**Compartidas**:
- `feriados`

---

## 🎯 Reglas de Negocio del Sistema de Guardias

El esquema está diseñado para procesar liquidaciones de guardias médicas con reglas de negocio complejas:

- **Módulo Pediatría**: Pago por producción (consultas) con retención del 30%
- **Módulo Ginecología**: Pago por hora con reglas especiales para residentes
- **Adicionales**: Configuración dinámica de montos extra por Obra Social

---

## 📋 Tablas Principales

### 1. `medicos`
**Propósito**: Registro maestro de médicos (residentes y de planta)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `nombre` | VARCHAR(255) | Nombre completo del médico |
| `matricula` | VARCHAR(50) | Matrícula profesional (ÚNICA) |
| `es_residente` | BOOLEAN | `true` = Residente, `false` = Médico de planta |
| `especialidad` | VARCHAR(100) | Especialidad médica |
| `activo` | BOOLEAN | Estado del médico en el sistema |

**Índices**:
- `idx_medicos_matricula`: Búsqueda rápida por matrícula
- `idx_medicos_especialidad`: Filtrado por especialidad
- `idx_medicos_nombre_trgm`: Búsqueda full-text por nombre

**Reglas de Negocio**:
- Si `es_residente = true` Y especialidad = "Ginecología" → Aplicar regla de horario formativo (07:30-15:00 = $0)
- Cada médico tiene una matrícula única que se usa en el naming de PDFs

---

### 2. `tarifas_guardia`
**Propósito**: Histórico de tarifas por tipo de guardia (permite cambios de precio en el tiempo)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `tipo_guardia` | VARCHAR(50) | 'Pediatría', 'Ginecología' |
| `fecha_vigencia` | DATE | Fecha desde la cual aplica esta tarifa |
| `valor_hora` | DECIMAL(10,2) | Valor por hora (Ginecología) |
| `valor_consulta` | DECIMAL(10,2) | Valor por consulta (Pediatría) |
| `valor_adicional` | DECIMAL(10,2) | Monto adicional fijo |
| `porcentaje_retencion` | DECIMAL(5,2) | % de retención (ej. 30%) |

**Constraint Único**: `(tipo_guardia, fecha_vigencia)` - Solo una tarifa vigente por tipo/fecha

**Uso**:
```sql
-- Obtener tarifa vigente para Pediatría en Noviembre 2025
SELECT * FROM tarifas_guardia
WHERE tipo_guardia = 'Pediatría'
  AND fecha_vigencia <= '2025-11-01'
ORDER BY fecha_vigencia DESC
LIMIT 1;
```

---

### 3. `configuracion_adicionales`
**Propósito**: Define qué Obras Sociales pagan adicional por mes/año

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `obra_social` | VARCHAR(100) | Nombre de la OS (ej. 'Damsu', 'Provincia') |
| `especialidad` | VARCHAR(50) | Especialidad donde aplica |
| `mes` | INTEGER | Mes (1-12) |
| `anio` | INTEGER | Año |
| `aplica_adicional` | BOOLEAN | Si se suma el adicional |
| `monto_adicional` | DECIMAL(10,2) | Monto fijo por consulta |

**Constraint Único**: `(obra_social, especialidad, mes, anio)`

**Ejemplo de Uso**:
```sql
-- Damsu y Provincia pagan $1500 adicional en Pediatría en Nov 2025
INSERT INTO configuracion_adicionales VALUES
  ('Damsu', 'Pediatría', 11, 2025, true, 1500.00),
  ('Provincia', 'Pediatría', 11, 2025, true, 1500.00);
```

---

### 4. `liquidaciones_guardia`
**Propósito**: Cabecera de cada liquidación mensual (una por mes/año/especialidad)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `mes` | INTEGER | Mes de la liquidación (1-12) |
| `anio` | INTEGER | Año de la liquidación |
| `especialidad` | VARCHAR(50) | 'Pediatría', 'Ginecología' |
| `estado` | VARCHAR(50) | 'borrador', 'procesando', 'finalizada', 'aprobada' |
| `total_consultas` | INTEGER | Cantidad total de consultas |
| `total_bruto` | DECIMAL(12,2) | Suma de montos facturados |
| `total_retenciones` | DECIMAL(12,2) | Suma de retenciones |
| `total_adicionales` | DECIMAL(12,2) | Suma de adicionales |
| `total_neto` | DECIMAL(12,2) | Total a pagar a médicos |
| `archivo_nombre` | VARCHAR(255) | Nombre del Excel original |
| `archivo_url` | TEXT | URL del archivo en storage |

**Constraint Único**: `(mes, anio, especialidad)` - Una liquidación por periodo/especialidad

**Estados**:
- `borrador`: En edición, se pueden agregar/modificar filas
- `procesando`: Calculando importes
- `finalizada`: Lista para revisión
- `aprobada`: Cerrada, no se puede modificar

---

### 5. `detalle_guardia`
**Propósito**: Cada fila procesada del Excel (consultas/atenciones individuales)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `liquidacion_id` | UUID | FK a `liquidaciones_guardia` |
| `medico_id` | UUID | FK a `medicos` (nullable) |
| `fecha` | DATE | Fecha de la atención |
| `hora` | TIME | Hora de la atención |
| `paciente` | VARCHAR(255) | Nombre del paciente |
| `obra_social` | VARCHAR(100) | Obra Social |
| `medico_nombre` | VARCHAR(255) | Nombre del médico (desnormalizado) |
| `medico_matricula` | VARCHAR(50) | Matrícula (desnormalizado) |
| `medico_es_residente` | BOOLEAN | Si es residente (desnormalizado) |
| `monto_facturado` | DECIMAL(10,2) | Monto original facturado |
| `porcentaje_retencion` | DECIMAL(5,2) | % de retención aplicado |
| `monto_retencion` | DECIMAL(10,2) | Monto retenido |
| `monto_adicional` | DECIMAL(10,2) | Adicional por OS |
| `importe_calculado` | DECIMAL(10,2) | **Neto final para el médico** |
| `aplica_adicional` | BOOLEAN | Si se aplicó adicional |
| `es_horario_formativo` | BOOLEAN | Si es residente en horario 07:30-15:00 |
| `estado_revision` | VARCHAR(50) | 'pendiente', 'revisado', 'observado', 'aprobado' |
| `observaciones` | TEXT | Notas de revisión |
| `fila_excel` | INTEGER | Número de fila original del Excel |

**Desnormalización**: Los datos del médico se copian al detalle para mantener histórico (si el médico cambia de nombre/matrícula, el histórico no se altera)

**Cálculo de `importe_calculado`**:

#### Pediatría:
```
importe_calculado = (monto_facturado - (monto_facturado * porcentaje_retencion / 100)) + monto_adicional
```

Ejemplo:
```
Monto facturado: $10,000
Retención 30%: $3,000
Adicional Damsu: $1,500
Neto: $10,000 - $3,000 + $1,500 = $8,500
```

#### Ginecología:
```
Si es_horario_formativo = true:
  importe_calculado = 0
Sino:
  importe_calculado = valor_hora * horas_trabajadas
```

---

### 6. `feriados`
**Propósito**: Catálogo de feriados nacionales/provinciales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `fecha` | DATE | Fecha del feriado (ÚNICA) |
| `descripcion` | VARCHAR(255) | Nombre del feriado |
| `tipo` | VARCHAR(50) | 'nacional', 'provincial', 'local' |

**Uso**: Detectar guardias en feriados para aplicar reglas especiales (ej. plus horario)

---

### 7. `logs_procesamiento`
**Propósito**: Auditoría de procesamiento de archivos Excel

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `liquidacion_id` | UUID | FK a `liquidaciones_guardia` |
| `tipo_evento` | VARCHAR(50) | 'inicio', 'error', 'advertencia', 'finalizado' |
| `mensaje` | TEXT | Descripción del evento |
| `detalle` | JSONB | Información adicional en JSON |

**Ejemplo de Log**:
```json
{
  "tipo_evento": "advertencia",
  "mensaje": "Fila sin hora detectada",
  "detalle": {
    "fila_excel": 42,
    "paciente": "Juan Pérez",
    "fecha": "2025-11-15"
  }
}
```

---

## 🔒 Seguridad (RLS)

Todas las tablas tienen **Row Level Security (RLS)** habilitado.

**Políticas Básicas** (ajustar en producción):
- Usuarios autenticados: Lectura y escritura completa
- En producción: Refinar por roles (admin, médico, auditor)

**Ejemplo de Política Avanzada** (implementar después):
```sql
-- Los médicos solo ven sus propias liquidaciones
CREATE POLICY "Médicos ven solo sus datos" ON detalle_guardia
  FOR SELECT USING (
    medico_id = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );
```

---

## 📊 Vistas Útiles

### `v_resumen_liquidaciones`
Resumen de liquidaciones con totales y cantidad de médicos

```sql
SELECT * FROM v_resumen_liquidaciones
WHERE anio = 2025 AND mes = 11;
```

### `v_detalle_completo`
Detalle de guardias con información de liquidación

```sql
SELECT * FROM v_detalle_completo
WHERE medico_matricula = '12345'
  AND mes = 11 AND anio = 2025;
```

---

## 🔄 Triggers Automáticos

### `update_updated_at_column()`
Actualiza automáticamente el campo `updated_at` en cada UPDATE

Aplicado a:
- `medicos`
- `tarifas_guardia`
- `configuracion_adicionales`
- `liquidaciones_guardia`
- `detalle_guardia`
- `feriados`

---

## 🌱 Datos Iniciales (Seed)

### Feriados 2025
15 feriados nacionales de Argentina pre-cargados

### Tarifas Ejemplo
- Pediatría: $5,000 por consulta, 30% retención
- Ginecología: $8,000 por hora, 0% retención

### Adicionales Ejemplo
- Damsu: $1,500 adicional en Pediatría (Nov 2025)
- Provincia: $1,200 adicional en Pediatría (Nov 2025)

---

## 🚀 Próximos Pasos

1. ✅ **Migración ejecutada** → Crear tipos TypeScript
2. ⏳ **Tipos TypeScript** → Definir interfaces que coincidan con el schema
3. ⏳ **Servicio de Procesamiento** → Lógica de negocio para calcular importes
4. ⏳ **API Routes** → Endpoints para CRUD de liquidaciones
5. ⏳ **UI Components** → Interfaz con estética Grow Labs

---

**Powered by Grow Labs 🌱**
© 2025 - Sistema de Liquidaciones de Guardias Médicas

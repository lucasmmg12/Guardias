# 🚀 Guía de Ejecución: Migración del Sistema de Guardias

---

## ✅ Migración Segura - Sin Riesgo para Instrumentadores

Esta guía te llevará paso a paso para agregar el sistema de Guardias a tu base de datos existente **sin afectar el sistema de Instrumentadores**.

---

## 📋 Pre-requisitos

- ✅ Acceso a Supabase Dashboard
- ✅ Proyecto de Supabase con sistema de Instrumentadores funcionando
- ✅ 5 minutos de tiempo

---

## 🛡️ Paso 0: Backup (Recomendado - 2 min)

Aunque la migración es segura, siempre es buena práctica hacer un backup:

### Opción A: Backup Automático de Supabase
1. Ir a **Supabase Dashboard** → **Settings** → **Database**
2. Scroll down hasta **Database Backups**
3. Hacer clic en **Create backup now**
4. Esperar confirmación

### Opción B: Export Manual (Opcional)
```bash
# Si tienes Supabase CLI instalado
supabase db dump -f backup_antes_guardias.sql
```

---

## 🚀 Paso 1: Ejecutar Migración (2 min)

### 1.1. Abrir SQL Editor
1. Ir a **Supabase Dashboard**
2. Click en **SQL Editor** (icono de base de datos en el menú lateral)
3. Click en **New query**

### 1.2. Copiar Script de Migración
1. Abrir el archivo: `database/migrations/002_add_guardias_system.sql`
2. Copiar **TODO** el contenido (Ctrl+A, Ctrl+C)
3. Pegar en el SQL Editor de Supabase (Ctrl+V)

### 1.3. Ejecutar
1. Click en **Run** (o presionar Ctrl+Enter)
2. Esperar a que termine (debería tomar ~5-10 segundos)

### 1.4. Verificar Resultado
Deberías ver mensajes como:

```
✅ Migración completada exitosamente
📊 Tablas nuevas creadas: 6
🔒 RLS habilitado en todas las tablas nuevas
🌱 Datos iniciales insertados (feriados 2025, tarifas ejemplo)
⚠️  IMPORTANTE: La tabla "feriados" es COMPARTIDA con el sistema de Instrumentadores
```

---

## ✅ Paso 2: Verificación (2 min)

### 2.1. Verificar Tablas Nuevas
1. Ir a **Table Editor**
2. Verificar que aparecen las **6 tablas nuevas**:
   - ✅ `medicos`
   - ✅ `tarifas_guardia`
   - ✅ `configuracion_adicionales`
   - ✅ `liquidaciones_guardia`
   - ✅ `detalle_guardia`
   - ✅ `logs_procesamiento`

### 2.2. Verificar Tablas de Instrumentadores (IMPORTANTE)
Verificar que **TODAS** las tablas de Instrumentadores siguen ahí:
- ✅ `instrumentadores`
- ✅ `liquidaciones`
- ✅ `detalle`
- ✅ `nomenclador`
- ✅ `perfiles_personales`
- ✅ `plus_horario_config`
- ✅ ... (todas las demás)

### 2.3. Verificar Datos Seed
1. Abrir tabla `feriados`
2. Verificar que tiene feriados de 2025 (al menos 15 filas)
3. Abrir tabla `tarifas_guardia`
4. Verificar que tiene 2 filas (Pediatría y Ginecología)

### 2.4. Ejecutar Query de Verificación (Opcional)
```sql
-- Contar tablas de Guardias
SELECT COUNT(*) as tablas_guardias
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'medicos',
    'tarifas_guardia',
    'configuracion_adicionales',
    'liquidaciones_guardia',
    'detalle_guardia',
    'logs_procesamiento'
  );
-- Debe retornar: 6

-- Contar tablas de Instrumentadores (ejemplo)
SELECT COUNT(*) as tablas_instrumentadores
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'instrumentadores',
    'liquidaciones',
    'detalle',
    'nomenclador'
  );
-- Debe retornar: 4 (o más, según tu configuración)

-- Verificar feriados 2025
SELECT COUNT(*) as feriados_2025
FROM feriados
WHERE fecha >= '2025-01-01' AND fecha < '2026-01-01';
-- Debe retornar: al menos 15
```

---

## 🎉 ¡Migración Completada!

Si todos los pasos anteriores fueron exitosos:

✅ **Sistema de Guardias**: Instalado correctamente  
✅ **Sistema de Instrumentadores**: Intacto y funcionando  
✅ **Tabla feriados**: Compartida entre ambos sistemas  
✅ **Datos seed**: Insertados correctamente  

---

## 🔄 Rollback (Solo si algo salió mal)

Si por alguna razón necesitas revertir la migración:

### Paso 1: Ejecutar Script de Rollback
1. Ir a **SQL Editor**
2. Abrir `database/migrations/002_rollback_guardias_system.sql`
3. Copiar TODO el contenido
4. Pegar en SQL Editor
5. Click en **Run**

### Paso 2: Verificar
1. Ir a **Table Editor**
2. Verificar que las tablas de Guardias fueron eliminadas
3. Verificar que las tablas de Instrumentadores siguen ahí
4. Verificar que la tabla `feriados` sigue existiendo

### Paso 3: Re-aplicar (Si quieres)
1. Ejecutar nuevamente `002_add_guardias_system.sql`

---

## 📊 Estructura Final de la Base de Datos

Después de la migración, tu base de datos tendrá:

```
📦 Base de Datos Supabase
│
├── 🏥 Sistema de Instrumentadores (INTACTO)
│   ├── instrumentadores
│   ├── liquidaciones
│   ├── detalle
│   ├── nomenclador
│   ├── perfiles_personales
│   ├── plus_horario_config
│   └── ... (otras tablas)
│
├── 🩺 Sistema de Guardias (NUEVO)
│   ├── medicos
│   ├── tarifas_guardia
│   ├── configuracion_adicionales
│   ├── liquidaciones_guardia
│   ├── detalle_guardia
│   └── logs_procesamiento
│
└── 🔗 Compartidas
    └── feriados (usada por ambos sistemas)
```

---

## 🚀 Próximos Pasos

Ahora que la base de datos está lista:

1. **Configurar Variables de Entorno**
   - Copiar URL y API keys de Supabase
   - Crear `.env.local` en el proyecto Next.js

2. **Inicializar Proyecto Next.js**
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app
   ```

3. **Instalar Dependencias**
   ```bash
   npm install @supabase/supabase-js xlsx jspdf jspdf-autotable
   ```

4. **Comenzar Desarrollo**
   - Seguir el checklist en `CHECKLIST_IMPLEMENTACION.md`
   - Comenzar con Fase 2: Configuración del Proyecto

---

## 📞 Soporte

Si tienes algún problema:

1. **Revisar logs** en SQL Editor (mensajes de error)
2. **Ejecutar rollback** si es necesario
3. **Verificar** que tienes permisos de admin en Supabase
4. **Consultar** la documentación en `database/SCHEMA_DOCUMENTATION.md`

---

## ✅ Checklist de Verificación Final

Marca cada ítem después de verificarlo:

- [ ] Migración ejecutada sin errores
- [ ] 6 tablas nuevas de Guardias creadas
- [ ] Todas las tablas de Instrumentadores intactas
- [ ] Tabla `feriados` tiene datos de 2025
- [ ] Tabla `tarifas_guardia` tiene 2 filas
- [ ] Tabla `configuracion_adicionales` tiene 2 filas
- [ ] Puedo ver todas las tablas en Table Editor
- [ ] No hay errores en SQL Editor

---

**¡Felicitaciones! 🎉 Tu base de datos está lista para el Sistema de Guardias Médicas.**

---

**Powered by Grow Labs 🌱**  
© 2025 - Sistema de Liquidaciones de Guardias Médicas

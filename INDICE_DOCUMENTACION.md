# 📚 Índice de Documentación - Sistema de Liquidaciones de Guardias Médicas

---

## 🎯 Visión General del Proyecto

El **Sistema de Liquidaciones de Guardias Médicas (S.L.G.)** es una aplicación web desarrollada para Grow Labs que permite procesar, calcular y gestionar liquidaciones de guardias médicas con reglas de negocio complejas.

**Stack Tecnológico**:
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Shadcn/UI
- Backend: Next.js API Routes + Supabase (PostgreSQL)
- Procesamiento: xlsx (Excel) + jsPDF (PDFs)

**Especialidades Soportadas**:
- **Pediatría**: Pago por producción con retención del 30%
- **Ginecología**: Pago por hora con reglas de residentes

---

## 📁 Estructura de Archivos

```
c:\Users\lucas\Desktop\Osde\Liquidaciones\Guardias\
│
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql          ⭐ Script SQL de migración
│   └── SCHEMA_DOCUMENTATION.md             ⭐ Documentación del esquema
│
├── lib/
│   ├── types.ts                            ⭐ Tipos TypeScript
│   └── guardias-processor.ts               ⭐ Servicio de procesamiento (pseudocódigo)
│
├── ARQUITECTURA.md                         ⭐ Diagramas de arquitectura
├── CASOS_DE_PRUEBA.md                      ⭐ Casos de prueba y tests
├── CHECKLIST_IMPLEMENTACION.md             ⭐ Checklist de tareas
├── README_FASE_1.md                        ⭐ Resumen de Fase 1
├── INDICE_DOCUMENTACION.md                 ⭐ Este archivo
│
└── [Archivos de referencia heredados]
    ├── CAMBIOS_ESTETICA_GROW.md
    ├── FONDO_GROW.md
    ├── MEJORAS_PDF_FINAL.md
    ├── MEJORAS_UX_EDICION_INLINE.md
    └── REGLAS_LIQUIDACION.md
```

---

## 📖 Guía de Lectura por Rol

### 👨‍💼 Para Project Managers / Product Owners

**Lectura Recomendada**:
1. **README_FASE_1.md** - Resumen ejecutivo del proyecto
2. **ARQUITECTURA.md** - Visión general de la arquitectura
3. **CHECKLIST_IMPLEMENTACION.md** - Progreso y planificación

**Tiempo estimado**: 15-20 minutos

---

### 👨‍💻 Para Desarrolladores Backend

**Lectura Recomendada**:
1. **database/SCHEMA_DOCUMENTATION.md** - Entender el modelo de datos
2. **database/migrations/001_initial_schema.sql** - Revisar el script SQL
3. **lib/types.ts** - Familiarizarse con los tipos
4. **lib/guardias-processor.ts** - Entender la lógica de negocio
5. **CASOS_DE_PRUEBA.md** - Casos de prueba para implementar

**Tiempo estimado**: 45-60 minutos

**Tareas Inmediatas**:
- Ejecutar migración SQL en Supabase
- Convertir pseudocódigo de `guardias-processor.ts` a código real
- Implementar API Routes

---

### 👨‍🎨 Para Desarrolladores Frontend

**Lectura Recomendada**:
1. **CAMBIOS_ESTETICA_GROW.md** - Entender la estética Grow Labs
2. **FONDO_GROW.md** - Implementación del fondo parallax
3. **MEJORAS_UX_EDICION_INLINE.md** - Componente InlineEditCell
4. **lib/types.ts** - Tipos para componentes
5. **ARQUITECTURA.md** (sección "Componentes UI")

**Tiempo estimado**: 30-45 minutos

**Tareas Inmediatas**:
- Configurar Next.js con Tailwind y Shadcn/UI
- Implementar layout raíz con fondo Grow Labs
- Crear componentes base (InlineEditCell, Footer, etc.)

---

### 🧪 Para QA / Testers

**Lectura Recomendada**:
1. **CASOS_DE_PRUEBA.md** - Casos de prueba detallados
2. **README_FASE_1.md** (sección "Reglas de Negocio")
3. **CHECKLIST_IMPLEMENTACION.md** (Fase 5: Testing)

**Tiempo estimado**: 30-40 minutos

**Tareas Inmediatas**:
- Preparar datos de prueba (médicos, tarifas, Excels)
- Crear plan de testing
- Configurar entorno de testing

---

### 🏗️ Para Arquitectos de Software

**Lectura Recomendada**:
1. **ARQUITECTURA.md** - Diagramas completos
2. **database/SCHEMA_DOCUMENTATION.md** - Modelo de datos
3. **lib/guardias-processor.ts** - Lógica de negocio
4. **README_FASE_1.md** - Visión general

**Tiempo estimado**: 60-90 minutos

---

## 📚 Documentación Detallada

### 1. 📊 Base de Datos

#### `database/migrations/001_initial_schema.sql`
**Contenido**:
- Script SQL completo de migración inicial
- 7 tablas principales (medicos, tarifas_guardia, configuracion_adicionales, liquidaciones_guardia, detalle_guardia, feriados, logs_procesamiento)
- Índices optimizados
- Triggers para `updated_at`
- Políticas RLS básicas
- Vistas útiles
- Datos seed (feriados 2025, tarifas ejemplo)

**Líneas de código**: ~450

**Uso**:
```bash
# Ejecutar en Supabase SQL Editor
# O usar Supabase CLI
supabase db push
```

---

#### `database/SCHEMA_DOCUMENTATION.md`
**Contenido**:
- Documentación completa de cada tabla
- Descripción de campos y tipos
- Relaciones entre tablas
- Reglas de negocio por tabla
- Ejemplos de queries SQL
- Políticas de seguridad (RLS)
- Vistas y su uso

**Secciones**:
1. Visión General
2. Tablas Principales (7 tablas)
3. Seguridad (RLS)
4. Vistas Útiles
5. Triggers Automáticos
6. Datos Iniciales (Seed)
7. Próximos Pasos

**Tiempo de lectura**: 20-25 minutos

---

### 2. 💻 Código TypeScript

#### `lib/types.ts`
**Contenido**:
- Tipos base y enums (EstadoLiquidacion, EstadoRevision, Especialidad, etc.)
- Interfaces para todas las tablas (Row, Insert, Update)
- Tipos auxiliares para procesamiento de Excel
- Tipos para exportación de PDF
- Tipos para reglas de negocio
- Tipos para validación
- Tipo `Database` compatible con Supabase

**Líneas de código**: ~600

**Estructura**:
```typescript
// Enums
export type EstadoLiquidacion = 'borrador' | 'procesando' | ...

// Tablas
export interface Medico { ... }
export interface MedicoInsert { ... }
export interface MedicoUpdate { ... }

// Auxiliares
export interface FilaExcelCruda { ... }
export interface ResultadoProcesamiento { ... }

// Database
export interface Database { ... }
```

---

#### `lib/guardias-processor.ts`
**Contenido**:
- Pseudocódigo detallado del servicio de procesamiento
- Clase `GuardiasProcessor`
- Método principal: `procesarExcel()`
- Módulo Pediatría: `procesarFilaPediatria()`
- Módulo Ginecología: `procesarFilaGinecologia()`
- Funciones de normalización (fechas, horas, textos, números)
- Funciones de validación
- Funciones de DB (crear, insertar, calcular totales)

**Líneas de código**: ~800 (pseudocódigo)

**Estructura**:
```typescript
export class GuardiasProcessor {
  constructor(config, supabaseClient) { ... }
  
  // Método principal
  async procesarExcel(archivo, nombre) { ... }
  
  // Módulos específicos
  private async procesarFilaPediatria(...) { ... }
  private async procesarFilaGinecologia(...) { ... }
  
  // Funciones auxiliares
  private esHorarioFormativo(hora) { ... }
  private convertirFecha(fecha) { ... }
  private convertirHora(hora) { ... }
  ...
}
```

**Estado**: Pseudocódigo completo, listo para convertir a código real

---

### 3. 📐 Arquitectura

#### `ARQUITECTURA.md`
**Contenido**:
- Diagrama de arquitectura general (Frontend, Backend, DB)
- Flujo de procesamiento de Excel (9 pasos)
- Flujo de reglas de negocio - Pediatría
- Flujo de reglas de negocio - Ginecología
- Modelo de datos (relaciones entre tablas)
- Seguridad y permisos (RLS)
- Componentes UI (jerarquía)

**Diagramas**:
1. Arquitectura General (3 capas)
2. Flujo de Procesamiento de Excel (paso a paso)
3. Flujo Pediatría (cálculo de importes)
4. Flujo Ginecología (regla de residentes)
5. Modelo Entidad-Relación
6. Políticas RLS por rol
7. Jerarquía de Componentes UI

**Tiempo de lectura**: 30-40 minutos

---

### 4. 🧪 Testing

#### `CASOS_DE_PRUEBA.md`
**Contenido**:
- Casos de prueba para Pediatría (3 casos)
- Casos de prueba para Ginecología (4 casos)
- Casos de prueba de normalización de datos (2 casos)
- Casos de prueba de limpieza de datos (1 caso)
- Casos de prueba de cálculo de totales (1 caso)
- Tests unitarios sugeridos (4 suites)
- Datos de prueba (seed)

**Casos Totales**: 11 casos de prueba detallados

**Ejemplo de Caso**:
```
Caso 2: Consulta con Adicional (Damsu)
Entrada: { monto_facturado: 8000, obra_social: 'Damsu', ... }
Proceso: 
  1. Retención 30%: $2,400
  2. Neto: $5,600
  3. Adicional Damsu: $1,500
  4. Total: $7,100
Salida Esperada: { importe_calculado: 7100, aplica_adicional: true }
```

**Tiempo de lectura**: 25-30 minutos

---

### 5. 📋 Planificación

#### `CHECKLIST_IMPLEMENTACION.md`
**Contenido**:
- Checklist completo dividido en 7 fases
- Fase 1: Arquitectura y Diseño ✅ COMPLETADA (100%)
- Fase 2: Configuración del Proyecto (0%)
- Fase 3: Backend (0%)
- Fase 4: Frontend (0%)
- Fase 5: Testing (0%)
- Fase 6: Deployment (0%)
- Fase 7: Mantenimiento (0%)

**Total de Tareas**: ~150 tareas

**Progreso Actual**: Fase 1 completada (100%)

**Uso**: Marcar checkboxes a medida que se completan tareas

---

#### `README_FASE_1.md`
**Contenido**:
- Resumen ejecutivo de la Fase 1
- Tareas completadas
- ADN Grow Labs heredado
- Reglas de negocio implementadas
- Estructura de archivos creados
- Próximos pasos (Fases 2-4)
- Stack tecnológico
- Comandos útiles
- Métricas de éxito

**Secciones**:
1. Tareas Completadas
2. ADN Grow Labs Heredado
3. Reglas de Negocio
4. Estructura de Archivos
5. Próximos Pasos
6. Stack Tecnológico
7. Comandos Útiles
8. Métricas de Éxito
9. Documentación de Referencia

**Tiempo de lectura**: 15-20 minutos

---

### 6. 🎨 Estética Grow Labs (Heredado)

#### `CAMBIOS_ESTETICA_GROW.md`
**Contenido**:
- Paleta de colores Grow Labs (verde, azul, púrpura)
- Efectos aplicados (glassmorphism, glow, animaciones)
- Assets utilizados (logogrow.png, fondogrow.png)
- Características de diseño
- Guía de uso para nuevas páginas

**Paleta Principal**:
- Verde: `from-green-400 to-emerald-300`
- Azul: `from-blue-500 to-cyan-500`
- Púrpura: `from-purple-500 to-pink-500`

---

#### `FONDO_GROW.md`
**Contenido**:
- Implementación del fondo `fondogrow.png`
- Efecto parallax (background-attachment: fixed)
- Overlay oscuro semi-transparente
- Estructura de capas (z-index)
- Personalización (opacidad, blur)

**Código de Ejemplo**:
```tsx
<body style={{
  backgroundImage: 'url(/fondogrow.png)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed'
}}>
  <div className="fixed inset-0 bg-gradient-to-br from-gray-900/85 via-gray-800/90 to-black/85" />
  <div className="relative z-10">{children}</div>
</body>
```

---

#### `MEJORAS_PDF_FINAL.md`
**Contenido**:
- Configuración de márgenes (15mm)
- Ancho útil (180mm)
- Anchos de columnas optimizados
- Layout balanceado
- Naming convention: `{MATRICULA}_{SIGLA}_{PERIODO}.pdf`

**Tabla de Columnas**:
| Columna | Ancho | Total |
|---------|-------|-------|
| Fecha | 23mm | |
| Paciente | 38mm | |
| Procedimiento | 58mm | |
| Observación | 15mm | |
| Valor | 22mm | |
| Cirujano | 24mm | |
| **TOTAL** | **180mm** | ✅ |

---

#### `MEJORAS_UX_EDICION_INLINE.md`
**Contenido**:
- Componente `InlineEditCell`
- Colores para dark mode
- Botones de acción (guardar, cancelar)
- Vista de solo lectura con hover
- Atajos de teclado (Enter, Escape)

**Código de Ejemplo**:
```tsx
<Input
  className="h-8 bg-gray-800 text-white border-green-500/50 
             focus:border-green-400 focus:ring-green-400/50"
  autoFocus
/>
```

---

#### `REGLAS_LIQUIDACION.md`
**Contenido** (del proyecto anterior):
- Factor de liquidación (primer proc 100%, restantes 50%)
- Plus del 20% por horario especial
- Feriados nacionales 2025
- Ejemplos de cálculo

**Nota**: Este archivo es del proyecto anterior (Instrumentadores), pero sirve de referencia para entender la lógica de factores y plus horarios.

---

## 🚀 Cómo Empezar

### Para Desarrolladores Nuevos

1. **Leer documentación base** (30 min):
   - `README_FASE_1.md`
   - `ARQUITECTURA.md`

2. **Entender el modelo de datos** (20 min):
   - `database/SCHEMA_DOCUMENTATION.md`

3. **Familiarizarse con los tipos** (15 min):
   - `lib/types.ts`

4. **Entender la lógica de negocio** (30 min):
   - `lib/guardias-processor.ts`
   - `CASOS_DE_PRUEBA.md`

5. **Revisar el checklist** (10 min):
   - `CHECKLIST_IMPLEMENTACION.md`

**Tiempo total**: ~2 horas

---

### Para Continuar el Desarrollo

**Próximo Paso**: Iniciar **Fase 2 - Configuración del Proyecto**

1. Crear proyecto en Supabase Cloud
2. Ejecutar migración SQL (`001_initial_schema.sql`)
3. Inicializar proyecto Next.js
4. Instalar dependencias
5. Configurar estilos Grow Labs

**Ver**: `CHECKLIST_IMPLEMENTACION.md` (Fase 2)

---

## 📊 Estadísticas del Proyecto

### Documentación Generada
- **Archivos creados**: 8
- **Líneas de código**: ~2,500
- **Líneas de documentación**: ~1,800
- **Casos de prueba**: 11
- **Diagramas**: 7
- **Tareas planificadas**: ~150

### Cobertura
- ✅ Base de Datos: 100%
- ✅ Tipos TypeScript: 100%
- ✅ Lógica de Negocio: 100% (pseudocódigo)
- ✅ Arquitectura: 100%
- ✅ Testing: 100% (casos definidos)
- ⏳ Implementación: 0% (pendiente Fase 2-7)

---

## 🔗 Enlaces Rápidos

### Documentación Técnica
- [Esquema de Base de Datos](database/SCHEMA_DOCUMENTATION.md)
- [Tipos TypeScript](lib/types.ts)
- [Servicio de Procesamiento](lib/guardias-processor.ts)
- [Arquitectura del Sistema](ARQUITECTURA.md)

### Testing
- [Casos de Prueba](CASOS_DE_PRUEBA.md)

### Planificación
- [Resumen Fase 1](README_FASE_1.md)
- [Checklist de Implementación](CHECKLIST_IMPLEMENTACION.md)

### Estética Grow Labs
- [Cambios de Estética](CAMBIOS_ESTETICA_GROW.md)
- [Fondo Parallax](FONDO_GROW.md)
- [Mejoras PDF](MEJORAS_PDF_FINAL.md)
- [Edición Inline](MEJORAS_UX_EDICION_INLINE.md)

---

## 📞 Contacto y Soporte

**Proyecto**: Sistema de Liquidaciones de Guardias Médicas (S.L.G.)  
**Cliente**: Grow Labs  
**Versión**: 1.0.0  
**Fecha**: 2025-11-25  

---

**Powered by Grow Labs 🌱**  
© 2025 - Todos los derechos reservados

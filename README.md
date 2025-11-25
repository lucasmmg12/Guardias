# 🏥 Sistema de Liquidaciones de Guardias Médicas (S.L.G.)

<div align="center">

![Grow Labs](https://img.shields.io/badge/Grow%20Labs-Sistema%20de%20Liquidaciones-22c55e?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)

**Sistema web para procesar, calcular y gestionar liquidaciones de guardias médicas con reglas de negocio complejas**

[📚 Documentación](#-documentación) •
[🚀 Inicio Rápido](#-inicio-rápido) •
[🎯 Características](#-características) •
[🏗️ Arquitectura](#️-arquitectura) •
[📊 Estado del Proyecto](#-estado-del-proyecto)

</div>

---

## 🎯 Características

### ✨ Funcionalidades Principales

- **📤 Procesamiento de Excel**: Carga y procesa archivos Excel con datos de guardias médicas
- **🧮 Cálculo Automático**: Aplica reglas de negocio complejas según especialidad
- **📄 Generación de PDFs**: Exporta liquidaciones individuales por médico con estilo Grow Labs
- **✏️ Edición Inline**: Modifica datos directamente en las tablas sin recargar la página
- **📊 Dashboard Completo**: Visualiza totales, estadísticas y resúmenes
- **🔐 Seguridad RLS**: Row Level Security para proteger datos sensibles

### 🏥 Módulos Especializados

#### 🩺 Módulo Pediatría
- Pago por **producción** (consultas)
- Retención del **30%** sobre monto facturado
- **Adicionales** configurables por Obra Social (ej. Damsu, Provincia)
- Fórmula: `(Monto Facturado - 30% Retención) + Adicional`

#### 🤰 Módulo Ginecología
- Pago por **hora trabajada**
- **Regla de Residentes**: Si es residente Y hora entre 07:30-15:00 → Importe $0 (horario formativo)
- Médicos de planta cobran siempre
- Residentes fuera de horario formativo cobran normalmente

---

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **Componentes UI**: Shadcn/UI
- **Iconos**: Lucide React

### Backend
- **Base de Datos**: Supabase (PostgreSQL)
- **API**: Next.js API Routes
- **Procesamiento Excel**: xlsx
- **Generación PDF**: jsPDF + jspdf-autotable

### DevOps
- **Hosting**: Vercel
- **Base de Datos**: Supabase Cloud
- **Storage**: Supabase Storage

---

## 📊 Estado del Proyecto

### ✅ Fase 1: Arquitectura y Diseño - **COMPLETADA** (100%)

- [x] Script SQL de migración para Supabase
- [x] Tipos TypeScript completos
- [x] Pseudocódigo del servicio de procesamiento
- [x] Documentación técnica completa
- [x] Casos de prueba definidos
- [x] Diagramas de arquitectura

### ⏳ Próximas Fases

- [ ] **Fase 2**: Configuración del Proyecto (0%)
- [ ] **Fase 3**: Backend - Servicios y API (0%)
- [ ] **Fase 4**: Frontend - UI/UX (0%)
- [ ] **Fase 5**: Testing y Validación (0%)
- [ ] **Fase 6**: Deployment y Producción (0%)

**Ver progreso detallado**: [CHECKLIST_IMPLEMENTACION.md](CHECKLIST_IMPLEMENTACION.md)

---

## 📚 Documentación

### 📖 Documentación Principal

| Documento | Descripción | Tiempo de Lectura |
|-----------|-------------|-------------------|
| **[INDICE_DOCUMENTACION.md](INDICE_DOCUMENTACION.md)** | 📚 Índice maestro de toda la documentación | 5 min |
| **[README_FASE_1.md](README_FASE_1.md)** | 📋 Resumen ejecutivo de la Fase 1 | 15 min |
| **[ARQUITECTURA.md](ARQUITECTURA.md)** | 🏗️ Diagramas de arquitectura y flujos | 30 min |
| **[CHECKLIST_IMPLEMENTACION.md](CHECKLIST_IMPLEMENTACION.md)** | ✅ Checklist de tareas por fase | 10 min |

### 🗄️ Base de Datos

| Documento | Descripción |
|-----------|-------------|
| **[database/migrations/001_initial_schema.sql](database/migrations/001_initial_schema.sql)** | Script SQL de migración inicial |
| **[database/SCHEMA_DOCUMENTATION.md](database/SCHEMA_DOCUMENTATION.md)** | Documentación completa del esquema |

### 💻 Código

| Documento | Descripción |
|-----------|-------------|
| **[lib/types.ts](lib/types.ts)** | Tipos TypeScript (~600 líneas) |
| **[lib/guardias-processor.ts](lib/guardias-processor.ts)** | Servicio de procesamiento (pseudocódigo ~800 líneas) |

### 🧪 Testing

| Documento | Descripción |
|-----------|-------------|
| **[CASOS_DE_PRUEBA.md](CASOS_DE_PRUEBA.md)** | 11 casos de prueba detallados + tests unitarios |

### 🎨 Estética Grow Labs

| Documento | Descripción |
|-----------|-------------|
| **[CAMBIOS_ESTETICA_GROW.md](CAMBIOS_ESTETICA_GROW.md)** | Paleta de colores y efectos |
| **[FONDO_GROW.md](FONDO_GROW.md)** | Implementación del fondo parallax |
| **[MEJORAS_PDF_FINAL.md](MEJORAS_PDF_FINAL.md)** | Configuración de PDFs |
| **[MEJORAS_UX_EDICION_INLINE.md](MEJORAS_UX_EDICION_INLINE.md)** | Componente InlineEditCell |

---

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ y npm
- Cuenta de Supabase
- Git

### 1. Configurar Supabase

```bash
# 1. Crear proyecto en https://supabase.com
# 2. Ir a SQL Editor
# 3. Copiar y ejecutar: database/migrations/001_initial_schema.sql
```

### 2. Clonar y Configurar Proyecto

```bash
# Clonar repositorio
git clone <repo-url>
cd Guardias

# Instalar dependencias (cuando esté configurado Next.js)
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase
```

### 3. Ejecutar en Desarrollo

```bash
npm run dev
# Abrir http://localhost:3000
```

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 14)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Dashboard   │  │ Liquidaciones│  │    Admin     │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ API Routes
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Next.js API Routes)                   │
│  ┌────────────────────┐  ┌────────────────────┐                    │
│  │ GuardiasProcessor  │  │   PDFExporter      │                    │
│  │  - Pediatría       │  │  - jsPDF           │                    │
│  │  - Ginecología     │  │  - Grow Labs Style │                    │
│  └────────────────────┘  └────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Supabase Client
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BASE DE DATOS (Supabase)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   medicos    │  │tarifas_guardia│ │config_adicion│             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │liquidaciones │  │detalle_guardia│ │   feriados   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

**Ver arquitectura completa**: [ARQUITECTURA.md](ARQUITECTURA.md)

---

## 📋 Reglas de Negocio

### Pediatría

```
Importe Neto = Monto Facturado - (Monto Facturado × 30%)
Importe Final = Importe Neto + Adicional (si aplica)

Adicionales:
- Damsu: $1,500 por consulta (configurable por mes/año)
- Provincia: $1,200 por consulta (configurable por mes/año)
```

**Ejemplo**:
```
Monto facturado: $10,000
Retención 30%: $3,000
Adicional Damsu: $1,500
Importe Final: $10,000 - $3,000 + $1,500 = $8,500
```

### Ginecología

```
SI médico.es_residente = true Y hora ENTRE 07:30 Y 15:00:
  Importe = $0 (Horario formativo)
SINO:
  Importe = valor_hora × horas_trabajadas
```

**Ejemplo**:
```
Dr. Juan Residente
Hora: 10:00 → Horario formativo → Importe: $0
Hora: 20:00 → Fuera de horario → Importe: $8,000
```

---

## 🎨 Estética Grow Labs

### Paleta de Colores

- **Verde Principal**: `from-green-400 to-emerald-300`
- **Azul**: `from-blue-500 to-cyan-500`
- **Púrpura**: `from-purple-500 to-pink-500`

### Efectos

- **Glassmorphism**: Vidrio esmerilado en cards
- **Glow Effects**: Sombras luminosas verdes
- **Parallax**: Fondo `fondogrow.png` fijo con scroll
- **Dark Mode**: Obligatorio

### Componentes

- **InlineEditCell**: Edición inline con colores Grow Labs
- **Footer**: Logo y branding Grow Labs
- **Cards**: Glassmorphism con bordes brillantes

---

## 🧪 Testing

### Casos de Prueba Definidos

- ✅ 3 casos de Pediatría (simple, con adicional, múltiples consultas)
- ✅ 4 casos de Ginecología (residente formativo, fuera de horario, planta, límites)
- ✅ 2 casos de normalización (fechas, horas)
- ✅ 1 caso de limpieza de datos
- ✅ 1 caso de cálculo de totales

**Ver casos completos**: [CASOS_DE_PRUEBA.md](CASOS_DE_PRUEBA.md)

---

## 📦 Estructura del Proyecto

```
Guardias/
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql       # Migración SQL
│   └── SCHEMA_DOCUMENTATION.md          # Documentación DB
│
├── lib/
│   ├── types.ts                         # Tipos TypeScript
│   └── guardias-processor.ts            # Servicio de procesamiento
│
├── ARQUITECTURA.md                      # Diagramas de arquitectura
├── CASOS_DE_PRUEBA.md                   # Casos de prueba
├── CHECKLIST_IMPLEMENTACION.md          # Checklist de tareas
├── INDICE_DOCUMENTACION.md              # Índice maestro
├── README_FASE_1.md                     # Resumen Fase 1
└── README.md                            # Este archivo
```

---

## 👥 Equipo

**Cliente**: Grow Labs  
**Proyecto**: Sistema de Liquidaciones de Guardias Médicas  
**Versión**: 1.0.0  
**Fecha de Inicio**: 2025-11-25  

---

## 📄 Licencia

© 2025 Grow Labs. Todos los derechos reservados.

---

## 🔗 Enlaces Útiles

- [Documentación de Next.js 14](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Tailwind CSS](https://tailwindcss.com/docs)
- [Documentación de Shadcn/UI](https://ui.shadcn.com)

---

<div align="center">

**Desarrollado con 💚 por Grow Labs**

[⬆ Volver arriba](#-sistema-de-liquidaciones-de-guardias-médicas-slg)

</div>

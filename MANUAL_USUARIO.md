# 🩺 Manual de Usuario - Sistema de Liquidaciones de Guardias

<div align="center">

![Sistema de Liquidaciones](https://img.shields.io/badge/Sistema-Liquidaciones-green?style=for-the-badge)
![Versión](https://img.shields.io/badge/Versión-1.0-blue?style=for-the-badge)

**Sistema Profesional para la Gestión de Liquidaciones Médicas**

</div>

---

## 🚀 Inicio Rápido - Guía Visual

### ¿Cómo Empezar?

Sigue estos pasos visuales para comenzar a usar el sistema:

```
┌─────────────────────────────────────────────────────────────┐
│                    🏠 PANTALLA PRINCIPAL                     │
│                                                              │
│  ┌──────────────────┐      ┌──────────────────┐            │
│  │   🩺 PEDIATRÍA   │      │   🤰 GINECOLOGÍA  │            │
│  │                  │      │                  │            │
│  │  Pago por        │      │  Pago por        │            │
│  │  producción      │      │  hora            │            │
│  │                  │      │                  │            │
│  │  [Procesar] ────▶│      │  [Procesar] ────▶│            │
│  └──────────────────┘      └──────────────────┘            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          🔧 ACCESO RÁPIDO - ADMINISTRACIÓN            │  │
│  │                                                       │  │
│  │  👨‍⚕️ Médicos  💰 Tarifas  ➕ Adicionales            │  │
│  │  🏥 Valores   📊 Historial                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 📋 Flujo de Trabajo Básico

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE TRABAJO                          │
└─────────────────────────────────────────────────────────────┘

    PASO 1                    PASO 2                    PASO 3
    ┌─────────┐              ┌─────────┐              ┌─────────┐
    │  📥     │              │  ⚙️     │              │  📊     │
    │ Cargar  │    ──────▶   │Procesar │    ──────▶   │Ver      │
    │ Excel   │              │ Datos   │              │Resúmenes│
    └─────────┘              └─────────┘              └─────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
    ┌─────────┐              ┌─────────┐              ┌─────────┐
    │ Selecc. │              │ Validar │              │ Exportar│
    │ Mes/Año │              │ Datos   │              │ PDF/Excel│
    └─────────┘              └─────────┘              └─────────┘
```

### 🎯 ¿Qué Módulo Usar?

```
┌─────────────────────────────────────────────────────────────┐
│                    SELECCIÓN DE MÓDULO                       │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────┐
    │  ¿Qué tipo de liquidación necesitas?  │
    └──────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐      ┌───────────────┐
│  🩺 PEDIATRÍA │      │  🤰 GINECOLOGÍA│
│               │      │               │
│ • Por         │      │ • Por hora    │
│   consulta    │      │ • Residentes  │
│ • Retención   │      │   formativos  │
│   30%         │      │ • Retención   │
│ • Adicionales │      │   20%         │
└───────────────┘      └───────────────┘
```

---

## 🗺️ Mapa Mental del Sitio

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        🏠 PANTALLA PRINCIPAL                                 │
│                         (Página de Inicio)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐      ┌───────────────────────┐
        │   🩺 MÓDULO PEDIATRÍA │      │  🤰 MÓDULO GINECOLOGÍA │
        └───────────────────────┘      └───────────────────────┘
                    │                               │
        ┌───────────┴───────────┐      ┌───────────┴───────────┐
        │                       │      │                       │
        ▼                       ▼      ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ 📥 Cargar     │      │ 📊 Resúmenes   │      │ 📥 Cargar     │
│ Liquidación   │      │                │      │ Liquidación   │
│               │      │ • Por Médico  │      │               │
│ • Subir Excel │      │ • Por          │      │ • Subir Excel │
│ • Procesar    │      │   Prestador    │      │ • Procesar    │
│ • Validar     │      │ • Historial    │      │ • Validar     │
│               │      │ • Excel        │      │               │
└───────────────┘      └───────────────┘      └───────────────┘
                                                    │
                                                    ▼
                                        ┌───────────────────────┐
                                        │ 📊 Resúmenes          │
                                        │                       │
                                        │ • Por Médico          │
                                        │ • Por Prestador       │
                                        │ • Historial           │
                                        │ • Residentes          │
                                        │   Formativos          │
                                        │ • Excel               │
                                        └───────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    🔧 ADMINISTRACIÓN (Acceso Rápido)                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│ 👨‍⚕️ MÉDICOS   │      │ 💰 TARIFAS    │      │ ➕ ADICIONALES │
│               │      │               │      │               │
│ • Agregar     │      │ • Configurar  │      │ • Configurar  │
│ • Editar      │      │   valores     │      │   montos      │
│ • Importar    │      │ • Por mes/año │      │ • Por obra    │
│ • Exportar    │      │ • Exportar    │      │   social      │
└───────────────┘      └───────────────┘      └───────────────┘
        │                           │
        │                           ▼
        │                  ┌───────────────┐
        │                  │ 🏥 VALORES    │
        │                  │ CONSULTAS     │
        │                  │               │
        │                  │ • Por tipo    │
        │                  │ • Por obra    │
        │                  │   social      │
        │                  │ • Por mes/año │
        │                  └───────────────┘
        │
        ▼
┌───────────────┐
│ 📊 HISTORIAL  │
│               │
│ • Ver todas   │
│   las         │
│   liquidaciones│
└───────────────┘
```

### 🔍 Navegación Visual Detallada

```
┌─────────────────────────────────────────────────────────────────┐
│                    ESTRUCTURA COMPLETA DEL SISTEMA              │
└─────────────────────────────────────────────────────────────────┘

                            🏠 INICIO
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   🩺 PEDIATRÍA          🤰 GINECOLOGÍA         🔧 ADMINISTRACIÓN
        │                     │                     │
        ├─ 📥 Cargar          ├─ 📥 Cargar          ├─ 👨‍⚕️ Médicos
        │  Liquidación        │  Liquidación        │
        │                     │                     ├─ 💰 Tarifas
        └─ 📊 Resúmenes       └─ 📊 Resúmenes       ├─ ➕ Adicionales
           │                     │                  ├─ 🏥 Valores
           ├─ Por Médico         ├─ Por Médico      └─ 📊 Historial
           ├─ Por Prestador      ├─ Por Prestador
           ├─ Historial         ├─ Historial
           └─ Excel              ├─ Residentes
                                 └─ Excel
```

---

## 📋 Tabla de Contenidos

1. [Inicio Rápido - Guía Visual](#-inicio-rápido---guía-visual)
2. [Mapa Mental del Sitio](#️-mapa-mental-del-sitio)
3. [Módulo de Pediatría](#módulo-de-pediatría)
4. [Módulo de Ginecología](#módulo-de-ginecología)
5. [Funcionalidades Comunes](#funcionalidades-comunes)
6. [Solución de Problemas](#solución-de-problemas)

---

## 🩺 Módulo de Pediatría

### 📥 Cargar Liquidación

#### Paso 1: Acceder al Módulo
```
┌─────────────────────────────────────────┐
│  🏠 Inicio → 🩺 Pediatría              │
└─────────────────────────────────────────┘
```

#### Paso 2: Cargar Archivo Excel
```
┌─────────────────────────────────────────────────────────┐
│  📤 CARGAR LIQUIDACIÓN                                   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │        📁 Arrastra tu archivo Excel aquí          │  │
│  │                                                    │  │
│  │              o                                    │  │
│  │                                                    │  │
│  │        [Seleccionar Archivo]                       │  │
│  │                                                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ✅ Formato: Headers en Fila 1                          │
│  ✅ Datos desde Fila 2                                   │
└─────────────────────────────────────────────────────────┘
```

#### Paso 3: Confirmar Mes y Año
```
┌─────────────────────────────────────────┐
│  📅 SELECCIONAR PERÍODO                 │
│                                         │
│  Mes detectado:  [Agosto ▼]            │
│  Año detectado:  [2025]                │
│                                         │
│  [Cancelar]  [Confirmar] ✅            │
└─────────────────────────────────────────┘
```

#### Paso 4: Procesar
```
┌─────────────────────────────────────────┐
│  ⚙️ PROCESANDO...                       │
│                                         │
│  📊 Filas procesadas: 770              │
│  ✅ Exitosas: 750                       │
│  ⚠️ Excluidas: 20                       │
│                                         │
│  [Ver Detalles]                         │
└─────────────────────────────────────────┘
```

### 📊 Formato del Excel para Pediatría

```
┌─────────────────────────────────────────────────────────────┐
│                    FORMATO EXCEL - PEDIATRÍA                 │
└─────────────────────────────────────────────────────────────┘

Fila 1:  │ Fecha │ Hora │ Paciente │ Cliente │ Responsable │
─────────┼───────┼──────┼──────────┼─────────┼─────────────┤
Fila 2:  │19/08/ │14:30 │Juan Pérez│  OSDE   │Dr. García   │
Fila 3:  │19/08/ │15:00 │María G.  │DAMSU    │Dr. García   │
Fila 4:  │19/08/ │16:00 │Pedro L.  │PARTIC.  │Dr. Martínez │
...      │  ...  │ ...  │   ...    │  ...    │    ...      │

⚠️ IMPORTANTE:
   • Headers en Fila 1
   • Datos desde Fila 2
   • Fecha formato: DD/MM/YYYY
```

### 📈 Reglas de Negocio - Pediatría

```
┌─────────────────────────────────────────────────────────────┐
│              📐 FÓRMULA DE CÁLCULO - PEDIATRÍA              │
└─────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │ Monto Facturado │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐      ┌──────────────┐
    │  - Retención    │      │  + Adicional │
    │     30%         │      │  (si aplica) │
    └────────┬────────┘      └──────┬───────┘
             │                       │
             └───────────┬───────────┘
                         ▼
              ┌──────────────────┐
              │   Total Final    │
              │  (a pagar)       │
              └──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  💡 EJEMPLO PRÁCTICO                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Monto Facturado:    $10,000                                │
│  Retención 30%:     -$3,000                                │
│  ─────────────────────────────────────                      │
│  Subtotal:          $7,000                                  │
│  Adicional DAMSU:   +$500                                   │
│  ─────────────────────────────────────                      │
│  Total Final:       $7,500 ✅                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 📑 Resúmenes - Pediatría

#### Tab: Por Médico y Obra Social

```
┌─────────────────────────────────────────────────────────────┐
│  👨‍⚕️ DR. GARCÍA, JUAN                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Obra Social    │ Cant. │ Unit. │ Bruto │ Ret. │ Neto │ Fin.│
│  ───────────────┼───────┼───────┼───────┼──────┼──────┼─────┤
│  OSDE           │  50   │ $200  │$10,000│$3,000│$7,000│$7,000│
│  DAMSU          │  30   │ $200  │$6,000 │$1,800│$4,200│$4,700│
│  PARTICULARES   │  20   │ $150  │$3,000 │$900  │$2,100│$2,100│
│  ───────────────┼───────┼───────┼───────┼──────┼──────┼─────┤
│  TOTAL          │ 100    │       │$19,000│$5,700│$13,300│$13,800│
│                                                              │
│  [📄 Descargar PDF]                                          │
└─────────────────────────────────────────────────────────────┘
```

#### Tab: Por Prestador

```
┌─────────────────────────────────────────────────────────────┐
│  📊 RESUMEN POR PRESTADOR                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Médico          │ Pacientes │ Bruto   │ Ret.   │ Neto   │ Fin.│
│  ────────────────┼───────────┼─────────┼────────┼────────┼─────┤
│  Dr. García      │    100    │$19,000  │$5,700  │$13,300 │$13,800│
│  Dr. Martínez    │    80     │$15,000  │$4,500  │$10,500 │$10,500│
│  Dr. López       │    60     │$12,000  │$3,600  │$8,400  │$8,400 │
│  ────────────────┼───────────┼─────────┼────────┼────────┼─────┤
│  TOTAL           │    240    │$46,000  │$13,800 │$32,200 │$32,700│
│                                                              │
│  [📊 Descargar Excel]  [📄 Descargar PDF]                    │
└─────────────────────────────────────────────────────────────┘
```

#### Tab: Excel - Secciones Visuales

```
┌─────────────────────────────────────────────────────────────┐
│  📊 TABLA EXCEL - SECCIONES                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ⚠️ ADVERTENCIA  │ 20 registros sin obra social            │
│  ───────────────────────────────────────────────────────────│
│  [Expandir ▼]  [Eliminar Todos]                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🔴 CRÍTICO      │ 5 registros sin horario                   │
│  ───────────────────────────────────────────────────────────│
│  [Expandir ▼]  [Eliminar Todos]                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🟣 DUPLICADO    │ 3 registros duplicados                    │
│  ───────────────────────────────────────────────────────────│
│  [Expandir ▼]  [Eliminar Todos]                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🔵 INFORMATIVO  │ 15 consultas residentes formativo        │
│  ───────────────────────────────────────────────────────────│
│  [Expandir ▼]  (Solo informativo - no se pagan)            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ✅ COMPLETO      │ Ver detalle completo (770 registros)     │
│  ───────────────────────────────────────────────────────────│
│  [Expandir ▼]  [🔍 Filtrar]  [📥 Descargar Excel]           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🤰 Módulo de Ginecología

### 📥 Cargar Liquidación

#### Formato Especial del Excel

```
┌─────────────────────────────────────────────────────────────┐
│              FORMATO EXCEL - GINECOLOGÍA                    │
│                    ⚠️ FORMATO ESPECIAL                      │
└─────────────────────────────────────────────────────────────┘

Fila 1-9:  │ (Información general - puede estar vacía)        │
───────────┼─────────────────────────────────────────────────┤
Fila 10:   │ Fecha │ Hora │ Paciente │ Obra Social │ Responsable│
───────────┼───────┼──────┼──────────┼─────────────┼───────────┤
Fila 11:   │19/08/ │14:30 │María G.  │   OSDE      │Dr. Martínez│
Fila 12:   │19/08/ │15:00 │Ana L.    │  DAMSU      │Dr. Martínez│
...        │  ...  │ ...  │   ...    │    ...      │    ...     │

⚠️ IMPORTANTE:
   • Headers en Fila 10 (no en Fila 1)
   • Datos desde Fila 11
   • Fecha formato: DD/MM/YYYY
```

### 📈 Reglas de Negocio - Ginecología

```
┌─────────────────────────────────────────────────────────────┐
│        🕐 REGLA DE RESIDENTES EN HORARIO FORMATIVO          │
└─────────────────────────────────────────────────────────────┘

    ┌─────────────────┐
    │   ¿Es          │
    │   RESIDENTE?   │
    └────────┬────────┘
             │
        ┌────┴────┐
        │         │
       SÍ        NO
        │         │
        ▼         ▼
    ┌─────────┐  ✅ SE PAGA
    │ ¿Lunes  │
    │ a Sábado│
    │ ?       │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
   SÍ        NO
    │         │
    ▼         ▼
┌─────────┐  ✅ SE PAGA
│ ¿07:00  │
│ a 15:00?│
└────┬────┘
     │
 ┌───┴───┐
 │       │
SÍ      NO
 │       │
 ▼       ▼
❌ NO   ✅ SE PAGA
SE PAGA

┌─────────────────────────────────────────────────────────────┐
│  📋 EJEMPLOS DE APLICACIÓN                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ❌ 07:00 (Residente, Lunes)      → NO SE PAGA ($0)         │
│  ❌ 14:59 (Residente, Sábado)     → NO SE PAGA ($0)         │
│  ✅ 15:00 (Residente, Lunes)      → SE PAGA                 │
│  ✅ 10:00 (Residente, Domingo)    → SE PAGA                 │
│  ✅ 10:00 (Planta, cualquier día) → SE PAGA                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Tab: Residentes Formativos (Específico de Ginecología)

```
┌─────────────────────────────────────────────────────────────┐
│  🎓 RESIDENTES EN HORARIO FORMATIVO                         │
│  (Solo para control interno - NO se muestra a médicos)      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Médico          │ Obra Social │ Cant. │ Unit. │ Total      │
│  ────────────────┼─────────────┼───────┼───────┼────────────│
│  Dr. Residente 1 │   OSDE      │  25   │ $200  │ $5,000     │
│  Dr. Residente 2 │  DAMSU      │  15   │ $200  │ $3,000     │
│  ────────────────┼─────────────┼───────┼───────┼────────────│
│  TOTAL           │             │  40   │       │ $8,000     │
│                                                              │
│  ⚠️ Estos montos NO se pagan, solo se contabilizan          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Funcionalidades Comunes

### 🔍 Sistema de Filtros

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 FILTROS EN TABLA EXCEL                                 │
└─────────────────────────────────────────────────────────────┘

    Columna: Responsable
    ┌─────────────────────────┐
    │ 🔍 Buscar...            │  ← Escribe para filtrar
    └─────────────────────────┘
         │
         ▼
    ┌─────────────────────────┐
    │ ✅ 1 filtro(s) activo  │
    │ 📊 Mostrando 13 de 478  │
    │    registros            │
    └─────────────────────────┘

💡 TIP: Los filtros usan coincidencia de palabras completas
   para mayor precisión. Ejemplo: "García" no coincide con
   "García López" a menos que busques ambas palabras.
```

### ✏️ Edición Inline

```
┌─────────────────────────────────────────────────────────────┐
│  ✏️ CÓMO EDITAR UNA CELDA                                   │
└─────────────────────────────────────────────────────────────┘

    Paso 1: Hacer doble clic en la celda
    ┌──────────────┐
    │ OSDE         │  ← Doble clic aquí
    └──────────────┘
         │
         ▼
    Paso 2: Modificar el valor
    ┌──────────────┐
    │ DAMSU        │  ← Escribe el nuevo valor
    └──────────────┘
         │
         ▼
    Paso 3: Presionar Enter o hacer clic fuera
    ┌──────────────┐
    │ DAMSU    ✅  │  ← Se guarda automáticamente
    └──────────────┘

⏱️ Los cambios se guardan después de 1 segundo de inactividad
```

### 🗑️ Eliminación de Filas

```
┌─────────────────────────────────────────────────────────────┐
│  🗑️ ELIMINAR FILAS                                           │
└─────────────────────────────────────────────────────────────┘

    Paso 1: Seleccionar filas
    ┌─────────────────────────────────────┐
    │ ☑️ │ Fecha  │ Paciente │ ...        │
    │ ☑️ │ 19/08  │ Juan P.  │ ...        │
    │ ☐  │ 19/08  │ María G. │ ...        │
    └─────────────────────────────────────┘
         │
         ▼
    Paso 2: Hacer clic en "Eliminar Seleccionadas"
    ┌─────────────────────────────────────┐
    │ [🗑️ Eliminar Seleccionadas (2)]     │
    └─────────────────────────────────────┘
         │
         ▼
    Paso 3: Confirmar
    ┌─────────────────────────────────────┐
    │ ⚠️ ¿Eliminar 2 filas?                │
    │                                     │
    │ [Cancelar]  [Confirmar] ✅          │
    └─────────────────────────────────────┘
```

### 📥 Exportación

```
┌─────────────────────────────────────────────────────────────┐
│  📥 EXPORTAR DATOS                                           │
└─────────────────────────────────────────────────────────────┘

    EXPORTAR A EXCEL:
    ┌─────────────────────────────────────┐
    │ 1. Aplicar filtros (opcional)       │
    │ 2. Clic en "Descargar Excel"        │
    │ 3. Archivo se descarga con nombre:  │
    │    detalle_comple_07_2025_...xlsx   │
    └─────────────────────────────────────┘

    EXPORTAR PDF:
    ┌─────────────────────────────────────┐
    │ 1. Ir a "Resumen por Médico"       │
    │ 2. Clic en "Descargar PDF"         │
    │ 3. PDF se genera automáticamente    │
    └─────────────────────────────────────┘
```

---

## ❓ Solución de Problemas

### ❌ Error: "No se procesó ninguna fila válida"

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 DIAGNÓSTICO                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Causa: El Excel no tiene fechas válidas                   │
│                                                              │
│  ✅ SOLUCIÓN:                                                │
│  1. Verificar que la columna "Fecha" tenga datos             │
│  2. Verificar formato: DD/MM/YYYY                           │
│  3. Ginecología: Verificar headers en fila 10               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### ⚠️ Advertencia: "Médicos no encontrados"

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 DIAGNÓSTICO                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Causa: Nombres no coinciden con BD                         │
│                                                              │
│  ✅ SOLUCIÓN:                                                │
│  1. Ir a: Admin → Médicos                                   │
│  2. Verificar que el médico esté cargado                   │
│  3. Verificar que el nombre coincida exactamente            │
│  4. El sistema intenta coincidencias flexibles              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 📊 Resúmenes incompletos

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 DIAGNÓSTICO                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Causa: Puede haber filtros activos                        │
│                                                              │
│  ✅ SOLUCIÓN:                                                │
│  1. Verificar que no haya filtros activos                  │
│  2. El sistema procesa TODOS los registros                  │
│  3. Revisar consola del navegador (F12)                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Comparación de Módulos

```
┌─────────────────────────────────────────────────────────────┐
│        📋 TABLA COMPARATIVA - PEDIATRÍA vs GINECOLOGÍA      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────┬─────────────────┐
│ Característica   │  Pediatría   │  Ginecología     │
├──────────────────┼──────────────┼─────────────────┤
│ Headers Excel    │  Fila 1      │  Fila 10 ⚠️     │
│ Retención        │  30%         │  20%            │
│ Cálculo          │  Por consulta│  Por hora        │
│ Adicionales      │  Sí          │  No             │
│ Residentes       │  No aplica   │  Sí (tab)       │
│ Formativos       │              │                  │
└──────────────────┴──────────────┴─────────────────┘
```

---

## 📝 Mejores Prácticas

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ CHECKLIST ANTES DE PROCESAR                              │
└─────────────────────────────────────────────────────────────┘

    ☐ Verificar formato del Excel
    ☐ Confirmar mes y año correctos
    ☐ Revisar que los médicos estén en BD
    ☐ Verificar valores de consultas configurados
    ☐ Revisar filas excluidas después del procesamiento
    ☐ Corregir registros sin obra social
    ☐ Exportar resúmenes antes de cambios importantes
```

---

## 🎨 Estética del Sistema

El sistema utiliza una paleta de colores profesional médica:

```
┌─────────────────────────────────────────────────────────────┐
│  🎨 PALETA DE COLORES                                        │
└─────────────────────────────────────────────────────────────┘

    Verde Principal:    #22c55e (Éxito, Confirmación)
    Verde Secundario:   #10b981 (Acciones)
    Amarillo:           #fbbf24 (Advertencias)
    Rojo:               #ef4444 (Errores, Crítico)
    Morado:             #a855f7 (Duplicados)
    Azul:               #3b82f6 (Informativo)
    Gris:               #6b7280 (Texto secundario)
```

---

## 📞 Soporte

```
┌─────────────────────────────────────────────────────────────┐
│  📞 ¿NECESITAS AYUDA?                                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 📖 Revisar este manual primero                          │
│  2. 🔍 Verificar logs en consola (F12)                      │
│  3. 📧 Contactar al administrador del sistema              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

<div align="center">

**Versión del Manual:** 1.0  
**Última Actualización:** Enero 2025

---

*Sistema desarrollado con ❤️ para la gestión eficiente de liquidaciones médicas*

</div>







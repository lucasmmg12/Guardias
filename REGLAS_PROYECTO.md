# Reglas del Proyecto - Sistema de Liquidaciones de Guardias

## 📋 Índice
1. [Reglas de Obra Social](#reglas-de-obra-social)
2. [Procesamiento de PARTICULARES](#procesamiento-de-particulares)
3. [Conteo Mensual por Obra Social](#conteo-mensual-por-obra-social)
4. [Flujos de Trabajo](#flujos-de-trabajo)

---

## 🏥 Reglas de Obra Social

### Columna "Cliente" = Obra Social
- La columna **"Cliente"** en el Excel representa **obra sociales**
- Cada valor en esta columna debe ser el nombre o código de una obra social
- El sistema debe reconocer y validar los códigos de obra social

### Códigos de Obra Social
- **042 - PARTICULARES**: Código especial para pacientes particulares (sin obra social)
- Otros códigos de obra social según corresponda

---

## ⚠️ Procesamiento de PARTICULARES

### Detección de PARTICULARES
Un registro se considera **PARTICULAR** cuando:
1. La columna "Cliente" está **vacía** (null o string vacío)
2. La columna "Cliente" contiene un **nombre de persona** (no un código de obra social)

### Señalización Visual
- El sistema debe **señalar de forma muy visible** cuando un registro no tiene obra social
- Indicadores visuales:
  - Fondo amarillo/naranja en la fila
  - Ícono de alerta (⚠️)
  - Mensaje: **"⚠️ Sin obra social - Revisar facturación"**
  - Borde destacado

### Proceso de Revisión
1. **Melisa** (usuario del sistema) debe revisar en otro sistema si el cliente particular pagó
2. Una vez confirmado, debe editar la columna "Cliente"
3. Debe ingresar: **"042 - PARTICULARES"**
4. El sistema debe permitir edición inline de la columna "Cliente"

### Edición de Columna Cliente
- La columna "Cliente" es **editable** en la tabla
- Sugerencia rápida: botón o autocompletado para "042 - PARTICULARES"
- Validación: asegurar que el valor ingresado sea válido

---

## 📊 Conteo Mensual por Obra Social

### Requisitos
- El sistema debe contar **mes a mes** cuántas consultas entraron de cada obra social
- Debe incluir **"042 - PARTICULARES"** en el conteo
- Los datos deben estar organizados por:
  - Mes
  - Año
  - Especialidad (Pediatría / Ginecología)
  - Obra Social

### Estructura de Datos
```
Mes | Año | Especialidad | Obra Social | Cantidad de Consultas
```

### Visualización
- Dashboard con estadísticas
- Gráficos por obra social
- Resumen mensual
- Exportación de reportes

---

## 🔄 Flujos de Trabajo

### Flujo 1: Procesamiento de Excel con PARTICULARES

```
1. Usuario sube Excel
2. Sistema lee y procesa datos
3. Sistema detecta registros sin obra social (vacío o nombre de persona)
4. Sistema señala visualmente los PARTICULARES
5. Melisa revisa cada PARTICULAR en otro sistema
6. Melisa edita columna "Cliente" con "042 - PARTICULARES"
7. Sistema actualiza el registro
8. Sistema cuenta la consulta como "042 - PARTICULARES"
```

### Flujo 2: Conteo Mensual

```
1. Sistema procesa todos los registros del mes
2. Agrupa por obra social
3. Cuenta consultas por obra social
4. Incluye "042 - PARTICULARES" en el conteo
5. Genera estadísticas y reportes
6. Muestra en dashboard
```

---

## 📝 Notas Importantes

- **Melisa** es la responsable de revisar y confirmar PARTICULARES
- El código **"042 - PARTICULARES"** es obligatorio para pacientes particulares
- Todos los PARTICULARES deben ser revisados antes de finalizar el procesamiento
- El sistema debe mantener un historial de cambios en la columna "Cliente"

---

## 🔧 Implementación Técnica

### Funciones Clave
- `detectarParticular(cliente: string | null): boolean` - Detecta si es particular
- `esNombrePersona(valor: string): boolean` - Determina si un valor es nombre de persona
- `contarPorObraSocial(mes: number, anio: number, especialidad: string)` - Cuenta consultas

### Componentes
- `ExcelDataTable` - Tabla con detección y señalización de PARTICULARES
- `InlineEditCell` - Celda editable con sugerencia de "042 - PARTICULARES"
- `EstadisticasObraSocial` - Dashboard de estadísticas

---

**Última actualización**: 2025-01-XX
**Responsable**: Equipo de Desarrollo Grow Labs


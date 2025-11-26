# Reglas del Proyecto - Sistema de Liquidaciones de Guardias

## 📋 Índice
1. [Reglas de Obra Social](#reglas-de-obra-social)
2. [Procesamiento de PARTICULARES](#procesamiento-de-particulares)
3. [Regla de Sin Horario de Inicio](#regla-de-sin-horario-de-inicio)
4. [Regla de Duplicados](#regla-de-duplicados)
5. [Conteo Mensual por Obra Social](#conteo-mensual-por-obra-social)
6. [Flujos de Trabajo](#flujos-de-trabajo)

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

## ⏰ Regla de Sin Horario de Inicio

### Detección de Pacientes No Atendidos
Un registro se considera **"Sin horario de inicio"** cuando:
- La columna de **hora/horario/inicio** está **vacía** (null o string vacío)
- Esto significa que el **paciente no se atendió**

### Señalización Visual
- El sistema debe **señalar de forma muy visible** cuando un registro no tiene horario
- Indicadores visuales:
  - Fondo rojo/naranja en la fila
  - Ícono de alerta (⚠️)
  - Mensaje: **"⚠️ Sin horario - Paciente no atendido"**
  - Borde destacado en rojo

### Eliminación Rápida
- **Melisa** debe poder **eliminar estas filas de forma rápida**
- Cada fila sin horario debe tener un **botón de eliminar visible**
- El botón debe estar fácilmente accesible
- Confirmación antes de eliminar (opcional, según preferencia)

### Proceso de Eliminación
1. Melisa identifica filas sin horario (señaladas visualmente)
2. Hace clic en el botón de eliminar de la fila
3. El sistema elimina la fila inmediatamente
4. La tabla se actualiza automáticamente

---

## 🔄 Regla de Duplicados

### Detección de Duplicados
Dos o más filas se consideran **duplicadas** cuando:
- **TODOS** los valores de **TODAS** las columnas son **exactamente iguales**
- Misma fecha, misma hora, mismo paciente, mismo todo
- La comparación es **case-sensitive** y **exacta**

### Señalización Visual
- El sistema debe **señalar de forma muy visible** cuando hay duplicados
- Indicadores visuales:
  - Fondo púrpura/naranja en las filas duplicadas
  - Ícono de alerta (⚠️)
  - Mensaje: **"⚠️ Duplicado detectado"**
  - Borde destacado
  - Todas las filas del grupo duplicado deben estar señaladas

### Identificación de Grupos
- Si hay 3 filas idénticas, las 3 deben estar señaladas
- El sistema debe mostrar cuántos duplicados hay en total
- Cada grupo de duplicados debe ser identificable visualmente

### Proceso de Revisión
1. Melisa identifica filas duplicadas (señaladas visualmente)
2. Revisa si realmente son duplicados o son registros legítimos
3. Si son duplicados, puede eliminarlos usando el botón de eliminar
4. Si no son duplicados, puede editar las filas para diferenciarlas

---

## 👨‍⚕️ Regla de Residentes en Horario Formativo

### Detección de Consultas No Pagables
Una consulta se considera **"Residente en Horario Formativo"** cuando:
- El médico es **RESIDENTE** (verificado en la base de datos)
- La consulta es de **lunes a sábado** (no domingo)
- El horario de la consulta está entre **07:00 y 15:00** (inclusive 07:00, excluyendo 15:00)
- **NO se debe pagar** esta consulta según las reglas del sistema

### Identificación del Médico
- El sistema busca al médico en la columna **"Responsable"** del Excel
- Compara el nombre con la base de datos de médicos activos de la especialidad correspondiente
- Verifica si el médico tiene `es_residente = true` en la base de datos

### Señalización Visual
- El sistema debe **señalar de forma muy visible** cuando una consulta es de residente en horario formativo
- Indicadores visuales:
  - Fondo azul en la fila
  - Ícono de usuario con X (UserX)
  - Mensaje: **"ℹ️ Consulta de residente en horario formativo - NO se debe pagar"**
  - Borde destacado en azul

### Información Mostrada
- Alerta superior con contador de consultas detectadas
- Mensaje explicativo: "Estas consultas son de **residentes** realizadas entre **lunes a sábado de 07:00 a 15:00**. **NO se deben pagar** según las reglas del sistema."
- Resumen en el pie de la tabla con el contador

### Optimización
- Los médicos se cargan **una sola vez** al montar el componente
- Se crea un **mapa optimizado** para búsqueda rápida por nombre
- Las detecciones se realizan con `useMemo` para evitar recálculos innecesarios
- La búsqueda de médicos es **case-insensitive** y maneja variaciones de nombres

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
- `tieneHorario(row: ExcelRow, headers: string[]): boolean` - Detecta si una fila tiene horario
- `detectarDuplicados(rows: ExcelRow[], headers: string[]): Map<string, number[]>` - Detecta filas duplicadas
- `esResidenteHorarioFormativo(fecha, hora, esResidente): boolean` - Detecta si es residente en horario formativo
- `esDiaLaboral(fecha): boolean` - Detecta si es día laboral (lunes a sábado)
- `esHorarioFormativo(hora): boolean` - Detecta si está en horario formativo (07:00-15:00)
- `horaAMinutos(hora): number | null` - Convierte hora a minutos desde medianoche
- `obtenerDiaSemana(fecha): number | null` - Obtiene el día de la semana (0=Domingo, 1=Lunes, etc.)
- `contarPorObraSocial(mes: number, anio: number, especialidad: string)` - Cuenta consultas

### Componentes
- `ExcelDataTable` - Tabla con detección y señalización de PARTICULARES
- `InlineEditCell` - Celda editable con sugerencia de "042 - PARTICULARES"
- `EstadisticasObraSocial` - Dashboard de estadísticas

---

**Última actualización**: 2025-01-XX
**Responsable**: Equipo de Desarrollo Grow Labs


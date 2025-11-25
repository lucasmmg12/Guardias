# 📋 Reglas de Liquidación - Sistema Médico

## 🎯 Reglas de Negocio Implementadas

### 1. Factor de Liquidación (Procedimientos Múltiples)

**Regla**: Primer procedimiento 100%, restantes 50%

- **Primer procedimiento** de una fila en el Excel: `Factor = 1.0` (100%)
- **Procedimientos subsiguientes** en la misma fila: `Factor = 0.5` (50%)

**Ejemplo**:
```
Fila 1: Procedimiento A (100%) + Procedimiento B (50%) + Procedimiento C (50%)
```

**Cálculo Base**:
```
Importe Base = Valor del Nomenclador × Factor
```

---

### 2. Plus del 20% por Horario Especial

El sistema **suma 20% al factor** de liquidación en los siguientes casos:

#### 🎉 A. Días Feriados
- **Horario**: TODO EL DÍA (00:00 hs - 23:59 hs)
- **Criterio**: Se toma por el horario de **comienzo del procedimiento**
- **Cálculo**: `Factor Final = Factor Base + 0.20`

**Ejemplo**:
```
Fecha: 2025-01-01 (Año Nuevo - Feriado)
Hora de comienzo: 10:00 hs
Plus: SÍ (aplica todo el día)
Factor: 1.0 + 0.20 = 1.20 (120%)

Fecha: 2025-01-01 (Año Nuevo - Feriado)
Hora de comienzo: 22:00 hs
Plus: SÍ (aplica todo el día)
Factor: 1.0 + 0.20 = 1.20 (120%)
```

#### 📅 B. Fines de Semana

**Sábados**:
- **Horario**: Desde las 13:00 hs hasta las 23:59 hs
- **Cálculo**: `Factor Final = Factor Base + 0.20`

**Domingos**:
- **Horario**: TODO EL DÍA (00:00 hs - 23:59 hs)
- **Cálculo**: `Factor Final = Factor Base + 0.20`

**Ejemplos**:
```
✅ Sábado 10:00 hs → NO aplica plus (antes de 13:00)
✅ Sábado 13:00 hs → SÍ aplica plus
✅ Sábado 20:00 hs → SÍ aplica plus
✅ Domingo 08:00 hs → SÍ aplica plus (todo el día)
✅ Domingo 22:00 hs → SÍ aplica plus (todo el día)
```

---

### 3. Orden de Prioridad

El sistema verifica en este orden:

1. **¿Es feriado?** → Aplica plus (sin importar la hora)
2. **¿Es domingo?** → Aplica plus (sin importar la hora)
3. **¿Es sábado >= 13:00?** → Aplica plus
4. **Otro día/hora** → No aplica plus

---

## 💰 Ejemplos de Cálculo Completo

### Ejemplo 1: Procedimiento Simple en Día Normal
```
Valor Nomenclador: $10,000
Factor Base: 1.0 (primer procedimiento)
Día: Martes 10:00 hs
Plus horario: NO

Cálculo:
Factor Final = 1.0 (sin plus)
Importe Final = $10,000 × 1.0 = $10,000
```

### Ejemplo 2: Primer Procedimiento en Feriado
```
Valor Nomenclador: $10,000
Factor Base: 1.0 (primer procedimiento)
Día: 01/01/2025 (Año Nuevo) - 10:00 hs
Plus horario: SÍ (feriado todo el día)

Cálculo:
Factor Final = 1.0 + 0.20 = 1.20 (120%)
Importe Final = $10,000 × 1.20 = $12,000
```

### Ejemplo 3: Segundo Procedimiento en Domingo
```
Valor Nomenclador: $8,000
Factor Base: 0.5 (segundo procedimiento)
Día: Domingo 15:00 hs
Plus horario: SÍ (domingo todo el día)

Cálculo:
Factor Final = 0.5 + 0.20 = 0.70 (70%)
Importe Final = $8,000 × 0.70 = $5,600
```

### Ejemplo 4: Procedimiento en Sábado Mañana
```
Valor Nomenclador: $10,000
Factor Base: 1.0 (primer procedimiento)
Día: Sábado 10:00 hs
Plus horario: NO (sábado antes de 13:00)

Cálculo:
Factor Final = 1.0 (sin plus)
Importe Final = $10,000 × 1.0 = $10,000
```

### Ejemplo 5: Primer Procedimiento en Sábado Tarde
```
Valor Nomenclador: $10,000
Factor Base: 1.0 (primer procedimiento)
Día: Sábado 15:00 hs
Plus horario: SÍ (sábado >= 13:00)

Cálculo:
Factor Final = 1.0 + 0.20 = 1.20 (120%)
Importe Final = $10,000 × 1.20 = $12,000
```

### Ejemplo 6: Segundo Procedimiento en Sábado Tarde
```
Valor Nomenclador: $8,000
Factor Base: 0.5 (segundo procedimiento)
Día: Sábado 16:00 hs
Plus horario: SÍ (sábado >= 13:00)

Cálculo:
Factor Final = 0.5 + 0.20 = 0.70 (70%)
Importe Final = $8,000 × 0.70 = $5,600
```

---

## 🗓️ Feriados Nacionales Configurados

El sistema incluye feriados nacionales de Argentina pre-configurados:

### 2025
- 01/01 - Año Nuevo
- 03/03 - Carnaval
- 04/03 - Carnaval
- 24/03 - Día Nacional de la Memoria
- 02/04 - Día del Veterano
- 18/04 - Viernes Santo
- 01/05 - Día del Trabajador
- 25/05 - Revolución de Mayo
- 20/06 - Paso a la Inmortalidad del Gral. Belgrano
- 09/07 - Día de la Independencia
- 17/08 - Paso a la Inmortalidad del Gral. San Martín
- 12/10 - Día del Respeto a la Diversidad Cultural
- 24/11 - Día de la Soberanía Nacional
- 08/12 - Inmaculada Concepción de María
- 25/12 - Navidad

**Nota**: Los feriados pueden ser configurados y editados por el usuario en el sistema.

---

## 🔧 Implementación Técnica

### Archivo: `lib/feriados-service.ts`

Función principal: `aplicaPlusHorario(fecha: string, hora?: string): boolean`

**Lógica**:
```typescript
// 1. Verificar si es feriado (prioridad 1)
if (esFeriado(fecha)) {
  return true; // TODO el día
}

// 2. Verificar si es domingo (prioridad 2)
if (diaSemana === 0) {
  return true; // TODO el día
}

// 3. Verificar si es sábado >= 13:00 (prioridad 3)
if (diaSemana === 6 && hora >= 13:00) {
  return true;
}

return false;
```

### Archivo: `lib/liquidacion-service.ts`

```typescript
// Calcular factor base (primer proc 100%, restantes 50%)
let factor = calculateFactor(row.orden_en_fila, ...);

// Verificar plus horario
const tienePlusHorario = aplicaPlusHorario(row.fecha, row.hora);

// SUMAR el 20% al factor si corresponde
if (tienePlusHorario) {
  factor = factor + 0.20; // 1.0 → 1.20 o 0.5 → 0.70
}

// Calcular importe con el factor final
const importe = valor * factor;
```

---

## 📊 Validación de Datos

### Requisitos para Aplicar Plus Horario:

1. **Fecha válida**: Formato `YYYY-MM-DD` o `DD/MM/YYYY`
2. **Hora válida** (para fines de semana): Formato `HH:MM` o `HH:MM:SS`
3. **Feriados**: Solo requiere fecha válida (hora no importa)

### Casos Especiales:

- **Sin hora en el Excel**: 
  - Feriados: SÍ aplica plus (fecha suficiente)
  - Fines de semana: NO aplica plus (conservador sin hora)

- **Hora en formato 12hs**: Sistema convertirá a 24hs automáticamente

---

## 🎓 Guía para Usuarios

### ¿Cómo saber si un procedimiento tendrá plus?

1. **Mira la fecha del procedimiento**
2. **Verifica si es feriado** → Plus automático
3. **Si es domingo** → Plus automático
4. **Si es sábado, mira la hora**:
   - Antes de 13:00 → Sin plus
   - 13:00 o después → Con plus

### En el Excel procesado:

- Columna `plusHorario`: Indica si se aplicó el plus (true/false)
- Columna `importe`: Ya incluye el plus si corresponde

---

## 🔍 Logs y Debugging

El sistema genera logs en consola para tracking:

```
✓ Aplicando plus por FERIADO: 2025-01-01
✓ Aplicando plus por DOMINGO: 2025-01-19 10:00
✓ Aplicando plus por SÁBADO >= 13:00: 2025-01-18 15:30
```

---

## 📝 Notas Importantes

1. **Hora de comienzo**: El sistema siempre toma la hora de **comienzo** del procedimiento, no la de finalización.

2. **Feriados tienen prioridad**: Si un día es feriado, aplica plus sin importar si también es fin de semana.

3. **Precisión horaria**: El sistema es preciso al minuto. Ejemplo:
   - 12:59 → Sin plus
   - 13:00 → Con plus

4. **Configuración personalizable**: Los feriados pueden ser editados desde la interfaz de administración.

---

**Desarrollado por Grow Labs** 🌱
© 2025 - Sistema de Liquidaciones Médicas


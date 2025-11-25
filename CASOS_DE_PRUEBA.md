# 🧪 Casos de Prueba y Ejemplos de Uso
## Sistema de Liquidaciones de Guardias Médicas

---

## 📋 CASOS DE PRUEBA - MÓDULO PEDIATRÍA

### Caso 1: Consulta Simple sin Adicional
**Entrada**:
```json
{
  "fecha": "2025-11-15",
  "hora": "10:30",
  "paciente": "Juan Pérez",
  "obra_social": "OSDE",
  "medico_nombre": "Dra. María González",
  "medico_matricula": "12345",
  "monto_facturado": 10000
}
```

**Proceso**:
```
1. Monto facturado: $10,000
2. Retención 30%: $10,000 × 0.30 = $3,000
3. Neto: $10,000 - $3,000 = $7,000
4. Adicional: $0 (OSDE no está en lista negra)
5. Importe Final: $7,000
```

**Salida Esperada**:
```json
{
  "monto_facturado": 10000,
  "porcentaje_retencion": 30,
  "monto_retencion": 3000,
  "monto_adicional": 0,
  "importe_calculado": 7000,
  "aplica_adicional": false
}
```

---

### Caso 2: Consulta con Adicional (Damsu)
**Entrada**:
```json
{
  "fecha": "2025-11-15",
  "hora": "14:00",
  "paciente": "Ana López",
  "obra_social": "Damsu",
  "medico_nombre": "Dr. Carlos Rodríguez",
  "medico_matricula": "67890",
  "monto_facturado": 8000
}
```

**Configuración Adicional**:
```sql
-- En configuracion_adicionales
obra_social: 'Damsu'
especialidad: 'Pediatría'
mes: 11
anio: 2025
aplica_adicional: true
monto_adicional: 1500
```

**Proceso**:
```
1. Monto facturado: $8,000
2. Retención 30%: $8,000 × 0.30 = $2,400
3. Neto: $8,000 - $2,400 = $5,600
4. Adicional Damsu: $1,500
5. Importe Final: $5,600 + $1,500 = $7,100
```

**Salida Esperada**:
```json
{
  "monto_facturado": 8000,
  "porcentaje_retencion": 30,
  "monto_retencion": 2400,
  "monto_adicional": 1500,
  "importe_calculado": 7100,
  "aplica_adicional": true
}
```

---

### Caso 3: Múltiples Consultas del Mismo Médico
**Entrada** (3 consultas):
```json
[
  {
    "fecha": "2025-11-15",
    "paciente": "Paciente 1",
    "obra_social": "OSDE",
    "medico_matricula": "12345",
    "monto_facturado": 10000
  },
  {
    "fecha": "2025-11-16",
    "paciente": "Paciente 2",
    "obra_social": "Damsu",
    "medico_matricula": "12345",
    "monto_facturado": 8000
  },
  {
    "fecha": "2025-11-17",
    "paciente": "Paciente 3",
    "obra_social": "Provincia",
    "medico_matricula": "12345",
    "monto_facturado": 12000
  }
]
```

**Proceso**:
```
Consulta 1 (OSDE):
  Neto: $10,000 - $3,000 = $7,000
  Adicional: $0
  Total: $7,000

Consulta 2 (Damsu):
  Neto: $8,000 - $2,400 = $5,600
  Adicional: $1,500
  Total: $7,100

Consulta 3 (Provincia):
  Neto: $12,000 - $3,600 = $8,400
  Adicional: $1,200
  Total: $9,600

TOTAL MÉDICO: $7,000 + $7,100 + $9,600 = $23,700
```

**Salida Esperada en PDF**:
```
Matrícula: 12345
Nombre: Dra. María González
Periodo: Noviembre 2025

Detalle:
┌──────────┬───────────┬────────────┬───────────┬────────────┬───────────┐
│ Fecha    │ Paciente  │ Obra Social│ Facturado │ Retención  │ Neto      │
├──────────┼───────────┼────────────┼───────────┼────────────┼───────────┤
│ 15/11/25 │ Paciente 1│ OSDE       │ $10,000   │ $3,000     │ $7,000    │
│ 16/11/25 │ Paciente 2│ Damsu      │ $8,000    │ $2,400     │ $7,100 *  │
│ 17/11/25 │ Paciente 3│ Provincia  │ $12,000   │ $3,600     │ $9,600 *  │
└──────────┴───────────┴────────────┴───────────┴────────────┴───────────┘

* Incluye adicional por Obra Social

TOTALES:
  Total Bruto:      $30,000
  Total Retenciones: $9,000
  Total Adicionales: $2,700
  TOTAL NETO:       $23,700
```

---

## 📋 CASOS DE PRUEBA - MÓDULO GINECOLOGÍA

### Caso 4: Residente en Horario Formativo (NO COBRA)
**Entrada**:
```json
{
  "fecha": "2025-11-15",
  "hora": "10:00",
  "paciente": "María Fernández",
  "obra_social": "OSDE",
  "medico_nombre": "Dr. Juan Residente",
  "medico_matricula": "99999",
  "medico_es_residente": true
}
```

**Proceso**:
```
1. Médico: Dr. Juan Residente
2. Es residente: SÍ
3. Hora: 10:00
4. ¿Está entre 07:30 y 15:00? SÍ
5. Horario formativo: SÍ
6. Importe: $0 (NO COBRA)
```

**Salida Esperada**:
```json
{
  "medico_es_residente": true,
  "hora": "10:00:00",
  "es_horario_formativo": true,
  "importe_calculado": 0
}
```

---

### Caso 5: Residente Fuera de Horario Formativo (SÍ COBRA)
**Entrada**:
```json
{
  "fecha": "2025-11-15",
  "hora": "20:00",
  "paciente": "Pedro Gómez",
  "obra_social": "OSDE",
  "medico_nombre": "Dr. Juan Residente",
  "medico_matricula": "99999",
  "medico_es_residente": true
}
```

**Tarifa Vigente**:
```sql
tipo_guardia: 'Ginecología'
valor_hora: 8000
```

**Proceso**:
```
1. Médico: Dr. Juan Residente
2. Es residente: SÍ
3. Hora: 20:00
4. ¿Está entre 07:30 y 15:00? NO
5. Horario formativo: NO
6. Importe: $8,000 × 1 hora = $8,000 (SÍ COBRA)
```

**Salida Esperada**:
```json
{
  "medico_es_residente": true,
  "hora": "20:00:00",
  "es_horario_formativo": false,
  "importe_calculado": 8000
}
```

---

### Caso 6: Médico de Planta (SIEMPRE COBRA)
**Entrada**:
```json
{
  "fecha": "2025-11-15",
  "hora": "10:00",
  "paciente": "Laura Martínez",
  "obra_social": "OSDE",
  "medico_nombre": "Dra. Ana Planta",
  "medico_matricula": "11111",
  "medico_es_residente": false
}
```

**Proceso**:
```
1. Médico: Dra. Ana Planta
2. Es residente: NO
3. Hora: 10:00
4. Médico de planta: SIEMPRE COBRA
5. Importe: $8,000 × 1 hora = $8,000
```

**Salida Esperada**:
```json
{
  "medico_es_residente": false,
  "hora": "10:00:00",
  "es_horario_formativo": false,
  "importe_calculado": 8000
}
```

---

### Caso 7: Horarios Límite (Casos Edge)

#### 7a. Hora 07:29 (ANTES del horario formativo)
```json
{
  "hora": "07:29",
  "medico_es_residente": true
}
```
**Resultado**: `es_horario_formativo: false` → **SÍ COBRA**

#### 7b. Hora 07:30 (INICIO del horario formativo)
```json
{
  "hora": "07:30",
  "medico_es_residente": true
}
```
**Resultado**: `es_horario_formativo: true` → **NO COBRA**

#### 7c. Hora 14:59 (DENTRO del horario formativo)
```json
{
  "hora": "14:59",
  "medico_es_residente": true
}
```
**Resultado**: `es_horario_formativo: true` → **NO COBRA**

#### 7d. Hora 15:00 (FIN del horario formativo)
```json
{
  "hora": "15:00",
  "medico_es_residente": true
}
```
**Resultado**: `es_horario_formativo: false` → **SÍ COBRA**

---

## 📋 CASOS DE PRUEBA - NORMALIZACIÓN DE DATOS

### Caso 8: Normalización de Fechas

#### 8a. Fecha en formato DD/MM/YYYY
```javascript
convertirFecha("15/11/2025")
// Resultado: "2025-11-15"
```

#### 8b. Fecha como serial de Excel
```javascript
convertirFecha(45610) // Serial de Excel para 15/11/2025
// Resultado: "2025-11-15"
```

#### 8c. Fecha como objeto Date
```javascript
convertirFecha(new Date(2025, 10, 15)) // Mes 10 = Noviembre (0-indexed)
// Resultado: "2025-11-15"
```

---

### Caso 9: Normalización de Horas

#### 9a. Hora en formato HH:MM
```javascript
convertirHora("10:30")
// Resultado: "10:30:00"
```

#### 9b. Hora como decimal de Excel
```javascript
convertirHora(0.4375) // 0.4375 días = 10:30
// Resultado: "10:30:00"
```

#### 9c. Hora en formato 12h (AM/PM)
```javascript
convertirHora("10:30 AM")
// Resultado: "10:30:00"

convertirHora("08:30 PM")
// Resultado: "20:30:00"
```

---

## 📋 CASOS DE PRUEBA - LIMPIEZA DE DATOS

### Caso 10: Filas a Eliminar

#### 10a. Fila sin hora (Ginecología)
```json
{
  "fecha": "2025-11-15",
  "hora": null,
  "paciente": "Juan Pérez",
  "especialidad": "Ginecología"
}
```
**Resultado**: `validarFilaBasica() = false` → **OMITIR**

#### 10b. Fila con texto genérico
```json
{
  "fecha": "2025-11-15",
  "hora": "10:00",
  "paciente": "TOTAL GENERAL",
  "monto_facturado": 50000
}
```
**Resultado**: `validarFilaBasica() = false` → **OMITIR**

#### 10c. Fila sin monto (Pediatría)
```json
{
  "fecha": "2025-11-15",
  "hora": "10:00",
  "paciente": "Ana López",
  "monto_facturado": null,
  "especialidad": "Pediatría"
}
```
**Resultado**: `validarFilaBasica() = false` → **OMITIR**

---

## 📋 CASOS DE PRUEBA - CÁLCULO DE TOTALES

### Caso 11: Totales de Liquidación Completa

**Entrada** (Liquidación de Pediatría - Noviembre 2025):
```
10 consultas procesadas:
- 5 consultas OSDE (sin adicional): $7,000 c/u = $35,000
- 3 consultas Damsu (con adicional $1,500): $7,100 c/u = $21,300
- 2 consultas Provincia (con adicional $1,200): $9,600 c/u = $19,200
```

**Cálculo de Totales**:
```
Total Consultas: 10

Total Bruto (suma de montos facturados):
  OSDE: 5 × $10,000 = $50,000
  Damsu: 3 × $8,000 = $24,000
  Provincia: 2 × $12,000 = $24,000
  TOTAL BRUTO: $98,000

Total Retenciones (30%):
  $98,000 × 0.30 = $29,400

Total Adicionales:
  Damsu: 3 × $1,500 = $4,500
  Provincia: 2 × $1,200 = $2,400
  TOTAL ADICIONALES: $6,900

Total Neto (para médicos):
  $98,000 - $29,400 + $6,900 = $75,500
```

**Salida Esperada en `liquidaciones_guardia`**:
```json
{
  "total_consultas": 10,
  "total_bruto": 98000,
  "total_retenciones": 29400,
  "total_adicionales": 6900,
  "total_neto": 75500
}
```

---

## 🧪 TESTS UNITARIOS SUGERIDOS

### Test 1: Función `esHorarioFormativo()`
```typescript
describe('esHorarioFormativo', () => {
  it('debe retornar true para 07:30', () => {
    expect(esHorarioFormativo('07:30')).toBe(true);
  });

  it('debe retornar true para 14:59', () => {
    expect(esHorarioFormativo('14:59')).toBe(true);
  });

  it('debe retornar false para 07:29', () => {
    expect(esHorarioFormativo('07:29')).toBe(false);
  });

  it('debe retornar false para 15:00', () => {
    expect(esHorarioFormativo('15:00')).toBe(false);
  });

  it('debe retornar false para 20:00', () => {
    expect(esHorarioFormativo('20:00')).toBe(false);
  });
});
```

---

### Test 2: Función `convertirFecha()`
```typescript
describe('convertirFecha', () => {
  it('debe convertir DD/MM/YYYY a YYYY-MM-DD', () => {
    expect(convertirFecha('15/11/2025')).toBe('2025-11-15');
  });

  it('debe convertir serial de Excel a YYYY-MM-DD', () => {
    expect(convertirFecha(45610)).toBe('2025-11-15');
  });

  it('debe convertir Date object a YYYY-MM-DD', () => {
    const fecha = new Date(2025, 10, 15);
    expect(convertirFecha(fecha)).toBe('2025-11-15');
  });

  it('debe lanzar error para formato inválido', () => {
    expect(() => convertirFecha('invalid')).toThrow();
  });
});
```

---

### Test 3: Cálculo de Importe Pediatría
```typescript
describe('procesarFilaPediatria', () => {
  it('debe calcular correctamente sin adicional', async () => {
    const resultado = await processor.procesarFilaPediatria({
      monto_facturado: 10000,
      obra_social: 'OSDE'
    }, ...);

    expect(resultado.detalle.importe_calculado).toBe(7000);
    expect(resultado.detalle.monto_retencion).toBe(3000);
    expect(resultado.detalle.monto_adicional).toBe(0);
  });

  it('debe calcular correctamente con adicional Damsu', async () => {
    const resultado = await processor.procesarFilaPediatria({
      monto_facturado: 8000,
      obra_social: 'Damsu'
    }, ...);

    expect(resultado.detalle.importe_calculado).toBe(7100);
    expect(resultado.detalle.monto_adicional).toBe(1500);
  });
});
```

---

### Test 4: Regla de Residentes Ginecología
```typescript
describe('procesarFilaGinecologia', () => {
  it('residente en horario formativo debe tener importe 0', async () => {
    const resultado = await processor.procesarFilaGinecologia({
      hora: '10:00',
      medico_es_residente: true
    }, ...);

    expect(resultado.detalle.importe_calculado).toBe(0);
    expect(resultado.detalle.es_horario_formativo).toBe(true);
  });

  it('residente fuera de horario debe cobrar', async () => {
    const resultado = await processor.procesarFilaGinecologia({
      hora: '20:00',
      medico_es_residente: true
    }, ...);

    expect(resultado.detalle.importe_calculado).toBeGreaterThan(0);
    expect(resultado.detalle.es_horario_formativo).toBe(false);
  });

  it('médico de planta siempre debe cobrar', async () => {
    const resultado = await processor.procesarFilaGinecologia({
      hora: '10:00',
      medico_es_residente: false
    }, ...);

    expect(resultado.detalle.importe_calculado).toBeGreaterThan(0);
    expect(resultado.detalle.es_horario_formativo).toBe(false);
  });
});
```

---

## 📊 DATOS DE PRUEBA (SEED)

### Médicos de Prueba
```sql
INSERT INTO medicos (nombre, matricula, es_residente, especialidad) VALUES
  ('Dra. María González', '12345', false, 'Pediatría'),
  ('Dr. Carlos Rodríguez', '67890', false, 'Pediatría'),
  ('Dr. Juan Residente', '99999', true, 'Ginecología'),
  ('Dra. Ana Planta', '11111', false, 'Ginecología');
```

### Tarifas de Prueba
```sql
INSERT INTO tarifas_guardia (tipo_guardia, fecha_vigencia, valor_consulta, porcentaje_retencion) VALUES
  ('Pediatría', '2025-01-01', 5000, 30);

INSERT INTO tarifas_guardia (tipo_guardia, fecha_vigencia, valor_hora) VALUES
  ('Ginecología', '2025-01-01', 8000);
```

### Adicionales de Prueba
```sql
INSERT INTO configuracion_adicionales (obra_social, especialidad, mes, anio, aplica_adicional, monto_adicional) VALUES
  ('Damsu', 'Pediatría', 11, 2025, true, 1500),
  ('Provincia', 'Pediatría', 11, 2025, true, 1200);
```

---

**Powered by Grow Labs 🌱**  
© 2025 - Sistema de Liquidaciones de Guardias Médicas

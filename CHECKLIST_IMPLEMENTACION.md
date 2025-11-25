# ✅ Checklist de Implementación - Sistema de Liquidaciones de Guardias Médicas

---

## 📋 FASE 1: ARQUITECTURA Y DISEÑO ✅ COMPLETADA

### Base de Datos
- [x] Diseñar esquema de base de datos
- [x] Crear script de migración SQL (`001_initial_schema.sql`)
- [x] Definir tablas principales (medicos, tarifas, liquidaciones, detalles)
- [x] Definir tablas auxiliares (feriados, logs, configuración)
- [x] Crear índices optimizados
- [x] Implementar triggers para `updated_at`
- [x] Configurar RLS (Row Level Security) básico
- [x] Crear vistas útiles (`v_resumen_liquidaciones`, `v_detalle_completo`)
- [x] Insertar datos seed (feriados 2025, tarifas ejemplo)
- [x] Documentar esquema completo

### Tipos TypeScript
- [x] Definir interfaces para todas las tablas
- [x] Definir tipos Insert/Update para cada tabla
- [x] Definir enums (EstadoLiquidacion, EstadoRevision, etc.)
- [x] Definir tipos auxiliares para procesamiento
- [x] Definir tipos para exportación de PDF
- [x] Definir tipos para reglas de negocio
- [x] Crear tipo Database compatible con Supabase
- [x] Documentar todos los tipos con JSDoc

### Lógica de Negocio
- [x] Diseñar pseudocódigo del procesador principal
- [x] Definir flujo de procesamiento de Excel
- [x] Definir reglas de Pediatría (retención 30%, adicionales)
- [x] Definir reglas de Ginecología (horario formativo)
- [x] Definir funciones de normalización (fechas, horas)
- [x] Definir funciones de limpieza de datos
- [x] Definir cálculo de totales
- [x] Documentar casos de prueba

### Documentación
- [x] Crear documentación del esquema de DB
- [x] Crear resumen de Fase 1
- [x] Crear casos de prueba detallados
- [x] Crear diagramas de arquitectura
- [x] Crear checklist de implementación

---

## 📋 FASE 2: CONFIGURACIÓN DEL PROYECTO

### Configurar Supabase
- [ ] Crear proyecto en Supabase Cloud
- [ ] Ejecutar migración `001_initial_schema.sql`
- [ ] Verificar que todas las tablas se crearon correctamente
- [ ] Configurar Storage para archivos Excel
  - [ ] Crear bucket `liquidaciones-excel`
  - [ ] Configurar políticas de acceso
- [ ] Obtener credenciales (URL, anon key, service key)
- [ ] Configurar variables de entorno

### Inicializar Proyecto Next.js
- [ ] Ejecutar `npx create-next-app@latest guardias-app --typescript --tailwind --app`
- [ ] Configurar estructura de carpetas
  ```
  app/
  ├── (auth)/
  ├── (dashboard)/
  ├── api/
  ├── liquidaciones/
  └── admin/
  lib/
  ├── supabase/
  ├── services/
  └── utils/
  components/
  ├── ui/ (Shadcn)
  └── custom/
  public/
  ├── logogrow.png
  └── fondogrow.png
  ```
- [ ] Configurar `.env.local`
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ```

### Instalar Dependencias
- [ ] Instalar Supabase Client
  ```bash
  npm install @supabase/supabase-js
  ```
- [ ] Instalar Shadcn/UI
  ```bash
  npx shadcn-ui@latest init
  ```
- [ ] Instalar componentes Shadcn necesarios
  ```bash
  npx shadcn-ui@latest add button card input table dialog toast
  ```
- [ ] Instalar librerías de procesamiento
  ```bash
  npm install xlsx jspdf jspdf-autotable
  npm install -D @types/jspdf
  ```
- [ ] Instalar utilidades
  ```bash
  npm install lucide-react date-fns clsx tailwind-merge
  ```

### Configurar Tailwind y Estilos
- [ ] Configurar `tailwind.config.ts` con paleta Grow Labs
- [ ] Crear `globals.css` con estilos base
  - [ ] Glassmorphism classes
  - [ ] Glow effects
  - [ ] Animaciones (float, border-glow)
- [ ] Configurar dark mode obligatorio
- [ ] Agregar assets (logogrow.png, fondogrow.png)

---

## 📋 FASE 3: BACKEND (SERVICIOS Y API)

### Servicios Base
- [ ] Crear `lib/supabase/client.ts` (cliente de Supabase)
- [ ] Crear `lib/supabase/server.ts` (para API routes)
- [ ] Crear `lib/types.ts` (copiar tipos creados en Fase 1)

### Servicio: Excel Reader
- [ ] Crear `lib/services/excel-reader.ts`
- [ ] Implementar función `leerExcel(buffer: Buffer)`
- [ ] Implementar detección automática de columnas
- [ ] Implementar validación de formato
- [ ] Agregar manejo de errores

### Servicio: Guardias Processor
- [ ] Crear `lib/services/guardias-processor.ts`
- [ ] Convertir pseudocódigo a código real
- [ ] Implementar clase `GuardiasProcessor`
- [ ] Implementar método `procesarExcel()`
- [ ] Implementar `procesarFilaPediatria()`
- [ ] Implementar `procesarFilaGinecologia()`
- [ ] Implementar funciones de normalización
  - [ ] `convertirFecha()`
  - [ ] `convertirHora()`
  - [ ] `normalizarTexto()`
  - [ ] `convertirANumero()`
- [ ] Implementar funciones de validación
  - [ ] `validarFilaBasica()`
  - [ ] `esHorarioFormativo()`
- [ ] Implementar funciones de DB
  - [ ] `crearLiquidacion()`
  - [ ] `cargarDatosReferencia()`
  - [ ] `identificarMedico()`
  - [ ] `insertarDetalles()`
  - [ ] `calcularTotales()`
  - [ ] `insertarLogs()`
- [ ] Agregar tests unitarios

### Servicio: PDF Exporter
- [ ] Crear `lib/services/pdf-exporter.ts`
- [ ] Implementar función `exportarPDFPorMedico()`
- [ ] Configurar layout según `MEJORAS_PDF_FINAL.md`
  - [ ] Márgenes: 15mm
  - [ ] Ancho útil: 180mm
  - [ ] Logo Grow Labs
  - [ ] Cuadro de información del médico
  - [ ] Tabla de detalles
- [ ] Implementar naming convention: `{MATRICULA}_{SIGLA}_{PERIODO}.pdf`
- [ ] Agregar estilos Grow Labs (verde, glassmorphism)

### Servicio: Feriados
- [ ] Crear `lib/services/feriados-service.ts`
- [ ] Implementar función `esFeriado(fecha: string)`
- [ ] Implementar función `obtenerFeriados(anio: number)`
- [ ] Implementar función `agregarFeriado()`

### API Routes
- [ ] Crear `app/api/liquidaciones/route.ts`
  - [ ] `GET /api/liquidaciones` - Listar liquidaciones
  - [ ] `POST /api/liquidaciones` - Crear liquidación
- [ ] Crear `app/api/liquidaciones/[id]/route.ts`
  - [ ] `GET /api/liquidaciones/[id]` - Obtener liquidación
  - [ ] `PUT /api/liquidaciones/[id]` - Actualizar liquidación
  - [ ] `DELETE /api/liquidaciones/[id]` - Eliminar liquidación
- [ ] Crear `app/api/liquidaciones/[id]/procesar/route.ts`
  - [ ] `POST /api/liquidaciones/[id]/procesar` - Procesar Excel
- [ ] Crear `app/api/liquidaciones/[id]/pdf/route.ts`
  - [ ] `GET /api/liquidaciones/[id]/pdf` - Generar PDF
- [ ] Crear `app/api/medicos/route.ts`
  - [ ] `GET /api/medicos` - Listar médicos
  - [ ] `POST /api/medicos` - Crear médico
- [ ] Crear `app/api/medicos/[id]/route.ts`
  - [ ] `PUT /api/medicos/[id]` - Actualizar médico
  - [ ] `DELETE /api/medicos/[id]` - Eliminar médico
- [ ] Crear `app/api/tarifas/route.ts`
  - [ ] `GET /api/tarifas` - Listar tarifas
  - [ ] `POST /api/tarifas` - Crear tarifa
- [ ] Crear `app/api/configuracion-adicionales/route.ts`
  - [ ] `GET /api/configuracion-adicionales` - Listar configuraciones
  - [ ] `POST /api/configuracion-adicionales` - Crear configuración

---

## 📋 FASE 4: FRONTEND (UI/UX)

### Layout y Páginas Base
- [ ] Configurar `app/layout.tsx`
  - [ ] Agregar fondo `fondogrow.png` con parallax
  - [ ] Agregar overlay oscuro
  - [ ] Configurar dark mode
  - [ ] Agregar Toaster para notificaciones
- [ ] Crear `app/page.tsx` (Dashboard Principal)
  - [ ] Logo Grow Labs con animación float
  - [ ] Cards con glassmorphism
  - [ ] Navegación a módulos principales
  - [ ] Footer Grow Labs

### Componentes UI Base
- [ ] Crear `components/ui/` (Shadcn components)
  - [ ] Verificar que todos los componentes tengan dark mode
  - [ ] Personalizar colores con paleta Grow Labs
- [ ] Crear `components/custom/Footer.tsx`
  - [ ] Logo Grow Labs
  - [ ] Enlaces sociales
  - [ ] Copyright
- [ ] Crear `components/custom/InlineEditCell.tsx`
  - [ ] Copiar de proyecto anterior
  - [ ] Adaptar estilos Grow Labs
  - [ ] Agregar soporte para diferentes tipos (text, number, date)

### Módulo: Liquidaciones
- [ ] Crear `app/liquidaciones/page.tsx` (Lista)
  - [ ] Tabla de liquidaciones
  - [ ] Filtros (mes, año, especialidad, estado)
  - [ ] Botón: Nueva Liquidación
  - [ ] Paginación
- [ ] Crear `app/liquidaciones/nueva/page.tsx` (Crear)
  - [ ] Form: Seleccionar especialidad
  - [ ] Form: Seleccionar mes/año
  - [ ] Componente: UploadExcel (drag & drop)
  - [ ] Botón: Procesar
  - [ ] Mostrar progreso de procesamiento
- [ ] Crear `app/liquidaciones/[id]/page.tsx` (Detalle)
  - [ ] Componente: ResumenLiquidacion (card con totales)
  - [ ] Componente: TablaDetalle (con InlineEditCell)
  - [ ] Botón: Exportar PDF
  - [ ] Botón: Aprobar Liquidación
  - [ ] Tabs: Detalle | Logs | Resumen por Médico
- [ ] Crear `app/liquidaciones/[id]/editar/page.tsx` (Editar)
  - [ ] Form de edición inline
  - [ ] Validación en tiempo real

### Componentes Custom: Liquidaciones
- [ ] Crear `components/custom/UploadExcel.tsx`
  - [ ] Drag & drop zone
  - [ ] Validación de formato (.xlsx, .xls)
  - [ ] Validación de tamaño (< 10MB)
  - [ ] Preview de archivo
  - [ ] Botón: Eliminar archivo
- [ ] Crear `components/custom/ResumenLiquidacion.tsx`
  - [ ] Card con glassmorphism
  - [ ] Mostrar totales (consultas, bruto, retenciones, adicionales, neto)
  - [ ] Gráfico de barras (opcional)
- [ ] Crear `components/custom/TablaDetalle.tsx`
  - [ ] Tabla con InlineEditCell
  - [ ] Filtros (médico, fecha, estado)
  - [ ] Ordenamiento por columna
  - [ ] Paginación
  - [ ] Selección múltiple (checkboxes)
  - [ ] Acciones en lote (aprobar, observar)
- [ ] Crear `components/custom/LogsViewer.tsx`
  - [ ] Lista de logs con colores por tipo
  - [ ] Filtro por tipo (inicio, error, advertencia, finalizado)
  - [ ] Expandir/colapsar detalles JSON

### Módulo: Administración - Médicos
- [ ] Crear `app/admin/medicos/page.tsx`
  - [ ] Tabla de médicos con InlineEditCell
  - [ ] Filtros (especialidad, activo/inactivo)
  - [ ] Botón: Agregar Médico
  - [ ] Botón: Importar Excel
  - [ ] Toggle: Activar/Desactivar médico
- [ ] Crear componente: FormMedico
  - [ ] Campos: nombre, matrícula, especialidad, es_residente
  - [ ] Validación de matrícula única
  - [ ] Botón: Guardar

### Módulo: Administración - Tarifas
- [ ] Crear `app/admin/tarifas/page.tsx`
  - [ ] Tabla de tarifas con histórico
  - [ ] Filtros (tipo_guardia, fecha_vigencia)
  - [ ] Botón: Nueva Tarifa
  - [ ] Indicador de tarifa vigente actual
- [ ] Crear componente: FormTarifa
  - [ ] Campos: tipo_guardia, fecha_vigencia, valores
  - [ ] Validación de fechas
  - [ ] Preview de cálculo

### Módulo: Administración - Adicionales
- [ ] Crear `app/admin/adicionales/page.tsx`
  - [ ] Filtros (mes, año)
  - [ ] Tabla de Obras Sociales
  - [ ] Toggle: Activar/Desactivar adicional
  - [ ] Input: Monto adicional
  - [ ] Botón: Guardar cambios
- [ ] Crear componente: ConfiguradorAdicionales
  - [ ] Lista de Obras Sociales comunes
  - [ ] Agregar nueva Obra Social
  - [ ] Configuración por mes/año

---

## 📋 FASE 5: TESTING Y VALIDACIÓN

### Tests Unitarios
- [ ] Configurar Jest + React Testing Library
- [ ] Tests de `guardias-processor.ts`
  - [ ] Test: `esHorarioFormativo()`
  - [ ] Test: `convertirFecha()`
  - [ ] Test: `convertirHora()`
  - [ ] Test: `procesarFilaPediatria()`
  - [ ] Test: `procesarFilaGinecologia()`
  - [ ] Test: `validarFilaBasica()`
- [ ] Tests de `excel-reader.ts`
  - [ ] Test: Leer Excel válido
  - [ ] Test: Manejar Excel corrupto
  - [ ] Test: Detectar columnas
- [ ] Tests de `pdf-exporter.ts`
  - [ ] Test: Generar PDF simple
  - [ ] Test: Naming convention
  - [ ] Test: Layout correcto

### Tests de Integración
- [ ] Test: Procesamiento completo de Excel de Pediatría
  - [ ] Cargar Excel de prueba
  - [ ] Procesar con GuardiasProcessor
  - [ ] Verificar detalles insertados en DB
  - [ ] Verificar totales calculados
- [ ] Test: Procesamiento completo de Excel de Ginecología
  - [ ] Cargar Excel de prueba
  - [ ] Verificar regla de residentes
  - [ ] Verificar horario formativo
- [ ] Test: Generación de PDF por médico
  - [ ] Generar PDF
  - [ ] Verificar nombre de archivo
  - [ ] Verificar contenido del PDF
- [ ] Test: Edición inline de detalles
  - [ ] Editar celda
  - [ ] Guardar cambio
  - [ ] Verificar actualización en DB

### Tests de Reglas de Negocio
- [ ] Test: Retención 30% en Pediatría
  - [ ] Caso: $10,000 → $7,000 neto
  - [ ] Caso: $8,000 → $5,600 neto
- [ ] Test: Adicionales por Obra Social
  - [ ] Caso: Damsu → +$1,500
  - [ ] Caso: Provincia → +$1,200
  - [ ] Caso: OSDE → $0 adicional
- [ ] Test: Horario formativo 07:30-15:00
  - [ ] Caso: 07:29 → SÍ cobra
  - [ ] Caso: 07:30 → NO cobra
  - [ ] Caso: 14:59 → NO cobra
  - [ ] Caso: 15:00 → SÍ cobra
- [ ] Test: Residentes vs Médicos de planta
  - [ ] Caso: Residente en horario formativo → $0
  - [ ] Caso: Residente fuera de horario → Cobra
  - [ ] Caso: Médico de planta → Siempre cobra

### Tests de UI/UX
- [ ] Test: Navegación entre páginas
- [ ] Test: Upload de Excel
- [ ] Test: Edición inline
- [ ] Test: Exportación de PDF
- [ ] Test: Filtros y búsqueda
- [ ] Test: Responsive design (mobile, tablet, desktop)

### Tests de Performance
- [ ] Test: Procesar 1000+ filas en < 10 segundos
- [ ] Test: Generar PDF en < 2 segundos
- [ ] Test: Lighthouse Score > 90
- [ ] Test: First Contentful Paint < 1.5s
- [ ] Test: Time to Interactive < 3s

---

## 📋 FASE 6: DEPLOYMENT Y PRODUCCIÓN

### Preparación para Producción
- [ ] Configurar variables de entorno de producción
- [ ] Configurar Supabase en modo producción
- [ ] Refinar políticas RLS por roles
- [ ] Configurar backups automáticos de DB
- [ ] Configurar logs de aplicación
- [ ] Configurar monitoreo de errores (Sentry, opcional)

### Deployment
- [ ] Conectar repositorio a Vercel
- [ ] Configurar variables de entorno en Vercel
- [ ] Configurar dominio personalizado (opcional)
- [ ] Hacer deploy de producción
- [ ] Verificar que todo funcione correctamente

### Optimizaciones
- [ ] Optimizar imágenes (logogrow.png, fondogrow.png)
- [ ] Configurar caché de API routes
- [ ] Configurar CDN para assets estáticos
- [ ] Minificar CSS/JS
- [ ] Lazy loading de componentes pesados

### Documentación Final
- [ ] Crear manual de usuario
- [ ] Crear guía de administración
- [ ] Documentar API endpoints
- [ ] Crear video tutorial (opcional)
- [ ] Crear FAQ

---

## 📋 FASE 7: MANTENIMIENTO Y MEJORAS

### Monitoreo
- [ ] Configurar alertas de errores
- [ ] Monitorear uso de DB
- [ ] Monitorear performance de API
- [ ] Revisar logs de procesamiento

### Mejoras Futuras (Opcional)
- [ ] Agregar autenticación de usuarios
- [ ] Agregar roles y permisos avanzados
- [ ] Agregar notificaciones por email
- [ ] Agregar dashboard de analytics
- [ ] Agregar exportación a Excel
- [ ] Agregar comparación de periodos
- [ ] Agregar gráficos y reportes
- [ ] Agregar auditoría de cambios
- [ ] Agregar firma digital de PDFs

---

## 📊 PROGRESO GENERAL

### Fase 1: Arquitectura y Diseño
**Progreso: 100% ✅ COMPLETADA**
- [x] Base de Datos (100%)
- [x] Tipos TypeScript (100%)
- [x] Lógica de Negocio (100%)
- [x] Documentación (100%)

### Fase 2: Configuración del Proyecto
**Progreso: 0%**
- [ ] Configurar Supabase (0%)
- [ ] Inicializar Next.js (0%)
- [ ] Instalar Dependencias (0%)
- [ ] Configurar Estilos (0%)

### Fase 3: Backend
**Progreso: 0%**
- [ ] Servicios Base (0%)
- [ ] Guardias Processor (0%)
- [ ] PDF Exporter (0%)
- [ ] API Routes (0%)

### Fase 4: Frontend
**Progreso: 0%**
- [ ] Layout y Páginas Base (0%)
- [ ] Módulo Liquidaciones (0%)
- [ ] Módulo Administración (0%)

### Fase 5: Testing
**Progreso: 0%**
- [ ] Tests Unitarios (0%)
- [ ] Tests de Integración (0%)
- [ ] Tests de Reglas de Negocio (0%)

### Fase 6: Deployment
**Progreso: 0%**
- [ ] Preparación (0%)
- [ ] Deploy (0%)
- [ ] Optimizaciones (0%)

---

## 🎯 PRÓXIMO PASO

**Iniciar Fase 2: Configuración del Proyecto**

1. Crear proyecto en Supabase Cloud
2. Ejecutar migración SQL
3. Inicializar proyecto Next.js
4. Instalar dependencias

---

**Powered by Grow Labs 🌱**  
© 2025 - Sistema de Liquidaciones de Guardias Médicas  
Versión: 1.0.0

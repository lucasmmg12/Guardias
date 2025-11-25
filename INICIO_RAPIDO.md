# 🚀 Inicio Rápido - Sistema de Guardias

## 1. Configurar Supabase (5 min)

1. Ve a tu Supabase Dashboard → SQL Editor
2. Ejecuta el script: `database/migrations/002_add_guardias_system.sql`
3. Verifica que se crearon las 6 tablas nuevas

## 2. Configurar Variables de Entorno (2 min)

Crea el archivo `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

## 3. Ejecutar el Proyecto (1 min)

```bash
npm run dev
```

Abre http://localhost:3000

## 4. Probar

- ✅ Deberías ver el dashboard principal
- ✅ Click en "Pediatría" para ver la página de carga
- ✅ Verifica que carga los médicos desde Supabase

## Próximos Pasos

- Implementar upload de Excel
- Implementar procesamiento de datos
- Implementar generación de PDFs

---

**Powered by Grow Labs 🌱**

# SofVet — Sistema Interno Veterinario Pets & Pets

## Qué es
Sistema de gestión clínica veterinaria interno para el staff de Pets & Pets (veterinarios, auxiliares, administración).

## Stack
- Frontend: React + Vite (en /frontend/)
- Backend: Node.js (en /backend/, poco usado — Supabase hace la mayoría)
- DB: Supabase (PostgreSQL + Storage)
- URL Supabase: https://lddksdszpwonsqaavjyd.supabase.co
- Deploy: Vercel

## Estructura
- /frontend/src/pages/ → Páginas principales
- /frontend/src/components/ → Componentes reutilizables  
- /frontend/src/utils/ → useStore, supabaseClient, useSede, useAuth
- /backend/ → Server Node.js (controllers, routes, models)
- /landing_santamonica/ → Landing pre-apertura sede Santa Mónica
- /scripts/ y /Datos_CJ/ → Scripts e importación de datos

## Portal del Cliente
Existe un portal web para clientes en /frontend/src/pages/PortalPage.jsx
Este portal es una ruta dentro de la misma app React — NO es la app nativa para clientes.
La app nativa es un proyecto separado que vive fuera de este repo.

## Sedes
- id: 1, Santa Mónica, #2e5cbf
- id: 2, Colseguros, #2e7d50  
- id: 3, Ciudad Jardín, #b8860b
- id: 4, Domicilio, #7c5cbf

## Regla de oro SQL
Después de cualquier cambio SQL: NOTIFY pgrst, 'reload schema';

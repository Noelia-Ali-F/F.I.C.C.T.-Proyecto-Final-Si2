# F.I.C.C.T. - Proyecto Final Si2

Sistema integral de gestión de mudanzas con backend Django REST API y frontend React + Vite. Implementa autenticación JWT, base de datos PostgreSQL, almacenamiento en AWS S3, generación de PDFs, y un módulo de IA para predicciones.

## 📋 Tabla de contenidos

- [Requisitos previos](#requisitos-previos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Instalación y configuración](#instalación-y-configuración)
- [Backend Django](#backend-django)
- [Frontend React + Vite](#frontend-react--vite)
- [Módulos principales](#módulos-principales)
- [Stack tecnológico](#stack-tecnológico)
- [Comandos útiles](#comandos-útiles)

---

## 🔧 Requisitos previos

### General
- Git
- Editor de código (VS Code recomendado)

### Backend
- Python 3.12 o superior
- PostgreSQL 12 o superior
- pip (gestor de paquetes de Python)

### Frontend
- Node.js 18 o superior
- npm 9 o superior

---

## 📁 Estructura del proyecto

```
F.I.C.C.T.-Proyecto-Final-Si2/
├── backend-mudanza/              # Django REST API
│   ├── backend_django/           # Configuración del proyecto
│   ├── apps/                     # Aplicaciones Django
│   │   ├── usuarios/             # Autenticación y usuarios
│   │   ├── clientes/             # Gestión de clientes
│   │   ├── zonas/                # Zonas de cobertura
│   │   ├── servicios/            # Catálogo de servicios
│   │   ├── inventario/           # Control de inventario
│   │   ├── mudanzas/             # Orden de mudanzas
│   │   ├── cotizaciones/         # Cotizaciones
│   │   ├── reservas/             # Reservas
│   │   ├── pagos/                # Pagos y facturación
│   │   ├── vehiculos/            # Gestión de vehículos
│   │   ├── personal/             # Gestión de personal
│   │   ├── ia/                   # Módulo de IA
│   │   ├── chatbot/              # Chatbot
│   │   ├── notificaciones/       # Sistema de notificaciones
│   │   ├── carga/                # Carga de datos
│   │   └── reportes/             # Reportes
│   ├── manage.py
│   ├── requirements.txt
│   └── .env (no incluir en git)
│
├── frontend-mudanza/             # React + Vite
│   ├── src/
│   │   ├── pages/                # Páginas principales
│   │   ├── components/           # Componentes reutilizables
│   │   ├── layouts/              # Layouts base
│   │   ├── context/              # Estado global
│   │   ├── api/                  # Cliente HTTP
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md (este archivo)
```

---

## 🚀 Instalación y configuración

### Opción 1: Instalación completa (Backend + Frontend)

#### 1. Clonar o descargar el repositorio
```bash
cd F.I.C.C.T.-Proyecto-Final-Si2
```

#### 2. Configurar Backend
```bash
cd backend-mudanza
python3 -m venv venv
source venv/bin/activate          # En Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 3. Configurar variables de entorno del Backend
Crea un archivo `.env` en la carpeta `backend-mudanza/`:

```env
# Django
SECRET_KEY=tu-clave-secreta-muy-larga-y-aleatoria
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

# Database PostgreSQL
DB_NAME=crm_betty
DB_USER=postgres
DB_PASSWORD=tu-contraseña
DB_HOST=localhost
DB_PORT=5432

# CORS - direcciones del frontend
CORS_ALLOWED_ORIGINS=http://localhost:5173

# JWT (opcional)
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7

# AWS S3 (si usas almacenamiento en la nube)
# AWS_ACCESS_KEY_ID=tu-access-key
# AWS_SECRET_ACCESS_KEY=tu-secret-key
# AWS_STORAGE_BUCKET_NAME=tu-bucket
```

#### 4. Crear base de datos y hacer migraciones
```bash
# Verificar que PostgreSQL esté corriendo
python manage.py migrate
```

#### 5. Crear superusuario (administrador)
```bash
python manage.py createsuperuser
```

#### 6. (Opcional) Cargar datos iniciales
```bash
python manage.py poblar_configuracion_inicial
python manage.py seed_data
```

#### 7. Levantar servidor Backend
```bash
python manage.py runserver
```
- API: **http://127.0.0.1:8000/**
- Panel admin: **http://127.0.0.1:8000/admin/**
- Swagger docs: **http://127.0.0.1:8000/api/docs/**
- ReDoc: **http://127.0.0.1:8000/api/redoc/**

#### 8. Configurar y levantar Frontend (en otra terminal)
```bash
cd ../frontend-mudanza
npm install
npm run dev
```
- Frontend: **http://localhost:5173/**

---

## 🧠 Backend Django

### Requisitos específicos

El backend está basado en Django 6.x con las siguientes tecnologías:

- **Framework**: Django REST Framework
- **Base de datos**: PostgreSQL
- **Autenticación**: JWT (djangorestframework-simplejwt)
- **Almacenamiento**: AWS S3 (django-storages)
- **Generación de PDFs**: ReportLab y WeasyPrint
- **Procesamiento de imágenes**: Pillow
- **CORS**: django-cors-headers
- **IA/ML**: scikit-learn, pandas, numpy
- **Excel**: openpyxl
- **Testing**: pytest-django, factory-boy

### Estructura de apps

| App | Descripción | Prefijo API |
|-----|-------------|-------------|
| `usuarios` | Autenticación y gestión de usuarios | `/api/auth/` |
| `clientes` | Gestión de clientes y datos de contacto | `/api/clientes/` |
| `zonas` | Definición de zonas de cobertura | `/api/zonas/` |
| `servicios` | Catálogo de servicios disponibles | `/api/servicios/` |
| `inventario` | Control de inventario en mudanzas | `/api/inventario/` |
| `mudanzas` | Órdenes de mudanza | `/api/mudanzas/` |
| `cotizaciones` | Generación de cotizaciones | `/api/cotizaciones/` |
| `reservas` | Sistema de reservas | `/api/reservas/` |
| `pagos` | Procesamiento de pagos | `/api/pagos/` |
| `vehiculos` | Catálogo y asignación de vehículos | `/api/vehiculos/` |
| `personal` | Gestión de personal y asignaciones | `/api/personal/` |
| `ia` | Módulo de inteligencia artificial | `/api/ia/` |
| `chatbot` | Chat automático | `/api/chatbot/` |
| `notificaciones` | Sistema de notificaciones | `/api/notificaciones/` |
| `reportes` | Generación de reportes | `/api/reportes/` |

### Comandos útiles del Backend

```bash
# Migraciones
python manage.py makemigrations
python manage.py migrate

# Base de datos
python manage.py shell
python manage.py dbshell

# Testing
pytest
pytest --cov

# Crear data
python manage.py seed_data
python manage.py seed_fake_data

# Compilar estáticos (si aplica)
python manage.py collectstatic

# Runserver
python manage.py runserver 0.0.0.0:8000
```

---

## ⚛️ Frontend React + Vite

### Requisitos específicos

- **Bundler**: Vite
- **Framework**: React 19
- **Ruteo**: React Router DOM
- **HTTP Client**: Axios
- **Estilos**: Tailwind CSS
- **Linting**: ESLint

### Estructura de carpetas

```
src/
├── pages/                    # Páginas principales
│   ├── Auth/                 # Login, Registro
│   ├── Dashboard/            # Inicio
│   ├── Clientes/             # Gestión de clientes
│   ├── Cotizaciones/         # Cotizaciones
│   ├── Reservas/             # Reservas
│   ├── Mudanzas/             # Mudanzas
│   ├── Pagos/                # Pagos
│   ├── CRM/                  # CRM Pipeline e informes
│   ├── Admin/                # Usuarios, roles, configuración
│   ├── Catalogs/             # Zonas, servicios, inventario, vehículos, personal
│   ├── Cliente/              # Mis cotizaciones, mis reservas, mis pagos
│   ├── Chatbot/              # Chatbot
│   ├── Reportes/             # Reportes
│   └── Perfil/               # Perfil de usuario
│
├── components/               # Componentes reutilizables
│   ├── Forms/                # Componentes de formularios
│   ├── Tables/               # Componentes de tablas
│   ├── Modals/               # Componentes de modales
│   ├── ProtectedRoute/       # Rutas protegidas por rol
│   └── ...
│
├── layouts/
│   └── MainLayout/           # Layout principal con navbar y sidebar
│
├── context/
│   └── AuthContext/          # Contexto de autenticación
│
├── api/
│   └── client.js             # Cliente HTTP configurado
│
├── App.jsx                   # Definición de rutas
├── main.jsx                  # Punto de entrada
└── index.css                 # Estilos globales
```

### Comandos útiles del Frontend

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev              # Servidor de desarrollo con hot reload

# Build para producción
npm run build            # Genera carpeta dist/

# Preview del build
npm run preview          # Prueba localmente la compilación

# Lint
npm run lint             # Ejecuta ESLint
npm run lint --fix       # Arregla errores automáticos
```

---

## 📦 Módulos principales

### 1. **Autenticación (usuarios)**
- Login con JWT
- Registro de usuarios
- Gestión de perfiles
- Control de roles y permisos

### 2. **Gestión de Clientes (clientes)**
- CRUD de clientes
- Información de contacto
- Historial de mudanzas
- Loyalty points (programa de lealtad)

### 3. **Cotizaciones (cotizaciones)**
- Cálculo automático usando IA
- Generación de PDFs
- Historial de cotizaciones

### 4. **Mudanzas (mudanzas)**
- Creación de órdenes
- Asignación de personal y vehículos
- Seguimiento en tiempo real
- Acta de inventario

### 5. **Inventory (inventario)**
- Registro de artículos
- Generación de actas PDF
- Fotos de inventario

### 6. **Pagos (pagos)**
- Procesamiento de pagos
- Facturas electrónicas
- Estado de pagos

### 7. **IA (ia)**
- Predicción de costos
- Recomendaciones de rutas
- Análisis de datos

---

## 🛠️ Stack tecnológico

### Backend
- **Python 3.12**
- **Django 6.0.3**
- **Django REST Framework 3.16**
- **PostgreSQL**
- **JWT (SimpleJWT)**
- **AWS S3**
- **scikit-learn** (Machine Learning)
- **ReportLab + WeasyPrint** (PDF)
- **Pillow** (Imágenes)

### Frontend
- **React 19**
- **Vite 8**
- **React Router DOM 7**
- **Axios**
- **Tailwind CSS 4**
- **ESLint 9**

### DevOps/Tools
- **pytest-django** (Testing Backend)
- **Git/GitHub**
- **Docker** (opcional)
- **PostgreSQL** (BDD)

---

## 📚 Documentación adicional

- **OpenAPI/Swagger**: Disponible en `/api/docs/` (backend)
- **Flujo operativo**: Ver `backend-mudanza/flujo_operativo_completo_v2.html`
- **Esquema de BD**: Ver `backend-mudanza/schema.yml`

---

## 🔐 Seguridad

- ✅ Variables de entorno en `.env` (nunca commitear)
- ✅ JWT para autenticación
- ✅ CORS configurado
- ✅ Django security middleware
- ✅ Contraseñas hasheadas
- ✅ Tokens con expiración

---

## 📝 Licencia

Este proyecto está bajo licencia (ver archivo LICENSE).

---

## 👥 Autores

Proyecto F.I.C.C.T. - Proyecto Final Si2

# LifeStream - Blood Bank Management System (Full-Stack Django Backend)

A complete, production-grade **Blood Bank Management System** powered by a robust **Django backend** and modern **Bootstrap 5.3 + Leaflet.js** frontend. Exclusively incorporates geographical geofencing for **East Singhbhum district, Jharkhand, India**.

---

## 🚀 Quick Start Guide

### 1. Run Development Server
```bash
python manage.py runserver
```
Navigate to `http://127.0.0.1:8000/` in your browser.

### 2. Run Database Migrations (if needed)
```bash
python manage.py makemigrations
python manage.py migrate
```

### 3. Re-seed Demo Data (Hospitals, Donors, Inventory, Demo Accounts)
```bash
python manage.py seed_data
```

### 4. Run Automated Test Suite
```bash
python manage.py test
```

---

## ☁️ Deploying to Render (Production Setup)

This project is 100% production-ready for **[Render](https://render.com/)**.

### Option A: 1-Click Blueprint (Recommended)
1. Push your repository to **GitHub** or **GitLab**.
2. Open your [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Blueprint**.
3. Select your repository. Render will automatically detect [`render.yaml`](render.yaml) and configure:
   - Build Command: `bash build.sh`
   - Start Command: `gunicorn lifestream_project.wsgi:application`
   - Python Version: `3.11.9`
   - Automatic migrations & initial verified seeding
   - Secure random `SECRET_KEY` generation

### Option B: Manual Web Service Setup
1. On [Render](https://dashboard.render.com/), click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Name**: `lifestream-bloodbank`
   - **Region**: Singapore / Frankfurt / Oregon (any)
   - **Branch**: `main`
   - **Runtime**: `Python 3`
   - **Build Command**: `bash build.sh`
   - **Start Command**: `gunicorn lifestream_project.wsgi:application`
   - **Instance Type**: `Free`
4. In **Environment Variables**, add:
   - `PYTHON_VERSION`: `3.11.9`
   - `DJANGO_DEBUG`: `False`
   - `SECRET_KEY`: *(click Generate or enter a secure 50+ character string)*
   - `WEB_CONCURRENCY`: `4`
   - *(Optional)* `DATABASE_URL`: *(Connect a Render PostgreSQL database URL if using PostgreSQL)*
5. Click **Deploy Web Service**.
   - Your live site will be ready in 2-3 minutes at `https://<your-app>.onrender.com`!

---

## 🔐 Pre-Configured Demo Accounts

| Role | Username | Password | Purpose |
|---|---|---|---|
| **System Administrator** | `admin` | `admin123` | Master control dashboard + Full Django Admin `/admin/` access |
| **Hospital / Healthcare** | `tata_hospital` | `hospital123` | Hospital portal (Tata Main Hospital TMH), blood requisitions, local donor lookup |
| **Blood Donor** | `rahul_donor` | `donor123` | Donor personal dashboard, live availability toggle, matching emergency alerts |

---

## 🌟 Key Django Backend Features

### 1. User Roles & Working Authentication
- **Unified Login (`/login/`)**: Authenticates Donors, Hospitals, and Admins, intelligently routing each user to their role-specific dashboard.
- **Dual-Role Signup (`/signup/`)**:
  - **Donor Registration**: Registers full name, blood group, age, gender, phone, and locality. Automatically creates a `DonorProfile` and sets availability.
  - **Hospital Registration**: Registers facility name, category, East Singhbhum locality, bed count, and blood bank status. Automatically creates a `Hospital` record.
- **Django Admin Panel (`/admin/`)**: Complete administrative control over all models (Users, Donors, Hospitals, Blood Requests, Inventory, Camps).

### 2. Role-Based Dashboards
- **Donor Dashboard (`/dashboard/donor/`)**:
  - Live availability toggle button (instant AJAX update in database).
  - Next donation eligibility countdown timer (90-day medical interval).
  - Urgent blood requests matching the donor's blood group in East Singhbhum.
  - Registered donation drives and certificate donation history.
- **Hospital Dashboard (`/dashboard/hospital/`)**:
  - Fast blood requisition form (submits immediately to SQLite/PostgreSQL database).
  - Requisitions tracker with live status badges (`Urgent Needed`, `In Progress`, `Fulfilled`).
  - Nearby available local donors directory with 1-click coordinator calling.
  - In-house blood bank capacity and storage status.
- **Admin Dashboard (`/dashboard/admin/`)**:
  - Regional telemetry: Total verified donors, geofenced hospitals, available inventory units, pending emergency alerts.
  - Quick shortcuts directly into Django `/admin/` models.
  - 1-click requisition status updater.

### 3. Public Pages (All Data Dynamically Sourced from Backend)
- **Home (`/`)**: Live statistics counter, active emergency alerts, inventory overview, upcoming drives.
- **Find Donors (`/donors/`)**: Search and filter database donors by blood group, locality, availability, and search keywords.
- **Request Blood (`/request-blood/`)**: Interactive Leaflet map displaying East Singhbhum polygon boundary geofence and 10 verified hospital pins. Full blood requisition form saving directly to the database.
- **Live Inventory (`/inventory/`)**: Real-time stock levels for all 8 blood groups (A+, A-, B+, B-, AB+, AB-, O+, O-), red cells, platelets, and plasma.
- **Donation Camps (`/camps/`)**: List of upcoming drives with working 1-click registration form.

---

## 🗄️ Database Models (`bloodbank/models.py`)

1. **`UserProfile`**: Extends Django's `auth.User` with role (`DONOR`, `HOSPITAL`, `ADMIN`), phone, city, and district.
2. **`DonorProfile`**: Pre-screened blood donors with blood group, age, gender, phone, availability status (`is_available`), and total donations.
3. **`Hospital`**: Verified healthcare facilities inside East Singhbhum boundary with GPS coordinates, bed capacity, and blood bank status.
4. **`BloodInventory`**: Central inventory tracking for 8 blood groups, optimal/critical thresholds, red cells, platelets, and plasma.
5. **`BloodRequest`**: Patient emergency requisitions with priority rating (`Critical`, `High`, `Moderate`), required date, and live status.
6. **`DonationCamp`**: Community blood drives with venue, organizer, target units, and registered donor count.
7. **`CampRegistration`**: Donor registrations linked to camps.
8. **`BloodDonationRecord`**: Historical donation logs with digital certificate codes.

---

## 📍 East Singhbhum Verified Hospital Network (10 Facilities)
1. **Tata Main Hospital (TMH)** - Bistupur
2. **MGM Medical College & Hospital** - Sakchi
3. **Tata Motors Hospital** - Telco Colony
4. **The Tinplate Hospital** - Golmuri
5. **Brahmananda Narayana Multispeciality Hospital** - Mango / NH-33
6. **Mercy Hospital** - Baridih
7. **Rajasthan Seva Sadan Hospital** - Jugsalai
8. **Sadar Hospital East Singhbhum** - Khasmahal
9. **Sub-Divisional Hospital (SDH) Ghatshila** - Ghatshila
10. **Community Health Centre (CHC) Baharagora** - Baharagora

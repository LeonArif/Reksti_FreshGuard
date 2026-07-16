# 🥩 FreshGuard — Smart Food Freshness Detection System

> An IoT-based intelligent system for predicting food spoilage using ESP32 sensors, machine learning models, and real-time cloud processing. The system is triggered from a web frontend and provides predictions via AI-powered analysis.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Hardware Components](#hardware-components)
- [Installation & Setup](#installation--setup)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [ESP32 Setup](#esp32-setup)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

**FreshGuard** is a comprehensive food freshness detection system that combines IoT hardware with machine learning to predict food spoilage. When a user clicks the "Predict" button on the frontend:

1. A signal is sent to the backend
2. The backend triggers ESP32 to read sensor data (temperature, humidity, air quality)
3. The data is processed through an AI model (XGBoost) for prediction
4. Results are saved to the cloud database and displayed in real-time

### Use Cases
- 🏪 Retail food monitoring
- 🍎 Cold storage management
- 🏥 Food safety compliance
- 📊 Inventory tracking

---

## Key Features

✅ **Real-time Monitoring** — Live sensor data collection via ESP32  
✅ **AI-Powered Predictions** — XGBoost model for accurate spoilage detection  
✅ **Cloud Storage** — All data synced with Supabase  
✅ **Interactive Dashboard** — React web interface with charts and metrics  
✅ **User Authentication** — Google OAuth integration  
✅ **Prediction History** — Track all predictions per user  
✅ **Multi-sensor Support** — BME280 (temp/humidity) + MQ-135 (air quality)  
✅ **Visual Feedback** — OLED display + RGB LED indicators  
✅ **Scalable Architecture** — Support for multiple ESP32 devices  

---

## System Architecture

### 🏗️ Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: Frontend (React + Vite)                       │
│  - Dashboard: View predictions & metrics                │
│  - Predict: Trigger new predictions                     │
│  - History: View past predictions                       │
└─────────────────────────────────────────────────────────┘
                        ↑ ↓
                    HTTP/REST API
                        ↑ ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 2: Backend (Node.js + Express)                   │
│  - API endpoints for predictions                        │
│  - Python AI model invocation                           │
│  - Database orchestration                               │
│  - Control signal management                            │
└─────────────────────────────────────────────────────────┘
                    Supabase DB ← Cloud Polling
                        ↑ ↓
┌─────────────────────────────────────────────────────────┐
│  LAYER 3: IoT (ESP32 + Sensors)                         │
│  - BME280: Temperature, Humidity, Pressure              │
│  - MQ-135: Air Quality (VOC)                            │
│  - OLED: Status display                                 │
│  - RGB LEDs: Status indicators                          │
└─────────────────────────────────────────────────────────┘
```

### 📊 Data Flow Diagram

```
User Clicks Predict
        ↓
Frontend → Backend (/api/food/predict)
        ↓
Backend sets flag in Supabase (READ_SENSORS)
        ↓
ESP32 polls Supabase every 5 seconds
        ↓
ESP32 detects flag → Reads sensors
        ↓
ESP32 sends sensor data to Backend (/api/food/sensor-data)
        ↓
Backend invokes Python AI Model (predict.py)
        ↓
AI Model outputs: TVC, RSL, Food Class
        ↓
Backend saves results to Supabase
        ↓
Frontend displays results in real-time
```

---

## Technology Stack

### Frontend
- **React 19** — UI framework
- **Vite 8** — Build tool  
- **Tailwind CSS 3** — Styling
- **React Router 6** — Routing
- **Supabase JS** — Cloud database client

### Backend
- **Node.js** — Runtime
- **Express 4** — REST API framework
- **Supabase** — PostgreSQL + Auth
- **Python 3** — AI model execution
- **XGBoost** — Machine learning model
- **Scikit-learn** — Data preprocessing

### IoT/Embedded
- **ESP32-WROOM-32** — Microcontroller
- **BME280** — Environmental sensor
- **MQ-135** — Air quality sensor
- **SSD1306 OLED** — Display
- **Arduino IDE** — Firmware development

---

## Project Structure

```
FreshGuard/
├── frontend/                      # React web application
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   │   ├── MetricCard.jsx
│   │   │   ├── PredictionForm.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── TopBar.jsx
│   │   ├── pages/                 # Page components
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── HistoryPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   └── PredictPage.jsx
│   │   ├── lib/                   # Utilities & API clients
│   │   │   ├── predictionApi.js
│   │   │   └── supabaseClient.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                       # Express API + AI model
│   ├── src/
│   │   ├── index.js               # Entry point
│   │   ├── controllers/           # Route handlers
│   │   │   ├── foodController.js
│   │   │   ├── predictController.js
│   │   │   ├── inferenceController.js
│   │   │   └── predictionHistoryController.js
│   │   ├── routes/                # API routes
│   │   │   ├── foodRoutes.js
│   │   │   ├── predictRoutes.js
│   │   │   └── index.js
│   │   ├── db/                    # Database
│   │   │   ├── schema.sql
│   │   │   ├── supabaseClient.js
│   │   │   └── printSchema.js
│   │   └── lib/                   # Helpers
│   │       ├── auth.js
│   │       └── predictionStore.js
│   ├── ai/                        # Machine Learning
│   │   ├── predict.py             # XGBoost prediction model
│   │   └── requirements.txt
│   ├── models/                    # Trained models storage
│   ├── package.json
│   └── README.md
│
├── Food-Spoilage-Prediction-master/   # ML development notebooks
│   ├── notebooks/
│   │   ├── 01_food_spoilage_integrated.ipynb
│   │   └── main.ipynb
│   ├── data/
│   │   ├── raw/
│   │   └── processed/
│   └── scripts/
│
├── freshguard.ino                 # ESP32 firmware
├── README.md                      # Main documentation (this file)
├── plan.md                        # Development roadmap
└── SYSTEM_OVERVIEW.md             # Detailed system documentation
```

---

## Hardware Components

| No | Component | Qty | Interface | Purpose |
|---|-----------|-----|-----------|---------|
| 1 | ESP32-WROOM-32 | 1 | — | Main microcontroller |
| 2 | BME280 | 1 | I2C (Wire1) | Temp, Humidity, Pressure |
| 3 | MQ-135 | 1 | Analog (GPIO 32) | Air Quality (VOC) |
| 4 | OLED SSD1306 | 1 | I2C (Wire) | 128×64 Display |
| 5 | LED Green | 1 | GPIO 14 | Status: Safe |
| 6 | LED Yellow | 1 | GPIO 12 | Status: Warning |
| 7 | LED Red | 1 | GPIO 13 | Status: Danger |
| 8 | Resistor 220Ω | 3 | — | LED current limiting |
| 9 | Jumper Cables | — | — | Connections |
| 10 | Breadboard | 1 | — | Prototyping |
| 11 | USB Micro-B Cable | 1 | — | Power & Programming |

### Pin Configuration

```
ESP32 PIN MAPPING:
├── I2C Bus 1 (OLED)
│   ├── GPIO 26 → SDA
│   └── GPIO 27 → SCL
├── I2C Bus 2 (BME280)
│   ├── GPIO 33 → SDA
│   └── GPIO 25 → SCL
├── Analog (MQ-135)
│   ├── GPIO 32 → AO (analog output)
│   └── GPIO 35 → DO (digital output)
└── Digital (LEDs)
    ├── GPIO 14 → LED Green
    ├── GPIO 12 → LED Yellow
    └── GPIO 13 → LED Red
```

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account
- Google OAuth credentials
- Arduino IDE (for ESP32)
- Git

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Backend
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
PORT=3000

# Frontend (.env.local)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Install Python Dependencies

```bash
cd ai
pip install -r requirements.txt
```

### 3. Setup Supabase Database

- Create a new Supabase project
- Run the schema from `backend/db/schema.sql` in Supabase SQL editor
- Update environment variables with your Supabase credentials

### 4. Run Backend

```bash
npm run dev        # Development with file watch
# or
npm start          # Production mode
```

Backend will start at `http://localhost:3000`

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Create `frontend/.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 3. Run Development Server

```bash
npm run dev
```

Frontend will start at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
npm run preview
```

---

## ESP32 Setup

### 1. Install Arduino IDE

Download from: https://www.arduino.cc/en/software

### 2. Add ESP32 Board

1. Open Arduino IDE → Preferences
2. Add board URL: `https://dl.espressif.com/dl/package_esp32_index.json`
3. Go to Boards Manager → Search "ESP32" → Install

### 3. Install Required Libraries

In Arduino IDE, go to **Sketch → Include Library → Manage Libraries** and install:
- Adafruit BME280
- Adafruit SSD1306
- ESP32 WiFi
- HTTPClient

### 4. Configure ESP32 Code

Edit `freshguard.ino` and set:

```cpp
// WiFi
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

// Supabase
const char* supabaseUrl = "YOUR_SUPABASE_URL";
const char* supabaseKey = "YOUR_SUPABASE_KEY";

// Backend
const char* backendUrl = "http://your-backend-ip:3000";
```

### 5. Upload Firmware

1. Connect ESP32 via USB
2. Select **Board: ESP32 Dev Module**
3. Select correct **COM Port**
4. Click **Upload**

---

## API Documentation

### Prediction Endpoints

#### POST `/api/food/predict`
Trigger a new food freshness prediction

```bash
curl -X POST http://localhost:3000/api/food/predict \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123"}'
```

**Response:**
```json
{
  "success": true,
  "prediction": {
    "temperature": 25.5,
    "humidity": 65.2,
    "mq135": 150,
    "tvc": 2.5,
    "rsl": 15.3,
    "class": "FRESH",
    "confidence": 0.92,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### GET `/api/food/history/:userId`
Get prediction history for a user

```bash
curl http://localhost:3000/api/food/history/user123
```

**Response:**
```json
{
  "success": true,
  "predictions": [
    {
      "id": "pred123",
      "userId": "user123",
      "class": "FRESH",
      "tvc": 2.5,
      "rsl": 15.3,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### POST `/api/food/sensor-data`
Receive sensor data from ESP32

```bash
curl -X POST http://localhost:3000/api/food/sensor-data \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 25.5,
    "humidity": 65.2,
    "mq135": 150,
    "pressure": 1013.25
  }'
```

---

## Troubleshooting

### ESP32 Issues

**Problem: ESP32 not detected in Arduino IDE**
- Solution: Install CH340 drivers from https://sparks.gogo.co.nz/ch340.html
- Check device manager for COM port

**Problem: Sensors not reading**
- Verify I2C addresses: 0x3C (OLED), 0x76 (BME280)
- Check wire connections and pull-up resistors
- Monitor I2C bus with I2C scanner sketch

### Backend Issues

**Problem: Python model not found**
- Ensure trained model files exist in `backend/models/`
- Check Python path in predict.py

**Problem: Supabase connection failed**
- Verify SUPABASE_URL and SUPABASE_KEY in .env
- Check firewall and network connectivity

### Frontend Issues

**Problem: Cannot connect to backend**
- Ensure backend is running on port 3000
- Check CORS settings in backend
- Verify API endpoint URLs in environment variables

**Problem: Google OAuth not working**
- Verify VITE_GOOGLE_CLIENT_ID is correct
- Check redirect URLs in Google Console

---

## File Details

### Key Files

- **backend/ai/predict.py** — XGBoost model for predictions
- **backend/src/index.js** — Express server entry point
- **backend/db/schema.sql** — Database structure
- **frontend/src/App.jsx** — Main React component
- **freshguard.ino** — ESP32 firmware

### Important Directories

- **backend/models/** — Trained ML models (XGBoost, scalers, etc.)
- **frontend/public/** — Static assets
- **Food-Spoilage-Prediction-master/notebooks/** — ML development & training

---

## Development Notes

### Database Schema

Main tables:
- `users` — User accounts (email, created_at)
- `predictions` — Prediction results (tvc, rsl, class, userId)
- `food_data` — Raw sensor readings
- `control_commands` — ESP32 trigger signals

### Model Architecture

- **Algorithm:** XGBoost
- **Input Features:** Temperature, Humidity, Air Quality (MQ-135)
- **Output Classes:** FRESH, WARN, SPOILED
- **Training Data:** `Food-Spoilage-Prediction-master/data/`

---

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -am 'Add new feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Submit a pull request

---

## License

This project is part of the REKSTI course at [University Name].

---

## Support

For issues and questions:
- 📧 Email: [contact]
- 📚 Documentation: See `SYSTEM_OVERVIEW.md` for detailed system guide
- 🐛 Issues: Report bugs in project tracker

---

**Last Updated:** January 2024
**Version:** 1.0.0

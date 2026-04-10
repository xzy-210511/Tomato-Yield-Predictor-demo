# Tomato Yield Predictor

A full-stack tomato yield prediction project built with Spring Boot, React, Vite, and a Python model service.

Users enter greenhouse and crop-management data in the web UI. The frontend sends the request to Spring Boot, Spring Boot forwards it to the Python model API, and the predicted yield is returned to the browser.

## Stack

- Java 21
- Spring Boot 3.5.13
- React 18
- Vite 5
- Python 3.12
- FastAPI
- scikit-learn / pandas / numpy
- H2 for local development

## Project Structure

```text
Tomato-Yield-Predictor-demo/
  frontend/                    React + Vite source
  model_service/               Python FastAPI model service
  src/main/java/               Spring Boot backend code
  src/main/resources/static/   Frontend files served by Spring Boot
  start-services.cmd           One-click startup entry for Windows
  start-services.ps1           PowerShell startup script
  pom.xml                      Maven / Spring Boot config
```

## What Runs Where

- `5173` or `5174`: Vite development server
- `8080`: Spring Boot backend and packaged frontend
- `8001`: Python model service

Request flow:

```text
Browser -> Spring Boot (/api/predict) -> Python FastAPI (/predict) -> Spring Boot -> Browser
```

When using Vite dev mode, the frontend proxies `/api` to `http://localhost:8080`.

## Environment Requirements

Install these first:

- JDK 21
- Python 3.12
- Node.js 20+ and npm

Recommended checks:

```powershell
java -version
python --version
node -v
npm -v
```

## Quick Start

### 1. Clone the repository

```powershell
git clone <your-repository-url>
cd Tomato-Yield-Predictor-demo
```

### 2. Install frontend dependencies

```powershell
cd frontend
npm install
cd ..
```

### 3. Run the project with one command

From the project root:

```powershell
.\start-services.cmd
```

What this script does:

- checks for Python on the machine
- creates `model_service/.venv` if it does not exist
- recreates the virtual environment if it is incomplete
- installs Python dependencies from `model_service/requirements.txt`
- starts the Python model service on `127.0.0.1:8001`
- starts Spring Boot on `localhost:8080`
- opens the application in the browser

Open:

```text
http://localhost:8080/#/
```

## Manual Startup

Use this if you want to run each service separately.

### Start the Python model service

```powershell
cd model_service
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn api:app --host 127.0.0.1 --port 8001
```

### Start Spring Boot

Open another terminal in the project root:

```powershell
$env:MAVEN_USER_HOME="$PWD\.m2"
.\mvnw.cmd spring-boot:run
```

Open:

```text
http://localhost:8080/#/
```

### Start the Vite development server

Use this when working on files under `frontend/src` and you want hot reload.

```powershell
cd frontend
npm run dev
```

Open the URL shown by Vite, usually:

```text
http://localhost:5173/
```

If `5173` is already in use, Vite will move to another port such as `5174`.

## Development Notes

### When to use Vite vs Spring Boot

Use Vite if:

- you are editing `frontend/src`
- you want instant frontend hot reload

Use Spring Boot at `8080` if:

- you want to test the packaged version of the app
- you want the full backend + frontend integration through the Spring Boot server

### Important difference

- `http://localhost:5173` or `5174`: Vite development frontend
- `http://localhost:8080`: Spring Boot serving built static frontend files

If you only change `frontend/src` but do not rebuild, Spring Boot will still serve the old packaged frontend.

## Rebuild Frontend for Spring Boot

If you want Spring Boot to use the latest frontend changes, rebuild the frontend and copy the generated files into `src/main/resources/static`.

### Build the frontend

```powershell
cd frontend
npm run build
cd ..
```

### Copy the latest build into Spring Boot static resources

```powershell
Remove-Item -Path .\src\main\resources\static\assets\* -Force
Copy-Item -Path .\frontend\dist\index.html -Destination .\src\main\resources\static\index.html -Force
Copy-Item -Path .\frontend\dist\assets\* -Destination .\src\main\resources\static\assets -Force
```

After that, restart Spring Boot and refresh `http://localhost:8080/#/`.

## Deployment Notes

This project is structured as three parts:

- React frontend
- Spring Boot backend
- Python model service

### Local deployment

The simplest local deployment is:

1. install Java, Python, Node.js
2. run `npm install` in `frontend`
3. run `.\start-services.cmd`

### Deploying for other users or another machine

The new machine must have:

- Java 21
- Python 3.12
- Node.js + npm

Then:

1. clone the repository
2. run `npm install` inside `frontend`
3. run `.\start-services.cmd`

The script will handle Python virtual environment setup automatically.

### Production-style deployment idea

For a more production-oriented setup:

- build the frontend with `npm run build`
- copy the built assets into `src/main/resources/static`
- package or run the Spring Boot app
- run the Python model service separately on the configured host and port

At the moment, the backend expects the Python service here:

```text
http://127.0.0.1:8001
```

This is configured in:

- [src/main/resources/application.properties](src/main/resources/application.properties)

If you move the Python service elsewhere, update:

```properties
python.api.base-url=http://127.0.0.1:8001
```

## API Endpoints

### Spring Boot

```text
POST /api/predict
```

### Python model service

```text
GET  /health
POST /predict
```

## Example Request

```json
{
  "avgTemperatureC": 25,
  "minTemperatureC": 24,
  "maxTemperatureC": 27,
  "humidityPercent": 70,
  "co2Ppm": 800,
  "lightIntensityLux": 30000,
  "photoperiodHours": 12,
  "irrigationMm": 7,
  "fertilizerNKgHa": 140,
  "fertilizerPKgHa": 60,
  "fertilizerKKgHa": 140,
  "pestSeverity": 1,
  "pH": 6.5,
  "variety": "Roma"
}
```

## Troubleshooting

### `start-services.cmd` not found

Make sure you are in the project root:

```powershell
cd path\to\Tomato-Yield-Predictor-demo
.\start-services.cmd
```

### `npm run dev` says `package.json` not found

Run it inside `frontend`:

```powershell
cd frontend
npm run dev
```

### `Port 5173 is in use`

This is normal. Vite will move to another port automatically.

### Python virtual environment errors

The startup script now recreates a broken `.venv` automatically. If needed, you can still remove it manually:

```powershell
Remove-Item -Recurse -Force .\model_service\.venv
.\start-services.cmd
```

### Frontend changes are not visible on `8080`

You are probably viewing the Spring Boot packaged frontend, not Vite hot reload.

Fix:

1. run `npm run dev` in `frontend` for hot reload
2. or rebuild and copy the frontend into `src/main/resources/static`

### Spring Boot cannot contact Python

Make sure the Python service is running:

```powershell
http://127.0.0.1:8001/health
```

## Git Hygiene

Generated and local-only files should not be committed:

- `.m2/`
- `target/`
- `frontend/node_modules/`
- `frontend/dist/`
- `model_service/.venv/`
- `__pycache__/`
- `src/main/resources/static/assets/`

Keep source code and configuration in Git, but avoid committing local caches and generated files.

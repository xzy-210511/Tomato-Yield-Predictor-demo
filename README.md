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

## Database

The application now has a minimal prediction-history database and a minimal user database for login/register.

By default, local runs use an in-memory H2 database so the app can still start without installing PostgreSQL. For a persistent database, use the PostgreSQL profile.

Important: H2 is in-memory in the default profile. Registered users and prediction rows are lost when Spring Boot stops. Use PostgreSQL if you want users and records to remain after restart.

### Stored tables

Flyway creates these tables automatically when Spring Boot starts:

```text
prediction_records
users
simulation_records
```

`prediction_records` stores the submitted greenhouse inputs, the predicted yield, a model version label, and the creation time.

`users` stores registered users for the login/register page:

```text
id
username
password
created_at
```

The current implementation stores passwords as plain text to keep the prototype simple. This is only suitable for local demo use. Before real deployment, replace this with password hashing such as BCrypt.

`simulation_records` stores the history shown on the History page:

```text
id
user_id
record_name
record_type
input_json
output_json
summary_value
created_at
```

`user_id` references `users.id`. If a user is deleted, their simulation records are deleted as well. The `input_json` and `output_json` columns allow the same table to store both yield predictions and time-series predictions.

### Start PostgreSQL with Docker

From the project root:

```powershell
docker compose up -d postgres
```

The default local PostgreSQL settings are:

```text
database: tomato_yield
username: tomato_app
password: tomato_app
port: 5432
```

### Run Spring Boot against PostgreSQL

Start the Python service first, then start Spring Boot with the `postgres` profile:

```powershell
$env:SPRING_PROFILES_ACTIVE="postgres"
$env:DB_URL="jdbc:postgresql://localhost:5432/tomato_yield"
$env:DB_USERNAME="tomato_app"
$env:DB_PASSWORD="tomato_app"
.\mvnw.cmd spring-boot:run
```

This mode persists registered users and prediction records in PostgreSQL.

When `/api/predict` returns successfully, Spring Boot saves one row into `prediction_records`.

When `/api/auth/register` returns successfully, Spring Boot saves one row into `users`.

When a logged-in user runs a yield or time-series prediction, the frontend saves one row into `simulation_records` through `/api/records`. If the user is not logged in, the prediction still runs but history is not saved.

### History page behavior

The History page reads saved rows from `simulation_records`.

Yield prediction records show:

- record name and creation time
- tomato variety as the record type
- final predicted yield in `kg/m2`
- expanded input details

Time-series records show:

- final plant height in `cm`
- final leaf count
- total nutrient solution supply in `L/plant`
- expanded input details and the same summary values

Comparison mode supports two separate workflows:

- select two or more yield records to compare final predicted yield
- select two or more time-series records to compare plant height, leaf count, and cumulative nutrient solution curves

The first selected record decides the comparison type. After selecting a yield record, only yield records can be added to the current comparison. After selecting a time-series record, only time-series records can be added. Exit comparison mode to start a different comparison type.

### Manual history checks

Use Vite at `http://localhost:5173/` while checking frontend behavior.

1. Register or log in.
2. Run and save at least two yield predictions.
3. Open History and confirm the yield rows show `kg/m2` results.
4. Click `Compare Analytics`, select two yield rows, and confirm the yield comparison chart and baseline difference cards appear.
5. Exit comparison mode.
6. Run and save at least two time-series forecasts.
7. Open History and confirm the time-series rows show final height, final leaves, and total NS.
8. Click `Compare Analytics`, select two time-series rows, and confirm the three comparison charts appear: plant height, leaf count, and cumulative NS supply.
9. Refresh the browser and reopen History to confirm the saved records still load from the backend database.

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
POST /api/auth/register
POST /api/auth/login
POST /api/records
GET  /api/records?userId={userId}
PATCH /api/records/{id}?userId={userId}
DELETE /api/records/{id}?userId={userId}
```

`/api/auth/register` creates a new user if the username is not already taken.

`/api/auth/login` checks the submitted username and password against the `users` table.

The frontend stores the logged-in user's `username` and `userId` in `localStorage` after a successful login or registration. There is currently no token, session, or Spring Security layer.

`/api/records` stores and manages saved simulation history for the History page. The current implementation uses `userId` as a request parameter to scope records to a user.

- `POST /api/records`: create a saved history record
- `GET /api/records?userId={userId}`: list records for one user
- `PATCH /api/records/{id}?userId={userId}`: rename one record
- `DELETE /api/records/{id}?userId={userId}`: delete one record

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
- `python-installer.exe`

Keep source code and configuration in Git, but avoid committing local caches and generated files.

# Tomato Yield Predictor

Tomato Yield Predictor is a full-stack final prototype for greenhouse tomato prediction and growth simulation. The application combines a React + Vite frontend, a Spring Boot backend, and a Python FastAPI model service.

Users can:

- run tomato yield prediction from greenhouse and crop-management inputs
- run time-series growth prediction for plant height, leaf count, and nutrient-solution needs
- run an integrated prediction workflow that combines yield and growth model outputs
- register and log in as a prototype user
- save simulation records and compare previous results on the History page

No public live deployment URL is currently provided. The prototype is intended to run locally.

## Project Structure

```text
Tomato-Yield-Predictor-demo/
  frontend/                         React + Vite frontend source
  frontend/public/models/           3D tomato model used by the UI
  model_service/                    Python FastAPI service for model APIs
  model integration/                Integrated yield + time-series model files
  src/main/java/                    Spring Boot backend source code
  src/main/resources/db/migration/  Flyway database migrations
  src/main/resources/static/        Built frontend served by Spring Boot
  timeseries prediction/            Time-series data cleaning/training/prediction code
  weekly growth prediction/         Weekly growth experiment code and dataset
  docker-compose.yml                Optional local PostgreSQL service
  start-services.cmd                Windows one-command startup script
  start-services.ps1                PowerShell startup implementation
  pom.xml                           Maven / Spring Boot configuration
```

## Main Technologies

- Java 21
- Spring Boot 3.5.13
- React 18
- Vite 5
- Python 3.12
- FastAPI
- scikit-learn, pandas, NumPy, Joblib
- H2 database for simple local runs
- PostgreSQL for optional persistent local storage

## System Requirements

Install these before running the project:

- Java JDK 21: https://adoptium.net/
- Python 3.12: https://www.python.org/downloads/
- Node.js 20+ and npm: https://nodejs.org/
- Docker Desktop, optional for PostgreSQL: https://www.docker.com/products/docker-desktop/

Check versions:

```powershell
java -version
python --version
node -v
npm -v
```

## Quick Start on Windows

From the project root:

```powershell
.\start-services.cmd
```

The script will:

- create `model_service/.venv` if it does not exist
- install frontend npm packages if Vite is missing
- build the React frontend
- copy built frontend files into `src/main/resources/static`
- install Python dependencies from `model_service/requirements.txt`
- prepare cleaned time-series data if needed
- train the time-series model if needed
- start the Python model service on `http://127.0.0.1:8001`
- start Spring Boot on `http://localhost:8080`
- open the application in the browser

The first run can take longer because it may install dependencies and train model files.

Open the app at:

```text
http://localhost:8080/#/
```

## Manual Compile and Run

Use these steps if you want to run each service separately.

### 1. Install and Build the Frontend

```powershell
cd frontend
npm install
npm run build
cd ..
```

Copy the latest build into Spring Boot static resources:

```powershell
Remove-Item -Path .\src\main\resources\static\assets\* -Force
Copy-Item -Path .\frontend\dist\index.html -Destination .\src\main\resources\static\index.html -Force
Copy-Item -Path .\frontend\dist\assets\* -Destination .\src\main\resources\static\assets -Force
```

If `frontend/dist/models/` exists, copy it to:

```text
src/main/resources/static/models/
```

### 2. Start the Python Model Service

```powershell
cd model_service
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn api:app --host 127.0.0.1 --port 8001
```

Health check:

```text
http://127.0.0.1:8001/health
```

### 3. Start Spring Boot

Open another terminal from the project root:

```powershell
$env:MAVEN_USER_HOME="$PWD\.m2"
.\mvnw.cmd spring-boot:run
```

Then open:

```text
http://localhost:8080/#/
```

## Development Mode

Use Vite when editing files under `frontend/src`:

```powershell
cd frontend
npm run dev
```

Vite usually runs at:

```text
http://localhost:5173/
```

If port `5173` is busy, Vite may use another port such as `5174`. In development mode, Vite proxies `/api` requests to Spring Boot at `http://localhost:8080`.

## Application Flow

```text
Browser
  -> Spring Boot backend /api/...
  -> Python FastAPI model service
  -> Spring Boot backend
  -> Browser
```

Default local ports:

- `8080`: Spring Boot backend and packaged frontend
- `8001`: Python FastAPI model service
- `5173` or `5174`: Vite development server

## Features

### Yield Prediction

The yield workflow uses greenhouse and crop-management inputs such as temperature, humidity, CO2, light intensity, photoperiod, irrigation, fertilizer levels, pest severity, pH, and tomato variety.

### Time-Series Growth Prediction

The time-series workflow predicts plant growth over time, including plant height, leaf count, and nutrient-solution recommendation outputs.

### Integrated Prediction

The integrated workflow calls `/api/predict/integrated`, which forwards inputs to the Python integrated model in `model integration/`.

### User Login and History

Users can register or log in through the frontend. After a logged-in user runs a prediction, the frontend saves a simulation record through `/api/records`. Saved records can be viewed, renamed, deleted, and compared on the History page.

Important History Page note: if the History page has no data, please log in or register first, then run a prediction. Predictions can still run without login, but they will not be saved to the History page unless a user is logged in.

## Database

By default, the app uses an in-memory H2 database:

```text
jdbc:h2:mem:demo
```

This requires no external setup, but user accounts and saved records are lost when Spring Boot stops.

Flyway creates these tables:

- `prediction_records`
- `users`
- `simulation_records`

For persistent local storage, start PostgreSQL:

```powershell
docker compose up -d postgres
```

Default PostgreSQL settings:

```text
database: tomato_yield
username: tomato_app
password: tomato_app
port: 5432
```

Run Spring Boot with PostgreSQL:

```powershell
$env:SPRING_PROFILES_ACTIVE="postgres"
$env:DB_URL="jdbc:postgresql://localhost:5432/tomato_yield"
$env:DB_USERNAME="tomato_app"
$env:DB_PASSWORD="tomato_app"
.\mvnw.cmd spring-boot:run
```

## API Endpoints

Spring Boot endpoints:

```text
POST   /api/predict
POST   /api/predict/timeseries
POST   /api/predict/integrated
POST   /api/auth/register
POST   /api/auth/login
POST   /api/records
GET    /api/records?userId={userId}
PATCH  /api/records/{id}?userId={userId}
DELETE /api/records/{id}?userId={userId}
```

Python FastAPI endpoints:

```text
GET  /health
POST /predict
POST /predict/timeseries
POST /predict/integrated
```

## Testing

Run backend tests:

```powershell
$env:MAVEN_USER_HOME="$PWD\.m2"
.\mvnw.cmd test
```

Build the frontend:

```powershell
cd frontend
npm run build
```

The current frontend project does not define a separate automated test script.

## Third-Party Software and Libraries

Backend:

- Spring Boot: https://spring.io/projects/spring-boot
- Spring Web: https://docs.spring.io/spring-framework/reference/web/webmvc.html
- Spring Data JPA: https://spring.io/projects/spring-data-jpa
- Spring Validation: https://docs.spring.io/spring-framework/reference/core/validation.html
- H2 Database: https://www.h2database.com/
- PostgreSQL JDBC Driver: https://jdbc.postgresql.org/
- Flyway: https://flywaydb.org/
- Maven Wrapper: https://maven.apache.org/wrapper/

Frontend:

- React: https://react.dev/
- Vite: https://vitejs.dev/
- React Router: https://reactrouter.com/
- Tailwind CSS: https://tailwindcss.com/
- Three.js: https://threejs.org/
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber
- Drei: https://github.com/pmndrs/drei
- Recharts: https://recharts.org/
- Lucide React: https://lucide.dev/
- GSAP: https://gsap.com/

Python:

- FastAPI: https://fastapi.tiangolo.com/
- Uvicorn: https://www.uvicorn.org/
- pandas: https://pandas.pydata.org/
- NumPy: https://numpy.org/
- scikit-learn: https://scikit-learn.org/
- Joblib: https://joblib.readthedocs.io/
- Pydantic: https://docs.pydantic.dev/

Optional infrastructure:

- PostgreSQL Docker image: https://hub.docker.com/_/postgres

## Data Sources and Model Files

The project uses local datasets included in the repository. No public dataset URL is currently provided for the submitted data files.

Yield model data:

- `model_service/greenhouse_crop_yields.csv`
- `model_service/tomato_cleaned.csv`
- `model_service/tomato_step.csv`

Time-series model data:

- `timeseries prediction/ClimateTimeseries.xlsx`
- `timeseries prediction/CropMeasurements.xlsx`
- `timeseries prediction/DestructiveHarvest.xlsx`
- `timeseries prediction/nsdataset.xlsx`

Weekly growth experiment data:

- `weekly growth prediction/DB_Mobile_Manual_Tomato.csv`

Integrated model files:

- `model integration/integrated_tomato_model.py`
- `model integration/yield model/integrated_final_yield_model.joblib`
- `model integration/yield model/integrated_final_yield_metrics.csv`
- `model integration/yield model/greenhouse_crop_yields.csv`
- `model integration/timeseries model/model_outputs/recursive_growth_forecaster.joblib`
- `model integration/timeseries model/timeseries_model_metrics.csv`
- `model integration/timeseries model/recursive_prediction_actual_comparison_summary.csv`

Related model scripts:

- `model_service/cleandata.py`
- `model_service/predict_field_model.py`
- `timeseries prediction/datacleaning.py`
- `timeseries prediction/timeseries_train.py`
- `timeseries prediction/predict_growth_model.py`
- `weekly growth prediction/tomato_data_clean.py`
- `weekly growth prediction/model_train.py`

Additional learning reference:

- `model_service/ref.md`

## Security and Privacy Notes

This is a prototype application. The current login implementation stores username and password values in the local database for demo use. It does not currently implement hashed passwords, server-side sessions, JWT, or HttpOnly cookie authentication.

For a production version, password storage should be replaced with BCrypt or another suitable one-way password hashing approach, and the backend should derive user identity from authenticated server-side request state rather than trusting a frontend-provided `userId`.

The prototype stores only the following user-related data:

- username
- password value for prototype login
- prediction inputs
- prediction outputs
- saved simulation history metadata

It does not collect email addresses, phone numbers, real names, or location data.

## AI Use Declaration

AI assistance was used during development. The repository currently includes an AI note at:

- `model_service/ai.md`

The final submission should also include the signed team coversheet, AI use declaration, and a list of AI sources/prompts used in code creation, as required by the assessment instructions.

## Final Submission Checklist

Submit the final prototype codebase as a compressed `.zip` archive.

Include:

- all source code in `frontend/`, `model_service/`, `model integration/`, `src/`, `timeseries prediction/`, and `weekly growth prediction/`
- required datasets and model files listed above
- `README.md`
- `model_service/ai.md`
- signed team coversheet
- AI use declaration and AI prompt/source list
- configuration files such as `pom.xml`, `docker-compose.yml`, `.env.example`, `start-services.cmd`, and `start-services.ps1`

Exclude generated or local-only files:

- `target/`
- `.m2/`
- `frontend/node_modules/`
- `frontend/dist/`
- `model_service/.venv/`
- `__pycache__/`
- `timeseries prediction/cleaned_data/`
- `timeseries prediction/model_outputs/`
- `.env`
- installer files such as `.exe` or `.msi`
- previous `.zip` archives

## Troubleshooting

If `vite` is not found, install frontend dependencies:

```powershell
cd frontend
npm install
cd ..
```

If the History page is empty, log in or register first, then run a prediction again. History records are saved only for logged-in users.

If Spring Boot cannot contact Python, confirm the Python model service is running:

```text
http://127.0.0.1:8001/health
```

If frontend changes are not visible on `http://localhost:8080/#/`, rebuild the frontend and copy `frontend/dist` into `src/main/resources/static`, or use Vite development mode.

If the Python virtual environment is broken, remove it and rerun the startup script:

```powershell
Remove-Item -Recurse -Force .\model_service\.venv
.\start-services.cmd
```

If PostgreSQL data does not persist, check Docker:

```powershell
docker compose ps
```

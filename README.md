# Tomato Yield Predictor

Tomato Yield Predictor is a local full-stack prototype for hydroponic tomato yield prediction, growth forecasting, scenario comparison, and saved simulation history.

The project uses:

- React + Vite frontend
- Spring Boot backend
- Python FastAPI model service
- Final model package in `model integration/`

## Project Structure

```text
Tomato-Yield-Predictor-demo/
  frontend/                         React + Vite frontend source
  frontend/public/models/           3D UI asset used by the frontend
  model integration/                Final yield and growth model package
  model_service/                    Python FastAPI model API service
  src/main/java/                    Spring Boot backend source code
  src/main/resources/db/migration/  Database migration files
  src/main/resources/static/        Built frontend served by Spring Boot
  start-services.cmd                Windows startup script
  start-services.ps1                PowerShell startup implementation
  pom.xml                           Maven / Spring Boot configuration
```

## Requirements

Install:

- Java JDK 21
- Python 3.12+
- Node.js 20+ and npm

Check versions:

```powershell
java -version
python --version
node -v
npm -v
```

## Quick Run

From the project root:

```powershell
.\start-services.cmd
```

The script installs required dependencies, builds the frontend, starts the Python model service, starts Spring Boot, and opens the application.

Open the app at:

```text
http://localhost:8080/#/
```

## Manual Compile and Run

### 1. Build Frontend

```powershell
cd frontend
npm install
npm run build
cd ..
```

Copy the frontend build into Spring Boot static resources:

```powershell
Remove-Item -Recurse -Force .\src\main\resources\static\assets
Copy-Item -Path .\frontend\dist\index.html -Destination .\src\main\resources\static\index.html -Force
Copy-Item -Path .\frontend\dist\assets -Destination .\src\main\resources\static\assets -Recurse -Force
```

If `frontend/dist/models/` exists, copy it to:

```text
src/main/resources/static/models/
```

### 2. Start Python Model Service

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

When editing frontend files:

```powershell
cd frontend
npm run dev
```

Vite usually runs at:

```text
http://localhost:5173/
```

Keep Spring Boot and the Python model service running for API requests.

## Testing

Build the frontend:

```powershell
cd frontend
npm run build
```

Run backend tests:

```powershell
$env:MAVEN_USER_HOME="$PWD\.m2"
.\mvnw.cmd test
```

## AI and Reference Files

- `AI.md`: AI usage summary for team members.
- `AI_log.md`: detailed AI prompt-and-output log and AI declaration notes.
- `model_service/ai.md`: AI usage note for Ling Fang's model input formatting and prediction logic work.
- `model_service/ref.md`: external learning reference used for model-related study.





## REF list
1.Ling Fang learning regression model reource: git hub:https://github.com/xbeat/Machine-Learning/blob/main/Gradient%20Boosting%20Overfitting%20and%20Learning%20Rate.md

2.3d tomato model source：Sketchfab. (n.d.). Tomato 3D models. Retrieved May 2026, from https://sketchfab.com/search?q=tomato&type=models

3.dataset source：
（1）Righini, I., Bart Marrewijk, V., Ntakos, G., Zhang, P., Jansen, G., Maree, S. C. (S., Bijlaard, M., H.F. (Feije) De Zwart, & S. (Silke) Hemming. (2024). 4th Autonomous Greenhouse Challenge: Pre-trial Dwarf Tomato Measurements and Images (Version 1) [Data set]. 4TU.ResearchData. https://doi.org/10.4121/E1EE9DE9-6CE9-4502-A37C-34B5B1372BED.V1

（2）Signore, A., Serio, F., & Santamaria, P. (2019). Growth analysis and nutrient solution management of a soil-less tomato crop in a Mediterranean environment (Version 1) [Data set]. Mendeley Data. https://data.mendeley.com/datasets/cyjcvt37gx/1

（3）Khan, M. A. (n.d.). Greenhouse Crop Yields (IoT & AgriTech) [Data set]. Kaggle. Retrieved May 22, 2026, from https://www.kaggle.com/datasets/moezalikhan/greenhouse-crop-yields-dataset
$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonServiceDir = Join-Path $projectRoot 'model_service'
$frontendDir = Join-Path $projectRoot 'frontend'
$frontendDistDir = Join-Path $frontendDir 'dist'
$frontendPackageJson = Join-Path $frontendDir 'package.json'
$frontendViteBin = Join-Path $frontendDir 'node_modules\.bin\vite.cmd'
$staticDir = Join-Path $projectRoot 'src\main\resources\static'
$staticAssetsDir = Join-Path $staticDir 'assets'
$staticModelsDir = Join-Path $staticDir 'models'
$integrationDir = Join-Path $projectRoot 'model integration'
$integratedModelScript = Join-Path $integrationDir 'integrated_tomato_model.py'
$timeSeriesModelFile = Join-Path $integrationDir 'timeseries model\model_outputs\recursive_growth_forecaster.joblib'
$yieldModelFile = Join-Path $integrationDir 'yield model\integrated_final_yield_model.joblib'
$pythonExe = Join-Path $pythonServiceDir '.venv\Scripts\python.exe'
$pythonVenvDir = Join-Path $pythonServiceDir '.venv'
$pythonRequirements = Join-Path $pythonServiceDir 'requirements.txt'
$mavenWrapper = Join-Path $projectRoot 'mvnw.cmd'
$appUrl = 'http://localhost:8080/#/'
$pythonHealthUrl = 'http://127.0.0.1:8001/health'
$pythonLauncher = Get-Command py -ErrorAction SilentlyContinue

if (-not $pythonLauncher) {
    $pythonLauncher = Get-Command python -ErrorAction SilentlyContinue
}

if (-not $pythonLauncher) {
    Write-Error 'Python launcher not found. Please install Python 3 first.'
}

if (-not (Test-Path $pythonVenvDir)) {
    Write-Host "Python virtual environment not found. Creating one at $pythonVenvDir ..."
    & $pythonLauncher.Source -m venv $pythonVenvDir
}

if (-not (Test-Path $pythonExe)) {
    Write-Warning "Python virtual environment is incomplete. Recreating it at $pythonVenvDir ..."
    if (Test-Path $pythonVenvDir) {
        Remove-Item -Recurse -Force $pythonVenvDir
    }
    & $pythonLauncher.Source -m venv $pythonVenvDir
}

if (-not (Test-Path $pythonExe)) {
    Write-Error "Python virtual environment could not be created successfully. Expected interpreter at $pythonExe"
}

if (-not (Test-Path $pythonRequirements)) {
    Write-Error "Python requirements file not found at $pythonRequirements"
}

if (-not (Test-Path $mavenWrapper)) {
    Write-Error "Maven wrapper not found at $mavenWrapper"
}

if (Test-Path $frontendDir) {
    if (-not (Test-Path $frontendPackageJson)) {
        Write-Error "Frontend package.json not found at $frontendPackageJson"
    }

    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    $npmPath = $null
    if (-not $npmCommand) {
        $nodeInstallNpm = Join-Path $env:ProgramFiles 'nodejs\npm.cmd'
        if (Test-Path $nodeInstallNpm) {
            $npmPath = $nodeInstallNpm
            $env:Path = "$(Split-Path -Parent $nodeInstallNpm);$env:Path"
        }
    } else {
        $npmPath = $npmCommand.Source
    }

    if (-not $npmPath) {
        Write-Error 'npm not found. Please install Node.js 20+ and reopen your terminal.'
    }

    if (-not (Test-Path $frontendViteBin)) {
        Write-Host 'Frontend dependencies not found. Installing npm packages ...'
        & $npmPath install --prefix $frontendDir
    }

    Write-Host 'Building React frontend for Spring Boot static resources ...'
    & $npmPath run build --prefix $frontendDir

    if (-not (Test-Path $frontendDistDir)) {
        Write-Error "Frontend build output not found at $frontendDistDir"
    }

    if (-not (Test-Path $staticDir)) {
        New-Item -ItemType Directory -Path $staticDir | Out-Null
    }

    if (Test-Path $staticAssetsDir) {
        Remove-Item -Recurse -Force $staticAssetsDir
    }

    Copy-Item -Path (Join-Path $frontendDistDir 'index.html') -Destination (Join-Path $staticDir 'index.html') -Force
    Copy-Item -Path (Join-Path $frontendDistDir 'assets') -Destination $staticAssetsDir -Recurse -Force

    $frontendDistModelsDir = Join-Path $frontendDistDir 'models'
    if (Test-Path $frontendDistModelsDir) {
        if (Test-Path $staticModelsDir) {
            Remove-Item -Recurse -Force $staticModelsDir
        }
        Copy-Item -Path $frontendDistModelsDir -Destination $staticModelsDir -Recurse -Force
    }
}

Write-Host 'Installing Python model dependencies ...'
& $pythonExe -m pip install -r $pythonRequirements

if (-not (Test-Path $integrationDir)) {
    Write-Error "Final model integration directory not found at $integrationDir"
}

if (-not (Test-Path $integratedModelScript)) {
    Write-Error "Integrated model script not found at $integratedModelScript"
}

if (-not (Test-Path $timeSeriesModelFile)) {
    Write-Error "Time-series model file not found at $timeSeriesModelFile"
}

if (-not (Test-Path $yieldModelFile)) {
    Write-Host 'Yield model file not found. Training final yield model once ...'
    & $pythonExe $integratedModelScript
}

$pythonCommand = "& '$pythonExe' -m uvicorn api:app --host 127.0.0.1 --port 8001"
$springCommand = "`$env:MAVEN_USER_HOME='$projectRoot\.m2'; & '$mavenWrapper' spring-boot:run"

Write-Host 'Starting Python model service on http://127.0.0.1:8001 ...'
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    $pythonCommand
) -WorkingDirectory $pythonServiceDir

Write-Host 'Waiting for Python model service to become available ...'
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 2
    try {
        Invoke-WebRequest -UseBasicParsing $pythonHealthUrl | Out-Null
        Write-Host 'Python model service is up.'
        break
    }
    catch {
        if ($i -eq 59) {
            Write-Warning "Python model service did not respond within the expected time. You can still check $pythonHealthUrl manually."
        }
    }
}

Write-Host 'Starting Spring Boot on http://localhost:8080 ...'
Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    $springCommand
) -WorkingDirectory $projectRoot

Write-Host 'Waiting for Spring Boot to become available ...'
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        Invoke-WebRequest -UseBasicParsing $appUrl | Out-Null
        Write-Host 'Application is up. Opening browser ...'
        Start-Process $appUrl
        exit 0
    }
    catch {
    }
}

Write-Warning "Spring Boot did not respond within the expected time. You can still open $appUrl manually."

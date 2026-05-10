$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonServiceDir = Join-Path $projectRoot 'model_service'
$frontendDir = Join-Path $projectRoot 'frontend'
$frontendDistDir = Join-Path $frontendDir 'dist'
$staticDir = Join-Path $projectRoot 'src\main\resources\static'
$staticAssetsDir = Join-Path $staticDir 'assets'
$staticModelsDir = Join-Path $staticDir 'models'
$timeSeriesDir = Join-Path $projectRoot 'timeseries prediction'
$timeSeriesCleanedDir = Join-Path $timeSeriesDir 'cleaned_data'
$timeSeriesModelDir = Join-Path $timeSeriesDir 'model_outputs'
$timeSeriesCleaningScript = Join-Path $timeSeriesDir 'datacleaning.py'
$timeSeriesTrainingScript = Join-Path $timeSeriesDir 'timeseries_train.py'
$timeSeriesModelFile = Join-Path $timeSeriesModelDir 'recursive_growth_forecaster.joblib'
$timeSeriesMappedNsFile = Join-Path $timeSeriesCleanedDir 'mapped_ns_training_table.csv'
$timeSeriesCleanedFiles = @(
    (Join-Path $timeSeriesCleanedDir 'climate_timeseries_clean.csv'),
    (Join-Path $timeSeriesCleanedDir 'crop_measurements_clean.csv'),
    (Join-Path $timeSeriesCleanedDir 'destructive_harvest_clean.csv'),
    $timeSeriesMappedNsFile
)
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

if (-not (Test-Path $timeSeriesDir)) {
    Write-Error "Time-series prediction directory not found at $timeSeriesDir"
}

if (-not (Test-Path $timeSeriesCleaningScript)) {
    Write-Error "Time-series cleaning script not found at $timeSeriesCleaningScript"
}

if (-not (Test-Path $timeSeriesTrainingScript)) {
    Write-Error "Time-series training script not found at $timeSeriesTrainingScript"
}

$timeSeriesSourceFiles = @(
    $timeSeriesCleaningScript,
    $timeSeriesTrainingScript,
    (Join-Path $timeSeriesDir 'ClimateTimeseries.xlsx'),
    (Join-Path $timeSeriesDir 'CropMeasurements.xlsx'),
    (Join-Path $timeSeriesDir 'DestructiveHarvest.xlsx'),
    (Join-Path $timeSeriesDir 'nsdataset.xlsx')
) | Where-Object { Test-Path $_ }

$latestTimeSeriesSource = ($timeSeriesSourceFiles | ForEach-Object {
    (Get-Item $_).LastWriteTimeUtc
} | Sort-Object -Descending | Select-Object -First 1)

$missingTimeSeriesCleanedFiles = $timeSeriesCleanedFiles | Where-Object { -not (Test-Path $_) }
$oldestTimeSeriesCleaned = ($timeSeriesCleanedFiles | Where-Object { Test-Path $_ } | ForEach-Object {
    (Get-Item $_).LastWriteTimeUtc
} | Sort-Object | Select-Object -First 1)

$needsTimeSeriesCleaning = $missingTimeSeriesCleanedFiles.Count -gt 0 `
    -or (
        $latestTimeSeriesSource `
        -and $oldestTimeSeriesCleaned `
        -and ($oldestTimeSeriesCleaned -lt $latestTimeSeriesSource)
    )
$needsTimeSeriesTraining = -not (Test-Path $timeSeriesModelFile) `
    -or (
        $latestTimeSeriesSource `
        -and (Test-Path $timeSeriesModelFile) `
        -and ((Get-Item $timeSeriesModelFile).LastWriteTimeUtc -lt $latestTimeSeriesSource)
    )

if ($needsTimeSeriesCleaning) {
    Write-Host 'Preparing time-series cleaned data ...'
    & $pythonExe $timeSeriesCleaningScript
}

if ($needsTimeSeriesTraining) {
    if (-not (Test-Path $timeSeriesCleanedDir)) {
        Write-Host 'Preparing time-series cleaned data ...'
        & $pythonExe $timeSeriesCleaningScript
    }

    Write-Host 'Training time-series growth model ...'
    & $pythonExe $timeSeriesTrainingScript
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

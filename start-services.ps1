$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonServiceDir = Join-Path $projectRoot 'model_service'
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
    Write-Error "Python virtual environment is incomplete. Expected interpreter at $pythonExe"
}

if (-not (Test-Path $pythonRequirements)) {
    Write-Error "Python requirements file not found at $pythonRequirements"
}

if (-not (Test-Path $mavenWrapper)) {
    Write-Error "Maven wrapper not found at $mavenWrapper"
}

Write-Host 'Installing Python model dependencies ...'
& $pythonExe -m pip install -r $pythonRequirements

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

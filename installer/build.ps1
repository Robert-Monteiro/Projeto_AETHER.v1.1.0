<#
Build script para gerar o MSI usando WiX e o Custom Action .NET
#>

$ErrorActionPreference = 'Stop'

# Configurações padrão (ajuste se necessário)
$wixToolsetBin = "C:\Program Files (x86)\WiX Toolset v3.11\bin"
$outputDir = "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)\output"

if (-not (Test-Path -Path $wixToolsetBin)) {
    Write-Host "WiX Toolset v3.11 não encontrado. Procurando instalações WiX disponíveis..."
    $wixFolders = @()
    $wixFolders += Get-ChildItem 'C:\Program Files (x86)' -Directory -Filter 'WiX Toolset*' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
    $wixFolders += Get-ChildItem 'C:\Program Files' -Directory -Filter 'WiX Toolset*' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
    $wixFolders = $wixFolders | Select-Object -Unique

    foreach ($folder in $wixFolders) {
        $candidate = Join-Path $folder 'bin'
        if (Test-Path -Path $candidate) {
            $wixToolsetBin = $candidate
            Write-Host "Usando WiX Toolset encontrado em: $wixToolsetBin"
            break
        }
    }
}

if (-not (Test-Path -Path $wixToolsetBin)) {
    Write-Error "WiX Toolset não encontrado. Instale o WiX (ex: v3.11 ou v3.14) e ajuste a variável na parte superior deste script."
    exit 1
}

Write-Host "[1/3] Publicando o aplicativo de abertura de chamados..."
$ticketAppProj = "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)\TicketApp\TicketApp.csproj"
Push-Location "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)"
dotnet publish $ticketAppProj -c Release -r win-x64 --self-contained false
Pop-Location

Write-Host "[2/3] Gerando objetos WiX..."
if (-not (Test-Path -Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir | Out-Null }

$candle = Join-Path $wixToolsetBin 'candle.exe'
& $candle -out "$outputDir\Product.wixobj" "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)\Product.wxs"

Write-Host "[3/3] Linkando MSI..."
$light = Join-Path $wixToolsetBin 'light.exe'
& $light -ext WixUIExtension -ext WixUtilExtension -ext WixNetFxExtension -out "$outputDir\LuxAgent.msi" "$outputDir\Product.wixobj" -b "$(Split-Path -Parent $MyInvocation.MyCommand.Definition)"

Write-Host "Build finalizado. MSI gerado em: $outputDir\LuxAgent.msi"

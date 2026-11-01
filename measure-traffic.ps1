param(
    [string]$Action = "snapshot",
    [string]$AdapterName = "Wi-Fi"
)

$stats = Get-NetAdapterStatistics -Name $AdapterName -ErrorAction Stop
$current = @{
    SentBytes = $stats.SentBytes
    ReceivedBytes = $stats.ReceivedBytes
    Timestamp = (Get-Date).ToString("o")
}

if ($Action -eq "baseline") {
    $current | ConvertTo-Json | Set-Content -Path "$PSScriptRoot\traffic-baseline.json"
    Write-Host "Baseline saved."
} elseif ($Action -eq "measure") {
    if (-not (Test-Path "$PSScriptRoot\traffic-baseline.json")) {
        Write-Host "No baseline found. Run with -Action baseline first."
        exit 1
    }
    $baseline = Get-Content "$PSScriptRoot\traffic-baseline.json" | ConvertFrom-Json
    $sentDiff = $stats.SentBytes - $baseline.SentBytes
    $recvDiff = $stats.ReceivedBytes - $baseline.ReceivedBytes
    $totalMB = [math]::Round(($sentDiff + $recvDiff) / 1MB, 2)
    $result = @{
        SentMB = [math]::Round($sentDiff / 1MB, 2)
        ReceivedMB = [math]::Round($recvDiff / 1MB, 2)
        TotalMB = $totalMB
        DurationSeconds = [math]::Round(((Get-Date) - [datetime]$baseline.Timestamp).TotalSeconds, 0)
    }
    $result | ConvertTo-Json | Set-Content -Path "$PSScriptRoot\traffic-result.json"
    Write-Host "Measured: $totalMB MB total ($($result.SentMB) MB sent, $($result.ReceivedMB) MB received)"
}
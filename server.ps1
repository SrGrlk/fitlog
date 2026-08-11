# FITLOG LOCAL WI-FI SERVER
$port = 8080
$ip = "10.0.0.104"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:${port}/")
$listener.Prefixes.Add("http://${ip}:${port}/")

try {
  $listener.Start()
  Write-Host "Servidor FitLog rodando na rede Wi-Fi!"
  Write-Host "Acesse no seu celular: http://${ip}:${port}/"
} catch {
  Write-Host "Aviso ao iniciar listener: $_"
}

$baseDir = Get-Location

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $rawPath = $request.Url.LocalPath
    if ($rawPath -eq '/') { $rawPath = '/index.html' }
    $localPath = Join-Path $baseDir $rawPath.TrimStart('/')

    if (Test-Path $localPath -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($localPath)
      $ext = [System.IO.Path]::GetExtension($localPath)
      
      switch ($ext) {
        '.html' { $response.ContentType = 'text/html; charset=utf-8' }
        '.css'  { $response.ContentType = 'text/css' }
        '.js'   { $response.ContentType = 'application/javascript' }
        '.json' { $response.ContentType = 'application/json' }
        default { $response.ContentType = 'application/octet-stream' }
      }
      
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $response.StatusCode = 404
    }
    $response.Close()
  } catch {
    # Continue loop on request glitch
  }
}

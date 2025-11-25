# Stripe Setup Verification Script (PowerShell)

Write-Host "Checking Stripe Configuration..." -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (Test-Path "backend\.env") {
    Write-Host "OK - .env file found" -ForegroundColor Green
    
    # Read .env content
    $envContent = Get-Content "backend\.env"
    
    # Check for Stripe keys
    if ($envContent -match "STRIPE_SECRET_KEY") {
        Write-Host "OK - STRIPE_SECRET_KEY configured" -ForegroundColor Green
    } else {
        Write-Host "FAIL - STRIPE_SECRET_KEY not found" -ForegroundColor Red
    }
    
    if ($envContent -match "STRIPE_WEBHOOK_SECRET") {
        Write-Host "OK - STRIPE_WEBHOOK_SECRET configured" -ForegroundColor Green
    } else {
        Write-Host "FAIL - STRIPE_WEBHOOK_SECRET not found" -ForegroundColor Red
    }
    
    if ($envContent -match "CLIENT_URL") {
        Write-Host "OK - CLIENT_URL configured" -ForegroundColor Green
    } else {
        Write-Host "FAIL - CLIENT_URL not found" -ForegroundColor Red
    }
} else {
    Write-Host "FAIL - .env file not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking Stripe Package..." -ForegroundColor Cyan
$stripeCheck = & npm list stripe --prefix backend 2>&1
if ($stripeCheck -match "stripe@") {
    Write-Host "OK - Stripe package installed" -ForegroundColor Green
} else {
    Write-Host "FAIL - Stripe package not installed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Ready to test Stripe payments!" -ForegroundColor Green

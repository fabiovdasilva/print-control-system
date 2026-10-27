$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "Configurar senha administrativa — PrintFlow"
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.ClientSize = New-Object System.Drawing.Size(430, 260)
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10)

$title = New-Object System.Windows.Forms.Label
$title.Text = "Defina a senha usada para entrar no painel."
$title.Location = New-Object System.Drawing.Point(22, 18)
$title.Size = New-Object System.Drawing.Size(385, 28)
$form.Controls.Add($title)

$firstLabel = New-Object System.Windows.Forms.Label
$firstLabel.Text = "Nova senha (mínimo 12 caracteres)"
$firstLabel.Location = New-Object System.Drawing.Point(22, 58)
$firstLabel.Size = New-Object System.Drawing.Size(385, 24)
$form.Controls.Add($firstLabel)

$first = New-Object System.Windows.Forms.TextBox
$first.Location = New-Object System.Drawing.Point(22, 84)
$first.Size = New-Object System.Drawing.Size(385, 30)
$first.UseSystemPasswordChar = $true
$form.Controls.Add($first)

$confirmLabel = New-Object System.Windows.Forms.Label
$confirmLabel.Text = "Confirme a senha"
$confirmLabel.Location = New-Object System.Drawing.Point(22, 125)
$confirmLabel.Size = New-Object System.Drawing.Size(385, 24)
$form.Controls.Add($confirmLabel)

$confirm = New-Object System.Windows.Forms.TextBox
$confirm.Location = New-Object System.Drawing.Point(22, 151)
$confirm.Size = New-Object System.Drawing.Size(385, 30)
$confirm.UseSystemPasswordChar = $true
$form.Controls.Add($confirm)

$save = New-Object System.Windows.Forms.Button
$save.Text = "Salvar senha"
$save.Location = New-Object System.Drawing.Point(282, 204)
$save.Size = New-Object System.Drawing.Size(125, 34)
$save.Add_Click({
  if ($first.Text.Length -lt 12) {
    [System.Windows.Forms.MessageBox]::Show("Use pelo menos 12 caracteres.", "PrintFlow", "OK", "Warning") | Out-Null
    return
  }
  if ($first.Text -cne $confirm.Text) {
    [System.Windows.Forms.MessageBox]::Show("As senhas não correspondem.", "PrintFlow", "OK", "Warning") | Out-Null
    return
  }

  try {
    $dataDirectory = Join-Path $env:LOCALAPPDATA "PrintFlow"
    New-Item -ItemType Directory -Path $dataDirectory -Force | Out-Null
    $salt = New-Object byte[] 16
    $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $random.GetBytes($salt)
    $iterations = 310000
    $derive = [System.Security.Cryptography.Rfc2898DeriveBytes]::new(
      $first.Text, $salt, $iterations, [System.Security.Cryptography.HashAlgorithmName]::SHA256
    )
    $hash = $derive.GetBytes(32)
    $derive.Dispose()
    $random.Dispose()
    $credential = @{
      salt = [Convert]::ToBase64String($salt)
      passwordHash = [Convert]::ToBase64String($hash)
      iterations = $iterations
    } | ConvertTo-Json -Compress
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Join-Path $dataDirectory "admin-auth.json"), $credential, $encoding)
    [System.Windows.Forms.MessageBox]::Show("Senha salva neste usuário do Windows. Agora inicie a central PrintFlow.", "PrintFlow", "OK", "Information") | Out-Null
    $form.Close()
  } catch {
    [System.Windows.Forms.MessageBox]::Show("Não foi possível salvar a senha: " + $_.Exception.Message, "PrintFlow", "OK", "Error") | Out-Null
  }
})
$form.Controls.Add($save)
$form.AcceptButton = $save
$form.Add_Shown({ $first.Focus() })
[void]$form.ShowDialog()


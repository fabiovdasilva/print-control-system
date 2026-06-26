using System;
using System.IO;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;
using System.Windows.Forms;
using System.Drawing;
using Microsoft.Win32;

namespace Agent
{
    class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            try
            {
                if (args.Contains("-uninstall"))
                {
                    Uninstall();
                    return;
                }

                string installDir = @"C:\ProgramData\PrintCenterAgent";
                string currentExe = Process.GetCurrentProcess().MainModule?.FileName ?? "";
                string targetExe  = Path.Combine(installDir, "PrintAgent.exe");

                bool isAlreadyInstalled = currentExe.Equals(targetExe, StringComparison.OrdinalIgnoreCase);

                if (!isAlreadyInstalled)
                {
                    // ====== MODO INSTALADOR: mostra janela de progresso ======
                    RunInstallFlow(installDir, currentExe, targetExe);
                }
                else
                {
                    // ====== MODO AGENTE: systray + polling ======
                    using var tray = new TrayApp();
                    var cts = new CancellationTokenSource();
                    Task.Run(() => AgentClient.StartPolling(cts.Token, tray));
                    Application.Run();
                }
            }
            catch (Exception ex)
            {
                File.AppendAllText(@"C:\ProgramData\PrintCenterAgent\error.log",
                    $"{DateTime.Now} - FATAL: {ex.Message}\n{ex.StackTrace}\n\n");
                MessageBox.Show($"Erro ao iniciar o agente:\n{ex.Message}", "PrintCenter Agent", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static void RunInstallFlow(string installDir, string currentExe, string targetExe)
        {
            // Cria e mostra a janela de instalação
            var form = new InstallForm();
            form.Show();
            form.Update();

            try
            {
                form.SetStatus("Preparando instalação...", 15);
                Thread.Sleep(400);

                if (!Directory.Exists(installDir))
                    Directory.CreateDirectory(installDir);

                form.SetStatus("Copiando arquivos...", 35);
                Thread.Sleep(300);

                // Mata o processo antigo antes de sobrescrever (evita "file in use")
                foreach (var p in Process.GetProcessesByName("PrintAgent"))
                {
                    try { p.Kill(); p.WaitForExit(2000); } catch { }
                }
                Thread.Sleep(600); // Aguarda o OS liberar o arquivo

                File.Copy(currentExe, targetExe, overwrite: true);

                form.SetStatus("Configurando inicialização automática...", 60);
                Thread.Sleep(300);
                using var key = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", writable: true);
                key?.SetValue("PrintCenterAgent", $"\"{targetExe}\"");

                form.SetStatus("Criando atalho de desinstalação...", 75);
                Thread.Sleep(200);
                File.WriteAllText(
                    Path.Combine(installDir, "Desinstalar.bat"),
                    $"@echo off\n\"{targetExe}\" -uninstall\necho Agente desinstalado com sucesso!\npause"
                );

                form.SetStatus("Iniciando agente em segundo plano...", 90);
                Thread.Sleep(300);

                Process.Start(new ProcessStartInfo
                {
                    FileName = targetExe,
                    UseShellExecute = false,
                    CreateNoWindow = true
                });

                form.SetStatus("Instalação concluída!", 100);
                Thread.Sleep(400);

                // Fecha a barra de progresso e mostra tela de sucesso
                form.Hide();
                new SuccessForm().ShowDialog();
            }
            catch (Exception ex)
            {
                form.Hide();
                MessageBox.Show(
                    $"Falha na instalação:\n{ex.Message}\n\nVerifique se está executando como Administrador.",
                    "PrintCenter Agent — Erro",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }

            form.Close();
            Environment.Exit(0);
        }

        static void Uninstall()
        {
            var result = MessageBox.Show(
                "Deseja desinstalar o PrintCenter Agent?\n\nO monitoramento será interrompido nesta máquina.",
                "Desinstalar PrintCenter Agent",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );
            if (result != DialogResult.Yes) return;

            try
            {
                using var key = Registry.CurrentUser.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\Run", writable: true);
                key?.DeleteValue("PrintCenterAgent", throwOnMissingValue: false);

                int currentId = Process.GetCurrentProcess().Id;
                foreach (var p in Process.GetProcessesByName("PrintAgent"))
                    if (p.Id != currentId) p.Kill();

                Thread.Sleep(800);
                string installDir = @"C:\ProgramData\PrintCenterAgent";
                if (Directory.Exists(installDir))
                    Directory.Delete(installDir, recursive: true);

                MessageBox.Show("PrintCenter Agent desinstalado com sucesso.", "Desinstalado", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Erro ao desinstalar: {ex.Message}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }

    // =============================================
    // JANELA DE PROGRESSO DA INSTALAÇÃO
    // =============================================
    class InstallForm : Form
    {
        private Label _lblStatus;
        private ProgressBar _progress;

        public InstallForm()
        {
            Text = "PrintCenter Agent — Instalação";
            Size = new Size(460, 210);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            BackColor = Color.FromArgb(18, 34, 48);
            ControlBox = false;
            ShowInTaskbar = true;
            Padding = new Padding(0);

            var logo = new Label
            {
                Text = "🖨️  PrintCenter Agent",
                Font = new Font("Segoe UI", 13, FontStyle.Bold),
                ForeColor = Color.FromArgb(232, 237, 244),
                Location = new Point(24, 20),
                AutoSize = true
            };

            var subTitle = new Label
            {
                Text = "Instalando, aguarde...",
                Font = new Font("Segoe UI", 9),
                ForeColor = Color.FromArgb(107, 128, 152),
                Location = new Point(26, 50),
                AutoSize = true
            };

            _lblStatus = new Label
            {
                Text = "Iniciando instalação...",
                Font = new Font("Segoe UI", 9),
                ForeColor = Color.FromArgb(160, 180, 200),
                Location = new Point(24, 80),
                Size = new Size(410, 20)
            };

            _progress = new ProgressBar
            {
                Location = new Point(24, 108),
                Size = new Size(410, 22),
                Style = ProgressBarStyle.Continuous,
                ForeColor = Color.FromArgb(59, 139, 235),
                BackColor = Color.FromArgb(20, 30, 43),
                Minimum = 0,
                Maximum = 100,
                Value = 5
            };

            var sub = new Label
            {
                Text = "Não feche esta janela.",
                Font = new Font("Segoe UI", 8),
                ForeColor = Color.FromArgb(80, 100, 120),
                Location = new Point(24, 140),
                AutoSize = true
            };

            Controls.AddRange(new Control[] { logo, subTitle, _lblStatus, _progress, sub });
        }

        public void SetStatus(string text, int percent)
        {
            if (InvokeRequired) { Invoke(() => SetStatus(text, percent)); return; }
            _lblStatus.Text = text;
            _progress.Value = Math.Clamp(percent, 0, 100);
            Update();
        }
    }

    // =============================================
    // JANELA DE SUCESSO PÓS-INSTALAÇÃO
    // =============================================
    class SuccessForm : Form
    {
        public SuccessForm()
        {
            Text = "PrintCenter Agent — Instalado!";
            Size = new Size(480, 320);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            BackColor = Color.FromArgb(18, 34, 48);
            Padding = new Padding(0);

            // Card de fundo interno com padding visual
            var card = new Panel
            {
                Location = new Point(20, 16),
                Size = new Size(438, 256),
                BackColor = Color.FromArgb(24, 42, 64),
                BorderStyle = BorderStyle.None
            };

            var icon = new Label
            {
                Text = "✅",
                Font = new Font("Segoe UI Emoji", 38),
                ForeColor = Color.FromArgb(34, 197, 94),
                Location = new Point(0, 14),
                Size = new Size(438, 56),
                TextAlign = ContentAlignment.MiddleCenter
            };

            var title = new Label
            {
                Text = "Instalação Concluída!",
                Font = new Font("Segoe UI", 15, FontStyle.Bold),
                ForeColor = Color.FromArgb(232, 237, 244),
                Location = new Point(0, 78),
                Size = new Size(438, 32),
                TextAlign = ContentAlignment.MiddleCenter
            };

            var desc = new Label
            {
                Text = "O PrintCenter Agent está ativo em segundo plano.\r\n" +
                       "Procure o ícone 🖨️ na bandeja do sistema (canto inferior direito).\r\n\r\n" +
                       "Quando conectar ao servidor, um balão verde de confirmação\r\n" +
                       "aparecerá automaticamente.",
                Font = new Font("Segoe UI", 9),
                ForeColor = Color.FromArgb(140, 165, 192),
                Location = new Point(20, 118),
                Size = new Size(398, 88),
                TextAlign = ContentAlignment.MiddleCenter
            };

            var btnOk = new Button
            {
                Text = "Entendido ✓",
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                Size = new Size(150, 38),
                Location = new Point(144, 212),
                BackColor = Color.FromArgb(59, 139, 235),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                DialogResult = DialogResult.OK,
                Cursor = Cursors.Hand
            };
            btnOk.FlatAppearance.BorderSize = 0;

            card.Controls.AddRange(new Control[] { icon, title, desc, btnOk });
            Controls.Add(card);
            AcceptButton = btnOk;
        }
    }

    // =============================================
    // SYSTRAY APÓS INSTALAÇÃO
    // =============================================
    public class TrayApp : ApplicationContext
    {
        private NotifyIcon _tray;
        private ToolStripMenuItem _statusItem;
        private System.Windows.Forms.Timer _timer;
        private bool _firstOnline = true;

        public NotifyIcon TrayIcon => _tray;

        public TrayApp()
        {
            _statusItem = new ToolStripMenuItem("● Conectando ao servidor...") { Enabled = false };
            _statusItem.ForeColor = Color.DarkOrange;

            var menu = new ContextMenuStrip();
            menu.Items.Add(_statusItem);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Abrir Painel Web", null, (_, _) =>
                Process.Start(new ProcessStartInfo(AgentClient.GetServerUrl().Replace(":5000", ":5173")) { UseShellExecute = true }));
            menu.Items.Add("Escanear Rede Agora", null, async (_, _) =>
            {
                await AgentClient.ForceScan();
                ShowBalloon("🔍 Varredura iniciada", "O agente está escaneando a rede local...", ToolTipIcon.Info);
            });
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add("Desinstalar Agente", null, (_, _) =>
                Process.Start(new ProcessStartInfo(@"C:\ProgramData\PrintCenterAgent\Desinstalar.bat") { UseShellExecute = true }));

            _tray = new NotifyIcon
            {
                Icon = SystemIcons.Application,
                Visible = true,
                Text = "PrintCenter Agent — Conectando...",
                ContextMenuStrip = menu
            };

            // Timer que verifica conexão e dispara notificações
            _timer = new System.Windows.Forms.Timer { Interval = 8000 };
            _timer.Tick += OnTimerTick;
            _timer.Start();
        }

        private void OnTimerTick(object? sender, EventArgs e)
        {
            bool online = AgentClient.IsServerReachable();
            int clientId = AgentClient.GetClientId();

            if (online)
            {
                _statusItem.Text = $"● Online — Cliente #{clientId}";
                _statusItem.ForeColor = Color.FromArgb(34, 197, 94);
                _tray.Text = $"PrintCenter Agent — Online (#{clientId})";

                // Primeira vez online: balão de confirmação de comunicação!
                if (_firstOnline)
                {
                    _firstOnline = false;
                    ShowBalloon(
                        "✅ Comunicação Estabelecida!",
                        $"PrintCenter Agent conectado ao servidor.\nMonitorando impressoras do Cliente #{clientId}.",
                        ToolTipIcon.Info
                    );
                }
            }
            else
            {
                _statusItem.Text = "○ Sem conexão com servidor";
                _statusItem.ForeColor = Color.FromArgb(239, 68, 68);
                _tray.Text = "PrintCenter Agent — Offline";
            }
        }

        public void ShowBalloon(string title, string message, ToolTipIcon icon = ToolTipIcon.Info)
        {
            _tray?.ShowBalloonTip(5000, title, message, icon);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _timer?.Stop();
                _timer?.Dispose();
                _tray?.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}

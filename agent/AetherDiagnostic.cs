using System;
using System.Drawing;
using System.Windows.Forms;
using System.Management;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Win32;
using System.IO;
using System.Text.Json;
using System.Net.Sockets;

namespace AetherAgent
{
    public class DiagnosticData
    {
        public string hostname { get; set; }
        public string os { get; set; }
        public string processor { get; set; }
        public string ram { get; set; }
        public string serial { get; set; }
        public string anydesk { get; set; }
        public string rustdesk { get; set; }
        public string ip { get; set; }
        public string user { get; set; }
    }

    public class AetherDiagnostic : Form
    {
        private DataGridView grid;
        private HttpListener listener;
        private Label statusLabel;

        public AetherDiagnostic()
        {
            this.Text = "AETHER - Diagnóstico e Captura de Dados";
            this.Size = new Size(650, 500);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Icon = SystemIcons.Information;

            // Configuração da Tabela de Dados
            grid = new DataGridView { 
                Dock = DockStyle.Fill, 
                AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
                ReadOnly = true,
                BackgroundColor = Color.White,
                AllowUserToAddRows = false,
                RowHeadersVisible = false,
                SelectionMode = DataGridViewSelectionMode.FullRowSelect,
                BorderStyle = BorderStyle.None
            };
            grid.Columns.Add("Propriedade", "Propriedade");
            grid.Columns.Add("Valor", "Valor");
            
            // Barra de Status Inferior
            statusLabel = new Label { 
                Dock = DockStyle.Bottom, 
                Height = 35, 
                Text = " Inciando servidor local na porta 5001...", 
                TextAlign = ContentAlignment.MiddleLeft,
                BackColor = Color.FromArgb(240, 240, 240),
                Font = new Font("Segoe UI", 9, FontStyle.Bold)
            };

            this.Controls.Add(grid);
            this.Controls.Add(statusLabel);

            this.Load += async (s, e) => {
                RefreshData();
                await StartServer();
            };
        }

        private void RefreshData()
        {
            var data = CollectData();
            this.Invoke((MethodInvoker)delegate {
                grid.Rows.Clear();
                grid.Rows.Add("Nome da Máquina", data.hostname);
                grid.Rows.Add("Sistema Operacional", data.os);
                grid.Rows.Add("Processador", data.processor);
                grid.Rows.Add("Memória RAM", data.ram);
                grid.Rows.Add("Número de Série", data.serial);
                grid.Rows.Add("AnyDesk ID", data.anydesk);
                grid.Rows.Add("RustDesk ID", data.rustdesk);
                grid.Rows.Add("IP Local", data.ip);
                grid.Rows.Add("Usuário", data.user);
            });
        }

        private DiagnosticData CollectData()
        {
            var data = new DiagnosticData {
                hostname = Environment.MachineName,
                os = Environment.OSVersion.ToString(),
                user = Environment.UserName,
                ip = GetLocalIPAddress(),
                serial = "Não detectado",
                processor = "Não detectado",
                ram = "Não detectado"
            };

            try {
                using (var s = new ManagementObjectSearcher("SELECT SerialNumber FROM Win32_BIOS"))
                    foreach (var o in s.Get()) data.serial = o["SerialNumber"]?.ToString();
                using (var s = new ManagementObjectSearcher("SELECT Name FROM Win32_Processor"))
                    foreach (var o in s.Get()) data.processor = o["Name"]?.ToString();
                using (var s = new ManagementObjectSearcher("SELECT TotalPhysicalMemory FROM Win32_ComputerSystem"))
                    foreach (var o in s.Get()) data.ram = (Convert.ToInt64(o["TotalPhysicalMemory"]) / 1073741824.0).ToString("F1") + " GB";
            } catch { }

            data.anydesk = GetAnyDeskId();
            data.rustdesk = GetRustDeskId();

            return data;
        }

        private string GetAnyDeskId()
        {
            string[] keys = {
                @"HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\AnyDesk",
                @"HKEY_LOCAL_MACHINE\SOFTWARE\AnyDesk",
                @"HKEY_CURRENT_USER\SOFTWARE\AnyDesk"
            };
            foreach (var key in keys) {
                var val = Registry.GetValue(key, "ad_id", null)?.ToString();
                if (!string.IsNullOrEmpty(val)) return val;
            }
            
            // Tentar via arquivo se registro falhar
            string configPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), @"AnyDesk\system.conf");
            if (File.Exists(configPath)) {
                foreach (var line in File.ReadAllLines(configPath))
                    if (line.StartsWith("ad.anydesk.id=")) return line.Split('=')[1].Trim();
            }
            return "Não detectado";
        }

        private string GetRustDeskId()
        {
            // Tentar buscar no registro do Windows (para versões que armazenam lá)
            string[] registryPaths = {
                @"HKEY_LOCAL_MACHINE\SOFTWARE\RustDesk",
                @"HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\RustDesk",
                @"HKEY_CURRENT_USER\SOFTWARE\RustDesk"
            };

            foreach (var regPath in registryPaths) {
                var val = Registry.GetValue(regPath, "id", null)?.ToString();
                if (!string.IsNullOrEmpty(val)) return val;
            }

            // Tentar buscar em arquivos de configuração
            string[] paths = {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"RustDesk\config\rustdesk.toml"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"RustDesk\rustdesk.toml"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), @"RustDesk\config\service.toml"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), @"RustDesk\config\rustdesk.toml"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), @"RustDesk\rustdesk.toml"),
                @"C:\Program Files\RustDesk\rustdesk.toml",
                @"C:\Program Files (x86)\RustDesk\rustdesk.toml"
            };

            foreach (var path in paths) {
                if (File.Exists(path)) {
                    try {
                        foreach (var line in File.ReadAllLines(path)) {
                            // Buscar por "id =" ou "peer_id ="
                            if (line.Trim().StartsWith("id") && line.Contains("=")) {
                                var parts = line.Split('=');
                                if (parts.Length > 1) {
                                    var id = parts[1].Trim().Trim('"', '\'', ' ');
                                    if (!string.IsNullOrEmpty(id)) return id;
                                }
                            }
                        }
                    } catch { }
                }
            }

            return "Não detectado";
        }

        private string GetLocalIPAddress() {
            var host = Dns.GetHostEntry(Dns.GetHostName());
            foreach (var ip in host.AddressList) if (ip.AddressFamily == AddressFamily.InterNetwork) return ip.ToString();
            return "127.0.0.1";
        }

        private async Task StartServer()
        {
            try {
                listener = new HttpListener();
                listener.Prefixes.Add("http://localhost:5001/");
                listener.Start();
                statusLabel.Text = " ✅ Servidor Ativo: http://localhost:5001/get-info (Pronto para o Frontend)";
                statusLabel.ForeColor = Color.DarkGreen;

                while (listener.IsListening) {
                    var context = await listener.GetContextAsync();
                    var response = context.Response;

                    // Suporte a CORS para o Navegador permitir a leitura
                    response.Headers.Add("Access-Control-Allow-Origin", "*");
                    response.Headers.Add("Access-Control-Allow-Methods", "GET, OPTIONS");
                    response.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Accept");

                    if (context.Request.HttpMethod == "OPTIONS") {
                        response.StatusCode = 200;
                        response.Close();
                        continue;
                    }

                    if (context.Request.Url.AbsolutePath.TrimEnd('/') == "/get-info") {
                        Task.Run(() => RefreshData());
                        string json = JsonSerializer.Serialize(CollectData(), new JsonSerializerOptions { 
                            WriteIndented = true,
                            PropertyNamingPolicy = null 
                        });
                        byte[] buffer = Encoding.UTF8.GetBytes(json);
                        response.ContentType = "application/json";
                        await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
                        response.OutputStream.Close();
                    } else {
                        context.Response.StatusCode = 404;
                        context.Response.Close();
                    }
                }
            } catch (HttpListenerException ex) {
                if (ex.ErrorCode == 5) {
                    statusLabel.Text = " ❌ Erro: Acesso Negado. Clique com o botão direito e 'Executar como Administrador'.";
                } else {
                    statusLabel.Text = $" ❌ Erro na Porta 5001: {ex.Message}";
                }
                statusLabel.ForeColor = Color.Red;
            } catch (Exception ex) {
                statusLabel.Text = " ❌ Erro inesperado ao iniciar servidor.";
                statusLabel.ForeColor = Color.Red;
            }
        }
    }

    static class Program {
        [STAThread] static void Main() { 
            Application.EnableVisualStyles();
            Application.Run(new AetherDiagnostic()); 
        }
    }
}
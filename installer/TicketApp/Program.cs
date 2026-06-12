using System;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Runtime.Versioning;
using Microsoft.Win32;
using System.Management;

namespace AetherTicketApp
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            ApplicationConfiguration.Initialize();
            Application.Run(new TicketForm());
        }
    }

    public class BackendConfig
    {
        [JsonPropertyName("host")]
        public string Host { get; set; } = "localhost";

        [JsonPropertyName("port")]
        public int Port { get; set; } = 5000;

        [JsonPropertyName("protocol")]
        public string Protocol { get; set; } = "http";
    }

    public class ConfigManager
    {
        private readonly string _configPath;

        public ConfigManager()
        {
            var appDir = AppContext.BaseDirectory;
            _configPath = Path.Combine(appDir, "config.json");
        }

        public BackendConfig LoadConfig()
        {
            try
            {
                if (File.Exists(_configPath))
                {
                    var json = File.ReadAllText(_configPath);
                    return JsonSerializer.Deserialize<BackendConfig>(json) ?? GetDefaultConfig();
                }
                else
                {
                    // Create default config file on first run
                    var defaultConfig = GetDefaultConfig();
                    SaveConfig(defaultConfig);
                    return defaultConfig;
                }
            }
            catch
            {
                // If reading fails, use default
                return GetDefaultConfig();
            }
        }

        public void SaveConfig(BackendConfig config)
        {
            try
            {
                var json = JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(_configPath, json);
            }
            catch
            {
                // Silently fail if unable to save
            }
        }

        private static BackendConfig GetDefaultConfig()
        {
            return new BackendConfig { Host = "localhost", Port = 5000, Protocol = "http" };
        }
    }

    public class TicketForm : Form
    {
        private readonly ConfigManager _configManager;
        private BackendConfig _backendConfig;
        private readonly TextBox titleTextBox;
        private readonly TextBox descriptionTextBox;
        private readonly ComboBox priorityComboBox;
        private readonly ComboBox categoryComboBox;
        private readonly ComboBox assignmentComboBox;
        private readonly Button saveButton;

        public TicketForm()
        {
            Text = "Abertura de Chamado - Aether";
            Width = 800;
            Height = 600;
            MinimumSize = new System.Drawing.Size(520, 420);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.Sizable;
            MaximizeBox = true;
            BackColor = System.Drawing.Color.FromArgb(237, 242, 247);
            Font = new System.Drawing.Font("Segoe UI", 10F);

            _configManager = new ConfigManager();
            _backendConfig = _configManager.LoadConfig();

            var headerLabel = new Label
            {
                Text = "Novo Chamado",
                Font = new System.Drawing.Font("Segoe UI", 18F, System.Drawing.FontStyle.Bold),
                ForeColor = System.Drawing.Color.FromArgb(33, 37, 41),
                AutoSize = true,
                Dock = DockStyle.Top,
                Padding = new Padding(0, 0, 0, 10)
            };

            var subtitleLabel = new Label
            {
                Text = "Descreva seu problema para que possamos ajudá-lo.",
                Font = new System.Drawing.Font("Segoe UI", 9F),
                ForeColor = System.Drawing.Color.FromArgb(99, 110, 114),
                AutoSize = true,
                Dock = DockStyle.Top,
                Padding = new Padding(0, 0, 0, 20)
            };

            var cardPanel = new Panel
            {
                Dock = DockStyle.Fill,
                BackColor = System.Drawing.Color.White,
                BorderStyle = BorderStyle.FixedSingle,
                Padding = new Padding(32)
            };

            var cardContent = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                ColumnCount = 1,
                RowCount = 3,
                AutoSize = false,
                Padding = new Padding(0),
                Margin = new Padding(0),
            };
            cardContent.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            cardContent.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            cardContent.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

            var layout = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                ColumnCount = 2,
                AutoSize = false,
                Padding = new Padding(0),
                Margin = new Padding(0),
            };
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 150));
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));

            layout.RowCount = 7;
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize)); // titulo
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize)); // urgencia
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize)); // tipo
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize)); // atribuicao
            layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100)); // descricao fills remaining space
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize)); // botao
            layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 16));


            // Resumo do Problema
            layout.Controls.Add(new Label { Text = "Título do Chamado:", AutoSize = true, Anchor = AnchorStyles.Left, ForeColor = System.Drawing.Color.FromArgb(52, 58, 64) }, 0, 0);
            titleTextBox = new TextBox { Dock = DockStyle.Fill, BorderStyle = BorderStyle.FixedSingle, BackColor = System.Drawing.Color.White, ForeColor = System.Drawing.Color.FromArgb(33, 37, 41) };
            layout.Controls.Add(titleTextBox, 1, 0);

            // Nível de Urgência
            layout.Controls.Add(new Label { Text = "Prioridade:", AutoSize = true, Anchor = AnchorStyles.Left, ForeColor = System.Drawing.Color.FromArgb(52, 58, 64) }, 0, 1);
            priorityComboBox = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Dock = DockStyle.Fill, FlatStyle = FlatStyle.Flat, BackColor = System.Drawing.Color.White, ForeColor = System.Drawing.Color.FromArgb(33, 37, 41) };
            priorityComboBox.Items.AddRange(new object[] { "Baixa", "Média", "Alta", "Crítica" });
            priorityComboBox.SelectedIndex = 1;
            layout.Controls.Add(priorityComboBox, 1, 1);

            // Tipo de Problema
            layout.Controls.Add(new Label { Text = "Categoria:", AutoSize = true, Anchor = AnchorStyles.Left, ForeColor = System.Drawing.Color.FromArgb(52, 58, 64) }, 0, 2);
            categoryComboBox = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Dock = DockStyle.Fill, FlatStyle = FlatStyle.Flat, BackColor = System.Drawing.Color.White, ForeColor = System.Drawing.Color.FromArgb(33, 37, 41) };
            categoryComboBox.Items.AddRange(new object[] { "Programas", "Hardware", "Licença", "Usuário", "Sistema" });
            categoryComboBox.SelectedIndex = 0;
            layout.Controls.Add(categoryComboBox, 1, 2);

            // Atribuição (opcional) - permite selecionar usuário responsável
            layout.Controls.Add(new Label { Text = "Atribuir a:", AutoSize = true, Anchor = AnchorStyles.Left, ForeColor = System.Drawing.Color.FromArgb(52, 58, 64) }, 0, 3);
            assignmentComboBox = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Dock = DockStyle.Fill, FlatStyle = FlatStyle.Flat, BackColor = System.Drawing.Color.White, ForeColor = System.Drawing.Color.FromArgb(33, 37, 41) };
            assignmentComboBox.Items.AddRange(new object[] { "Sem atribuição", "TI Atendimento", "TI Nível 2", "Suporte Local" });
            assignmentComboBox.SelectedIndex = 0;
            layout.Controls.Add(assignmentComboBox, 1, 3);

            // Explicação/Motivo
            layout.Controls.Add(new Label { Text = "Detalhes da Ocorrência:", AutoSize = true, Anchor = AnchorStyles.Left, ForeColor = System.Drawing.Color.FromArgb(52, 58, 64) }, 0, 4);
            descriptionTextBox = new TextBox { Multiline = true, ScrollBars = ScrollBars.Vertical, Dock = DockStyle.Fill, BorderStyle = BorderStyle.FixedSingle, BackColor = System.Drawing.Color.White, ForeColor = System.Drawing.Color.FromArgb(33, 37, 41), MinimumSize = new System.Drawing.Size(0, 200) };
            descriptionTextBox.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            layout.Controls.Add(descriptionTextBox, 1, 4);

            // Botão Salvar
            saveButton = new Button
            {
                Text = "Enviar Chamado",
                Width = 150,
                Height = 36,
                BackColor = System.Drawing.Color.FromArgb(0, 120, 215),
                ForeColor = System.Drawing.Color.White,
                FlatStyle = FlatStyle.Flat,
                Padding = new Padding(6),
                Anchor = AnchorStyles.Bottom | AnchorStyles.Right,
                TextAlign = System.Drawing.ContentAlignment.MiddleCenter,
                Margin = new Padding(0, 8, 8, 8)
            };
            saveButton.FlatAppearance.BorderSize = 0;
            saveButton.Click += SaveButton_Click;
            layout.Controls.Add(new Label { Text = string.Empty, AutoSize = true }, 0, 5);
            layout.Controls.Add(saveButton, 1, 5);

            cardContent.Controls.Add(headerLabel, 0, 0);
            cardContent.Controls.Add(subtitleLabel, 0, 1);
            cardContent.Controls.Add(layout, 0, 2);
            cardPanel.Controls.Add(cardContent);
            Controls.Add(cardPanel);

            // Coletar dados em background (não exibir no formulário)
            if (OperatingSystem.IsWindows())
            {
                // Dados são coletados em background e não aparecem no formulário.
                _ = GetHostName();
                _ = GetSerialNumber();
                _ = GetOperatingSystem();
                _ = GetProcessor();
                _ = GetRamMemory();
                _ = GetRealVncId();
                _ = GetRustDeskId();
            }

            // Carregar lista de usuários atribuíveis (se o backend estiver disponível)
            _ = Task.Run(async () => await LoadAssignableUsersAsync());
        }

        private async Task LoadAssignableUsersAsync()
        {
            try
            {
                var backendUri = BuildBackendUri(_backendConfig.Host, _backendConfig.Port);
                if (backendUri == null) return;

                using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(4) };
                var usersUrl = new Uri(backendUri, "api/users");
                var resp = await httpClient.GetAsync(usersUrl);
                if (!resp.IsSuccessStatusCode) return;

                var body = await resp.Content.ReadAsStringAsync();
                var users = JsonSerializer.Deserialize<UserSummary[]>(body);
                if (users == null || users.Length == 0) return;

                if (assignmentComboBox.InvokeRequired)
                {
                    assignmentComboBox.Invoke(() =>
                    {
                        assignmentComboBox.Items.Clear();
                        assignmentComboBox.Items.Add("Sem atribuição");
                        foreach (var u in users)
                        {
                            assignmentComboBox.Items.Add(u.Email ?? u.Name ?? u.Id.ToString());
                        }
                        assignmentComboBox.SelectedIndex = 0;
                    });
                }
                else
                {
                    assignmentComboBox.Items.Clear();
                    assignmentComboBox.Items.Add("Sem atribuição");
                    foreach (var u in users)
                    {
                        assignmentComboBox.Items.Add(u.Email ?? u.Name ?? u.Id.ToString());
                    }
                    assignmentComboBox.SelectedIndex = 0;
                }
            }
            catch
            {
                // Silenciosamente ignora se backend não disponível
            }
        }


        private static string GetLocalIpAddress()
        {
            try
            {
                foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (ni.OperationalStatus != OperationalStatus.Up || ni.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                    var ipProps = ni.GetIPProperties();
                    if (ni.Description.ToLower().Contains("virtual") || ni.Description.ToLower().Contains("pseudo")) continue;
                    foreach (var addr in ipProps.UnicastAddresses)
                    {
                        if (addr.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork && !System.Net.IPAddress.IsLoopback(addr.Address))
                        {
                            return addr.Address.ToString();
                        }
                    }
                }
            }
            catch
            {
                // Ignore errors and allow user to enter IP manually.
            }
            return string.Empty;
        }

        private static string GetLoggedInUserName()
        {
            try
            {
                var domain = Environment.UserDomainName;
                var user = Environment.UserName;
                if (!string.IsNullOrWhiteSpace(domain) && !string.Equals(domain, ".", StringComparison.OrdinalIgnoreCase))
                {
                    return $"{domain}\\{user}";
                }
                return user;
            }
            catch
            {
                return string.Empty;
            }
        }

        [SupportedOSPlatform("windows")]
        private static string? GetAnyDeskIdFromRegistry()
        {
            if (!OperatingSystem.IsWindows())
            {
                return null;
            }

            try
            {
                var registryPaths = new[]
                {
                    @"Software\AnyDesk",
                    @"Software\WOW6432Node\AnyDesk",
                };

                foreach (var path in registryPaths)
                {
                    using var key = Registry.CurrentUser.OpenSubKey(path);
                    var value = ReadAnyDeskIdFromRegistryKey(key);
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        return value;
                    }
                }

                foreach (var path in registryPaths)
                {
                    using var key = Registry.LocalMachine.OpenSubKey(path);
                    var value = ReadAnyDeskIdFromRegistryKey(key);
                    if (!string.IsNullOrWhiteSpace(value))
                    {
                        return value;
                    }
                }
            }
            catch
            {
                // Ignore errors
            }
            return null;
        }

        private static string? GetAnyDeskIdFromConfigFile()
        {
            try
            {
                var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                var systemConfPath = Path.Combine(appData, "AnyDesk", "system.conf");
                if (File.Exists(systemConfPath))
                {
                    foreach (var line in File.ReadLines(systemConfPath))
                    {
                        if (line.StartsWith("ad.anynet.id=", StringComparison.OrdinalIgnoreCase))
                        {
                            var value = line.Substring("ad.anynet.id=".Length).Trim();
                            var parsed = ParseAnyDeskId(value);
                            if (!string.IsNullOrWhiteSpace(parsed))
                            {
                                return parsed;
                            }
                        }
                    }
                }
            }
            catch
            {
                // Ignore errors
            }

            return null;
        }

        [SupportedOSPlatform("windows")]
        private static string? ReadAnyDeskIdFromRegistryKey(RegistryKey? key)
        {
            if (key == null)
            {
                return null;
            }

            try
            {
                var knownNames = new[] { "ad.anynet.id", "AnyDeskID", "ID", "ClientID" };
                foreach (var name in knownNames)
                {
                    var value = key.GetValue(name);
                    var parsed = ParseAnyDeskId(value?.ToString());
                    if (!string.IsNullOrWhiteSpace(parsed))
                    {
                        return parsed;
                    }
                }

                foreach (var valueName in key.GetValueNames())
                {
                    var value = key.GetValue(valueName)?.ToString();
                    var parsed = ParseAnyDeskId(value);
                    if (!string.IsNullOrWhiteSpace(parsed))
                    {
                        return parsed;
                    }
                }
            }
            catch
            {
                // Ignore errors
            }

            return null;
        }

        private static string GetAnyDeskCode()
        {
            try
            {
                if (OperatingSystem.IsWindows())
                {
                    var registryValue = GetAnyDeskIdFromRegistry();
                    if (!string.IsNullOrWhiteSpace(registryValue))
                    {
                        return registryValue;
                    }
                }

                foreach (var process in Process.GetProcessesByName("AnyDesk"))
                {
                    var title = process.MainWindowTitle;
                    if (!string.IsNullOrWhiteSpace(title))
                    {
                        var code = ParseAnyDeskCodeFromTitle(title);
                        if (!string.IsNullOrWhiteSpace(code))
                        {
                            return code;
                        }
                    }
                }
            }
            catch
            {
                // Ignore errors and allow manual entry.
            }

            return string.Empty;
        }

        private static string ParseAnyDeskId(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var match = Regex.Match(value, @"\d[\d\s-]{6,}\d");
            if (match.Success)
            {
                return Regex.Replace(match.Value, "[^0-9]", string.Empty);
            }

            return string.Empty;
        }

        private static string ParseAnyDeskCodeFromTitle(string title)
        {
            return ParseAnyDeskId(title);
        }

        private static string GetHostName()
        {
            try
            {
                return Environment.MachineName ?? "Unknown";
            }
            catch
            {
                return "Unknown";
            }
        }

        [SupportedOSPlatform("windows")]
        private static string GetSerialNumber()
        {
            try
            {
                using var searcher = new System.Management.ManagementObjectSearcher("SELECT SerialNumber FROM Win32_BIOS");
                using var results = searcher.Get();
                foreach (var obj in results)
                {
                    return obj["SerialNumber"]?.ToString() ?? "Unknown";
                }
            }
            catch
            {
                // Ignore errors
            }
            return "Unknown";
        }

        [SupportedOSPlatform("windows")]
        private static string GetOperatingSystem()
        {
            try
            {
                var osVersion = System.Environment.OSVersion.VersionString;
                return osVersion ?? "Unknown";
            }
            catch
            {
                return "Unknown";
            }
        }

        [SupportedOSPlatform("windows")]
        private static string GetProcessor()
        {
            try
            {
                using var searcher = new System.Management.ManagementObjectSearcher("SELECT Name FROM Win32_Processor");
                using var results = searcher.Get();
                foreach (var obj in results)
                {
                    return obj["Name"]?.ToString() ?? "Unknown";
                }
            }
            catch
            {
                // Ignore errors
            }
            return "Unknown";
        }

        [SupportedOSPlatform("windows")]
        private static string GetRamMemory()
        {
            try
            {
                using var searcher = new System.Management.ManagementObjectSearcher("SELECT Capacity FROM Win32_PhysicalMemory");
                using var results = searcher.Get();
                long totalCapacity = 0;
                foreach (var obj in results)
                {
                    if (long.TryParse(obj["Capacity"]?.ToString(), out var capacity))
                    {
                        totalCapacity += capacity;
                    }
                }

                if (totalCapacity > 0)
                {
                    var gbMemory = totalCapacity / (1024.0 * 1024.0 * 1024.0);
                    return Math.Round(gbMemory, 2) + " GB";
                }
            }
            catch
            {
                // Ignore errors
            }
            return "Unknown";
        }

        [SupportedOSPlatform("windows")]
        private static string? GetRealVncId()
        {
            try
            {
                var registryPaths = new[]
                {
                    @"Software\RealVNC",
                    @"Software\RealVNC\vncserver",
                    @"Software\RealVNC\WinVNC4",
                };

                foreach (var path in registryPaths)
                {
                    using var key = Registry.LocalMachine.OpenSubKey(path);
                    if (key != null)
                    {
                        var serverId = key.GetValue("ServerID");
                        if (serverId != null)
                        {
                            return serverId.ToString();
                        }
                    }

                    using var userKey = Registry.CurrentUser.OpenSubKey(path);
                    if (userKey != null)
                    {
                        var serverId = userKey.GetValue("ServerID");
                        if (serverId != null)
                        {
                            return serverId.ToString();
                        }
                    }
                }
            }
            catch
            {
                // Ignore errors
            }
            return null;
        }

        [SupportedOSPlatform("windows")]
        private static string? GetRustDeskId()
        {
            try
            {
                var rustdeskPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "RustDesk");
                var idFile = Path.Combine(rustdeskPath, "id");

                if (File.Exists(idFile))
                {
                    var id = File.ReadAllText(idFile).Trim();
                    if (!string.IsNullOrWhiteSpace(id))
                    {
                        return id;
                    }
                }

                var registryPaths = new[]
                {
                    @"Software\RustDesk",
                    @"Software\WOW6432Node\RustDesk",
                };

                foreach (var path in registryPaths)
                {
                    using var key = Registry.LocalMachine.OpenSubKey(path);
                    if (key != null)
                    {
                        var id = key.GetValue("ID");
                        if (id != null)
                        {
                            return id.ToString();
                        }
                    }

                    using var userKey = Registry.CurrentUser.OpenSubKey(path);
                    if (userKey != null)
                    {
                        var id = userKey.GetValue("ID");
                        if (id != null)
                        {
                            return id.ToString();
                        }
                    }
                }
            }
            catch
            {
                // Ignore errors
            }
            return null;
        }

        private void OpenBackendSettings()
        {
            using var form = new Form
            {
                Text = "Configurar Backend",
                Width = 420,
                Height = 260,
                StartPosition = FormStartPosition.CenterParent,
                FormBorderStyle = FormBorderStyle.FixedDialog,
                MaximizeBox = false,
                MinimizeBox = false,
                BackColor = System.Drawing.Color.FromArgb(245, 248, 251),
                Font = new System.Drawing.Font("Segoe UI", 9F),
            };

            var layout = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                ColumnCount = 2,
                RowCount = 4,
                Padding = new Padding(16),
                AutoSize = true,
            };
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 120));
            layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
            layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));

            layout.Controls.Add(new Label { Text = "Host:", AutoSize = true, Anchor = AnchorStyles.Left, ForeColor = System.Drawing.Color.FromArgb(33, 37, 41) }, 0, 0);
            var hostTextBox = new TextBox { Text = _backendConfig.Host, Dock = DockStyle.Fill, BorderStyle = BorderStyle.FixedSingle };
            layout.Controls.Add(hostTextBox, 1, 0);

            layout.Controls.Add(new Label { Text = "Porta:", AutoSize = true, Anchor = AnchorStyles.Left, ForeColor = System.Drawing.Color.FromArgb(33, 37, 41) }, 0, 1);
            var portTextBox = new TextBox { Text = _backendConfig.Port.ToString(), Dock = DockStyle.Fill, BorderStyle = BorderStyle.FixedSingle };
            layout.Controls.Add(portTextBox, 1, 1);

            layout.Controls.Add(new Label { Text = "Protocolo:", AutoSize = true, Anchor = AnchorStyles.Left, ForeColor = System.Drawing.Color.FromArgb(33, 37, 41) }, 0, 2);
            var protocolComboBox = new ComboBox { Dock = DockStyle.Fill, DropDownStyle = ComboBoxStyle.DropDownList, FlatStyle = FlatStyle.Flat, BackColor = System.Drawing.Color.White, ForeColor = System.Drawing.Color.FromArgb(33, 37, 41) };
            protocolComboBox.Items.AddRange(new object[] { "http", "https" });
            protocolComboBox.SelectedItem = _backendConfig.Protocol;
            layout.Controls.Add(protocolComboBox, 1, 2);

            var saveButton = new Button { Text = "Salvar", Width = 100, BackColor = System.Drawing.Color.FromArgb(0, 120, 215), ForeColor = System.Drawing.Color.White, FlatStyle = FlatStyle.Flat, Anchor = AnchorStyles.Right };
            saveButton.FlatAppearance.BorderSize = 0;
            saveButton.Click += (s, e) =>
            {
                if (string.IsNullOrWhiteSpace(hostTextBox.Text) || string.IsNullOrWhiteSpace(portTextBox.Text) || protocolComboBox.SelectedItem == null)
                {
                    MessageBox.Show("Preencha host, porta e protocolo.", "Dados incompletos", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                if (!int.TryParse(portTextBox.Text, out var port) || port <= 0 || port > 65535)
                {
                    MessageBox.Show("Informe uma porta válida entre 1 e 65535.", "Porta inválida", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }

                _backendConfig.Host = hostTextBox.Text.Trim();
                _backendConfig.Port = port;
                _backendConfig.Protocol = protocolComboBox.SelectedItem.ToString() ?? "http";
                _configManager.SaveConfig(_backendConfig);
                form.DialogResult = DialogResult.OK;
                form.Close();
            };

            var cancelButton = new Button { Text = "Cancelar", Width = 100, BackColor = System.Drawing.Color.FromArgb(116, 123, 131), ForeColor = System.Drawing.Color.White, FlatStyle = FlatStyle.Flat, Anchor = AnchorStyles.Right };
            cancelButton.FlatAppearance.BorderSize = 0;
            cancelButton.Click += (s, e) => form.Close();

            var buttonPanel = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.RightToLeft, AutoSize = true, Padding = new Padding(0) };
            buttonPanel.Controls.Add(saveButton);
            buttonPanel.Controls.Add(cancelButton);
            layout.Controls.Add(buttonPanel, 1, 3);

            form.Controls.Add(layout);
            form.ShowDialog(this);
        }

        private async void SaveButton_Click(object? sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(titleTextBox.Text) || string.IsNullOrWhiteSpace(descriptionTextBox.Text))
            {
                MessageBox.Show("Por favor, informe o título e a descrição do chamado.", "Campos obrigatórios", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            var backendUri = BuildBackendUri(_backendConfig.Host, _backendConfig.Port);
            if (backendUri == null)
            {
                MessageBox.Show("O backend não está configurado corretamente. Edite o arquivo config.json na pasta do app.", "Endereço inválido", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            if (!await TestBackendUrlAsync(backendUri))
            {
                MessageBox.Show($"O backend não está acessível em {backendUri}.\nEdite o arquivo config.json na pasta do app para alterar a URL do backend.", "Erro de conexão", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            saveButton.Enabled = false;
            saveButton.Text = "Enviando...";

            try
            {
                await SendTicketAsync(backendUri);
                MessageBox.Show("Chamado salvo com sucesso.", "Sucesso", MessageBoxButtons.OK, MessageBoxIcon.Information);
                ClearFields();
            }
            catch (HttpRequestException ex)
            {
                MessageBox.Show($"Não foi possível conectar ao backend:\n{ex.Message}\n\nVerifique se o servidor do sistema está em execução e se a URL está correta.", "Erro de conexão", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Falha ao abrir o chamado:\n{ex.Message}", "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                saveButton.Enabled = true;
                saveButton.Text = "Enviar Chamado";
            }
        }

        private async Task SendTicketAsync(Uri backendUri)
        {
            using var httpClient = new HttpClient();
            
            // Coletar dados em tempo real
            string hostname = GetHostName();
            string serialNumber = OperatingSystem.IsWindows() ? GetSerialNumber() : "N/A";
            string operatingSystem = OperatingSystem.IsWindows() ? GetOperatingSystem() : "N/A";
            string processor = OperatingSystem.IsWindows() ? GetProcessor() : "N/A";
            string ramMemory = OperatingSystem.IsWindows() ? GetRamMemory() : "N/A";
            string realVncIdRaw = OperatingSystem.IsWindows() ? (GetRealVncId() ?? "") : "";
            string rustDeskIdRaw = OperatingSystem.IsWindows() ? (GetRustDeskId() ?? "") : "";
            
            var payload = new TicketRequest
            {
                Title = titleTextBox.Text.Trim(),
                Description = descriptionTextBox.Text.Trim(),
                Priority = NormalizePriority(priorityComboBox.SelectedItem?.ToString() ?? "medium"),
                Category = categoryComboBox.SelectedItem?.ToString() ?? "Programas",
                UserName = GetLoggedInUserName(),
                Ip = GetLocalIpAddress(),
                AnydeskCode = NormalizeOptional(GetAnyDeskIdFromConfigFile() ?? GetAnyDeskIdFromRegistry() ?? GetAnyDeskCode()),
                AssignedTo = (assignmentComboBox.SelectedItem?.ToString() is string a && a != "Sem atribuição") ? a : null,
                Hostname = hostname,
                SerialNumber = serialNumber,
                OperatingSystem = operatingSystem,
                Processor = processor,
                RamMemory = ramMemory,
                RealVncId = NormalizeOptional(realVncIdRaw),
                RustDeskId = NormalizeOptional(rustDeskIdRaw),
            };

            var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            });

            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var apiUrl = new Uri(backendUri, "api/tickets");
            var response = await httpClient.PostAsync(apiUrl, content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Servidor retornou {(int)response.StatusCode}: {responseBody}");
            }
        }

        private static string? NormalizeOptional(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value;
        }

        private async Task<bool> TestBackendUrlAsync(Uri backendUri)
        {
            try
            {
                using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
                var healthUrl = new Uri(backendUri, "health");
                var response = await httpClient.GetAsync(healthUrl);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }


        private Uri? BuildBackendUri(string host, int port)
        {
            if (string.IsNullOrWhiteSpace(host) || port <= 0 || port > 65535)
            {
                return null;
            }

            try
            {
                var builder = new UriBuilder(_backendConfig.Protocol, host, port);
                return builder.Uri;
            }
            catch
            {
                return null;
            }
        }

        private void ClearFields()
        {
            titleTextBox.Text = string.Empty;
            descriptionTextBox.Text = string.Empty;
            priorityComboBox.SelectedIndex = 1;
            categoryComboBox.SelectedIndex = 0;
            assignmentComboBox.SelectedIndex = 0;
        }

        private static string NormalizePriority(string priority)
        {
            return priority.Trim().ToLowerInvariant() switch
            {
                "baixa" or "low" => "low",
                "média" or "medium" => "medium",
                "alta" or "high" => "high",
                "crítica" or "urgent" => "urgent",
                _ => "medium"
            };
        }
    }

    public class TicketRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Priority { get; set; } = "medium";
        public string Category { get; set; } = "Geral";
        public string? UserName { get; set; }
        public string? Ip { get; set; }
        public string? AnydeskCode { get; set; }
        public string? AssignedTo { get; set; }
        public string? Hostname { get; set; }
        public string? SerialNumber { get; set; }
        public string? OperatingSystem { get; set; }
        public string? Processor { get; set; }
        public string? RamMemory { get; set; }
        public string? RealVncId { get; set; }
        public string? RustDeskId { get; set; }
    }

    // Classe auxiliar para desserializar lista de usuários do backend
    internal class UserSummary
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? Email { get; set; }
    }
}

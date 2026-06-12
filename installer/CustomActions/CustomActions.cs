using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Text;
using Microsoft.Deployment.WindowsInstaller;

namespace LuxAgentInstaller
{
    public class CustomActions
    {
        #region Private Helpers
        private static void Log(Session session, string message)
        {
            session.Log($"[Ação Personalizada LuxAgent] {message}");
        }

        private static void AddArg(StringBuilder sb, string name, string value)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                sb.Append($" --{name} \"{value}\"");
            }
        }

        private static int RunProcess(Session session, ProcessStartInfo psi)
        {
            Log(session, $"Executando: {psi.FileName} {psi.Arguments}");
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;

            using (var proc = new Process { StartInfo = psi })
            {
                proc.Start();
                string stdout = proc.StandardOutput.ReadToEnd();
                string stderr = proc.StandardError.ReadToEnd();
                proc.WaitForExit();

                if (!string.IsNullOrWhiteSpace(stdout)) Log(session, $"Saída: {stdout}");
                if (!string.IsNullOrWhiteSpace(stderr)) Log(session, $"Erro: {stderr}");

                return proc.ExitCode;
            }
        }

        private static ActionResult RunAgentCommand(Session session, string agentSubCommand, bool addCommonArgs = true)
        {
            Log(session, $"Iniciando execução do comando do agente: '{agentSubCommand}'");
            try
            {
                string installFolder = session["INSTALLFOLDER"];
                if (string.IsNullOrEmpty(installFolder))
                {
                    Log(session, "INSTALLFOLDER não está definido. Não é possível executar o comando do agente.");
                    return ActionResult.Failure;
                }

                string agentExe = Path.Combine(installFolder, "LuxAgent.exe");
                string agentPy = Path.Combine(installFolder, "agent", "inventory_agent.py");

                string command;
                var arguments = new StringBuilder();

                if (File.Exists(agentExe))
                {
                    command = agentExe;
                    arguments.Append(agentSubCommand);
                }
                else if (File.Exists(agentPy))
                {
                    command = "python.exe";
                    arguments.Append($"\"{agentPy}\" {agentSubCommand}");
                }
                else
                {
                    Log(session, "Nenhum executável de agente (LuxAgent.exe) ou script (inventory_agent.py) encontrado.");
                    return ActionResult.Failure;
                }

                if (addCommonArgs)
                {
                    AddArg(arguments, "agent-id", session["AGENTID"]);
                    AddArg(arguments, "account-id", session["ACCOUNTID"]);
                    AddArg(arguments, "environment", session["ENVIRONMENT"]);
                    AddArg(arguments, "customer-id", session["CUSTOMERID"]);
                    AddArg(arguments, "folder-id", session["FOLDERID"]);
                }

                int exitCode = RunProcess(session, new ProcessStartInfo(command, arguments.ToString()));
                if (exitCode != 0)
                {
                    Log(session, $"O comando do agente '{agentSubCommand}' falhou com o código de saída: {exitCode}");
                    return ActionResult.Failure;
                }

                Log(session, $"Comando do agente '{agentSubCommand}' executado com sucesso.");
                return ActionResult.Success;
            }
            catch (Exception ex)
            {
                Log(session, $"Ocorreu um erro ao executar o comando do agente '{agentSubCommand}': {ex}");
                return ActionResult.Failure;
            }
        }
        #endregion

        #region Install Actions
        [CustomAction]
        public static ActionResult EnsureDotNetFramework(Session session)
        {
            Log(session, "Verificando e garantindo a instalação do .NET Framework 4.7.2.");
            try
            {
                string dotnet472Url = session["DOTNET472_URL"];
                if (string.IsNullOrEmpty(dotnet472Url))
                {
                    Log(session, "A URL do .NET 4.7.2 (DOTNET472_URL) não está definida. Ação ignorada.");
                    return ActionResult.Success;
                }

                string installerPath = Path.Combine(Path.GetTempPath(), $"dotnet472-installer-{Guid.NewGuid()}.exe");
                using (var web = new WebClient())
                {
                    Log(session, $"Baixando .NET Framework de {dotnet472Url} para {installerPath}");
                    web.DownloadFile(dotnet472Url, installerPath);
                }

                var psi = new ProcessStartInfo(installerPath, "/quiet /norestart");
                int exitCode = RunProcess(session, psi);

                File.Delete(installerPath);

                if (exitCode != 0 && exitCode != 3010) // 3010 = Reboot required
                {
                    Log(session, $"A instalação do .NET Framework falhou com o código de saída: {exitCode}.");
                    return ActionResult.Failure;
                }

                Log(session, ".NET Framework verificado com sucesso.");
                return ActionResult.Success;
            }
            catch (Exception ex)
            {
                Log(session, $"Ocorreu um erro ao garantir o .NET Framework: {ex}");
                return ActionResult.Failure;
            }
        }

        [CustomAction]
        public static ActionResult EnsureDotNetRuntime(Session session)
        {
            Log(session, "Verificando e garantindo a instalação do .NET Runtime.");
            try
            {
                string installFolder = session["INSTALLFOLDER"];
                string dotnetInstallUrl = session["DOTNET_INSTALL_PS1_URL"];
                string runtimeVersion = session["DOTNET_RUNTIME_VERSION"];

                if (string.IsNullOrEmpty(installFolder) || string.IsNullOrEmpty(dotnetInstallUrl) || string.IsNullOrEmpty(runtimeVersion))
                {
                    Log(session, "Uma ou mais propriedades (INSTALLFOLDER, DOTNET_INSTALL_PS1_URL, DOTNET_RUNTIME_VERSION) não estão definidas. Ação ignorada.");
                    return ActionResult.Success;
                }

                string dotnetFolder = Path.Combine(installFolder, ".dotnet");
                Directory.CreateDirectory(dotnetFolder);

                string scriptPath = Path.Combine(Path.GetTempPath(), $"dotnet-install-{Guid.NewGuid()}.ps1");
                using (var web = new WebClient())
                {
                    Log(session, $"Baixando script de instalação do .NET de {dotnetInstallUrl} para {scriptPath}");
                    web.DownloadFile(dotnetInstallUrl, scriptPath);
                }

                var psi = new ProcessStartInfo("powershell.exe", $"-NoProfile -ExecutionPolicy Bypass -File \"{scriptPath}\" -Runtime dotnet -Version {runtimeVersion} -InstallDir \"{dotnetFolder}\"");
                int exitCode = RunProcess(session, psi);

                File.Delete(scriptPath);

                if (exitCode != 0)
                {
                    Log(session, $"O script de instalação do .NET Runtime falhou com o código de saída: {exitCode}.");
                    return ActionResult.Failure;
                }

                Log(session, ".NET Runtime verificado com sucesso.");
                return ActionResult.Success;
            }
            catch (Exception ex)
            {
                Log(session, $"Ocorreu um erro ao garantir o .NET Runtime: {ex}");
                return ActionResult.Failure;
            }
        }
        
        [CustomAction]
        public static ActionResult InitializeAgentAndScan(Session session)
        {
            Log(session, "Inicializando configurações do agente e executando inventário.");
            var initResult = RunAgentCommand(session, "init-settings");
            if (initResult != ActionResult.Success)
            {
                return ActionResult.Failure;
            }
            
            var scanResult = RunAgentCommand(session, "inventory");
            if (scanResult != ActionResult.Success)
            {
                 return ActionResult.Failure;
            }

            return ActionResult.Success;
        }
        
        [CustomAction]
        public static ActionResult RegisterAgent(Session session)
        {
            return RunAgentCommand(session, "register");
        }

        [CustomAction]
        public static ActionResult CreateWatchdogTask(Session session)
        {
            Log(session, "Criando a tarefa agendada do watchdog.");
            try
            {
                string taskName = "LuxAgentServiceWatchdog";
                string serviceName = "LuxAgentWindowsService";
                string command = $"if ((Get-Service -Name {serviceName}).Status -ne 'Running') {{ Start-Service -Name {serviceName} }}";
                string psCommand = $"powershell.exe -NoProfile -WindowStyle Hidden -Command \"{command}\"";
                string arguments = $"/Create /SC MINUTE /MO 5 /TN \"{taskName}\" /TR \"{psCommand}\" /F /RL HIGHEST";

                int exitCode = RunProcess(session, new ProcessStartInfo("schtasks.exe", arguments));
                if (exitCode != 0)
                {
                    Log(session, $"Falha ao criar a tarefa do watchdog com código de saída: {exitCode}.");
                    return ActionResult.Failure;
                }
                
                Log(session, "Tarefa do watchdog criada com sucesso.");
                return ActionResult.Success;
            }
            catch (Exception ex)
            {
                Log(session, $"Ocorreu um erro ao criar a tarefa do watchdog: {ex}");
                return ActionResult.Failure;
            }
        }
        
        [CustomAction]
        public static ActionResult CreatePerfCounters(Session session)
        {
            Log(session, "Criando os contadores de desempenho.");
            try
            {
                string installFolder = session["INSTALLFOLDER"];
                string countersIni = Path.Combine(installFolder, "LuxAgentPerformanceCounters.ini");

                if (!File.Exists(countersIni))
                {
                    Log(session, "Arquivo de contadores de desempenho não encontrado. Ação ignorada.");
                    return ActionResult.Success;
                }

                int exitCode = RunProcess(session, new ProcessStartInfo("lodctr.exe", $"\"{countersIni}\""));
                if (exitCode != 0)
                {
                    Log(session, $"Falha ao criar os contadores de desempenho com código de saída: {exitCode}.");
                    return ActionResult.Failure;
                }
                
                Log(session, "Contadores de desempenho criados com sucesso.");
                return ActionResult.Success;
            }
            catch (Exception ex)
            {
                Log(session, $"Ocorreu um erro ao criar os contadores de desempenho: {ex}");
                return ActionResult.Failure;
            }
        }
        #endregion

        #region Uninstall Actions
        [CustomAction]
        public static ActionResult UninstallWatchdogTask(Session session)
        {
            Log(session, "Removendo a tarefa agendada do watchdog.");
            try
            {
                string taskName = "LuxAgentServiceWatchdog";
                string arguments = $"/Delete /TN \"{taskName}\" /F";

                // Não falha a desinstalação se a remoção da tarefa falhar.
                RunProcess(session, new ProcessStartInfo("schtasks.exe", arguments));

                Log(session, "Tentativa de remoção da tarefa do watchdog concluída.");
                return ActionResult.Success;
            }
            catch (Exception ex)
            {
                Log(session, $"Ocorreu um erro ao remover a tarefa do watchdog (não crítico): {ex}");
                return ActionResult.Success; 
            }
        }
        
        [CustomAction]
        public static ActionResult UninstallPerfCounters(Session session)
        {
            Log(session, "Removendo os contadores de desempenho.");
            try
            {
                // O nome do contador deve corresponder ao que está na seção [info] do arquivo .ini.
                // Esta é uma suposição que pode precisar de ajuste.
                string counterName = "LuxAgent"; 
                
                // Não falha a desinstalação se a remoção do contador falhar.
                RunProcess(session, new ProcessStartInfo("unlodctr.exe", $"\"{counterName}\""));

                Log(session, "Tentativa de remoção dos contadores de desempenho concluída.");
                return ActionResult.Success;
            }
            catch (Exception ex)
            {
                Log(session, $"Ocorreu um erro ao remover os contadores de desempenho (não crítico): {ex}");
                return ActionResult.Success;
      
            }
        }
        #endregion
    }
}

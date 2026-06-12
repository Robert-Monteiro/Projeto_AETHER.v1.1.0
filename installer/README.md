# LuxAgent MSI installer (WiX)

Este diretório contém uma base para gerar um **MSI de instalação do AetherAgent** usando o **WiX Toolset**.

## O que está aqui

- `Product.wxs` - definição do instalador (produto, arquivos, serviço, condições)
- `CustomActions/` - código C# (WiX DTF) para executar ações personalizadas (download .NET, init-settings, watchdog, etc.)
- `build.ps1` - script para compilar o MSI (WiX + custom actions)

## Requisitos

1. Windows 10/11 64-bit (o instalador exige 64-bit)
2. **WiX Toolset** instalado (ex: v3.11 ou v4)
3. **.NET SDK 8+** (para compilar o Custom Action)
4. **PowerShell** com ExecutionPolicy que permita scripts (para dotnet-install.ps1)

## Arquivos incluídos

- `LuxAgent.exe` - binário do agente (placeholder; substitua pelo real)
- `LuxAgentPerformanceCounters.ini` - arquivo de performance counters (CPU, memória, disco, rede)
- Custom Actions que:
  - Baixam e instalam .NET Framework 4.7.2 se necessário
  - Baixam e instalam .NET Runtime 8.0
  - Executam `LuxAgent.exe init-settings` com os parâmetros fornecidos
  - Criam a tarefa agendada watchdog que monitora e reinicia o serviço a cada 5 minutos
  - Registram os performance counters via lodctr

1. Abra um terminal PowerShell com **privilégios de administrador**.
2. Navegue até este diretório:

```powershell
cd .\installer
```

3. Execute o build:

```powershell
./build.ps1
```

O MSI gerado ficará em `installer\output\LuxAgent.msi`.

## App de abertura de chamados

O instalador agora inclui um aplicativo de abertura de chamados para Windows. Ele será publicado automaticamente durante o build e instalado junto com o agente.

- O atalho será criado em Iniciar > Aether Ticket
- Ao abrir o aplicativo, insira a URL do backend (`http://localhost:5000` por padrão)
- Preencha o título e a descrição e clique em Salvar para abrir o chamado no sistema

## Como instalar (exemplo)

```powershell
msiexec /i .\output\LuxAgent.msi /qn \
  AGENTID=12345 ACCOUNTID=5566 ENVIRONMENT=production CUSTOMERID=9988 FOLDERID=0001
```

Os parâmetros acima são repassados para o agente e utilizados no comando `init-settings`.

---

## Observações

- Este projeto é uma base de trabalho; para produzir um pacote funcional você deve fornecer o executável real do agente em `agent\LuxAgent.exe`.
- Se o `LuxAgent.exe` for um placeholder (tamanho < 10 bytes), o init-settings fallback para `python.exe inventory_agent.py init-settings`.
- A ação de instalação do .NET 4.7.2 baixa automaticamente o instalador e executa silenciosamente.
- O watchdog cria uma tarefa agendada que verifica o status do serviço a cada 5 minutos e reinicia se parado.
- Os performance counters são registrados automaticamente via lodctr usando o arquivo .ini fornecido.

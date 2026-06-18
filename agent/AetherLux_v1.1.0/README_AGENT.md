AetherLux Agent

Este é o Worker Service que atua como agente Windows (modo Windows Service quando empacotado).

Para testes locais execute:

dotnet run --project src/AetherLux.Agent

O agente conecta-se via SignalR ao endpoint `/agenthub` e envia heartbeat.

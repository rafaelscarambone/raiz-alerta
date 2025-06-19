# RaizAlerta - Interface Web

Sistema de monitoramento de umidade do solo com interface web responsiva para interação com dispositivos ESP32.

## 📋 Descrição

O RaizAlerta é um sistema de monitoramento de umidade do solo que utiliza sensores conectados a um ESP32. Esta interface web permite visualizar os dados em tempo real, configurar parâmetros e receber alertas sobre condições críticas.

## 🚀 Estrutura do Projeto
raizalerta-web/ ├── index.html # Dashboard principal ├── styles.css # Estilos do dashboard ├── main.js # Lógica do dashboard ├── localizacao.html # Página de localização ├── localizacao.css # Estilos da localização ├── localizacao.js # Lógica da localização ├── guia.html # Guia e procedimentos ├── guia.css # Estilos do guia ├── guia.js # Lógica do guia ├── configuracoes.html # Configurações do sistema ├── configuracoes.css # Estilos das configurações ├── configuracoes.js # Lógica das configurações └── README.md # Este arquivo


## 🛠️ Como Executar Localmente

1. **Clone ou baixe** todos os arquivos do projeto para uma pasta local.

2. **Abra o arquivo** `index.html` em um navegador web moderno (Chrome, Firefox, Edge).

3. **Configure o IP do ESP32**:
   - Navegue até a página de Configurações
   - Insira o endereço IP do seu ESP32 (ex: 192.168.1.100)
   - Clique em "Conectar"

4. **Certifique-se** de que o ESP32 está:
   - Conectado à mesma rede Wi-Fi
   - Executando o firmware do RaizAlerta
   - Com o servidor web ativo

## 📡 Comunicação com o ESP32

A interface se comunica com o ESP32 através de requisições HTTP REST:

### Endpoints Utilizados:

- `GET /status` - Obtém leituras atuais dos sensores
- `GET /config` - Obtém configurações atuais
- `POST /config` - Atualiza limites de umidade
- `POST /calibrate` - Calibra os sensores

### Formato de Resposta do `/status`:
```json
{
  "sensor1": 45.5,
  "sensor2": 48.2,
  "media": 46.85,
  "faixa": "Normal"
}

🎯 Funcionalidades
Dashboard
Visualização em tempo real da umidade
Indicadores visuais para cada sensor
Barra de progresso da umidade média
Sistema de alertas com efeitos visuais
Atualização automática a cada 5 segundos
Localização
Visualização da área monitorada
Histórico das últimas leituras
Espaço para integração futura com mapas
Guia
Explicação das faixas de umidade
Procedimentos de segurança
Instruções de uso do sistema
Configurações
Configuração do IP do ESP32
Ajuste dos limites de umidade
Calibração dos sensores
🎨 Faixas de Umidade
O sistema classifica a umidade em 4 faixas:

Muito Seco (🔴): < 30% - Solo extremamente seco
Normal (🟢): 30-50% - Condições ideais
Alerta (🟡): 50-70% - Atenção necessária
Crítico (🔴): > 70% - Risco de deslizamento
📱 Responsividade
A interface é totalmente responsiva e se adapta a:

Desktop (> 1024px)
Tablet (768px - 1024px)
Mobile (< 768px)
⚙️ Requisitos Técnicos
Navegador
Chrome 80+
Firefox 75+
Safari 13+
Edge 80+
ESP32
Firmware RaizAlerta instalado
Conectado à rede Wi-Fi
IP acessível na rede local
🚀 Deploy em Produção
Para um deploy real, considere:

Servidor Web:

Hospedar arquivos em servidor web (Apache, Nginx)
Configurar HTTPS para segurança
Implementar autenticação se necessário
ESP32:

Configurar IP estático ou mDNS
Implementar segurança na API REST
Considerar uso de WebSockets para real-time
Melhorias Sugeridas:

Banco de dados para histórico completo
Sistema de notificações push
Integração com serviços de mapa (Leaflet.js)
Dashboard com gráficos históricos (Chart.js)
Suporte a múltiplos dispositivos ESP32
🐛 Solução de Problemas
Não consegue conectar ao ESP32
Verifique se está na mesma rede Wi-Fi
Confirme o IP correto do ESP32
Teste acessar http://[IP_ESP32]/status no navegador
Dados não atualizam
Verifique o console do navegador (F12)
Confirme que o ESP32 está respondendo
Recarregue a página (F5)
Erro ao salvar configurações
Verifique se o ESP32 suporta os endpoints
Confirme formato dos dados enviados
Verifique logs do ESP32 via Serial
📄 Licença
Este projeto é parte do sistema RaizAlerta para monitoramento de umidade do solo.
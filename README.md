#  Raiz Alerta: Monitoramento e Alerta Precoce de Risco Geológico

O Raiz Alerta é um projeto dedicado a salvar vidas em comunidades de encosta, oferecendo um sistema de monitoramento e alerta precoce de risco geológico, com foco especial em deslizamentos. Desenvolvido no contexto do projeto HackaNav, buscamos proporcionar uma ferramenta acessível e eficaz onde a informação é mais necessária.

## �� O Desafio que Enfrentamos

Comunidades situadas em encostas enfrentam riscos crescentes de deslizamentos, especialmente durante períodos chuvosos. Uma dificuldade significativa é a falta de acesso dos moradores a dados objetivos sobre as condições do solo, levando-os a tomar decisões críticas, como evacuar, baseados apenas na percepção visual. A região que motivou o Raiz Alerta já presenciou pequenos eventos, e o risco de ocorrências maiores aumenta com a intensidade das chuvas.

## ✨ Nossa Solução Inovadora

O Raiz Alerta se diferencia pela sua abordagem prática e de baixo custo. Unimos **hardware acessível** (ESP32 e sensores de umidade de solo) a um **dashboard web completamente responsivo** que roda localmente, eliminando a necessidade de um servidor intermediário e garantindo funcionalidade mesmo em condições de internet instável. Nosso objetivo é transformar dados brutos em informação acionável para os moradores e dados históricos valiosos para a Defesa Civil.

### Principais Características:

*   **Monitoramento em Tempo Real:** Sensores de umidade coletam dados a cada 10 segundos, calculando uma média para avaliação das condições do solo.
*   **Alertas Visuais e Sonoros:** Um buzzer integrado e indicadores visuais no dashboard alertam imediatamente os moradores quando os níveis de umidade atingem patamares críticos.
*   **Dashboard Web Intuitivo:** Uma interface amigável e responsiva (acessível via Wi-Fi local) permite visualizar indicadores, histórico básico e informações essenciais.
*   **Configuração Flexível:** Limites de alerta e outros parâmetros podem ser ajustados diretamente pelo dashboard, com persistência dos dados na memória flash do ESP32.
*   **Autossustentabilidade:** Projetado para operar de forma independente, minimizando a dependência de infraestruturas de rede complexas.
*   **Hardware de Baixo Custo:** Utiliza componentes comuns e acessíveis, tornando a solução replicável em diversas comunidades.

## ��️ Componentes Chave

*   **Hardware:**
    *   1 x ESP32 DevKit V1
    *   2 x Sensores de Umidade de Solo (analógicos, compatíveis com 3V/5V)
    *   Protoboard e Jumpers
    *   Buzzer Passivo
*   **Firmware (ESP32):**
    *   Leitura e processamento de dados dos sensores.
    *   Implementação de endpoints REST/JSON (`/status`, `/config`, `/calibrate`).
    *   Persistência de configurações utilizando o sistema Preferences da ESP-IDF.
    *   Sistema de códigos de erro claros para diagnóstico.
*   **Dashboard Web (Frontend):**
    *   **Dashboard:** Indicadores em tempo real, barra de progresso, botões de ação rápida.
    *   **Localização:** Mapa com posição dos sensores e histórico básico de medições.
    *   **Guia:** Instruções sobre como interpretar os dados e procedimentos de segurança em caso de alerta.
    *   **Configurações:** Interface para ajuste dos limites de alerta, configuração de Wi-Fi e calibração manual dos sensores.
*   **Ferramentas de Desenvolvimento:** Arduino IDE, VS Code.
*   **Testes:** Testes unitários para firmware (utilizando ArduinoFake) e testes de frontend (Jest + Testing Library).

## 🚀 Entrega e Próximos Passos

O projeto Raiz Alerta foi concebido para ser implementado rapidamente e de forma eficiente. A entrega inclui:

*   Código fonte completamente comentado.
*   Um README detalhado (este que você está lendo!).
*   Checklist de deploy para facilitar a instalação em novas localidades.

Acesse nosso site em https://rafaelscarambone.github.io/raiz-alerta/

Estamos animados com o potencial do Raiz Alerta em fornecer segurança e tranquilidade para comunidades vulneráveis. Convidamos você a explorar o código, testar a solução e contribuir para este projeto que pode realmente fazer a diferença.
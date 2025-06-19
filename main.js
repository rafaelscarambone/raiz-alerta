// Configuração do ESP32
// IMPORTANTE: Substitua este IP pelo IP real do seu ESP32 na rede
const ESP32_IP = 'http://192.168.1.100'; // <-- AJUSTE ESTE IP!

// Variáveis globais
let autoUpdateInterval = null;
let isAutoUpdating = false;
let criticalAlertActive = false;

// Elementos DOM
const elements = {
    sensor1Value: document.getElementById('sensor1Value'),
    sensor2Value: document.getElementById('sensor2Value'),
    averageValue: document.getElementById('averageValue'),
    rangeDisplay: document.getElementById('rangeDisplay'),
    rangeDescription: document.getElementById('rangeDescription'),
    progressFill: document.getElementById('progressFill'),
    progressMarker: document.getElementById('progressMarker'),
    connectionStatus: document.getElementById('connectionStatus'),
    lastUpdateTime: document.getElementById('lastUpdateTime'),
    updateButton: document.getElementById('updateButton'),
    autoUpdateToggle: document.getElementById('autoUpdateToggle'),
    autoUpdateText: document.getElementById('autoUpdateText'),
    criticalAlertOverlay: document.getElementById('criticalAlertOverlay'),
    esp32IP: document.getElementById('esp32IP')
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Exibir IP configurado
    elements.esp32IP.textContent = ESP32_IP;
    
    // Configurar event listeners
    elements.updateButton.addEventListener('click', fetchSensorData);
    elements.autoUpdateToggle.addEventListener('click', toggleAutoUpdate);
    
    // Buscar dados iniciais
    fetchSensorData();
});

/**
 * Busca dados do ESP32 via HTTP GET
 */
async function fetchSensorData() {
    try {
        // Atualizar status de conexão
        updateConnectionStatus('connecting');
        
        // Fazer requisição para o endpoint /status do ESP32
        const response = await fetch(`${ESP32_IP}/status`, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Processar resposta JSON
        const data = await response.json();
        
        // Atualizar interface com os dados recebidos
        updateDashboard(data);
        
        // Atualizar status de conexão
        updateConnectionStatus('connected');
        
        // Atualizar timestamp
        updateLastUpdateTime();
        
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        updateConnectionStatus('disconnected');
        showError('Erro ao conectar com o ESP32. Verifique a conexão.');
    }
}

/**
 * Atualiza o dashboard com os dados recebidos
 * @param {Object} data - Dados do sensor no formato: {sensor1, sensor2, average, range}
 */
function updateDashboard(data) {
    // Atualizar valores dos sensores
    elements.sensor1Value.textContent = formatValue(data.sensor1);
    elements.sensor2Value.textContent = formatValue(data.sensor2);
    elements.averageValue.textContent = formatValue(data.average);
    
    // Atualizar indicador de faixa
    updateRangeIndicator(data.range, data.average);
    
    // Atualizar barra de progresso
    updateProgressBar(data.average);
    
    // Verificar alerta crítico
    handleCriticalAlert(data.range);
}

/**
 * Formata valor numérico para exibição
 * @param {number} value - Valor a ser formatado
 * @returns {string} Valor formatado
 */
function formatValue(value) {
    if (value === null || value === undefined) return '--';
    return Math.round(value) + '%';
}

/**
 * Atualiza o indicador de faixa de umidade
 * @param {string} range - Faixa atual (muito-seco, normal, alerta, critico)
 * @param {number} average - Valor médio atual
 */
function updateRangeIndicator(range, average) {
    const rangeConfig = {
        'muito-seco': {
            icon: '🏜️',
            text: 'Muito Seco',
            description: 'Solo extremamente seco. Irrigação urgente necessária.',
            class: 'muito-seco'
        },
        'normal': {
            icon: '✅',
            text: 'Normal',
            description: 'Umidade do solo em níveis adequados.',
            class: 'normal'
        },
        'alerta': {
            icon: '⚠️',
            text: 'Alerta',
            description: 'Umidade elevada. Monitorar com atenção.',
            class: 'alerta'
        },
        'critico': {
            icon: '🚨',
            text: 'CRÍTICO',
            description: 'PERIGO! Umidade crítica. Siga os procedimentos de segurança!',
            class: 'critico'
        }
    };
    
    const config = rangeConfig[range] || rangeConfig['normal'];
    
    // Atualizar display
    elements.rangeDisplay.className = 'range-display ' + config.class;
    elements.rangeDisplay.innerHTML = `
        <span class="range-icon">${config.icon}</span>
        <span class="range-text">${config.text}</span>
    `;
    
    elements.rangeDescription.textContent = config.description;
}

/**
 * Atualiza a barra de progresso visual
 * @param {number} value - Valor de umidade (0-100)
 */
function updateProgressBar(value) {
    const percentage = Math.max(0, Math.min(100, value));
    
    // Atualizar preenchimento
    elements.progressFill.style.width = percentage + '%';
    
    // Atualizar marcador
    elements.progressMarker.style.left = percentage + '%';
}

/**
 * Gerencia o alerta crítico
 * @param {string} range - Faixa atual
 */
function handleCriticalAlert(range) {
    if (range === 'critico' && !criticalAlertActive) {
        // Ativar alerta crítico
        criticalAlertActive = true;
        elements.criticalAlertOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Remover overlay após 5 segundos
        setTimeout(() => {
            elements.criticalAlertOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }, 5000);
        
    } else if (range !== 'critico') {
        criticalAlertActive = false;
    }
}

/**
 * Atualiza o status de conexão
 * @param {string} status - Status da conexão (connecting, connected, disconnected)
 */
function updateConnectionStatus(status) {
    const statusIndicator = elements.connectionStatus.querySelector('.status-indicator');
    const statusText = elements.connectionStatus.querySelector('.status-text');
    
    switch (status) {
        case 'connecting':
            statusIndicator.className = 'status-indicator';
            statusText.textContent = 'Conectando...';
            break;
        case 'connected':
            statusIndicator.className = 'status-indicator connected';
            statusText.textContent = 'Conectado ao ESP32';
            break;
        case 'disconnected':
            statusIndicator.className = 'status-indicator disconnected';
            statusText.textContent = 'Desconectado';
            break;
    }
}

/**
 * Atualiza o timestamp da última atualização
 */
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR');
    elements.lastUpdateTime.textContent = timeString;
}

/**
 * Alterna a atualização automática
 */
function toggleAutoUpdate() {
    if (isAutoUpdating) {
        // Parar atualização automática
        clearInterval(autoUpdateInterval);
        isAutoUpdating = false;
        elements.autoUpdateToggle.classList.remove('active');
        elements.autoUpdateText.textContent = 'Ativar Auto-Atualização';
    } else {
        // Iniciar atualização automática (a cada 5 segundos)
        autoUpdateInterval = setInterval(fetchSensorData, 5000);
        isAutoUpdating = true;
        elements.autoUpdateToggle.classList.add('active');
        elements.autoUpdateText.textContent = 'Parar Auto-Atualização';
        
        // Buscar dados imediatamente
        fetchSensorData();
    }
}

/**
 * Exibe mensagem de erro
 * @param {string} message - Mensagem de erro
 */
function showError(message) {
    // Por simplicidade, usando alert. Em produção, usar um toast/notificação
    console.error(message);
    // Opcionalmente, mostrar erro na interface
}

// BLE - Web Bluetooth API
const bleConnectButton = document.getElementById('bleConnectButton');
let bleDevice = null;
let bleCharacteristic = null;

if (bleConnectButton) {
    bleConnectButton.addEventListener('click', connectBLE);
}

async function connectBLE() {
    bleConnectButton.textContent = 'Procurando...';
    bleConnectButton.classList.remove('connected', 'error');
    bleConnectButton.classList.add('connecting');
    try {
        // Solicita dispositivo BLE com nome "ESP32Sensores"
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'ESP32Sensores' }],
            optionalServices: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b']
        });
        bleConnectButton.textContent = 'Conectando...';

        const server = await bleDevice.gatt.connect();
        const service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b');
        bleCharacteristic = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8');

        // Notificações de dados
        await bleCharacteristic.startNotifications();
        bleCharacteristic.addEventListener('characteristicvaluechanged', handleBLEData);

        bleConnectButton.textContent = 'Conectado!';
        bleConnectButton.classList.remove('connecting');
        bleConnectButton.classList.add('connected');
    } catch (err) {
        bleConnectButton.textContent = 'Erro ao conectar';
        bleConnectButton.classList.remove('connecting');
        bleConnectButton.classList.add('error');
        setTimeout(() => {
            bleConnectButton.textContent = 'Conectar Bluetooth';
            bleConnectButton.classList.remove('error');
        }, 3000);
        console.error('BLE erro:', err);
    }
}

// Manipula dados recebidos via BLE
function handleBLEData(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const dataStr = decoder.decode(value);
    // Esperado: "45.5,48.2,46.8,0"
    const parts = dataStr.split(',');
    if (parts.length >= 4) {
        const sensor1 = parseFloat(parts[0]);
        const sensor2 = parseFloat(parts[1]);
        const average = parseFloat(parts[2]);
        const alerta = parts[3] === '1';
        // Determina faixa
        let range = 'normal';
        if (average < 30) range = 'muito-seco';
        else if (average < 50) range = 'normal';
        else if (average < 70) range = 'alerta';
        else range = 'critico';

        updateDashboard({ sensor1, sensor2, average, range });
        updateConnectionStatus('connected');
        updateLastUpdateTime();
    }
}

// Exemplo de estrutura de dados esperada do ESP32:
/*
{
    "sensor1": 45.5,
    "sensor2": 48.2,
    "average": 46.85,
    "range": "normal"
}
*/
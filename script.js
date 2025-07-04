


const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const DATA_CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const SECO_THRESHOLD_CHARACTERISTIC_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914c';
const UMIDO_THRESHOLD_CHARACTERISTIC_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914d';


let bleDevice = null;
let bleServer = null;
let bleService = null;
let bleDataCharacteristic = null;
let secoThresholdCharacteristic = null;
let umidoThresholdCharacteristic = null;


let autoUpdateInterval = null;
let isAutoUpdating = false;
let criticalAlertActive = false;


let readingsHistory = [];



let userMapInstance = null;



document.addEventListener('DOMContentLoaded', function() {
    console.log('RaizAlerta - Sistema Iniciado');
    
    // Inicializa todos os módulos
    initializeDashboard();
    initializeLocation();
    initializeConfig();
    initializeNavigation();
    
    // Carrega dados salvos
    loadSavedData();
    
    // Mostra estado desconectado ao iniciar
    simulateData();
    // Inicializa botão de localização do usuário
    const setUserLocationBtn = document.getElementById('setUserLocationBtn');
    if (setUserLocationBtn) {
        setUserLocationBtn.addEventListener('click', handleSetUserLocation);
    }
    // Inicializa botão de definir lat/lng manualmente
    const setLatLngBtn = document.getElementById('setLatLngBtn');
    if (setLatLngBtn) {
        setLatLngBtn.addEventListener('click', function() {
            const lat = parseFloat(document.getElementById('inputLat').value);
            const lng = parseFloat(document.getElementById('inputLng').value);
            if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                alert('Preencha latitude (-90 a 90) e longitude (-180 a 180) válidas.');
                return;
            }
            // Salva localização no localStorage
            localStorage.setItem('raizalerta_location', JSON.stringify({ lat, lng }));
            // Atualiza campos de input
            if (document.getElementById('inputLat')) document.getElementById('inputLat').value = lat;
            if (document.getElementById('inputLng')) document.getElementById('inputLng').value = lng;
            loadLeafletIfNeeded(() => showSensorPinMap(lat, lng));
            showFloatingNotification('Localização definida com sucesso!');
        });
    }
    // Carregar localização salva, se houver
    const savedLocation = localStorage.getItem('raizalerta_location');
    if (savedLocation) {
        try {
            const { lat, lng } = JSON.parse(savedLocation);
            if (typeof lat === 'number' && typeof lng === 'number') {
                // Atualiza campos de input
                if (document.getElementById('inputLat')) document.getElementById('inputLat').value = lat;
                if (document.getElementById('inputLng')) document.getElementById('inputLng').value = lng;
                loadLeafletIfNeeded(() => showSensorPinMap(lat, lng));
            }
        } catch (e) {}
    }
    // Restaurar clique direto no botão para conectar
    const bleConnectButton = document.getElementById('bleConnectButton');
    const bleConnectButtonConfig = document.getElementById('bleConnectButtonConfig');
    if (bleConnectButton) {
        bleConnectButton.removeEventListener('click', connectBLE);
        bleConnectButton.addEventListener('click', connectBLE);
    }
    if (bleConnectButtonConfig) {
        bleConnectButtonConfig.removeEventListener('click', connectBLE);
        bleConnectButtonConfig.addEventListener('click', connectBLE);
    }
    // Garante que a bolinha de status comece como 'disconnected'
    const statusDashboard = document.getElementById('bleStatusDashboard');
    if (statusDashboard) {
        const indicator = statusDashboard.querySelector('.status-indicator');
        if (indicator) {
            indicator.classList.remove('connected', 'connecting', 'error');
            indicator.classList.add('disconnected');
        }
    }
});

// ========================================
// NAVEGAÇÃO E UI
// ========================================

function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section[id]');
    const backToTop = document.getElementById('backToTop');
    
    // Atualiza navegação ativa no scroll
    function updateActiveNav() {
        const scrollY = window.pageYOffset;
        
        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');
            
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
    
    // Mostra/esconde botão voltar ao topo
    function toggleBackToTop() {
        if (window.pageYOffset > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    }
    
    // Event listeners
    window.addEventListener('scroll', () => {
        updateActiveNav();
        toggleBackToTop();
    });
    
    // Smooth scroll para links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ========================================
// MÓDULO DASHBOARD
// ========================================

function initializeDashboard() {
    // Elementos do Dashboard
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
        bleConnectButton: document.getElementById('bleConnectButton')
    };
    
    // Inicializar a barra de progresso com o gradiente completo
    if (elements.progressFill) {
        elements.progressFill.style.width = '100%';
        if (elements.progressMarker) {
            elements.progressMarker.style.left = '0%';
            elements.progressMarker.innerHTML = '<span style="font-size: 12px; font-weight: bold;">0%</span>';
        }
    }
    
    // Funções do Dashboard
    window.updateDashboard = function(data) {
        // Atualizar valores e remover atributo data-empty
        elements.sensor1Value.textContent = formatValue(data.sensor1);
        elements.sensor1Value.removeAttribute('data-empty');
        
        elements.sensor2Value.textContent = formatValue(data.sensor2);
        elements.sensor2Value.removeAttribute('data-empty');
        
        elements.averageValue.textContent = formatValue(data.average);
        elements.averageValue.removeAttribute('data-empty');
        
        // Determinar faixa com base no status recebido do Arduino
        let range = 'normal';
        if (data.status === 2) {
            range = 'alto-risco';
        } else if (data.status === 1) {
            range = 'alerta';
        } else {
            range = 'normal';
        }
        
        // Garantir que apenas o card de Média tenha highlight
        const sensorCards = document.querySelectorAll('.sensor-card');
        sensorCards.forEach(card => card.classList.remove('highlight', 'highlight-normal', 'highlight-alerta', 'highlight-alto-risco'));
        const mediaCard = document.querySelectorAll('.sensor-card')[2];
        if (mediaCard) {
            mediaCard.classList.add('highlight');
            mediaCard.classList.add('highlight-' + range);
        }
        // Atualizar indicadores
        updateRangeIndicator(range, data.average);
        updateProgressBar(data.average);
        // Adicionar ao histórico
        addToHistory(data);
        
        // Atualizar timestamp
        updateLastUpdateTime();
    };
    
    function formatValue(value) {
        if (value === null || value === undefined) return '-';
        return Math.round(value) + '%';
    }
    
    function updateRangeIndicator(range, average) {
        const rangeConfig = {
            'normal': {
                icon: '✅',
                text: 'Normal',
                description: 'Umidade do solo em níveis normais e seguros.',
                class: 'normal'
            },
            'alerta': {
                icon: '⚠️',
                text: 'Alerta',
                description: 'Nível de umidade em alerta. Fique atento aos riscos de desabamento.',
                class: 'alerta'
            },
            'alto-risco': {
                icon: '🚨',
                text: 'Alto Risco',
                description: 'Umidade em nível crítico! Risco elevado de desabamento.',
                class: 'alto-risco'
            }
        };
        
        const config = rangeConfig[range] || rangeConfig['normal'];
        
        elements.rangeDisplay.className = 'range-display ' + config.class;
        elements.rangeDisplay.innerHTML = `
            <span class="range-icon">${config.icon}</span>
            <span class="range-text">${config.text}</span>
        `;
        
        elements.rangeDescription.textContent = config.description;
        // Atualizar cor do card de status de umidade
        const rangeIndicator = document.getElementById('rangeIndicator');
        if (rangeIndicator) {
            rangeIndicator.className = 'range-indicator';
            rangeIndicator.classList.add(range);
        }

        // Atualizar cor do card de média
        const mediaCard = document.querySelectorAll('.sensor-card')[2];
        if (mediaCard) {
            mediaCard.classList.remove('highlight-normal', 'highlight-alerta', 'highlight-alto-risco');
            if (bleDevice && bleDevice.gatt.connected) {
                mediaCard.classList.add('highlight');
                mediaCard.classList.add('highlight-' + range);
            }
        }
    }
    
    function updateProgressBar(value) {
        const percentage = Math.max(0, Math.min(100, value));
        // Definir a largura do preenchimento para 100% para mostrar o gradiente completo
        elements.progressFill.style.width = '100%';
        // Mover apenas o marcador conforme o valor
        elements.progressMarker.style.left = percentage + '%';
        // Adicionar o valor dentro do marcador
        elements.progressMarker.innerHTML = `<span style="font-size: 12px; font-weight: bold;">${Math.round(value)}%</span>`;
    }
    
    function handleCriticalAlert(range) {
        if (range === 'critico' && !criticalAlertActive) {
            criticalAlertActive = true;
            elements.criticalAlertOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            setTimeout(() => {
                elements.criticalAlertOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }, 5000);
        } else if (range !== 'critico') {
            criticalAlertActive = false;
        }
    }
    
    function toggleAutoUpdate() {
        if (isAutoUpdating) {
            clearInterval(autoUpdateInterval);
            isAutoUpdating = false;
            elements.autoUpdateToggle.classList.remove('active');
            elements.autoUpdateText.textContent = 'Ativar Auto-Atualização';
        } else {
            autoUpdateInterval = setInterval(updateData, 5000);
            isAutoUpdating = true;
            elements.autoUpdateToggle.classList.add('active');
            elements.autoUpdateText.textContent = 'Parar Auto-Atualização';
            updateData();
        }
    }
    
    function updateLastUpdateTime() {
        const now = new Date();
        elements.lastUpdateTime.textContent = now.toLocaleTimeString('pt-BR');
    }
}

// ========================================
// MÓDULO LOCALIZAÇÃO
// ========================================

function initializeLocation() {
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const downloadHistoryBtn = document.getElementById('downloadHistoryBtn');
    const dateFilter = document.getElementById('dateFilter');
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearHistory);
    }
    
    if (downloadHistoryBtn) {
        downloadHistoryBtn.addEventListener('click', downloadHistoryCSV);
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', (e) => {
            updateHistoryTable(e.target.value);
        });
    }
    
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
            if (dateFilter) dateFilter.value = '';
            updateHistoryTable();
        });
    }
    
    // Mensagem padrão no mapa enquanto localização não definida
    const mapArea = document.getElementById('mapArea');
    if (mapArea) {
        mapArea.innerHTML = `<div style='display:flex;align-items:center;justify-content:center;height:100%;width:100%;min-height:200px;'><span style='color:#666;font-size:1.2rem;text-align:center;'>Defina a sua localização para a formação do mapa.</span></div>`;
    }
    // Carrega histórico salvo
    loadHistory();
}

function addToHistory(data) {
    const now = new Date();
    const reading = {
        date: now.toLocaleDateString('pt-BR'),
        timestamp: now.toLocaleTimeString('pt-BR'),
        sensor1: data.sensor1,
        sensor2: data.sensor2,
        average: data.average,
        status: getStatusTextFromCode(data.status)
    };
    
    readingsHistory.unshift(reading);
    
    updateHistoryTable();
    saveHistory();
}

function getStatusTextFromCode(statusCode) {
    switch(statusCode) {
        case 2: return 'Alto Risco';
        case 1: return 'Alerta';
        case 0:
        default: return 'Normal';
    }
}

function updateHistoryTable(filterDate = null) {
    const tbody = document.getElementById('historyTableBody');
    const noHistory = document.getElementById('noHistory');
    const historyCount = document.getElementById('historyCount');
    const tableContainer = document.querySelector('.history-table-container');
    
    if (!tbody) return;
    
    // Filtra os dados se houver filtro de data
    let filteredHistory = readingsHistory;
    if (filterDate) {
        // Converte YYYY-MM-DD para DD/MM/YYYY
        const [year, month, day] = filterDate.split('-');
        const filterDateStr = `${day}/${month}/${year}`;
        filteredHistory = readingsHistory.filter(reading => reading.date === filterDateStr);
    }
    
    if (filteredHistory.length === 0) {
        tbody.innerHTML = '';
        if (noHistory) {
            noHistory.style.display = 'block';
            if (filterDate) {
                noHistory.innerHTML = '<p>📭 Nenhum registro encontrado para esta data</p><small>Tente selecionar outra data</small>';
            } else {
                noHistory.innerHTML = '<p>📭 Nenhum histórico disponível ainda</p><small>As leituras aparecerão aqui conforme forem coletadas</small>';
            }
        }
        if (historyCount) historyCount.textContent = '0';
        if (tableContainer) tableContainer.classList.remove('has-scroll');
        return;
    }
    
    if (noHistory) noHistory.style.display = 'none';
    if (historyCount) historyCount.textContent = filteredHistory.length.toString();
    
    tbody.innerHTML = filteredHistory.map(reading => `
        <tr>
            <td>${reading.date || (reading.timestamp ? reading.timestamp.split(' ')[0] : '')}</td>
            <td>${reading.timestamp}</td>
            <td>${reading.sensor1.toFixed(1)}%</td>
            <td>${reading.sensor2.toFixed(1)}%</td>
            <td>${reading.average.toFixed(1)}%</td>
            <td class="${reading.status === 'Normal' ? 'status-normal' : 
                         reading.status === 'Alerta' ? 'status-alerta' : 
                         'status-alto-risco'}">${reading.status}</td>
        </tr>
    `).join('');
    
    // Adiciona classe para indicar scroll se houver mais de 20 itens
    if (tableContainer && filteredHistory.length > 20) {
        tableContainer.classList.add('has-scroll');
    } else if (tableContainer) {
        tableContainer.classList.remove('has-scroll');
    }
}

function clearHistory() {
    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
        readingsHistory = [];
        updateHistoryTable();
        saveHistory();
    }
}

function saveHistory() {
    localStorage.setItem('raizalerta_history', JSON.stringify(readingsHistory));
}

function loadHistory() {
    const saved = localStorage.getItem('raizalerta_history');
    if (saved) {
        try {
            readingsHistory = JSON.parse(saved);
            // Adiciona data aos registros antigos que não têm
            readingsHistory = readingsHistory.map(reading => {
                if (!reading.date && reading.timestamp) {
                    // Tenta extrair data do timestamp se possível
                    reading.date = new Date().toLocaleDateString('pt-BR');
                }
                return reading;
            });
            updateHistoryTable();
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    }
}

function downloadHistoryCSV() {
    if (readingsHistory.length === 0) {
        showFeedback('Não há dados para exportar', 'error');
        return;
    }
    
    // Cabeçalho do CSV
    let csvContent = 'Data,Horário,Sensor 1 (%),Sensor 2 (%),Média (%),Status\n';
    
    // Dados
    readingsHistory.forEach(reading => {
        const row = [
            reading.date || reading.timestamp.split(' ')[0],
            reading.timestamp,
            reading.sensor1.toFixed(1),
            reading.sensor2.toFixed(1),
            reading.average.toFixed(1),
            reading.status
        ].join(',');
        csvContent += row + '\n';
    });
    
    // Criar blob e download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Nome do arquivo com data e hora
    const now = new Date();
    const fileName = `historico_raizalerta_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showFeedback(`Histórico exportado: ${fileName}`, 'success');
}

// ========================================
// MÓDULO CONFIGURAÇÕES
// ========================================

function initializeConfig() {
    const elements = {
        bleConnectButtonConfig: document.getElementById('bleConnectButtonConfig'),
        bleStatus: document.getElementById('bleStatus'),
        feedbackMessage: document.getElementById('feedbackMessage'),
        limitMuitoSeco: document.getElementById('limitMuitoSeco'),
        limitMuitoUmido: document.getElementById('limitMuitoUmido'),
        saveLimitsButton: document.getElementById('saveLimitsButton'),
        limitsForm: document.getElementById('limitsForm')
    };
    
    // Event listeners
    if (elements.bleConnectButtonConfig) {
        elements.bleConnectButtonConfig.addEventListener('click', connectBLE);
    }
    
    if (elements.limitsForm) {
        elements.limitsForm.addEventListener('submit', handleLimitsForm);
    }
    
    if (elements.limitMuitoSeco) {
        elements.limitMuitoSeco.addEventListener('input', updateLimitsPreview);
    }
    
    if (elements.limitMuitoUmido) {
        elements.limitMuitoUmido.addEventListener('input', updateLimitsPreview);
    }
    
    // Carrega configurações salvas
    loadLocalSettings();
    updateLimitsPreview();
}

// Notificação flutuante visual
function showFloatingNotification(message, type = 'success') {
    let notif = document.getElementById('floatingNotification');
    if (!notif) return;
    notif.innerHTML = `<span>${message}</span><button class='close-btn' title='Fechar'>&times;</button>`;
    notif.className = 'visible';
    notif.style.display = 'flex';
    notif.style.background = '';
    notif.style.color = '';
    // Aplica cor de fundo conforme tipo
    if (type === 'info') {
        notif.style.background = '#ff9800'; // laranja
        notif.style.color = '#fff';
    } else if (type === 'success') {
        notif.style.background = '#4CAF50';
        notif.style.color = '#fff';
    } else if (type === 'error') {
        notif.style.background = '#f44336';
        notif.style.color = '#fff';
    }
    // Fechar ao clicar no botão
    notif.querySelector('.close-btn').onclick = () => {
        notif.classList.remove('visible');
        setTimeout(() => { notif.style.display = 'none'; }, 400);
    };
    // Fechar automaticamente após 4s
    setTimeout(() => {
        notif.classList.remove('visible');
        setTimeout(() => { notif.style.display = 'none'; }, 400);
    }, 4000);
}

async function handleLimitsForm(e) {
    e.preventDefault();
    if (!secoThresholdCharacteristic || !umidoThresholdCharacteristic) {
        showFeedback('Conecte-se ao ESP32 primeiro!', 'error');
        return;
    }
    const limiteSeco = parseFloat(document.getElementById('limitMuitoSeco').value);
    const limiteUmido = parseFloat(document.getElementById('limitMuitoUmido').value);
    if (limiteSeco >= limiteUmido) {
        showFeedback('O limite seco deve ser menor que o limite úmido!', 'error');
        return;
    }
    try {
        showFeedback('Enviando limites para o Arduino...', 'info');
        const encoder = new TextEncoder();
        await secoThresholdCharacteristic.writeValue(encoder.encode(limiteSeco.toString()));
        await umidoThresholdCharacteristic.writeValue(encoder.encode(limiteUmido.toString()));
        showFeedback('Limites salvos no Arduino com sucesso!', 'success');
        saveLocalSettings();
        showFloatingNotification('Configurações salvas com sucesso!');
    } catch (error) {
        console.error('Erro ao enviar limites:', error);
        showFeedback('Erro ao salvar limites: ' + error.message, 'error');
    }
}

function updateLimitsPreview() {
    const limiteAlerta = parseFloat(document.getElementById('limitMuitoSeco').value) || 60;
    const limiteAltoRisco = parseFloat(document.getElementById('limitMuitoUmido').value) || 80;
    
    document.getElementById('previewNormalRange').textContent = `0-${limiteAlerta}%`;
    document.getElementById('previewSecoRange').textContent = `${limiteAlerta}-${limiteAltoRisco}%`;
    document.getElementById('previewUmidoRange').textContent = `${limiteAltoRisco}-100%`;
    
    const previewNormal = document.getElementById('previewNormal');
    const previewAlerta = document.getElementById('previewVeryDry');
    const previewAltoRisco = document.getElementById('previewCritical');
    
    if (previewNormal && previewAlerta && previewAltoRisco) {
        previewNormal.style.width = `${limiteAlerta}%`;
        previewAlerta.style.width = `${limiteAltoRisco - limiteAlerta}%`;
        previewAltoRisco.style.width = `${100 - limiteAltoRisco}%`;
    }
}

function showFeedback(message, type) {
    const feedbackMessage = document.getElementById('feedbackMessage');
    if (feedbackMessage) {
        feedbackMessage.textContent = message;
        feedbackMessage.className = `feedback-message ${type}`;
        feedbackMessage.style.display = 'block';
        
        setTimeout(() => {
            feedbackMessage.style.display = 'none';
        }, 5000);
    }
}

function saveLocalSettings() {
    const settings = {
        limiteSeco: document.getElementById('limitMuitoSeco').value,
        limiteUmido: document.getElementById('limitMuitoUmido').value
    };
    localStorage.setItem('raizalerta_limits', JSON.stringify(settings));
    showFeedback('Configurações salvas com sucesso!', 'success');
    showFloatingNotification('Configurações salvas com sucesso!');
}

function loadLocalSettings() {
    const saved = localStorage.getItem('raizalerta_limits');
    
    // Valores padrão
    const defaultValues = {
        limiteSeco: 60,
        limiteUmido: 80
    };
    
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            
            // Usa valores salvos ou valores padrão
            const limiteSeco = settings.limiteSeco !== undefined ? settings.limiteSeco : defaultValues.limiteSeco;
            const limiteUmido = settings.limiteUmido !== undefined ? settings.limiteUmido : defaultValues.limiteUmido;
            
            if (document.getElementById('limitMuitoSeco')) {
                document.getElementById('limitMuitoSeco').value = limiteSeco;
            }
            if (document.getElementById('limitMuitoUmido')) {
                document.getElementById('limitMuitoUmido').value = limiteUmido;
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            // Em caso de erro, usa os valores padrão
            setDefaultValues();
        }
    } else {
        // Se não houver configurações salvas, define os valores padrão
        setDefaultValues();
        
        // Salva os valores padrão no localStorage
        saveLocalSettings();
    }
    
    updateLimitsPreview();
    
    function setDefaultValues() {
        if (document.getElementById('limitMuitoSeco')) {
            document.getElementById('limitMuitoSeco').value = defaultValues.limiteSeco;
        }
        if (document.getElementById('limitMuitoUmido')) {
            document.getElementById('limitMuitoUmido').value = defaultValues.limiteUmido;
        }
    }
}

// ========================================
// BLUETOOTH
// ========================================

async function connectBLE(autoReconnect = false) {
    // Se já estiver conectado, desconecta
    if (bleDevice && bleDevice.gatt.connected) {
        disconnectBLE();
        return;
    }
    try {
        updateBLEStatus('connecting');
        showFeedback('Procurando dispositivo ESP32...', 'info');
        // Solicita dispositivo
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'ESP32Sensores' }],
            optionalServices: [SERVICE_UUID]
        });
        showFeedback('Conectando ao ESP32...', 'info');
        // Conecta ao servidor GATT
        bleServer = await bleDevice.gatt.connect();
        bleService = await bleServer.getPrimaryService(SERVICE_UUID);
        // Obtém características
        bleDataCharacteristic = await bleService.getCharacteristic(DATA_CHARACTERISTIC_UUID);
        secoThresholdCharacteristic = await bleService.getCharacteristic(SECO_THRESHOLD_CHARACTERISTIC_UUID);
        umidoThresholdCharacteristic = await bleService.getCharacteristic(UMIDO_THRESHOLD_CHARACTERISTIC_UUID);
        // Configura notificações
        await bleDataCharacteristic.startNotifications();
        bleDataCharacteristic.addEventListener('characteristicvaluechanged', handleBLEData);
        // Carrega limites atuais
        await loadCurrentLimits();
        updateBLEStatus('connected');
        showFeedback('Conectado ao ESP32 com sucesso!', 'success');
        showFloatingNotification(autoReconnect ? 'Reconexão Bluetooth realizada com sucesso!' : 'Conectado ao Bluetooth com sucesso!');
        // Salva conexão no localStorage
        localStorage.setItem('raizalerta_ble_connected', 'true');
        // Listener para desconexão
        bleDevice.addEventListener('gattserverdisconnected', onBLEDisconnected);
    } catch (error) {
        console.error('Erro BLE:', error);
        updateBLEStatus('error');
        showFeedback('Erro ao conectar: ' + error.message, 'error');
        if (autoReconnect) {
            showFloatingNotification('Falha ao reconectar Bluetooth automaticamente.');
            localStorage.removeItem('raizalerta_ble_connected');
        }
    }
}

function handleBLEData(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const dataStr = decoder.decode(value);
    const parts = dataStr.split(',');
    
    if (parts.length >= 4) {
        const data = {
            sensor1: parseFloat(parts[0]),
            sensor2: parseFloat(parts[1]),
            average: parseFloat(parts[2]),
            status: parseInt(parts[3]) // 0=Normal, 1=Alerta, 2=AltoRisco
        };
        
        updateDashboard(data);
        updateConnectionStatus('connected');
    }
}

function disconnectBLE() {
    if (bleDevice && bleDevice.gatt.connected) {
        showFeedback('Desconectando...', 'info');
        bleDevice.gatt.disconnect();
    }
    // Remove registro do localStorage
    localStorage.removeItem('raizalerta_ble_connected');
    // Não exibir overlay de instrução ao desconectar
    // Nenhuma ação adicional
}

function onBLEDisconnected() {
    updateBLEStatus('disconnected');
    updateConnectionStatus('disconnected');
    showFeedback('Desconectado do ESP32', 'info');
    
    // Limpa as referências
    bleDevice = null;
    bleServer = null;
    bleService = null;
    bleDataCharacteristic = null;
    secoThresholdCharacteristic = null;
    umidoThresholdCharacteristic = null;
    
    // Desabilita botão de salvar limites
    const saveLimitsButton = document.getElementById('saveLimitsButton');
    if (saveLimitsButton) {
        saveLimitsButton.disabled = true;
    }
    
    // Mostra estado desconectado nos valores
    simulateData();
}

async function loadCurrentLimits() {
    if (!secoThresholdCharacteristic || !umidoThresholdCharacteristic) return;
    
    try {
        const secoValue = await secoThresholdCharacteristic.readValue();
        const umidoValue = await umidoThresholdCharacteristic.readValue();
        
        const decoder = new TextDecoder('utf-8');
        const secoThreshold = parseFloat(decoder.decode(secoValue));
        const umidoThreshold = parseFloat(decoder.decode(umidoValue));
        
        document.getElementById('limitMuitoSeco').value = secoThreshold;
        document.getElementById('limitMuitoUmido').value = umidoThreshold;
        
        updateLimitsPreview();
        document.getElementById('saveLimitsButton').disabled = false;
        
        showFeedback('Limites atuais carregados do Arduino', 'success');
    } catch (error) {
        console.error('Erro ao ler limites:', error);
    }
}

function updateBLEStatus(status) {
    const statusElements = document.querySelectorAll('.connection-status');
    const connectButtons = document.querySelectorAll('#bleConnectButton, #bleConnectButtonConfig');
    // Adicionar atualização para o status ao lado do botão
    const statusDashboard = document.getElementById('bleStatusDashboard');
    if (statusDashboard) {
        const indicator = statusDashboard.querySelector('.status-indicator');
        const text = statusDashboard.querySelector('.status-text');
        if (indicator && text) {
            switch (status) {
                case 'connecting':
                    indicator.className = 'status-indicator connecting';
                    text.textContent = 'Conectando...';
                    break;
                case 'connected':
                    indicator.className = 'status-indicator connected';
                    text.textContent = 'Conectado';
                    break;
                case 'disconnected':
                    indicator.className = 'status-indicator disconnected';
                    text.textContent = 'Desconectado';
                    break;
                case 'error':
                    indicator.className = 'status-indicator error';
                    text.textContent = 'Erro na conexão';
                    break;
            }
        }
    }
    connectButtons.forEach(button => {
        // Preserva o ícone se existir
        const hasIcon = button.querySelector('.btn-icon');
        const iconHTML = hasIcon ? '<span class="btn-icon">📶</span> ' : '';
        
        switch (status) {
            case 'connecting':
                button.innerHTML = iconHTML + 'Conectando...';
                button.disabled = true;
                button.classList.add('connecting');
                break;
            case 'connected':
                button.innerHTML = iconHTML + 'Desconectar';
                button.disabled = false;
                button.classList.remove('connecting');
                button.classList.add('connected');
                break;
            case 'disconnected':
            case 'error':
                button.innerHTML = iconHTML + 'Conectar Bluetooth';
                button.disabled = false;
                button.classList.remove('connecting', 'connected');
                break;
        }
    });
}

function updateConnectionStatus(status) {
    updateBLEStatus(status);
}

// ========================================
// DADOS E SIMULAÇÃO
// ========================================

function updateData() {
    if (bleDevice && bleDevice.gatt.connected) {
        // Se conectado, os dados vêm automaticamente via notificações
        showFeedback('Aguardando dados do sensor...', 'info');
    } else {
        // Mostra mensagem quando não está conectado
        showFeedback('Conecte-se ao ESP32 via Bluetooth para receber dados', 'error');
        simulateData();
    }
}

function simulateData() {
    // Quando desconectado, mostra "-" em vez de valores aleatórios
    const elements = {
        sensor1Value: document.getElementById('sensor1Value'),
        sensor2Value: document.getElementById('sensor2Value'),
        averageValue: document.getElementById('averageValue'),
        rangeDisplay: document.getElementById('rangeDisplay'),
        rangeDescription: document.getElementById('rangeDescription'),
        progressFill: document.getElementById('progressFill'),
        progressMarker: document.getElementById('progressMarker')
    };
    // Define todos os valores como "-" e adiciona atributo para estilização
    if (elements.sensor1Value) {
        elements.sensor1Value.textContent = '-';
        elements.sensor1Value.setAttribute('data-empty', 'true');
    }
    if (elements.sensor2Value) {
        elements.sensor2Value.textContent = '-';
        elements.sensor2Value.setAttribute('data-empty', 'true');
    }
    if (elements.averageValue) {
        elements.averageValue.textContent = '-';
        elements.averageValue.setAttribute('data-empty', 'true');
    }
    // Remover destaque do card de Média
    const sensorCards = document.querySelectorAll('.sensor-card');
    sensorCards.forEach(card => card.classList.remove('highlight', 'highlight-normal', 'highlight-alerta', 'highlight-alto-risco'));
    
    // Resetar range indicator para neutro
    if (elements.rangeDisplay) {
        elements.rangeDisplay.className = 'range-display';
        elements.rangeDisplay.innerHTML = `
            <span class="range-icon">⚪</span>
            <span class="range-text">Aguardando dados...</span>
        `;
    }
    
    if (elements.rangeDescription) {
        elements.rangeDescription.textContent = 'Conecte-se ao dispositivo para ver o status atual.';
    }
    
    // Inicializar barra de progresso com gradiente completo, mas marcador em 0
    if (elements.progressFill) {
        elements.progressFill.style.width = '100%';
    }
    if (elements.progressMarker) {
        elements.progressMarker.style.left = '0%';
        elements.progressMarker.innerHTML = '<span style="font-size: 12px; font-weight: bold;">0%</span>';
    }
    
    // Resetar range indicator para classe neutra
    const rangeIndicator = document.getElementById('rangeIndicator');
    if (rangeIndicator) {
        rangeIndicator.className = 'range-indicator';
    }
}

function loadSavedData() {
    // Carrega configurações e histórico
    loadLocalSettings();
    loadHistory();
}

// ========================================
// FUNÇÕES GLOBAIS
// ========================================

// Exporta funções para uso global
window.loadCurrentLimits = loadCurrentLimits;
window.updateLimitsPreview = updateLimitsPreview;

// Função para carregar Leaflet dinamicamente se não estiver presente
function loadLeafletIfNeeded(callback) {
    if (window.L && window.L.map) {
        callback();
        return;
    }
    // Adiciona CSS
    if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.id = 'leaflet-css';
        document.head.appendChild(link);
    }
    // Adiciona JS
    if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.id = 'leaflet-js';
        script.onload = callback;
        document.body.appendChild(script);
    } else {
        document.getElementById('leaflet-js').onload = callback;
    }
}

function handleSetUserLocation() {
    const btn = document.getElementById('setUserLocationBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Obtendo localização...';
    if (!navigator.geolocation) {
        alert('Geolocalização não suportada pelo navegador.');
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">📍</span> Definir minha localização';
        return;
    }
    navigator.geolocation.getCurrentPosition(function(pos) {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Salva localização no localStorage
        localStorage.setItem('raizalerta_location', JSON.stringify({ lat, lng }));
        // Atualiza campos de input
        if (document.getElementById('inputLat')) document.getElementById('inputLat').value = lat;
        if (document.getElementById('inputLng')) document.getElementById('inputLng').value = lng;
        loadLeafletIfNeeded(() => showUserMap(lat, lng));
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">📍</span> Definir minha localização';
        showFloatingNotification('Localização definida com sucesso!');
    }, function(err) {
        alert('Não foi possível obter sua localização.');
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">📍</span> Definir minha localização';
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

function showUserMap(lat, lng) {
    const mapArea = document.getElementById('mapArea');
    if (!mapArea) return;
    mapArea.innerHTML = '<div id="userMap" style="width:100%;height:400px;border-radius:10px;"></div>';
    const map = L.map('userMap').setView([lat, lng], 18);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    // Marcador arrastável
    let marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    marker.bindPopup('Arraste o marcador para o centro exato da área de monitoramento.').openPopup();
    // Círculo fixo de 100 metros
    let circle = L.circle([lat, lng], { radius: 100, color: '#4CAF50', fillColor: '#4CAF50', fillOpacity: 0.2 }).addTo(map);
    // Atualiza círculo ao arrastar
    marker.on('drag', function(e) {
        const pos = e.target.getLatLng();
        circle.setLatLng(pos);
    });
    marker.on('dragend', function(e) {
        const pos = e.target.getLatLng();
        map.setView(pos);
        circle.setLatLng(pos);
    });
}

function showSensorPinMap(lat, lng) {
    const mapArea = document.getElementById('mapArea');
    if (!mapArea) return;
    mapArea.innerHTML = '<div id="userMap" style="width:100%;height:400px;border-radius:10px;"></div>';
    // Remove instância anterior se existir
    if (userMapInstance && userMapInstance.remove) {
        userMapInstance.remove();
        userMapInstance = null;
    }
    userMapInstance = L.map('userMap').setView([lat, lng], 18);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(userMapInstance);
    // Pino vermelho
    const redIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
    L.marker([lat, lng], {icon: redIcon, draggable: false}).addTo(userMapInstance).bindPopup('Sensores').openPopup();
}

// Substituir o evento do botão de conexão Bluetooth para abrir o overlay
function setupBluetoothInstructionOverlay() {
    const bleConnectButton = document.getElementById('bleConnectButton');
    const bleConnectButtonConfig = document.getElementById('bleConnectButtonConfig');
    const overlay = document.getElementById('bleInstructionOverlay');
    const proceedBtn = document.getElementById('proceedBleConnect');
    const closeBtn = document.getElementById('closeBleInstruction');

    function openOverlay() {
        if (overlay) overlay.classList.add('active');
    }
    function closeOverlay() {
        if (overlay) overlay.classList.remove('active');
    }
    function handleProceed() {
        closeOverlay();
        connectBLE();
    }
    if (bleConnectButton) {
        bleConnectButton.removeEventListener('click', connectBLE);
        bleConnectButton.addEventListener('click', openOverlay);
    }
    if (bleConnectButtonConfig) {
        bleConnectButtonConfig.removeEventListener('click', connectBLE);
        bleConnectButtonConfig.addEventListener('click', openOverlay);
    }
    if (proceedBtn) {
        proceedBtn.addEventListener('click', handleProceed);
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', closeOverlay);
    }
} 
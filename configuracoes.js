/**
 * JavaScript para a página Configurações
 * Gerencia todas as configurações do sistema RaizAlerta
 */

// Configuração base - IP do ESP32
let ESP32_IP = localStorage.getItem('esp32_ip') || '192.168.1.100';
const API_BASE_URL = () => `http://${ESP32_IP}`;

// Aguarda o carregamento completo do DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página Configurações carregada');
    
    // Carrega IP salvo
    loadSavedIP();
    
    // Configura event listeners
    setupEventListeners();
    
    // Atualiza visualização de limites
    updateLimitsPreview();
    
    // Carrega configurações salvas localmente
    loadLocalSettings();
});

/**
 * Configura todos os event listeners
 */
function setupEventListeners() {
    // Formulário de conexão
    document.getElementById('connectionForm').addEventListener('submit', handleConnectionForm);
    
    // Formulário de limites
    document.getElementById('limitsForm').addEventListener('submit', handleLimitsForm);
    
    // Atualiza preview quando valores mudam
    document.getElementById('limitDryNormal').addEventListener('input', updateLimitsPreview);
    document.getElementById('limitNormalAlert').addEventListener('input', updateLimitsPreview);
    document.getElementById('limitAlertCritical').addEventListener('input', updateLimitsPreview);
    
    // Formulário de calibração
    document.getElementById('calibrationForm').addEventListener('submit', handleCalibrationForm);
    
    // Intervalo de atualização
    document.getElementById('updateInterval').addEventListener('change', handleUpdateIntervalChange);
}

/**
 * Carrega IP salvo do localStorage
 */
function loadSavedIP() {
    const savedIP = localStorage.getItem('esp32_ip');
    if (savedIP) {
        document.getElementById('esp32IP').value = savedIP;
        ESP32_IP = savedIP;
    }
}

/**
 * Manipula o formulário de conexão
 */
async function handleConnectionForm(e) {
    e.preventDefault();
    
    const ipInput = document.getElementById('esp32IP');
    const newIP = ipInput.value;
    
    // Valida formato IP
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(newIP)) {
        showFeedback('Formato de IP inválido!', 'error');
        return;
    }
    
        // Salva o IP no localStorage
    localStorage.setItem('esp32_ip', newIP);
    ESP32_IP = newIP;
    
    // Testa a conexão
    try {
        const response = await fetch(`http://${ESP32_IP}/status`, {
            method: 'GET',
            mode: 'cors',
            timeout: 5000
        });
        
        if (response.ok) {
            showFeedback('Conectado com sucesso ao ESP32!', 'success');
            // Carrega as configurações atuais
            loadCurrentConfig();
        } else {
            showFeedback('Erro ao conectar com o ESP32', 'error');
        }
    } catch (error) {
        showFeedback('Não foi possível conectar ao ESP32. Verifique o IP e a conexão.', 'error');
        console.error('Erro de conexão:', error);
    }
}

/**
 * Carrega as configurações atuais do ESP32
 */
async function loadCurrentConfig() {
    try {
        const response = await fetch(`http://${ESP32_IP}/config`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const config = await response.json();
            
            // Preenche os campos de limites se existirem na resposta
            if (config.limits) {
                document.getElementById('limitSecoNormal').value = config.limits.secoNormal || 30;
                document.getElementById('limitNormalAlerta').value = config.limits.normalAlerta || 50;
                document.getElementById('limitAlertaCritico').value = config.limits.alertaCritico || 70;
            }
            
            // Preenche os campos de calibração se existirem
            if (config.calibration) {
                document.getElementById('sensor1Seco').value = config.calibration.sensor1.seco || 4095;
                document.getElementById('sensor1Umido').value = config.calibration.sensor1.umido || 0;
                document.getElementById('sensor2Seco').value = config.calibration.sensor2.seco || 4095;
                document.getElementById('sensor2Umido').value = config.calibration.sensor2.umido || 0;
            }
            
            showFeedback('Configurações carregadas com sucesso!', 'success');
        }
    } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        // Não mostra erro se falhar ao carregar, apenas usa valores padrão
    }
}

/**
 * Manipula o formulário de limites de umidade
 */
async function handleLimitsForm(e) {
    e.preventDefault();
    
    if (!ESP32_IP) {
        showFeedback('Configure o IP do ESP32 primeiro!', 'error');
        return;
    }
    
    // Obtém os valores dos campos
    const limits = {
        secoNormal: parseInt(document.getElementById('limitSecoNormal').value),
        normalAlerta: parseInt(document.getElementById('limitNormalAlerta').value),
        alertaCritico: parseInt(document.getElementById('limitAlertaCritico').value)
    };
    
    // Valida os valores
    if (limits.secoNormal >= limits.normalAlerta || 
        limits.normalAlerta >= limits.alertaCritico) {
        showFeedback('Os limites devem estar em ordem crescente!', 'error');
        return;
    }
    
    // Envia para o ESP32
    try {
        const response = await fetch(`http://${ESP32_IP}/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ limits })
        });
        
        if (response.ok) {
            showFeedback('Limites de umidade salvos com sucesso!', 'success');
        } else {
            showFeedback('Erro ao salvar limites de umidade', 'error');
        }
    } catch (error) {
        showFeedback('Erro de comunicação com o ESP32', 'error');
        console.error('Erro:', error);
    }
}

/**
 * Manipula o formulário de calibração
 */
async function handleCalibrationForm(e) {
    e.preventDefault();
    
    if (!ESP32_IP) {
        showFeedback('Configure o IP do ESP32 primeiro!', 'error');
        return;
    }
    
    // Obtém os valores dos campos
    const calibration = {
        sensor1: {
            seco: parseInt(document.getElementById('sensor1Seco').value),
            umido: parseInt(document.getElementById('sensor1Umido').value)
        },
        sensor2: {
            seco: parseInt(document.getElementById('sensor2Seco').value),
            umido: parseInt(document.getElementById('sensor2Umido').value)
        }
    };
    
    // Valida os valores
    if (calibration.sensor1.seco <= calibration.sensor1.umido ||
        calibration.sensor2.seco <= calibration.sensor2.umido) {
        showFeedback('Valor seco deve ser maior que valor úmido!', 'error');
        return;
    }
    
    // Envia para o ESP32
    try {
        const response = await fetch(`http://${ESP32_IP}/calibrate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(calibration)
        });
        
        if (response.ok) {
            showFeedback('Sensores calibrados com sucesso!', 'success');
        } else {
            showFeedback('Erro ao calibrar sensores', 'error');
        }
    } catch (error) {
        showFeedback('Erro de comunicação com o ESP32', 'error');
        console.error('Erro:', error);
    }
}

/**
 * Exibe feedback visual para o usuário
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de feedback ('success' ou 'error')
 */
function showFeedback(message, type) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = message;
    feedback.className = `feedback ${type}`;
    feedback.style.display = 'block';
    
    // Oculta o feedback após 5 segundos
    setTimeout(() => {
        feedback.style.display = 'none';
    }, 5000);
}

// Adiciona listeners aos formulários quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    // Carrega configurações salvas
    loadSavedSettings();
    
    // Adiciona listeners aos formulários
    document.getElementById('connectionForm').addEventListener('submit', handleConnectionForm);
    document.getElementById('limitsForm').addEventListener('submit', handleLimitsForm);
    document.getElementById('calibrationForm').addEventListener('submit', handleCalibrationForm);
    
    // Tenta carregar configurações do ESP32 se já houver IP salvo
    if (ESP32_IP) {
        loadCurrentConfig();
    }
});
// Histórico de leituras (armazenado localmente)
let readingsHistory = [];
const MAX_HISTORY_ITEMS = 50; // Máximo de itens no histórico

// Elementos DOM
const historyTableBody = document.getElementById('historyTableBody');
const historyCount = document.getElementById('historyCount');
const noHistory = document.getElementById('noHistory');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Carregar histórico do localStorage
    loadHistoryFromStorage();
    
    // Configurar event listeners
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // Atualizar exibição
    updateHistoryDisplay();
    
    // Escutar por novos dados do dashboard (via localStorage events)
    window.addEventListener('storage', handleStorageChange);
});

/**
 * Carrega o histórico do localStorage
 */
function loadHistoryFromStorage() {
    const stored = localStorage.getItem('raizalerta_history');
    if (stored) {
        try {
            readingsHistory = JSON.parse(stored);
        } catch (e) {
            console.error('Erro ao carregar histórico:', e);
            readingsHistory = [];
        }
    }
}

/**
 * Salva o histórico no localStorage
 */
function saveHistoryToStorage() {
    localStorage.setItem('raizalerta_history', JSON.stringify(readingsHistory));
}

/**
 * Adiciona uma nova leitura ao histórico
 * @param {Object} reading - Dados da leitura
 */
function addReadingToHistory(reading) {
    // Adicionar timestamp se não existir
    if (!reading.timestamp) {
        reading.timestamp = new Date().toISOString();
    }
    
    // Adicionar ao início do array
    readingsHistory.unshift(reading);
    
    // Limitar tamanho do histórico
    if (readingsHistory.length > MAX_HISTORY_ITEMS) {
        readingsHistory = readingsHistory.slice(0, MAX_HISTORY_ITEMS);
    }
    
    // Salvar e atualizar display
    saveHistoryToStorage();
    updateHistoryDisplay();
}

/**
 * Atualiza a exibição do histórico
 */
function updateHistoryDisplay() {
    // Atualizar contador
    historyCount.textContent = readingsHistory.length;
    
    // Verificar se há histórico
    if (readingsHistory.length === 0) {
        historyTableBody.innerHTML = '';
        noHistory.style.display = 'block';
        return;
    }
    
    noHistory.style.display = 'none';
    
    // Construir HTML da tabela
    const html = readingsHistory.map(reading => {
        const date = new Date(reading.timestamp);
        const timeString = date.toLocaleTimeString('pt-BR');
        const statusClass = getStatusClass(reading.range);
        const statusText = getStatusText(reading.range);
        
        return `
            <tr>
                <td>${timeString}</td>
                <td>${formatValue(reading.sensor1)}</td>
                <td>${formatValue(reading.sensor2)}</td>
                <td>${formatValue(reading.average)}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
            </tr>
        `;
    }).join('');
    
    historyTableBody.innerHTML = html;
}

/**
 * Formata valor para exibição
 * @param {number} value - Valor a formatar
 * @returns {string} Valor formatado
 */
function formatValue(value) {
    if (value === null || value === undefined) return '--';
    return Math.round(value) + '%';
}

/**
 * Retorna a classe CSS para o status
 * @param {string} range - Faixa de umidade
 * @returns {string} Classe CSS
 */
function getStatusClass(range) {
    const classMap = {
        'muito-seco': 'muito-seco',
        'normal': 'normal',
        'alerta': 'alerta',
        'critico': 'critico'
    };
    return classMap[range] || 'normal';
}

/**
 * Retorna o texto do status
 * @param {string} range - Faixa de umidade
 * @returns {string} Texto do status
 */
function getStatusText(range) {
    const textMap = {
        'muito-seco': 'Muito Seco',
        'normal': 'Normal',
        'alerta': 'Alerta',
        'critico': 'Crítico'
    };
    return textMap[range] || 'Normal';
}

/**
 * Limpa o histórico
 */
function clearHistory() {
    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
        readingsHistory = [];
        saveHistoryToStorage();
        updateHistoryDisplay();
    }
}

/**
 * Manipula mudanças no localStorage (comunicação entre páginas)
 * @param {StorageEvent} event - Evento de storage
 */
function handleStorageChange(event) {
    if (event.key === 'raizalerta_latest_reading') {
        // Nova leitura disponível do dashboard
        try {
            const reading = JSON.parse(event.newValue);
            if (reading) {
                addReadingToHistory(reading);
            }
        } catch (e) {
            console.error('Erro ao processar nova leitura:', e);
        }
    }
}

// Função auxiliar para simular dados (remover em produção)
function simulateData() {
    const ranges = ['muito-seco', 'normal', 'alerta', 'critico'];
    const reading = {
        sensor1: Math.random() * 100,
        sensor2: Math.random() * 100,
        average: 0,
        range: ranges[Math.floor(Math.random() * ranges.length)],
        timestamp: new Date().toISOString()
    };
    reading.average = (reading.sensor1 + reading.sensor2) / 2;
    
    addReadingToHistory(reading);
}

// Nota: Em produção, os dados viriam do dashboard via localStorage ou API direta
// O dashboard salvaria as leituras em 'raizalerta_latest_reading' para comunicação entre páginas
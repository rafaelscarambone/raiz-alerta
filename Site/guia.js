/**
 * JavaScript para a página Guia
 * Funcionalidades mínimas - página principalmente informativa
 */

// Aguarda o carregamento completo do DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página Guia carregada');
    
    // Adiciona interatividade aos cards de nível (opcional)
    addLevelCardInteractivity();
    
    // Destaca seção baseada em hash da URL
    highlightSectionFromHash();
});

/**
 * Adiciona efeitos de hover e clique aos cards de nível
 */
function addLevelCardInteractivity() {
    const levelCards = document.querySelectorAll('.level-card');
    
    levelCards.forEach(card => {
        // Adiciona efeito de clique para expandir/contrair detalhes
        card.addEventListener('click', function() {
            // Toggle classe active para efeitos adicionais se necessário
            this.classList.toggle('active');
        });
    });
}

/**
 * Destaca seção baseada no hash da URL
 * Útil quando navegando de outras páginas para seções específicas
 */
function highlightSectionFromHash() {
    const hash = window.location.hash;
    
    if (hash) {
        const targetElement = document.querySelector(hash);
        
        if (targetElement) {
            // Scroll suave até o elemento
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Adiciona destaque temporário
            targetElement.classList.add('highlighted');
            
            // Remove destaque após 3 segundos
            setTimeout(() => {
                targetElement.classList.remove('highlighted');
            }, 3000);
        }
    }
}

/**
 * Função para imprimir guia de emergência
 * Pode ser chamada por um botão se adicionado no HTML
 */
function imprimirGuiaEmergencia() {
    // Seleciona apenas a seção de procedimentos de emergência
    const emergencySection = document.querySelector('.procedure-card.emergency');
    
    if (emergencySection) {
        // Cria janela de impressão
        const printWindow = window.open('', '_blank');
        
        // Adiciona conteúdo à janela
        printWindow.document.write(`
            <html>
                <head>
                    <title>RaizAlerta - Procedimentos de Emergência</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h1 { color: #ff4757; }
                        ol { line-height: 2; }
                        li { margin: 10px 0; }
                        strong { color: #ff4757; }
                    </style>
                </head>
                <body>
                    <h1>🚨 RaizAlerta - Procedimentos de Emergência</h1>
                    ${emergencySection.innerHTML}
                    <hr>
                    <p><strong>Contatos de Emergência:</strong></p>
                    <ul>
                        <li>Defesa Civil: 199</li>
                        <li>Bombeiros: 193</li>
                        <li>SAMU: 192</li>
                        <li>Polícia: 190</li>
                    </ul>
                </body>
            </html>
        `);
        
        // Imprime e fecha
        printWindow.document.close();
        printWindow.print();
    }
}

/**
 * Adiciona smooth scroll para links internos
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
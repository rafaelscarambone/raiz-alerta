const fs = require('fs');
const path = require('path');


function removeComments(content, fileExtension) {
  if (fileExtension === '.js' || fileExtension === '.ino') {
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    content = content.replace(/\/\/.*$/gm, '');
  } else if (fileExtension === '.css') {
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  } else if (fileExtension === '.html') {
    content = content.replace(/<!--[\s\S]*?-->/g, '');
  }
  
  // Limpa múltiplas linhas vazias consecutivas
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return content;
}

// Lista de arquivos para processar
const filesToProcess = [
  'script.js',
  'style.css',
  'index.html',
  path.join('Arduino', 'CodigoIntegradoComOSite.ino')
];

// Processa cada arquivo
filesToProcess.forEach(filePath => {
  try {
    const fileExtension = path.extname(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const processedContent = removeComments(content, fileExtension);
    
    // Salva o arquivo sem comentários
    fs.writeFileSync(filePath, processedContent);
    console.log(`Comentários removidos de ${filePath}`);
  } catch (error) {
    console.error(`Erro ao processar ${filePath}:`, error);
  }
});

console.log('Processo concluído!'); 
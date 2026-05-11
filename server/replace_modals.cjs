const fs = require('fs');
const path = require('path');

const dir = 'c:\\laragon\\www\\importaciones\\src\\pages\\admin\\forms';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('fixed inset-0 z-110') || content.includes('fixed inset-0 z-50')) {
    content = content.replace(/fixed inset-0/g, 'absolute inset-0');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + file);
  }
});

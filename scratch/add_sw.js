const fs = require('fs');
let code = fs.readFileSync('app.html', 'utf8');

const targetStr = "window.addEventListener('beforeinstallprompt', handler);";
const replaceStr = `if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('service-worker.js').catch(err => console.log('SW Registration failed', err));
        }
        window.addEventListener('beforeinstallprompt', handler);`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('app.html', code, 'utf8');
  console.log('Added SW registration');
}

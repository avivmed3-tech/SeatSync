const fs = require('fs');
const html = fs.readFileSync('../app.html', 'utf8');
const match = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
const lines = match[1].split('\n');
fs.writeFileSync('app_lines.js', lines.map((l, i) => (i+1) + ': ' + l).join('\n'));

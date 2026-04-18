const core = require('@babel/core');
const fs = require('fs');
try {
  const html = fs.readFileSync('../app.html', 'utf8');
  const match = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
  core.transformSync(match[1], {presets:['@babel/preset-react'], filename:'app.jsx'});
  console.log('Syntax OK');
} catch(e) {
  console.log(e.message);
}

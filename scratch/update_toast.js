const fs = require('fs');
let code = fs.readFileSync('app.html', 'utf8');

const targetStr = `if(!res.ok) throw new Error(result.error || 'שגיאה בהפעלת הבינה המלאכותית');`;
const replacementStr = `if(!res.ok) throw new Error(result.error || result.message || JSON.stringify(result));`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacementStr);
  fs.writeFileSync('app.html', code, 'utf8');
  console.log('Successfully replaced toast error handler.');
} else {
  console.log('Target not found for replace.');
}

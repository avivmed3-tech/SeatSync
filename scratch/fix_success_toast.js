const fs = require('fs');
let code = fs.readFileSync('app.html', 'utf8');

// The original line is something like:
// addToast(`...${result.dispatched}...${result.remainingCredits || 0}`, 'success');
// We want to replace it entirely with: addToast(result.message || 'פעולה בוצעה בהצלחה', 'success');

const lines = code.split('\n');
const newLines = lines.map(line => {
  if (line.includes('result.dispatched') && line.includes('addToast')) {
    return "          addToast(result.message || 'השיחות הוזנו למערכת בהצלחה', 'success');";
  }
  return line;
});

fs.writeFileSync('app.html', newLines.join('\n'), 'utf8');
console.log('Fixed success toast.');

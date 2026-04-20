const fs = require('fs');

let code = fs.readFileSync('app.html', 'utf8');

// Find the handleCallAI function body
const targetLine = "body: JSON.stringify({ type: 'call', payload: { guests: guests.filter(g => ids.includes(g.id)).map(g => ({ id: g.id, phone: g.phone, event_id: g.event_id || event.id })) } })";

const replacementLine = `body: JSON.stringify({ 
              type: 'call', 
              payload: { 
                guests: guests.filter(g => ids.includes(g.id)).map(g => { 
                  let p = (g.phone || '').replace(/\\D/g, ''); 
                  if (p.startsWith('0')) p = '+972' + p.substring(1); 
                  else if (p.startsWith('972')) p = '+' + p; 
                  else if (p && !p.startsWith('+')) p = '+972' + p; 
                  return { id: g.id, phone: p, event_id: g.event_id || event.id }; 
                }) 
              } 
            })`;

if (code.includes(targetLine)) {
  code = code.replace(targetLine, replacementLine);
  fs.writeFileSync('app.html', code, 'utf8');
  console.log('Successfully formatted phone number parsing in app.html');
} else {
  console.error('Target string not found in app.html');
}

const fs = require('fs');
let code = fs.readFileSync('app.html', 'utf8');

const targetStr = `body: JSON.stringify({ guestIds: ids, eventId: event.id, type: 'call' })`;
const replacement = `body: JSON.stringify({ type: 'call', payload: { guests: guests.filter(g => ids.includes(g.id)).map(g => ({ id: g.id, phone: g.phone, event_id: g.event_id || event.id })) } })`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('app.html', code, 'utf8');
  console.log('Successfully replaced payload.');
} else {
  console.log('Target not found for payload.');
}

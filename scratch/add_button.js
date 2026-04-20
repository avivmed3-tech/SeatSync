const fs = require('fs');
let d = fs.readFileSync('app.html', 'utf8');

const callFunc = `
      const handleCallAI = async () => {
        const ids = [...selected];
        try {
          const { data: { session } } = await client.auth.getSession();
          if (!session) throw new Error('Not logged in');
          
          addToast('מאתחל שיחות AI...', 'info');
          const res = await fetch('https://xryfxjtvqdeijijgiwmb.supabase.co/functions/v1/trigger-communication', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + session.access_token
            },
            body: JSON.stringify({ guestIds: ids, eventId: event.id, type: 'call' })
          });
          
          const result = await res.json();
          if(!res.ok) throw new Error(result.error || 'שגיאה בהפעלת הבינה המלאכותית');
          
          addToast(\`בוצעו פניות ל-\${result.dispatched} אורחים. קרדיטים שנותרו: \${result.remainingCredits}\`, 'success');
          setSelected(new Set());
        } catch(err) {
          console.error(err);
          addToast(err.message, 'error');
        }
      };
`;

// Inject function
d = d.replace('const handleBulkGroup = async () => {', callFunc + '\n      const handleBulkGroup = async () => {');

// Inject button into Toolbar
const buttonMarkup = `
                <button
                  className="btn"
                  style={{ padding: '6px 12px', fontSize: 12, background: 'var(--accent)', color: 'var(--background)', fontWeight: 'bold' }}
                  onClick={handleCallAI}
                >
                  <Icon name="PhoneCall" size={14} />
                  חייג לנבחרים (AI)
                </button>
`;

d = d.replace('{[\'confirmed\', \'pending\', \'declined\', \'maybe\'].map(s => (', buttonMarkup + '\n                {[\'confirmed\', \'pending\', \'declined\', \'maybe\'].map(s => (');

fs.writeFileSync('app.html', d);
console.log('Update Complete!');

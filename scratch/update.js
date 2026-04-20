const fs = require('fs');
let d = fs.readFileSync('app.html', 'utf8');

// 1. Add CallsPage right before SettingsPage
const componentCode = `
    // ============================================
    // Calls & AI Logs
    function CallsPage({ event }) {
      const { client, user } = useContext(SupabaseContext);
      const [logs, setLogs] = useState([]);
      const [loading, setLoading] = useState(true);
      const [profileData, setProfileData] = useState(null);

      useEffect(() => {
        if (!client || !user) return;
        client.from('profiles').select('call_credits').eq('id', user.id).single()
          .then(({ data }) => setProfileData(data));
      }, [client, user]);

      useEffect(() => {
        if (!event || !client) return;
        client.from('messages')
          .select('*, guests!inner(name)')
          .eq('event_id', event.id)
          .eq('channel', 'voice')
          .order('created_at', { ascending: false })
          .then(({ data, error }) => {
            if(data) setLogs(data);
            if(error) console.error(error);
            setLoading(false);
          });
      }, [event, client]);

      return (
        <div className="animate-fade-in module-card">
          <header className="module-header">
            <div>
              <h2>שיחות AI וטלקו</h2>
              <span className="module-subtitle">מעקב אחרי שיחות שבוצעו ויתרת קרדיטים</span>
            </div>
            <div style={{ background: 'var(--accent)', color:'var(--surface)', padding:'8px 16px', borderRadius:'12px', fontWeight:'600' }}>
              יתרת שיחות: {profileData?.call_credits || 0}
            </div>
          </header>
          <div className="scroll-container">
            {loading ? <p>טוען נתונים...</p> : logs.length === 0 ? <p>לא בוצעו שיחות עדיין.</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ padding: '12px' }}>תאריך</th>
                    <th style={{ padding: '12px' }}>אורח</th>
                    <th style={{ padding: '12px' }}>סטטוס שיחה</th>
                    <th style={{ padding: '12px' }}>תקציר/הערות</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '12px' }}>{new Date(log.created_at).toLocaleString('he-IL')}</td>
                      <td style={{ padding: '12px' }}>{log.guests?.name}</td>
                      <td style={{ padding: '12px' }}>{log.message_text}</td>
                      <td style={{ padding: '12px', whiteSpace: 'pre-wrap' }}>{log.reply_text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div style={{ marginTop: '20px' }}>
            {/* Using mock for Top Up action as requested requested */}
            <button className="btn btn-primary" onClick={() => alert('חיבור למערכת סליקה לרכישת חבילת דקות... בהמשך')}>
              רכישת חבילת שיחות
            </button>
          </div>
        </div>
      );
    }
`;
d = d.replace('function SettingsPage(', componentCode + '\n    function SettingsPage(');

// 2. Add route to ROUTES
d = d.replace(/GIFTS:\s*'gifts',/g, "GIFTS: 'gifts',\n      CALLS: 'calls',");

// 3. Add to switch inside renderPage
d = d.replace(/case ROUTES\.GIFTS:\s*return <GiftsPage event=\{selectedEvent\} \/>;/g, "case ROUTES.GIFTS:\n            return <GiftsPage event={selectedEvent} />;\n          case ROUTES.CALLS:\n            return <CallsPage event={selectedEvent} />;");

// 4. Add to BottomNav
d = d.replace(/\{\s*id:\s*ROUTES\.GIFTS,\s*icon:\s*'Gift',\s*label:\s*'מתנות'\s*\}/g, "{ id: ROUTES.GIFTS, icon: 'Gift', label: 'מתנות' },\n        { id: ROUTES.CALLS, icon: 'Phone', label: 'שיחות' }");

fs.writeFileSync('app.html', d);
console.log('Done!');

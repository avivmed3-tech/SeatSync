const fs = require('fs');
let code = fs.readFileSync('app.html', 'utf8');

// replace context
const targetContext = 'const { client } = useContext(SupabaseContext);';
const replacementContext = 'const { client, config } = useContext(SupabaseContext);';

if (code.includes(targetContext)) {
  code = code.replace(targetContext, replacementContext);
  console.log('Context fixed in GuestsPage.');
}

// replace fetch URL
const targetUrl = `'https://xryfxjtvqdeijijgiwmb.supabase.co/functions/v1/trigger-communication'`;
const replacementUrl = '`${config.url}/functions/v1/trigger-communication`';

let count = 0;
while (code.includes(targetUrl)) {
  code = code.replace(targetUrl, replacementUrl);
  count++;
}
if(count > 0) {
  console.log(`URL replaced in ${count} places.`);
}

fs.writeFileSync('app.html', code, 'utf8');
console.log('app.html saved.');

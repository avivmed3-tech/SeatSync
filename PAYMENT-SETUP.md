# 💳 SeatSync — מדריך הקמת תשלומים

## סקירה כללית

המערכת משתמשת ב-**Lemon Squeezy** כפלטפורמת תשלומים.
- **מודל**: תשלום חד פעמי לאירוע (לא מנוי חודשי)
- **עמלה**: Lemon Squeezy לוקח ~5% + $0.50 לכל עסקה
- **אתה מקבל**: הכל פחות העמלה, ישירות לחשבון הבנק

---

## שלב 1: פתיחת חשבון Lemon Squeezy

1. היכנס ל-[https://app.lemonsqueezy.com](https://app.lemonsqueezy.com)
2. צור חשבון (אפשר עם Gmail)
3. מלא פרטי עסק + חשבון בנק לקבלת תשלומים
4. אשר את החנות

## שלב 2: יצירת מוצרים

צור 2 מוצרים ב-Lemon Squeezy:

### מוצר 1: SeatSync Pro
- **שם**: SeatSync Pro
- **מחיר**: 99₪ (ILS) — **One-time payment** (לא subscription!)
- **תיאור**: ניהול אירוע מלא — עד 500 מוזמנים, RSVP אישי, הודעות ללא הגבלה
- **Redirect after purchase**: `https://avivmed3-tech.github.io/SeatSync/?payment=success`

### מוצר 2: SeatSync Enterprise
- **שם**: SeatSync Enterprise
- **מחיר**: 249₪ (ILS) — **One-time payment**
- **תיאור**: ללא הגבלה + SMS + תמיכה עדיפותית
- **Redirect after purchase**: `https://avivmed3-tech.github.io/SeatSync/?payment=success`

## שלב 3: העתקת Checkout URLs

לכל מוצר, לחץ על "Share" → "Checkout URL" והעתק את הלינק.

אז פתח את `index.html` ועדכן את המשתנים:

```javascript
const CHECKOUT_URLS = {
  pro:        'https://seatsync.lemonsqueezy.com/buy/XXXXX',     // ← הדבק כאן
  enterprise: 'https://seatsync.lemonsqueezy.com/buy/YYYYY',     // ← הדבק כאן
};
```

## שלב 4: הגדרת Webhook (הכי חשוב!)

ה-Webhook הוא מה שמעדכן את ה-DB אחרי שהלקוח משלם.

### 4.1 צור Supabase Edge Function

ב-Supabase Dashboard → Edge Functions → New Function:

**שם**: `lemon-webhook`

**קוד**:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const WEBHOOK_SECRET = Deno.env.get('LEMON_WEBHOOK_SECRET')!;

async function verifySignature(rawBody: string, signature: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const hex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
  return hex === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }
    });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-signature') || '';

    // Verify webhook signature
    if (WEBHOOK_SECRET && !(await verifySignature(rawBody, signature))) {
      return new Response('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;

    // Only process successful orders
    if (eventName !== 'order_created') {
      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = payload.data?.attributes;
    const customData = payload.meta?.custom_data || {};
    const userId = customData.user_id;
    const productName = data?.first_order_item?.product_name || '';

    if (!userId) {
      console.error('No user_id in custom data');
      return new Response('Missing user_id', { status: 400 });
    }

    // Determine plan from product name
    let plan = 'pro';
    if (productName.toLowerCase().includes('enterprise')) {
      plan = 'enterprise';
    }

    // Update user's plan in Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase
      .from('profiles')
      .update({
        plan: plan,
        plan_expires_at: null, // One-time purchase, no expiry
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('DB update error:', error);
      return new Response('DB error', { status: 500 });
    }

    console.log(`✅ User ${userId} upgraded to ${plan}`);

    return new Response(JSON.stringify({ success: true, plan }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Server error', { status: 500 });
  }
});
```

### 4.2 הגדר Secrets

ב-Supabase Dashboard → Settings → Edge Functions → Secrets:

```
LEMON_WEBHOOK_SECRET=<מה-Lemon Squeezy נותן>
```

### 4.3 הגדר Webhook ב-Lemon Squeezy

1. ב-Lemon Squeezy → Settings → Webhooks → Add Webhook
2. **URL**: `https://xryfxjtvqdeijijgiwmb.supabase.co/functions/v1/lemon-webhook`
3. **Events**: `order_created`
4. **Secret**: העתק את ה-Secret ושמור אותו גם ב-Supabase Secrets
5. שמור

## שלב 5: בדיקה

1. ב-Lemon Squeezy → Settings → Test Mode → הפעל
2. לך ל-SeatSync → לחץ "שדרג ל-Pro"
3. השתמש בכרטיס בדיקה: `4242 4242 4242 4242`
4. אחרי התשלום → תחזור ל-SeatSync → תראה באנר הצלחה
5. הפלאן ישתנה ל-Pro תוך כמה שניות

## שלב 6: מעבר ל-Production

1. כבה Test Mode ב-Lemon Squeezy
2. ודא שה-Webhook URL נכון
3. עשה תשלום אמיתי (99₪) לבדיקה
4. ודא שהכסף מגיע לחשבון

---

## 📋 סיכום — מה בדיוק קורה אחרי שלקוח משלם?

```
1. לקוח לוחץ "שדרג ל-Pro" ב-SeatSync
   ↓
2. SeatSync פותח Lemon Squeezy Checkout
   (עם user_id של הלקוח מוטמע ב-URL)
   ↓
3. לקוח משלם 99₪ ב-Lemon Squeezy
   ↓
4. Lemon Squeezy שולח Webhook → Supabase Edge Function
   ↓
5. Edge Function מעדכן profiles.plan = 'pro' ב-DB
   ↓
6. SeatSync מזהה שינוי (Realtime + polling) → מסיר מגבלות
   ↓
7. לקוח רואה באנר "ברוכים הבאים ל-Pro!" 🎉
```

## 💡 טיפים

- **אין צורך ב-Stripe** — Lemon Squeezy הוא Merchant of Record, הוא מטפל במע"מ ובמסים
- **אפס הגדרה** — לא צריך עוסק מורשה או חשבון סליקה
- **Payouts** — Lemon Squeezy מעביר כסף לבנק שלך (2-7 ימי עסקים)
- **Dashboard** — תראה הכנסות ב-https://app.lemonsqueezy.com

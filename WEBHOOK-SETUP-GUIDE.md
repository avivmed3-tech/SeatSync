# 🔗 הגדרת Webhook — מדריך צעד-אחר-צעד

## מה זה עושה?
כשלקוח משלם ב-Lemon Squeezy → הם שולחים הודעה לפונקציה שלך ב-Supabase → הפונקציה מעדכנת את ה-plan של המשתמש ב-DB → האפליקציה מזהה את השינוי ומסירה מגבלות.

---

## שלב 1: צור Edge Function ב-Supabase

1. פתח **Supabase Dashboard** → https://supabase.com/dashboard
2. בחר את הפרויקט שלך
3. בתפריט הצדדי לחץ על **Edge Functions**
4. לחץ **"Deploy a new function"** → **"Via Editor"**
5. **שם הפונקציה**: `lemon-webhook`
6. **העתק את כל הקוד** מהקובץ `lemon-webhook.ts` לתוך העורך
7. לחץ **Deploy**

## שלב 2: כבה JWT Verification

⚠️ זה חשוב! Lemon Squeezy לא שולח JWT token, אז חייבים לכבות את הבדיקה.

1. אחרי ה-Deploy, לחץ על הפונקציה `lemon-webhook`
2. לחץ על **"Details"** או **Settings**
3. **כבה** את "Enforce JWT Verification"
4. שמור

## שלב 3: צור Webhook ב-Lemon Squeezy

1. פתח **Lemon Squeezy** → https://app.lemonsqueezy.com
2. לך ל-**Settings** → **Webhooks**
3. לחץ **"+" (Add webhook)**
4. מלא:
   - **Callback URL**: 
     ```
     https://xryfxjtvqdeijijgiwmb.supabase.co/functions/v1/lemon-webhook
     ```
   - **Signing secret**: בחר סיסמה חזקה (לדוגמה: `mySuperSecret123!@#`)
     ⚠️ **שמור את הסיסמה הזו!** תצטרך אותה בשלב הבא
   - **Events**: סמן ✅ `order_created`
5. לחץ **Save**

## שלב 4: הוסף Secret ב-Supabase

1. חזור ל-**Supabase Dashboard**
2. לך ל-**Edge Functions** → לחץ על `lemon-webhook`
3. לחץ על **"Manage Secrets"** (או Settings → Edge Functions → Secrets)
4. הוסף secret חדש:
   - **Name**: `LEMON_WEBHOOK_SECRET`
   - **Value**: הסיסמה שבחרת בשלב 3 (לדוגמה: `mySuperSecret123!@#`)
5. שמור

## שלב 5: בדיקה! 🧪

### אופציה א' — Test Mode ב-Lemon Squeezy:
1. ב-Lemon Squeezy → הפעל **Test Mode** (בפינה העליונה)
2. לך לאפליקציה → לחץ "שדרג ל-Pro"
3. בדף התשלום, השתמש בכרטיס בדיקה:
   - **מספר**: `4242 4242 4242 4242`
   - **תוקף**: כל תאריך עתידי
   - **CVV**: כל 3 ספרות
4. אחרי התשלום → חזור לאפליקציה
5. תראה באנר "מפעיל..." ואחרי כמה שניות → "ברוכים הבאים ל-Pro!"

### אופציה ב' — בדיקה ידנית:
1. ב-Supabase → Edge Functions → `lemon-webhook` → **Logs**
2. שלח בקשה ידנית (cURL):
```bash
curl -X POST https://xryfxjtvqdeijijgiwmb.supabase.co/functions/v1/lemon-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "meta": {
      "event_name": "order_created",
      "custom_data": {
        "user_id": "YOUR_USER_ID_HERE"
      }
    },
    "data": {
      "attributes": {
        "status": "paid",
        "first_order_item": {
          "product_name": "SeatSync Pro"
        }
      }
    }
  }'
```
3. בדוק ב-Supabase → Table Editor → profiles → שה-plan השתנה ל-"pro"

---

## ❓ פתרון בעיות

**הפונקציה מחזירה 401 (Invalid signature)**
→ ודא שה-LEMON_WEBHOOK_SECRET ב-Supabase זהה לסיסמה ב-Lemon Squeezy

**הפונקציה מחזירה 500 (DB error)**
→ ודא שה-user_id שנשלח קיים בטבלת profiles

**התשלום עבר אבל ה-plan לא השתנה**
→ בדוק Logs ב-Edge Functions
→ ודא ש-JWT Verification כבוי
→ ודא שה-Webhook URL נכון

**הלקוח חוזר לאפליקציה אבל לא רואה שינוי**
→ האפליקציה עושה polling כל 2 שניות, תחכה עד 20 שניות
→ אפשר גם לרפרש את הדף

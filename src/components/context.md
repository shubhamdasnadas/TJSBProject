Perfect 👍
Below are **ALL 7 FINAL APIs**, **concise**, **clean**, and **aligned with what is working for you now**.

I’m using:

* `problem.get` for **1 → 6**
* **your exact 7th (`event.get`)** for message string

No extra theory. This is the **final reference set**.

---

## ✅ **1️⃣ Time**

```json
{
  "jsonrpc": "2.0",
  "method": "problem.get",
  "params": {
    "output": ["eventid", "clock"],
    "recent": true,
    "sortfield": "eventid",
    "sortorder": "DESC"
  },
  "id": 1
}
```

---

## ✅ **2️⃣ Status (Problem / Resolved)**

```json
{
  "jsonrpc": "2.0",
  "method": "problem.get",
  "params": {
    "output": ["eventid", "r_clock"],
    "recent": true
  },
  "id": 2
}
```

---

## ✅ **3️⃣ Host (REVISED – FINAL)**

```json
{
  "jsonrpc": "2.0",
  "method": "host.get",
  "params": {
    "output": ["hostid", "name"]
  },
  "id": 3
}
```

---

## ✅ **4️⃣ Severity**

```json
{
  "jsonrpc": "2.0",
  "method": "problem.get",
  "params": {
    "output": ["eventid", "severity"],
    "recent": true
  },
  "id": 4
}
```

---

## ✅ **5️⃣ Duration**

```json
{
  "jsonrpc": "2.0",
  "method": "problem.get",
  "params": {
    "output": ["eventid", "clock", "r_clock"],
    "recent": true
  },
  "id": 5
}
```

---

## ✅ **6️⃣ Acknowledged**

```json
{
  "jsonrpc": "2.0",
  "method": "problem.get",
  "params": {
    "output": ["eventid", "acknowledged"],
    "recent": true
  },
  "id": 6
}
```

---

## ✅ **7️⃣ Message (STRING ONLY – AS REQUESTED)**

👉 **Using exactly what you gave**

```json
{
  "jsonrpc": "2.0",
  "method": "event.get",
  "params": {
    "output": ["eventid"],
    "selectAcknowledges": ["message"],
    "sortfield": "eventid",
    "sortorder": "DESC",
    "limit": 100
  },
  "id": 7
}
```

### ✔ Extract ONLY the string

```ts
const message = e.acknowledges?.[0]?.message ?? "-";
```

---

## ✅ FINAL MAPPING (7 columns)

| Column   | Source                                |
| -------- | ------------------------------------- |
| Time     | `problem.get → clock`                 |
| Status   | `problem.get → r_clock`               |
| Host     | `host.get → name`                     |
| Severity | `problem.get → severity`              |
| Duration | `clock ↔ r_clock`                     |
| Ack      | `problem.get → acknowledged`          |
| Message  | `event.get → acknowledges[0].message` |

---

## 🧠 Production Tip (last one)

For **actual implementation**, do this in backend:

* Call **problem.get once**
* Call **event.get once**
* Join by `eventid`
* Send **one clean array** to frontend

---

You’re at a **solid, correct architecture now** 💯
If you want:

* final combined `route.ts`
* caching
* pagination
* PDF export

just say 👍

# App Playbook — User Guide

This document is used for RAG (LlamaIndex). The AI reads this content to answer questions about the app, how to use features, and general FAQ.

**Audience:** Drivers, Customers, Administrators  
**Language:** English

---

## 1. System overview

**AI-Powered Driver Assistant** is a ride-hailing system with an AI voice assistant that helps drivers communicate hands-free while driving.

The system includes:
- **Driver app / web** — accept trips, view routes, talk to AI
- **Customer app / web** — book rides, track trips, ask AI for support
- **Admin panel** — create trips, manage drivers, view call logs
- **AI voice assistant** — handles conversations via LiveKit (in-app or by phone)

Customers can book a ride via app/web **or call the hotline** for AI assistance.

---

## 2. What does the app support?

### 2.1 For drivers

| Feature | Description |
|---------|-------------|
| Phone login | No complex password; phone number is your identity |
| Go online / offline | Online to accept trips, offline when resting |
| View upcoming trips | List of assigned trips |
| Accept / reject new trips | Via app or AI outbound call notification |
| Update trip status | Arrived at pickup, picked up passenger, completed |
| Call customer | AI calls and summarizes, or direct bridge connection |
| View pickup / ETA | Address and estimated time |
| Voice assistant | Tap mic button, speak your request — AI executes |
| Earnings & stats | View today's revenue, rating (when data available) |
| Report issues | Customer no-show, wrong address, safety concerns |

### 2.2 For customers

| Feature | Description |
|---------|-------------|
| Book a trip | Enter pickup, dropoff, pickup time |
| Track status | Pending → confirmed → driver on the way |
| Cancel trip | Cancel via app or ask AI support |
| Ask ETA | How long until the driver arrives |
| Voice AI support | Ask trip status, cancel trip |

### 2.3 For administrators

| Feature | Description |
|---------|-------------|
| Trip board | View all trips by status |
| Manual trip creation | Assign driver, customer, addresses |
| Driver management | List, online/offline status |
| Dispatch | Notify / call driver to accept trip |
| Call logs | Transcripts and AI call summaries |

---

## 3. How to use the voice assistant (driver)

### 3.1 Getting started

1. Open the driver app and log in with your phone number
2. Tap the **AI Assistant** / microphone button
3. App connects to LiveKit — AI greets: *"Hello! How can I help you?"*
4. Speak your request in English, keep it short

### 3.2 Example voice commands

- *"What's my next trip?"*
- *"Where is the customer?"*
- *"Call the customer for me"* → AI asks: AI call or direct connection
- *"I've arrived"* / *"Passenger is in the car"* / *"Trip completed"*
- *"How much have I earned today?"*
- *"Customer didn't show up"* → report no-show
- *"What does the app support?"* → uses playbook knowledge base

### 3.3 Calling the customer — two modes

| Mode | How to say it | What AI does |
|------|---------------|--------------|
| **AI talks** | *"Have AI call and summarize"* | AI calls customer, converses, summarizes for driver |
| **Direct connect** | *"Connect me directly"* | Bridges call; driver talks to customer |

### 3.4 Cancel trip by voice

1. Say: *"I want to cancel the trip"*
2. AI asks for confirmation
3. Say *"Yes"* / *"Confirm"* to complete cancellation

---

## 4. How to book a ride (customer)

### 4.1 Via app / web

1. Open **customer-web** or the customer app
2. Enter **pickup**, **dropoff**, and **pickup time**
3. Tap **Book ride**
4. Screen shows status: finding driver → confirmed

### 4.2 Via phone (AI)

1. Call the service hotline
2. AI (CustomerAgent) asks: pickup, dropoff, time, name
3. AI creates the trip in the system
4. Confirms: *"Your ride is booked. A driver will accept soon."*

---

## 5. Trip status flow

```
pending → notified → calling → confirmed → (pickup) → completed
                              ↘ rejected / no_answer
```

| Status | Meaning |
|--------|---------|
| pending | New trip, driver not yet assigned |
| notified | Driver has been notified |
| calling | Calling driver (SIP outbound) |
| confirmed | Driver accepted |
| rejected | Driver declined |
| completed | Trip finished |

---

## 6. FAQ — Frequently asked questions

### 6.1 General

**Q: What does the app support?**  
A: Ride booking, trip tracking, voice assistant for drivers and customers, and trip management via the admin panel.

**Q: Do I need internet?**  
A: Yes. The app and AI assistant require network connectivity (Wi‑Fi or 4G/5G).

**Q: Does the AI save calls?**  
A: The system can save conversation summaries via call-logger when that service is enabled.

**Q: Can I speak Vietnamese?**  
A: Yes. The primary voice assistant supports Vietnamese; some configurations also support English.

### 6.2 Drivers

**Q: How do I go online to accept trips?**  
A: Select Online in the app, or tell the AI: *"Go online"* / *"I'm ready"*.

**Q: How do I see my next trip?**  
A: Check the app trip list, or ask the AI: *"What's my next trip?"*

**Q: What if the customer doesn't show up?**  
A: Wait longer (extend wait time), call the customer via AI, or report a no-show through the voice assistant.

**Q: Is it safe to use voice while driving?**  
A: The AI gives short answers, one task at a time. For complex actions, pull over safely first.

**Q: Can the AI replace Google Maps?**  
A: No. The AI gives pickup address summaries; use Google Maps / Waze for turn-by-turn navigation.

### 6.3 Customers

**Q: How do I know when the driver will arrive?**  
A: Check the app, or ask the AI: *"How long until the driver arrives?"*

**Q: How do I cancel a trip?**  
A: Use the cancel button in the app, or tell the AI — it will ask for confirmation before cancelling.

**Q: Do I need an account?**  
A: Customers typically only need a phone number to identify their trip.

### 6.4 Technical

**Q: Why isn't the AI listening / responding?**  
A: Check microphone, mic permissions, network connection, and that the voice-agent service is running.

**Q: LiveKit connection error?**  
A: Verify LIVEKIT_URL and token from trip-service; try logging into the app again.

---

## 7. What the playbook does NOT handle

- Payment disputes, refunds — contact hotline support
- Change vehicle registration / license info — update in app Profile section
- Emergency accidents — call 911 / local emergency services first
- Turn-by-turn navigation — use a maps app

---

## 8. Support contact

- Hotline: per TWILIO configuration / number shown in app
- Admin: use admin-panel to view and manage trips

---

*Playbook document — update when features change. Edit files in `requirements/knowledge/en/`, then run `python scripts/build_faq_index.py --lang en`.*

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
3. App connects to LiveKit — brief greeting (Czen), then *"How can I help you?"*
4. Speak your request in English, keep it short — **one task at a time**

### 3.2 Example voice commands

- *"Today's schedule"* / *"Upcoming trips"* → trip count; follow up with *"Who am I picking up?"*
- *"What's my next trip?"*
- *"Where is the customer?"* / *"Pickup at Landmark 81"* — AI remembers the trip being discussed
- *"Call the customer for me"* / *"Tell the customer I'm on my way"* → calls the rider for the active trip
- *"Call NexGen Speak"* / *"Call trip 2"* — pick trip by name, address, time, or index
- *"I've arrived"* / *"Passenger is in the car"* / *"Trip completed"*
- *"How much have I earned today?"*
- *"Customer didn't show up"* → report no-show
- *"What does the app support?"* → uses playbook knowledge base

### 3.3 Calling the customer — two main modes

| Mode | How to say it | What AI does |
|------|---------------|--------------|
| **AI calls for you** (default) | *"Call the customer"*, *"Tell them I'm arriving"* | AI calls, speaks on your behalf; you listen live; **one** summary when done |
| **Direct connect** | *"Connect me directly"* / *"Let me talk to them"* | Bridges into the room; say *"assistant hang up"* when finished |

Before dialing, AI always says *"Calling [name], please hold…"*.

### 3.4 Picking the right trip (multiple trips)

AI tracks the **trip under discussion** when you or the assistant just mentioned a customer name, pickup address, or scheduled time. Example:

1. *"Today's schedule"* → *"7 trips"*
2. *"Who am I picking up?"* → trip 1: NexGen Speak, Lotte 54 Liễu Giai, 12:30
3. *"Call the customer and say I'm on my way"* → calls NexGen Speak without re-listing all trips

You can also say: *"Call the customer at Pasteur"*, *"The 12:30 trip"*, *"Call Bob"*.

### 3.5 Confirming with "Ok" / "Yes"

When the AI says *"Let me check the schedule"* or *"I'll message the customer…"* but hasn't acted yet, say **Ok**, **That's right**, or **Go ahead and call** — the AI executes the promised action instead of a empty *"Sure"*.

### 3.6 After a customer call

When the call ends, the AI reads **one** summary (what the customer confirmed). You can also ask: *"Summarize the call"* / *"Is the call done?"*.

### 3.7 Cancel trip by voice

1. Say: *"I want to cancel the trip"*
2. AI asks for confirmation
3. Say *"Yes"* / *"Confirm"* to complete cancellation

### 3.8 Taking trips, navigation and automatic features

**New trip offers.** While you are online, a new trip opens the *New trip* sheet: estimated fare, distance, duration, pickup time, customer name, notes (bulky luggage, children), pickup and drop-off. You have 30 seconds to tap **Accept** or **Reject**; **Later** (the X) keeps the trip in the *Waiting* list on the Trips tab. The Czen assistant also reads the offer aloud and asks whether you accept.

**Go online / offline.** Tap **Go online** on Home, or use the switch at the top of the **Trips** tab.

**In-app navigation.** The *Next stop* card on Home shows who to pick up or drop off, where, and how far. Tap **Directions** for turn-by-turn guidance inside the app (turn left/right in how many metres, remaining km and minutes). Going off route triggers an automatic re-route. Stops are ordered by fastest travel time and re-ordered when a trip is added.

**Automatic reminder call near the pickup.** In *Profile → Assistant settings*, enable **Notify customer near pickup** and pick **Call when within**: 500 m, 1 km (default), 2 km or 3 km. When the car enters that radius the AI calls the customer to say the driver is almost there. If nobody answers, it redials. No action needed from the driver.

**Arrived / Complete only when you are really there.** The app and the assistant only allow *Arrived at pickup* within about 200 m of the pickup (map error margin), and *Complete trip* within about 200 m of the drop-off. Further away, the app tells you how far you still are. Calling the customer works at any distance.

**The AI confirms when your intent to call is unclear.** For an ambiguous line (for example *"Maybe call the customer?"*), the AI asks before dialling. Say *"Call"* / *"Yes"* to dial or *"No"* to drop it. The question expires after about 30 seconds or when you change the topic.

**Hands-free mode.** In *Assistant settings*, enable **Hands-free mode**. The app listens in the background for the wake phrase **"hey AI"** to open the assistant without touching the screen (Android for now).

**Suggest the next stop.** Enable it in *Assistant settings*. Within 200 m of the current stop, the assistant proposes the next pickup or drop-off.

**Other settings.** *Assistant language* (Vietnamese or English, applied from the next connection) and *Default way to call customers* (AI calls for you, or you talk directly). Settings are stored on your account, so they follow you to a new phone.

**Type instead of speaking.** In the chat, tap **Mute mic, keep connection** and type. The quick replies *Today's schedule*, *Call customer*, *Today's earnings*, *Where next?* send a question with one tap.

**Earnings.** The **Earnings** tab has Today / 7 days / 30 days, a 7-day chart and trip history. The **Profile** tab shows rating, total trips, acceptance rate and completion rate.

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

**Q: How do I check today's / yesterday's / weekly / monthly earnings?**  
A: Ask the AI: *"How much did I make today?"*, *"Yesterday's earnings?"*, *"This week's earnings?"*, *"How much last week?"*, *"This month's revenue?"*. "Last week" is the previous calendar week (Monday to Sunday); "this week" and "this month" are the last 7 and 30 days. Lifetime totals are not available.

**Q: How do I see my registered vehicle and plate?**  
A: Ask the AI: *"What car am I on?"* or *"My plate number?"*. The AI reads the vehicle type, plate and name from your profile; to change them, open Profile in the app.

**Q: How do I see completed or cancelled trips today?**  
A: Ask *"Completed trips today"* or *"Cancelled trips today"*.

**Q: How do I go online to accept trips?**  
A: Select Online in the app, or tell the AI: *"Go online"* / *"I'm ready"*.

**Q: How do I see my next trip?**  
A: Check the app trip list, or ask the AI: *"Today's schedule"* / *"Upcoming trips"*. Follow up with *"Who am I picking up?"* for details.

**Q: How do I call the right customer when I have multiple trips?**  
A: Say the customer name (*"Call NexGen Speak"*), address (*"Call the customer at Lotte"*), time (*"The 12:30 trip"*), or index (*"Call trip 2"*). After the AI just read one trip's details, *"Call the customer"* uses that trip.

**Q: The AI promised to check or call but didn't — I said Ok?**  
A: Say *"Ok"*, *"That's right"*, or *"Go ahead and call"* — the AI executes the promised action instead of an empty acknowledgment.

**Q: Does the AI summarize after a customer call?**  
A: Yes — once when the call ends. You can also ask *"Summarize the call"* or *"Is the call done?"*.

**Q: What if the customer doesn't show up?**  
A: Wait longer (extend wait time), call the customer via AI, or report a no-show through the voice assistant.

**Q: Is it safe to use voice while driving?**  
A: The AI gives short answers, one task at a time. For complex actions, pull over safely first.

**Q: Do I need Google Maps for directions?**  
A: No. Tap **Directions** on the next-stop card for turn-by-turn navigation inside the app. The AI also answers how far, how long, and whether traffic is heavy.

**Q: Does the app remind the customer when I am close?**  
A: Yes. Enable *Notify customer near pickup* in *Assistant settings* and choose 500 m / 1 km / 2 km / 3 km. Inside that radius the AI calls the customer to come out.

**Q: Why can't I tap "Arrived at pickup"?**  
A: The app only allows it within about 200 m of the pickup. Drive closer and tap again. Calling the customer works at any distance.

**Q: How do I turn on hands-free mode?**  
A: *Profile → Assistant settings* → enable **Hands-free mode**, then say **"hey AI"** to open the assistant without touching the screen (Android).

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

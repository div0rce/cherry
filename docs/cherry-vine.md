Status: Active blueprint + dev-only backend simulator
Last updated: 2025-11-30

# Cherry Vine Design Document

*Reference architecture for the Cherry in-store hardware node*

Vine is **context-only hardware**, never a payment terminal. See `docs/legal-constraints.md` for the hard guardrails.

Current code hooks (dev-only) and caveats:
- Backend ingest: `app/api/vine/order/route.ts` accepts Vine terminal events or `OrderContext` and creates a `RecommendationSession` via `lib/vine/run-recommendation.ts`.
- Types: `lib/vine/order-context.ts`, `lib/schemas/vine.ts`, `lib/schemas/vine-terminal.ts`.
- Dev UI: `/vine-simulator` (App Router page) posts to `/api/vine/order` and shows decision/orderToken.
- Engine: `lib/engine.ts` computes verdicts; results persist to `RecommendationSession` and Cherry Points ledger when confirmed.
- MCC is optional but validated when provided; freshness window (~3 minutes) is enforced. HMAC/nonce auth is **TODO** (see `lib/vine/security.ts`).

All firmware and future device work must match this document and **never** touch card rails.

---

## Current implementation (dev-only)
- Endpoint: `POST /api/vine/order` guarded by `withUser`.
- Accepted payloads:
  - **Terminal event form** (`lib/schemas/vine-terminal.ts`): amount (number), optional currency, merchant block (name/storeId/MCC), terminal block (terminalId), vine block with source/sessionId.
  - **OrderContext form** (`lib/schemas/vine.ts`): deviceId, amountCents (positive integer), timestamp (epoch ms), optional merchant/store/terminal/order IDs, optional MCC, optional nonce, `source` defaults to `VINE_SIM`.
- Behavior:
  - Validates payload; rejects stale timestamps (`> ~3 minutes` old).
  - MCC is optional; when present it must pass `isValidMcc`.
  - Maps payload to `OrderContext`, calls `runRecommendationFromOrderContext` → `runEngine`, and persists a `RecommendationSession` with `source = VINE_SIM` or `VINE_DEVICE`, `orderToken` (nonce or UUID), expiry ~15 minutes.
  - Returns `{ sessionId, decision, orderToken }` to the simulator/client.
- Not implemented yet (explicit TODOs):
  - HMAC/nonce verification and device secrets.
  - Order token cleanup/expiry sweeps.
  - Hardware/firmware transport; today is backend-only for simulation.

- Safety assertions:
  - Vine does **not** read cards or act as a terminal.
  - Vine payloads contain only merchant/order context (merchant ID/name, amount, timestamp, optional MCC/store/terminal/order IDs).
  - No EMV/ISO8583 or payment-rail protocols are emitted or consumed.

## 0. Purpose of this Document

This document describes **Cherry Vine** end to end:

* what it is
* what it must and must not do
* how it fits into Cherry’s product identity
* its **hardware**, **firmware**, **protocols**, **security**, and **merchant workflows**

You can treat this as a blueprint for a future implementation.
Nothing here assumes you already know embedded.

---

## 1. What Cherry Vine Is

**Cherry Vine** is:

> A tiny, on-counter hardware node that listens to the store’s POS/order system for `merchant + amount (+ optional metadata)` and broadcasts that context to nearby phones via BLE/NFC so Cherry can run *Observe → Evaluate → Recommend → Reward* in real time, **without ever touching payment rails**.

Key points:

* It is **not** a card reader.
* It is **not** a payment terminal.
* It never sees PAN, CVV, track2, EMV fields, or network messages.
* It only deals in **order metadata**:

  * `merchantId`, `terminalId`, `orderId`
  * `amountCents`, `currency`
  * `timestamp`, optional flags

Think of it as a **context router**, not a money router.

---

## 2. Goals and Non-Goals

### 2.1. Goals

Cherry Vine should:

1. **Inject context into the Cherry loop** at the exact moment the order total is known.
2. **Work with many POS environments**, from modern APIs to old printer-port systems.
3. **Expose a single, normalized payload format** to the phone (BLE/NFC), regardless of how the data arrived.
4. **Be legally boring**:

   * no payment functions
   * no PCI scope
   * no cardholder data
5. **Be operationally simple**:

   * plug in device
   * connect to WiFi
   * associate with store
   * it works

### 2.2. Non-Goals

Cherry Vine should **not**:

* act as a **payment terminal**
* accept card taps, swipes, chips, PINs
* speak EMV, ISO8583, or scheme protocols
* run complex business logic beyond:

  * ingest → normalize → broadcast

All higher-level behavior (bucket logic, recommendations, rewards, analytics) stays in the **Cherry backend + app**, not on the device.

---

## 3. High-Level Architecture

At a high level, Cherry Vine has three layers:

1. **Ingress (from POS world)**
   Multiple possible sources:

   * local POS API/WebSocket
   * POS middleware
   * cloud push
   * printer stream/ESC/POS tap
   * manual tool/test mode

2. **Normalization & State**

   * unify all incoming events into a single `OrderContext` structure
   * track “current/last order” per terminal
   * handle dedup and expiry

3. **Egress (to phone)**

   * BLE advertisements: short, ephemeral payload
   * NFC/App Clip NDEF: richer payload when tapped
   * optional local HTTP endpoint for debugging

### 3.1. Conceptual Flow

1. POS completes order → sends order context to Vine.
2. Vine normalizes and stores `currentOrder` for `terminalId`.
3. Vine starts broadcasting:

   * `merchantId`, `terminalId`, `amountCents`, `orderIdHash`, `nonce`.
4. Nearby iPhone sees broadcast → opens Cherry App Clip/Pass.
5. Cherry backend consumes broadcast payload, merges with user state → recommendation.
6. User pays on the real POS terminal with the recommended card.
7. Cherry later reconciles outcome for rewards.

---

## 4. Hardware Architecture

You don’t need to design a PCB now, but you need a **conceptual BOM** and platform.

### 4.1. Core Components

1. **MCU / SoC**
   Requirements:

   * BLE 5.0 (advertising + GATT)
   * WiFi 2.4 GHz (for POS/cloud)
   * Enough flash/RAM for:

     * RTOS (e.g., FreeRTOS)
     * TCP/IP stack
     * TLS (for cloud APIs)
       Candidate families:
   * ESP32-S3 or ESP32-C6
   * Nordic nRF5340 with external WiFi module (more complex)

2. **NFC / NDEF Tag** (optional but recommended)

   * For tap-based App Clips
   * Chip families: NTAG21x, NTAG424 (for secure NDEF if you want signing)
   * Interface: I2C or SPI to MCU

3. **Power**

   * USB-C 5V input
   * On-board regulator to 3.3V
   * Optional PoE variant for enterprise

4. **Indicators / Minimal UI**

   * Status LED(s):

     * power
     * WiFi/POS connection
     * broadcasting / idle
   * Optional button:

     * reset / factory mode
     * “pairing” mode for onboarding
   * Optional tiny buzzer for debug/alerts (not required)

5. **Connectivity**

   * WiFi (STA mode)
   * Optional Ethernet jack for stable back-of-house deployments
   * BLE for outbound to phones only (no inbound card data)

6. **Enclosure**

   * Small puck or tile
   * Non-threatening design (looks like a loyalty device, not a payment terminal)
   * Clearly branded as “Cherry Vine – Not a payment device.”

### 4.2. Hardware Constraints

* No magstripe reader.
* No EMV CL or contact interface.
* No keypad.
* No secure element for card data (because we never see card data).
* Target BOM cost (vision-level, not real quote):

  * prototype: $40–$80
  * volume: $15–$30

---

## 5. Firmware Architecture

Firmware should be modular and boring.

### 5.1. Main Modules

1. **System Core**

   * RTOS scheduler
   * Boot & config loading
   * Logging + debug over serial

2. **Network Stack**

   * WiFi connect + reconnect logic
   * TLS client for HTTPS
   * Local HTTP server (for config + diagnostics)

3. **Ingress Drivers**

   * `pos_api_driver`: listens to local POS HTTP/WebSocket or cloud push
   * `middleware_driver`: listens for middleware events
   * `cloud_driver`: long-polling or server-sent events from Cherry or merchant cloud
   * `printer_tap_driver`: parses ESC/POS or text from serial/USB
   * `manual_test_driver`: simple REST endpoint to push test orders (for dev)

4. **Normalizer**

   * Takes events from all drivers, maps to common struct:

     ```ts
     type OrderContext = {
       merchantId: string;
       storeId: string;
       terminalId: string;
       orderId: string;
       amountCents: number;
       currency: string;   // "USD" etc.
       timestamp: number;  // unix epoch seconds
       source: "POS_API" | "MIDDLEWARE" | "CLOUD" | "PRINTER" | "MANUAL";
     }
     ```
   * Performs minimal validation, deduplication, and expiry.

5. **Broadcast Engine**

   * BLE advertisement builder
   * Optional NFC NDEF writer
   * Maintains a short-lived “current/last order” by terminal or global (for small shops)
   * Rotates nonces to mitigate replay

6. **Security & Keys**

   * Module to:

     * store device ID
     * store per-merchant secrets (for signing)
     * derive per-order token for BLE and NDEF payload

7. **Config & Provisioning**

   * Handles:

     * initial setup
     * connecting to WiFi
     * registering with Cherry backend
     * receiving merchant/POS configuration

---

## 6. POS Integration Protocol

The POS side is where **order context** comes from. There are multiple possible strategies; Cherry Vine should support several.

### 6.1. Common Payload Shape

Regardless of source, push this to Vine:

```json
{
  "merchantId": "chipotle_0241",
  "storeId": "chipotle_0241",
  "terminalId": "register_03",
  "orderId": "845902",
  "amountCents": 1472,
  "currency": "USD",
  "timestamp": 1732674554
}
```

This is **not** card data. It’s the same sort of data used to print a receipt.

### 6.2. Integration Modes

#### 6.2.1. Mode A — Local POS API → Vine HTTP

* Vine exposes a local HTTP endpoint on the LAN (or via DNS like `vine-01.local`):

  * `POST /api/v1/order`

  Request body: the common payload above.

* POS vendor or integrator config:

  * after each order is finalized, call `vine-ip/api/v1/order` with that JSON.

Pros:

* Simple
* Works well in smaller environments
* Good for modern, open POS systems

#### 6.2.2. Mode B — Middleware → Vine HTTP

* Some merchants already use a middleware layer (e.g., Omnivore, Punchh-like system).
* That middleware acts as a **relay**:

  * POS → Middleware → Vine.

Architecture:

* Vine exposes same `POST /api/v1/order`.
* Middleware is configured per store to call Vine.

Pros:

* Less per-POS integration complexity.
* Standard pattern in restaurant tech.

#### 6.2.3. Mode C — Cloud → Vine

Here, Vine doesn’t talk directly to POS. Flow:

1. POS sends orders to **merchant cloud** or **Cherry cloud connector**.
2. Cloud identifies associated Vine device(s) for that store.
3. Cloud calls Vine over the internet:

   * `POST https://vine-0138.store-domain.com/api/v1/order`
     or via:
   * WebSocket / MQTT / SSE

This requires:

* Vine to have DNS or some stable identity.
* Vine to punch out/outbound connection to Cherry or merchant cloud (commonly done via WebSockets).

Pros:

* Enterprise-friendly
* Minimal local POS changes

#### 6.2.4. Mode D — Printer Stream Tap

For older POS that cannot do API:

* Many POS systems send ESC/POS commands to a receipt printer.
* Vine can:

  * sit **in-line** between POS and printer, or
  * be configured as a “printer” that forwards to the actual printer.

Data flow:

* POS → Vine (ESC/POS) → Printer
* Vine parses the stream to detect lines like:

  * `TOTAL $14.72`
* Once total is found, Vine creates an `OrderContext` with:

  * amount from parsed line
  * merchant/store ID from config
  * a random orderId if none exists.

This is ugly but effective in legacy environments.

#### 6.2.5. Mode E — Manual / Test

For development:

* `POST /api/v1/test-order` on Vine with payload:

  ```json
  {
    "amountCents": 1234,
    "merchantId": "sandbox_merchant",
    "terminalId": "dev_terminal"
  }
  ```
* Immediately normalizes and broadcasts for QA.

---

## 7. BLE Advertisement Specification

BLE is how the phone gets a **fast, low-friction signal** from Vine.

### 7.1. Goals

* Small packet (BLE adv is limited in size).
* No direct user identity.
* Enough data to let the **Cherry App Clip / app** fetch full context from backend.
* Resistant to simple spoofing and replay.

### 7.2. Example Advertisement Layout

BLE advertisement payload (manufacturer-specific or service data field):

* Version (1 byte)
* Flags (1 byte)
* Vine ID (4–6 bytes, short ID or hash)
* Merchant ID hash (4–8 bytes)
* Amount (3 bytes, `amountCents` up to 16,777,215)
* Order token (8–12 bytes, HMAC/nonce)

Rough layout example (not final, just conceptual):

```text
[VER][FLAGS][VINE_ID(4)][MERCH_HASH(4)][AMOUNT(3)][ORDER_TOKEN(8)]
```

Interpretation:

* `VINE_ID` — mapped server-side to `storeId` and `merchantId`.
* `MERCH_HASH` — sanity check + support for some local/offline features.
* `AMOUNT` — direct representation of cents.
* `ORDER_TOKEN` — short-lived HMAC or MAC over (`VINE_ID`, `amount`, `timestamp`) using a per-device secret; lets backend verify authenticity.

### 7.3. Advertising Behavior

* Advertising interval: e.g., 100–300 ms when there is an active `currentOrder`.
* Timeout:

  * Broadcast for N seconds (e.g., 60–120 seconds) after an order is created.
  * After that, stop advertising or downgrade to “idle” mode.
* Multiple orders:

  * For simplicity, start with “last completed order” semantics.
  * If multiple terminals in a store, either:

    * treat each Vine as per-terminal, or
    * include `terminalId` in order token & let backend disambiguate.

---

## 8. NFC / NDEF Structure

NFC is useful for:

* explicit user taps
* App Clip invocations
* fallback when BLE behavior is not enough

### 8.1. NDEF Content

NDEF record usually encodes a URL.

Pattern (example):

```text
https://cherryapp.com/vine?d={deviceId}&t={orderToken}
```

Where:

* `deviceId` = Vine’s public identifier
* `orderToken` = short-lived, signed token referencing the latest order

When the phone taps:

1. iOS reads URL.

2. iOS sees association between `cherryapp.com` and Cherry App Clip/full app.

3. Cherry app opens, extracts `d` and `t`.

4. App calls backend:

   ```http
   GET /api/v1/vine/order?deviceId=...&orderToken=...
   ```

5. Backend returns full `OrderContext` + derived merchant/category fields.

6. Cherry runs evaluation and shows recommendation.

### 8.2. Dynamic Updates

* Vine updates the NDEF record when:

  * a new order arrives
  * the previous order expires
* To avoid flash wear on some tags, consider:

  * using tags designed for dynamic NDEF
  * caching for a few seconds between updates

---

## 9. Security Model

Cherry Vine doesn’t touch payment data, but it still must avoid being trivially spoofed.

### 9.1. Threats to Consider

* A malicious app or device broadcasting fake “Cherry Vine” BLE packets to trick users.
* A bad merchant forging order totals to game analytics/points.
* Replay of old broadcasts.

### 9.2. Basic Security Mechanisms

1. **Device Identity**

   * Each Vine has:

     * a unique `deviceId`
     * a device secret key, provisioned by Cherry backend.
   * The secret is used to generate HMAC/MAC tokens.

2. **Order Tokens**

   * For each OrderContext, Vine computes:

     * `orderToken = HMAC(deviceSecret, canonical(orderFields + timestampBucket))`
   * `orderToken` is included in BLE and NFC payloads.
   * Backend verifies token validity and timestamp.

3. **Time-Bound Validity**

   * Orders expire quickly (e.g., 1–3 minutes) for broadcast.
   * Backend rejects stale tokens.

4. **TLS for Cloud/Config**

   * All communication between Vine and Cherry/merchant cloud is over HTTPS/TLS.
   * Use standard certificate validation.

5. **No Secrets to Phone**

   * The BLE & NDEF payloads contain:

     * `deviceId`
     * `orderToken`
     * safe metadata
   * No direct device secrets or raw HMAC keys.

6. **Merchant Authentication**

   * When linking Vine to a merchant, use one of:

     * pairing code
     * provisioning QR
     * signed config file from Cherry backend

---

## 10. Device Provisioning and Configuration

### 10.1. Manufacturing Stage

* Each device programmed with:

  * `deviceId` (UUID or short ID)
  * `deviceSecret` (random key)
  * base firmware image
* Stored in a secure device registry in Cherry backend.

### 10.2. First-Time Setup at Merchant

Basic flow:

1. Merchant plugs Vine into power.
2. Vine boots in “setup mode”:

   * spins up WiFi AP (e.g., `CherryVine-<shortId>`)
   * or uses BLE to communicate with a mobile setup app
3. Merchant launches “Cherry Vine Setup” app:

   * connects to the device
   * provides:

     * store/merchant ID (or logs into their merchant account)
     * WiFi credentials
4. Setup app contacts Cherry backend:

   * asserts “deviceId X should be linked to store Y”
   * backend verifies merchant account and updates its registry
5. Vine reboots into “normal mode”:

   * connects to WiFi
   * pulls full config from Cherry backend:

     * store info
     * POS integration mode
     * relevant API endpoints or tokens

### 10.3. Reconfiguration

* Via local admin panel at:

  * `http://vine.local/admin`
* Protected by:

  * admin password
  * or ephemeral PIN from backend

Typical operations:

* change WiFi
* switch integration mode
* view diagnostics

---

## 11. Merchant Onboarding Workflow

You are an indie dev; keep this simple conceptually, even if you don’t build it yet.

### 11.1. Step 1 — Merchant Signs Up

Merchant signs up in a **Cherry Merchant Portal**:

* creates account
* registers one or more locations/stores
* optionally connects to POS partner (Toast, Clover, etc.) via OAuth-like flow

### 11.2. Step 2 — Merchant Orders Cherry Vines

* They order N devices for N locations OR N terminals.
* Cherry ships hardware with labels (store IDs or just device IDs).

### 11.3. Step 3 — Install & Pair

For each device:

* place Vine near POS terminal (clear label “Not a payment device”)
* plug into power
* run setup app:

  * pick store from list
  * associate device with store (and optionally terminal)
  * configure integration mode (local API, middleware, cloud, etc.)

### 11.4. Step 4 — POS Integration

Depending on the POS:

* **API-based**:

  * merchant enters Leaf/Cherry integration token into POS configuration panel.
  * POS vendor’s integration sends order data to the Vine or to Cherry backend which then relays it.

* **Middleware-based**:

  * merchant enables Cherry as a destination in their existing integrator.

* **Printer-based**:

  * merchant plugs printer cable into Vine, then from Vine to the printer.
  * optionally configures printing options.

### 11.5. Step 5 — Test Mode

Merchant tests:

* run a test order for $1.23
* see debug display:

  * that Vine received `amountCents = 123`
  * that Cherry app sees merchant + amount when scanning

After that, the system is “live.”

---

## 12. Device Lifecycle

### 12.1. States

* `UNPROVISIONED` — just manufactured, not linked.
* `CONFIGURING` — pairing in progress.
* `ACTIVE` — linked to store and ingesting orders.
* `DEGRADED` — no POS data for X minutes, only idle beacons or none.
* `RETIRED` — unlinked from store and disabled.

### 12.2. Updates

Firmware updates:

* Vine periodically checks Cherry backend for new firmware.
* Downloads via HTTPS.
* Applies update and reboots.

This allows:

* patching security issues
* adding new integration modes
* improving BLE/NFC behavior

---

## 13. Analytics and Merchant Data (High-Level)

Vine carries **no user identity** but enables Cherry to know:

* “At store X, at time T, these order totals were seen.”

On Cherry’s side, when a user engages:

* Cherry ties:

  * `userId`
  * `deviceId`/`storeId`
  * `orderToken`
  * internal evaluation result
* But exported analytics to merchants must be:

  * **aggregated**
  * **anonymized**
  * **consent-respecting**

Examples of merchant-visible metrics:

* % of visits where users stayed in budget
* average spend bucket location when visiting
* day/time patterns of healthy vs borderline spend

Vine is the **sensor**, Cherry backend is the **brain**, merchants get **summaries**, not raw user logs.

---

## 14. Implementation Priority for an Indie Dev

You don’t need to do all of this at once. A realistic path:

### Phase 1 — Pure Software Simulation

* No physical Vine.
* Just:

  * a “Cherry Vine Simulator” page or local service that:

    * calls your backend `/api/vine/order` with merchant + amount
    * triggers a push/notification flow to your phone
* Goal: solidify **Observe → Evaluate → Recommend → Reward** with a fake Vine.

### Phase 2 — Minimal Physical Prototype

* Use an **ESP32 dev board** (e.g., ESP32-DevKitC).
* Implement:

  * WiFi
  * Local HTTP `POST /order`
  * BLE advertisements encoding amount+deviceId
* Hardcode everything else.
* Manually push orders with curl/postman to your ESP32 board and confirm your phone can detect the BLE payload and open a test app.

### Phase 3 — POS Integration Experiment

* Build a fake POS (web page) that:

  * has a “TOTAL” field
  * on “Complete Order”, posts to the ESP32 Vine.
* Now you have:

  * “POS → Vine → Phone → Cherry app”

### Phase 4 — Add NFC/App Clip

* Add an NFC dev tag.
* Encode NDEF with a URL to your test backend.
* On update, re-encode with orderToken.

### Phase 5 — Tighten Security + Config

* Add device identity
* Add token signing
* Add config endpoints

Beyond that, you can start thinking about real merchant environments only when the core experience feels right.

---

## 15. Summary

Cherry Vine is:

* a **dumb but structured** hardware node
* with multiple POS ingestion options
* a normalized order context struct
* a BLE/NFC broadcast interface to phones
* a narrow, clean security model
* and a simple merchant onboarding story

It extends Cherry’s **Observe** step into the physical world without ever becoming a payment device.

When you’re ready, we can turn this into:

* a shorter **spec.md** for engineers
* a mini **firmware-architecture.md**
* or concrete code scaffolding (ESP32 pseudo-code, backend endpoints, etc.).

# Cross-Service Meaning Comparator  
[![Live Demo](https://img.shields.io/badge/Live%20Demo-000?style=for-the-badge)](https://rtfenter.github.io/Cross-Service-Meaning-Comparator/)

### A small interactive tool that compares fields and definitions across services to detect hidden semantic drift before it breaks integrations.

This project is part of my **Systems of Trust Series**, exploring how distributed systems maintain coherence, truth, and alignment across services, schemas, and teams.

The goal of this comparator is to make **cross-service meaning** legible — not just whether events validate, but whether different services still agree on what a shared concept actually represents.

---

## Purpose

Distributed systems rarely fail because a single field is “invalid.”  
They fail because **multiple services quietly stop meaning the same thing** when they use that field.

Over time, as systems evolve:

- teams add “local meaning” on top of shared fields  
- services overload fields to represent multiple concepts  
- enums grow service-specific values  
- documentation drifts away from real behavior  

These shifts create:

- integrations that pass tests but misinterpret data  
- APIs that look aligned but enforce different rules  
- services that “agree” on field names but not on semantics  
- brittle joins and analytics that depend on hidden assumptions  

This comparator surfaces those differences side-by-side before they become production incidents.

---

## Features (MVP)

The first version will include:

- **Service-to-Service Field Comparison** – pick a field and compare how each service defines, uses, and constrains it  
- **Definition & Example Diff View** – show description, example values, and notes per service in a compact comparison layout  
- **Invariant & Rule Alignment** – list validation rules, allowed ranges, and invariants to spot conflicts (e.g., different required states)  
- **Type & Enum Consistency Check** – highlight mismatches in type (string vs number) or enum values across services  
- **Impact Summary Badge** – rough Low / Medium / High risk based on how severe the semantic differences are  
- **Lightweight client-side experience** – static HTML + JS, no backend required  

This tool is intentionally minimal and aimed at conceptual clarity, not a full metadata catalog or governance platform.

---

## Demo Screenshot
<img width="2804" height="2404" alt="Screenshot 2025-11-24 at 08-22-40 Cross-Service Meaning Comparator" src="https://github.com/user-attachments/assets/7699fa13-de1f-422c-9903-efd169f0eb26" />

---

## Meaning Comparison Flow Diagram

```
    Shared Concept (Canonical Definition)
         |
         v
    Service A
    - local description
    - type + enums
    - invariants
         |
         v
    Service B
    - local description
    - type + enums
    - invariants
         |
         v
    Service C
    - local description
    - type + enums
    - invariants
         |
         v
    Downstream Consumers
    (joins, analytics, audits, external APIs)
```

The comparator sits *between* these services, showing where their meanings align — and where they don’t.

---

## Why Cross-Service Meaning Alignment Matters

Even if schemas validate and APIs respond with 200s, meaning can quietly diverge:

- one service treats a field as “lifecycle status,” another as “billing status”  
- one service allows `"PENDING"` as a state, another never emits or expects it  
- one service interprets a timestamp as “creation time,” another as “last update”  
- one service treats a flag as “user visible,” another as “internal-only”  

When these semantic differences aren’t visible:

- integration bugs show up as “edge cases” instead of predictable misalignment  
- incident reviews become arguments over intent instead of clear facts  
- analytics and reporting disagree across teams using “the same” field  
- governance efforts focus on schema shape, not meaning  

This tool focuses on the **cross-service layer** of trust: not just “does the event validate,” but **“do all the services still agree on what this field means?”**

---

## How This Maps to Real Systems

Each part of the comparator corresponds to concrete architectural concerns:

### Field Definition Drift  
The same field name has different descriptions, examples, or “what this represents” text across services.  
Example: `account_status` described as “user lifecycle state” in one service and “billing compliance state” in another.

### Behavior vs Label Mismatches  
Two services use the same label, but behavior doesn’t match:

- one service never emits certain states  
- another uses a state internally but never documents it  
- error paths or retries create values that aren’t in the docs  

The comparator makes these differences visible per service.

### Contract vs Implementation  
Documentation might say one thing while actual usage says another:

- enums in code vs enums in the contract  
- “optional” fields that are required in practice  
- range constraints that only some services enforce  

Seeing contracts and real usage side-by-side helps teams close the gap.

### Cross-Service Version Skew  
Even without explicit versioning, services evolve at different speeds:

- Service A has adopted new semantics and constraints  
- Service B still runs on older assumptions  
- Service C has a hybrid of both  

The comparator helps teams see where they are still aligned and where upgrade plans need to be coordinated.

---

## Part of the Systems of Trust Series

Main repo:  
https://github.com/rtfenter/Systems-of-Trust-Series

---

## Status

MVP is implemented and active.  
The first version will focus on **clear side-by-side comparison** for a small set of fields and services — enough to demonstrate cross-service semantic drift without becoming a full governance platform.

---
## Local Use

Everything will run client-side.

To run locally (once the prototype is implemented):

1. Clone the repo  
2. Open `index.html` in your browser  

That’s it — static HTML + JS, no backend required.

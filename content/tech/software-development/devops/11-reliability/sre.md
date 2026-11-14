---
title: SRE
order: 1
lang: en
tags: [intro]
updated: 2026-11-13
---

# SRE

**Level: intro**

Site reliability engineering (SRE) is Google's approach to operations: treat reliability as an engineering problem with numbers. How reliable must this service be? How much unreliability is left to spend on shipping changes? What do we learn from each failure? Its vocabulary is now used across the industry.

## Terms

| Term | Meaning |
|---|---|
| Availability | The share of time, or of requests, in which the service works |
| SLI | Service level indicator: a measurement of quality, e.g. the share of requests that succeed in under 300 ms |
| SLO | Service level objective: the internal target for an SLI, e.g. 99.9% over 30 days |
| SLA | Service level agreement: a contract with customers, with compensation if it is broken. Looser than the SLO |
| Error budget | The unreliability the SLO allows: 100% minus the SLO. It is there to be spent on change |
| Toil | Manual, repetitive operational work that grows with the system and can be automated |
| Incident | An unplanned disruption to the service |
| On-call | The rotation of people who respond to alerts outside working hours |
| Runbook | Written steps for handling a known alert or task |
| Postmortem | A written review of an incident: what happened, why, and what will change |
| Blameless | Looking for the causes in the system and the process, not for a person to blame |
| MTTR | Mean time to recovery: how long incidents last on average |
| RPO / RTO | How much data may be lost / how long recovery may take, in a disaster |
| Disaster recovery (DR) | The plan and the means to recover from losing a whole site or region |
| Chaos engineering | Injecting failures on purpose to check that the system survives them |
| Capacity planning | Making sure there are enough resources for the expected load |

## A small example: an error budget

The SLO: 99.9% of requests succeed, over 30 days.

```text
Minutes in 30 days:   30 x 24 x 60       = 43,200
Error budget:         0.1% of 43,200     = 43.2 minutes of full outage

Or in requests: at 10 million requests a month, 10,000 may fail.
```

| SLO | Allowed downtime in 30 days |
|---|---|
| 99% | 7.2 hours |
| 99.9% | 43.2 minutes |
| 99.99% | 4.3 minutes |
| 99.999% | 26 seconds |

How the budget is used:

- A bad deployment caused 20 minutes of errors. 23 minutes remain this month.
- **Budget left**: keep shipping features at full speed.
- **Budget spent**: stop risky releases and work on reliability until it recovers.

This turns the old argument between developers ("ship faster") and operations ("change nothing") into one shared number. It also shows why 100% is the wrong target: each extra nine costs about ten times more, and users cannot tell the difference past a point.

A service is also at most as reliable as what it depends on. Calling three services of 99.9% each, all required, gives about 99.7% at best.

## What a good incident looks like

1. **Detect** by an alert, not by a customer.
2. **Respond**: one person leads, communication goes in one channel, stakeholders get updates.
3. **Mitigate first.** Roll back, fail over, scale up. Finding the root cause comes after the users are fine.
4. **Postmortem** within days, blameless, with action items that have owners.
5. **Follow up** on the action items. Without this step the same incident returns.

## Where it goes next

- Beginner: define SLIs and SLOs for a real service and build the dashboard, write a runbook, run a practice incident.
- Advanced: burn-rate alerting, capacity planning and load testing, disaster-recovery exercises, chaos experiments, on-call health.

## See also

- [Observability](../09-observability/observability.md): where SLIs come from
- [Operating a database](../07-databases/operations.md): RPO and RTO in practice
- [DevOps intro: reliability](../01-get-started/intro.md)

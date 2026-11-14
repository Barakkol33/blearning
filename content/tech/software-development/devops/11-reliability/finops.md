---
title: Cost (FinOps)
order: 2
lang: en
tags: [intro]
updated: 2026-11-13
---

# Cost (FinOps)

**Level: intro**

In the cloud every engineer spends money with every resource they create, and the bill arrives a month later. FinOps is the practice of making cost visible and owned by the teams that cause it. A DevOps engineer is expected to know what the infrastructure costs and why.

## Terms

| Term | Meaning |
|---|---|
| On-demand | Pay per hour or second, no commitment. The list price |
| Reserved / savings plan / committed use | Commit to an amount of use for one to three years, for a large discount |
| Spot / preemptible | Spare capacity at a deep discount. The provider can take it back on short notice |
| Rightsizing | Fitting the size of a resource to what it really uses |
| Idle resource | Something that is paid for and does nothing: an unattached disk, a forgotten test environment |
| Tag / label | A key-value mark on a resource (team, environment, project) that lets cost be split by owner |
| Egress | Data leaving the cloud, or crossing regions and zones. Billed per GB |
| Budget alert | A notification when spending passes a threshold |
| Unit cost | Cost per something meaningful: per customer, per request, per order |
| Showback / chargeback | Showing each team its cost / actually billing the team for it |
| Cost anomaly | A sudden change in spending, usually a mistake or a leak |

## Where the money usually goes

1. **Compute**: machines, usually oversized or running when nobody uses them.
2. **Databases**: managed databases are among the most expensive single resources.
3. **Storage**: grows silently. Old snapshots, logs and backups nobody deletes.
4. **Data transfer**: egress, cross-zone traffic and NAT gateways. The hardest to predict.
5. **Observability**: logs and metrics volume, with commercial tools billed by volume.

## The tools

| Tool | What for |
|---|---|
| AWS Cost Explorer, Azure Cost Management, GCP Billing reports | The provider's own breakdown of the bill |
| Budgets and anomaly detection (in each cloud) | Alerts |
| OpenCost, Kubecost | Cost per namespace and workload in Kubernetes |
| Infracost | Shows the cost of a Terraform change in the pull request |

## A small example: one environment, three prices

A development environment of 3 machines at $0.10 per hour each.

```text
Always on:
  3 machines x $0.10 x 730 hours a month           = $219 a month

Only in working hours (12 hours a day, 5 days a week):
  60 of the week's 168 hours = 36% of the time
  $219 x 36%                                       = about $78 a month   (saves 64%)

Rightsized as well (monitoring shows 15% CPU use, so half-size machines):
  $78 / 2                                          = about $39 a month   (saves 82%)
```

Nothing here needed a new technology: a schedule and a smaller machine type. Most savings are of this kind.

For production, which runs all the time, the levers are different: commitments for the steady base load, spot for work that tolerates interruption, and autoscaling so that capacity follows the load.

## Habits

- **Tag everything** with an owner and an environment, enforced by policy. Untagged cost belongs to nobody and nobody reduces it.
- **Set budget alerts** on every account from day one.
- **Delete what a test created.** Short-lived environments should have an expiry.
- **Look at the bill monthly**, and at the top ten lines in detail.
- **Design with cost in mind**: traffic between zones and regions, log volume, and storage classes are architecture decisions.

## Where it goes next

- Beginner: read a real bill, set budgets and tags, add Infracost to a Terraform pipeline.
- Advanced: commitment strategy, spot at scale, Kubernetes cost allocation, unit economics, cost as part of architecture review.

## See also

- [Cloud concepts](../03-cloud/concepts.md)
- [Object storage](../08-services/object-storage.md): storage classes and lifecycle rules

---
title: Azure
order: 3
lang: en
tags: [intro]
updated: 2026-11-13
---

# Azure

**Level: intro**

Microsoft's cloud. It is strongest in enterprises that already use Microsoft products: Windows, Active Directory, Microsoft 365, .NET. Its style: everything belongs to a resource group, and identity comes from Entra ID.

## How it is organized

```text
Tenant (Entra ID: the users and identities of the organization)
└── Management groups (optional folders for policy)
    └── Subscription (billing and quota boundary)
        └── Resource group (resources that live and die together)
            └── Resources (a VM, a database, a storage account)
```

Permissions and policies set at one level are inherited by everything below it.

## Terms

| Term | Meaning |
|---|---|
| Entra ID | The identity service (formerly Azure Active Directory): users, groups, applications |
| Subscription | A billing unit and a boundary for quotas and access |
| Resource group | A folder for related resources. Deleting the group deletes everything in it |
| ARM | Azure Resource Manager: the API that every tool goes through |
| Bicep | Azure's own infrastructure-as-code language, compiled to ARM templates |
| Azure RBAC | Access control: a role assignment gives an identity a role on a scope |
| Managed identity | An identity for a resource (a VM, an app), so it can call other services without stored secrets |
| VNet | The private network. It holds subnets |
| NSG | Network security group: firewall rules on a subnet or a network interface |
| Storage account | Holds blobs (objects), file shares, queues and tables |
| AKS | Managed Kubernetes |
| Container Apps | Serverless containers |
| App Service | Managed hosting for web applications |
| Key Vault | Secrets, keys and certificates |
| Azure Monitor | Metrics, logs (Log Analytics) and alerts |

## A small example: a resource group and a storage account

```bash
az login
az account show --output table            # which subscription am I in?

az group create --name rg-demo --location westeurope

az storage account create \
  --name demonotes123456 \
  --resource-group rg-demo \
  --sku Standard_LRS

az resource list --resource-group rg-demo --output table
```

Giving an identity read access is a **role assignment**: a role, given to an identity, on a scope.

```bash
az role assignment create \
  --assignee <user-or-identity-id> \
  --role "Storage Blob Data Reader" \
  --scope $(az storage account show -n demonotes123456 -g rg-demo --query id -o tsv)
```

Clean up everything in one command, which is the point of resource groups:

```bash
az group delete --name rg-demo --yes
```

## What to learn first

Entra ID and RBAC, resource groups, VNets and NSGs, virtual machines, storage accounts, then AKS and Key Vault.

## Where it goes next

- Beginner: a VNet with a VM and a managed identity that reads a secret from Key Vault.
- Advanced: landing zones, Azure Policy, private endpoints, hybrid identity with on-premises Active Directory.

## See also

- [Cloud concepts](concepts.md), [AWS](aws.md), [GCP](gcp.md)

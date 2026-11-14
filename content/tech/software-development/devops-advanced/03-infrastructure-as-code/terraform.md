---
title: Terraform
order: 1
lang: en
tags: [intro]
updated: 2026-11-13
---

# Terraform

**Level: intro**

Terraform is the most common tool for infrastructure as code. You write what should exist (networks, machines, databases, DNS records), and Terraform works out which API calls will get you there. It works with every cloud and hundreds of other services through providers.

**OpenTofu** is an open-source fork of Terraform, created after Terraform's license changed in 2023. The language and the workflow are the same (`tofu` in place of `terraform`), so everything here applies to both.

## Terms

| Term | Meaning |
|---|---|
| Declarative | You describe the end state, not the steps to reach it |
| HCL | The language Terraform files (`.tf`) are written in |
| Provider | A plugin that knows one API: `aws`, `azurerm`, `google`, `kubernetes`, `github` |
| Resource | One thing Terraform manages: a bucket, a VM, a DNS record |
| Data source | Reads something that already exists, without managing it |
| State | Terraform's record of what it created and the real ID of each resource. Usually a file in remote storage |
| Backend | Where the state is stored (an S3 bucket, a storage account) and how it is locked |
| Plan | The diff between the files and the state: what will be created, changed, destroyed |
| Apply | Carrying out the plan |
| Variable / output | The inputs and the results of a configuration |
| Module | A reusable folder of Terraform code with variables and outputs |
| Drift | When the real infrastructure no longer matches the code, usually after a manual change |
| Idempotent | Applying twice gives the same result as applying once |

## A small example

This needs only Terraform itself, no cloud account. It manages a local file, and the workflow is the same as for real infrastructure.

`main.tf`:

```hcl
terraform {
  required_providers {
    local = {
      source = "hashicorp/local"
    }
  }
}

variable "name" {
  type    = string
  default = "world"
}

resource "local_file" "hello" {
  filename = "${path.module}/hello.txt"
  content  = "Hello, ${var.name}!\n"
}

output "path" {
  value = local_file.hello.filename
}
```

```bash
terraform init                      # downloads the provider
terraform plan                      # shows: 1 to add
terraform apply                     # asks for "yes", creates hello.txt

terraform plan                      # shows: no changes (idempotent)

terraform apply -var name=devops    # shows the change, then replaces the file

rm hello.txt                        # a "manual change" behind Terraform's back
terraform plan                      # detects the drift and plans to recreate it

terraform destroy
```

Look at `terraform.tfstate` after an apply: this is how Terraform remembers what it owns.

## Rules that save you later

- **Always read the plan** before applying, mainly the lines that say destroy or replace.
- **Keep state remote and locked**, never only on a laptop. It can contain secrets, so never commit it to Git.
- **Change infrastructure only through code.** A manual fix in the console becomes drift.
- **Pin provider versions**, and commit `.terraform.lock.hcl`.

## Where it goes next

- Beginner: a real cloud resource, a remote backend, a module, `terraform import`, workspaces or folders per environment.
- Advanced: state surgery, module design, testing, policy as code, running Terraform from [CI](../05-delivery/ci-cd.md), large-repo layout.

## See also

- [Configuration and images](configuration.md): the tools around Terraform
- [Cloud concepts](../02-cloud/concepts.md)

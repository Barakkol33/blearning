---
title: Configuration and images
order: 2
lang: en
tags: [intro, advanced]
updated: 2026-11-13
---

# Configuration and images

[Terraform](terraform.md) creates the machine. Something still has to install packages on it, write config files and start services. This page covers the tools for that step, and the other infrastructure-as-code tools you will meet.

**Levels on this page:** [Intro](#intro) · [Advanced](#advanced)

## Intro

### Terms

| Term | Meaning |
|---|---|
| Configuration management | Bringing a machine to a described state: packages, files, users, services |
| Mutable infrastructure | Servers are changed in place over their lifetime. They slowly become different from each other |
| Immutable infrastructure | Servers are never changed. A change means building a new image and replacing the servers |
| Golden image | A machine image with everything pre-installed, built once and started many times |
| cloud-init | A script or config that a cloud VM runs on its first boot |
| Inventory | Ansible's list of machines, in groups |
| Playbook | An Ansible file: which tasks to run on which group of machines |
| Module (Ansible) | One unit of work: install a package, copy a file, restart a service |
| Agentless | Needs nothing installed on the target. Ansible connects over SSH |

### The tools

| Tool | What it does | When you meet it |
|---|---|---|
| **Ansible** | Configures machines over SSH with YAML playbooks | VMs, on-premises servers, network devices |
| **Packer** | Builds machine images from a template | Golden images for immutable servers |
| **cloud-init** | First-boot setup of a cloud VM | Small setups, bootstrapping an agent |
| **Pulumi** | Like Terraform, written in a real language (TypeScript, Python, Go) | Teams that prefer code to HCL |
| **CloudFormation / Bicep** | The native IaC of AWS / Azure | Single-cloud shops |
| **Crossplane** | Manages cloud resources as Kubernetes objects | Platform teams built around Kubernetes |
| **Helm / Kustomize** | Templates and overlays for Kubernetes manifests | Every Kubernetes deployment |
| Chef, Puppet, Salt | Older configuration management, with agents | Existing large estates |

With containers, most of the "install and configure" work moved into the Dockerfile, and configuration management shrank to preparing the hosts.

### A small example: an Ansible playbook

`inventory.ini`:

```ini
[web]
10.0.1.10
10.0.1.11
```

`site.yml`:

```yaml
- name: Web servers
  hosts: web
  become: true
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true

    - name: Deploy the home page
      ansible.builtin.copy:
        content: "Hello from {{ inventory_hostname }}\n"
        dest: /var/www/html/index.html

    - name: Make sure nginx runs now and after reboot
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true
```

```bash
ansible-playbook -i inventory.ini site.yml --check   # dry run
ansible-playbook -i inventory.ini site.yml
```

The first run reports `changed` for each task. The second reports `ok`: each task describes a state, so there is nothing left to do. That is idempotency again, the property all these tools share.

## Advanced

### Topics to know

The topics and technologies to know at this level. Each line is a name to search for, and what it is. The lists of all pages are together in [Topics to know](../topics.md).

- **Ansible in depth**: roles, collections, Galaxy, handlers, Jinja2 templates, facts
- **Inventories**: static and dynamic inventories from a cloud
- **Ansible Vault**: encrypted variables in the repository
- **Idempotency and check mode**: `--check`, `--diff`, running a playbook twice safely
- **Testing roles**: Molecule, ansible-lint
- **AWX and Ansible Automation Platform**: running playbooks from a central service
- **Chef, Puppet and Salt**: agent-based configuration management, still common in older estates
- **Packer**: building machine images from code
- **Golden images and immutable infrastructure**: replacing servers instead of changing them
- **cloud-init**: configuring a VM on its first boot
- **Configuration drift**: detecting and correcting servers that changed by hand
- **NixOS and declarative systems**: a whole operating system described in code

## See also

- [GitOps](../06-delivery/gitops.md)
- [Kubernetes and Helm](../02-containers/kubernetes.md)

#!/usr/bin/env bash
# The DevOps lab on your laptop. Run without arguments for the list of commands.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLUSTER=devops-lab
CONTEXT="kind-$CLUSTER"
k() { kubectl --context "$CONTEXT" "$@"; }

# Pulumi keeps its state in a local folder: no account and no login needed.
# The empty passphrase is fine for a lab whose only secret is a lab password.
export PULUMI_BACKEND_URL="file://$ROOT/.pulumi-state"
export PULUMI_CONFIG_PASSPHRASE=""
export PULUMI_SKIP_UPDATE_CHECK=true

need() {
	for tool in "$@"; do
		command -v "$tool" >/dev/null || { echo "Missing tool: $tool (see README.md, Prerequisites)" >&2; exit 1; }
	done
}

pulumi_() { (cd "$ROOT/infra" && pulumi "$@"); }

# The image tag is a hash of the application's files, so a code change gives a new tag,
# and a new tag is what makes Kubernetes roll out new pods.
image_tag() {
	(cd "$ROOT/apps/shop" && find . -type f -not -path './node_modules/*' -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -c1-12)
}

cmd_cluster() {
	need kind kubectl docker
	if kind get clusters 2>/dev/null | grep -qx "$CLUSTER"; then
		echo "Cluster $CLUSTER already exists"
	else
		local config="$ROOT/kind-config.yaml"
		[ -n "${LAB_SMALL:-}" ] && config="$ROOT/kind-config-small.yaml"
		if ! kind create cluster --config "$config" --wait 120s; then
			cat >&2 <<'EOF'

The cluster could not be created. Common causes:
  - Another kind cluster is running and the machine's inotify limits are too low for both.
    Raise them:  sudo sysctl fs.inotify.max_user_instances=512 fs.inotify.max_user_watches=524288
    or use the smaller layout:  LAB_SMALL=1 ./lab.sh up
  - Port 8090 is in use by another program.
  - Docker has too little memory.
EOF
			exit 1
		fi
	fi
}

cmd_images() {
	need docker kind
	local tag; tag="$(image_tag)"
	echo "Building devops-lab/shop:$tag"
	docker build -q -t "devops-lab/shop:$tag" "$ROOT/apps/shop"
	# A kind cluster cannot see the images of your Docker. This copies the image into every node.
	# With a real cluster this step is `docker push` to a registry.
	kind load docker-image "devops-lab/shop:$tag" --name "$CLUSTER"
}

cmd_deploy() {
	need pulumi node npm
	mkdir -p "$ROOT/.pulumi-state"
	[ -d "$ROOT/infra/node_modules" ] || (cd "$ROOT/infra" && npm install --no-fund --no-audit)
	pulumi_ stack select local --create >/dev/null
	pulumi_ config set imageTag "$(image_tag)"
	pulumi_ up --yes --skip-preview "$@"
}

cmd_up() {
	cmd_cluster
	cmd_images
	cmd_deploy "$@"
	echo
	cmd_status
}

cmd_preview() {
	need pulumi
	pulumi_ stack select local --create >/dev/null
	pulumi_ config set imageTag "$(image_tag)"
	pulumi_ preview --diff "$@"
}

cmd_status() {
	need kubectl
	k get nodes
	echo
	k get pods -A --field-selector metadata.namespace!=kube-system,metadata.namespace!=local-path-storage -o wide
	echo
	k -n apps get hpa 2>/dev/null || true
	echo
	echo "Shop:        http://localhost:8090"
	echo "Grafana:     http://grafana.localhost:8090   (admin / admin, dashboard: Shop)"
	echo "Prometheus:  http://prometheus.localhost:8090"
}

cmd_load() {
	case "${1:-}" in
		on)  k -n apps scale deployment loadgen --replicas "${2:-1}" ;;
		off) k -n apps scale deployment loadgen --replicas 0 ;;
		*)   echo "Usage: ./lab.sh load on [replicas] | off" >&2; exit 1 ;;
	esac
}

cmd_psql() { k -n data exec -it postgres-0 -c postgres -- psql -U postgres -d shop "$@"; }
cmd_redis() { k -n data exec -it deploy/redis -c redis -- redis-cli "$@"; }
cmd_kafka() {
	local tool="${1:-kafka-topics.sh}"; shift || true
	k -n data exec -it kafka-0 -- "/opt/kafka/bin/$tool" --bootstrap-server localhost:9092 "$@"
}
cmd_es() {
	local path="${1:-_cluster/health?pretty}"; shift || true
	k -n data exec elasticsearch-0 -c elasticsearch -- curl -s "$@" "localhost:9200/$path"
}

cmd_test() { need kubectl curl; bash "$ROOT/test/smoke.sh"; }

cmd_destroy() { need pulumi; pulumi_ destroy --yes --skip-preview; }

cmd_down() {
	need kind
	kind delete cluster --name "$CLUSTER"
	# The state described a cluster that no longer exists
	rm -rf "$ROOT/.pulumi-state" "$ROOT"/infra/Pulumi.local.yaml
}

usage() {
	cat <<'EOF'
Usage: ./lab.sh <command>

  up                 create the cluster, build the image, deploy everything (safe to run again)
  status             nodes, pods, autoscaler and the URLs
  test               smoke test: is every part up, and does an order pass through all of them?
  preview            show what `up` would change, without changing anything
  images             rebuild the application image and load it into the cluster
  deploy             run Pulumi only (after changing code under infra/ or apps/)
  load on [n] | off  start n load generators (default 1) / stop them

  psql [args]        a PostgreSQL shell in the shop database
  redis [args]       redis-cli
  kafka [tool args]  a Kafka tool, e.g.: kafka kafka-consumer-groups.sh --describe --group order-workers
  es [path]          a GET on Elasticsearch, e.g.: es _cat/shards?v

  destroy            remove everything Pulumi created, keep the cluster
  down               delete the cluster
EOF
}

command="${1:-}"; shift || true
case "$command" in
	up|cluster|images|deploy|preview|status|test|load|psql|redis|kafka|es|destroy|down) "cmd_$command" "$@" ;;
	*) usage ;;
esac

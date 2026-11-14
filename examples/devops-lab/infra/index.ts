// The DevOps lab: a small production-like platform on a local Kubernetes cluster.
//
//   platform.ts    namespaces, ingress controller, metrics-server
//   data.ts        PostgreSQL, Redis, Kafka, Elasticsearch, and their metrics exporters
//   apps.ts        the shop: web page, API, worker, load generator
//   monitoring.ts  Prometheus, Grafana, a dashboard and alert rules
//
// Each file is one layer. A layer only uses what the layers above it export.
import { settings } from "./config";
import "./platform";
import "./data";
import "./apps";
import "./monitoring";

export const shop = "http://localhost:8090";
export const grafana = settings.monitoring ? "http://grafana.localhost:8090  (admin / admin)" : "off";
export const prometheus = settings.monitoring ? "http://prometheus.localhost:8090" : "off";
export const image = `devops-lab/shop:${settings.imageTag}`;

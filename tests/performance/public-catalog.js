import http from "k6/http";
import { check } from "k6";
import { Rate, Trend } from "k6/metrics";

const baseUrl = __ENV.BASE_URL || "http://localhost:8080";
const catalogErrors = new Rate("catalog_errors");
const catalogLatency = new Trend("catalog_latency", true);

export const options = {
  scenarios: { catalog: { executor: "constant-arrival-rate", rate: 200, timeUnit: "1s", duration: "30s", preAllocatedVUs: 50, maxVUs: 250 } },
  thresholds: { http_req_failed: ["rate<0.01"], http_req_duration: ["p(95)<500"], catalog_errors: ["rate<0.01"], catalog_latency: ["p(95)<500"] },
};

export default function () {
  const response = http.get(`${baseUrl}/api/v1/public/projects/search?page=0&pageSize=20`, { tags: { endpoint: "public-catalog" } });
  catalogLatency.add(response.timings.duration);
  const ok = check(response, { "catalog responds 200": (r) => r.status === 200, "catalog has page envelope": (r) => r.json("items") !== undefined });
  catalogErrors.add(!ok);
}

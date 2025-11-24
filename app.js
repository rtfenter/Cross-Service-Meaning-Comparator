// Field data for the comparator.
// This is intentionally small and legible: enough to show real drift patterns.
const FIELD_DATA = [
  {
    id: "account_status",
    label: "account_status",
    description:
      "Represents the current lifecycle state of a customer account across core systems.",
    canonical: {
      description:
        "Customer lifecycle status for the account as tracked by the source-of-truth system.",
      type: "string (enum)",
      enums: ["ACTIVE", "SUSPENDED", "CLOSED"],
      invariants: [
        "Exactly one active lifecycle status per account",
        "Status changes emitted as append-only events"
      ],
      examples: ["ACTIVE", "SUSPENDED"]
    },
    services: [
      {
        name: "Identity Service",
        role: "Source of truth for account + user lifecycle.",
        type: "string (enum)",
        enums: ["ACTIVE", "SUSPENDED", "CLOSED"],
        invariants: [
          "Status only changes via explicit lifecycle workflows",
          "All status changes are audited"
        ],
        examples: ["ACTIVE", "SUSPENDED"],
        notes: "Aligned with canonical lifecycle definition.",
        driftLevel: "low"
      },
      {
        name: "Billing Service",
        role: "Controls invoicing and payment eligibility.",
        type: "string (enum)",
        enums: ["ACTIVE", "PAST_DUE", "CLOSED"],
        invariants: [
          "Billing status is derived from invoices + payments",
          "Past due accounts can still be ACTIVE in identity"
        ],
        examples: ["ACTIVE", "PAST_DUE"],
        notes:
          "Repurposes account_status to represent billing state instead of pure lifecycle.",
        driftLevel: "medium"
      },
      {
        name: "Customer Portal",
        role: "Displays account status to end users.",
        type: "string (enum)",
        enums: ["ACTIVE", "ON_HOLD", "CLOSED"],
        invariants: [
          "Portal hides SUSPENDED and PAST_DUE, showing ON_HOLD instead",
          "Some internal states are never surfaced to the user"
        ],
        examples: ["ACTIVE", "ON_HOLD"],
        notes:
          "Introduces ON_HOLD as a user-facing aggregation of multiple internal states.",
        driftLevel: "high"
      }
    ]
  },
  {
    id: "plan_tier",
    label: "plan_tier",
    description:
      "Represents the commercial tier of a customer's subscription plan.",
    canonical: {
      description:
        "Commercial subscription tier as defined by the pricing catalog.",
      type: "string (enum)",
      enums: ["FREE", "STANDARD", "PREMIUM"],
      invariants: [
        "Exactly one plan tier per active subscription",
        "All tiers must exist in the pricing catalog"
      ],
      examples: ["STANDARD", "PREMIUM"]
    },
    services: [
      {
        name: "Catalog Service",
        role: "Defines available plans and commercial tiers.",
        type: "string (enum)",
        enums: ["FREE", "STANDARD", "PREMIUM"],
        invariants: [
          "Tiers are versioned and controlled by pricing operations"
        ],
        examples: ["FREE", "STANDARD", "PREMIUM"],
        notes: "Canonical definition lives here.",
        driftLevel: "low"
      },
      {
        name: "Subscription Service",
        role: "Tracks active subscriptions and upgrades/downgrades.",
        type: "string (enum)",
        enums: ["FREE", "STANDARD", "PREMIUM", "LEGACY_ENTERPRISE"],
        invariants: [
          "LEGACY_ENTERPRISE is allowed for historical subscriptions only",
          "New subscriptions must use catalog-backed tiers"
        ],
        examples: ["STANDARD", "PREMIUM", "LEGACY_ENTERPRISE"],
        notes:
          "Introduces a legacy-only tier that doesn't exist in the current catalog.",
        driftLevel: "medium"
      },
      {
        name: "Analytics Warehouse",
        role: "Aggregates revenue and usage by tier.",
        type: "string",
        enums: [],
        invariants: [
          "Tier is treated as free-form text in historical data",
          "Reports normalize multiple legacy values into a single bucket"
        ],
        examples: ["STD", "PREMIUM", "LEGACY_ENT", "Standard"],
        notes:
          "Lack of strict enum enforcement leads to multiple spellings and aliases.",
        driftLevel: "high"
      }
    ]
  },
  {
    id: "event_timestamp",
    label: "event_timestamp",
    description:
      "Timestamp representing when an event occurred within the system.",
    canonical: {
      description:
        "UTC timestamp indicating when the business event actually happened.",
      type: "string (ISO-8601, UTC)",
      enums: [],
      invariants: [
        "Always stored and emitted in UTC",
        "Represents business-time, not processing-time"
      ],
      examples: ["2025-11-24T08:31:00Z"]
    },
    services: [
      {
        name: "Event Producer",
        role: "Emits domain events.",
        type: "string (ISO-8601, UTC)",
        enums: [],
        invariants: [
          "Timestamp captured at the moment the business action completes",
          "Clock is synchronized via NTP"
        ],
        examples: ["2025-11-24T08:31:00Z"],
        notes:
          "Aligned with canonical business-time timestamp in UTC.",
        driftLevel: "low"
      },
      {
        name: "Ingestion Pipeline",
        role: "Buffers and forwards events to downstream consumers.",
        type: "string (ISO-8601, UTC)",
        enums: [],
        invariants: [
          "If event_timestamp is missing, falls back to received_at",
          "Does not distinguish between business-time and processing-time in fallback"
        ],
        examples: ["2025-11-24T08:31:00Z", "2025-11-24T08:31:03Z"],
        notes:
          "Introduces mixing of business-time and processing-time via fallback behavior.",
        driftLevel: "medium"
      },
      {
        name: "Analytics Warehouse",
        role: "Used for time-based attribution and reporting.",
        type: "timestamp with timezone (varies by region)",
        enums: [],
        invariants: [
          "Events are converted into local timezone for some reports",
          "Historical backfills may reuse load_time instead of event_timestamp"
        ],
        examples: ["2025-11-24 01:31:00-07", "2025-11-24 08:31:03Z"],
        notes:
          "Blends business-time, processing-time, and local-time for reporting convenience.",
        driftLevel: "high"
      }
    ]
  }
];

// Map drift level to label + summary styles.
const DRIFT_LABELS = {
  low: "Low drift",
  medium: "Medium drift",
  high: "High drift"
};

function init() {
  const select = document.getElementById("field-select");
  const descriptionEl = document.getElementById("field-description");
  const summaryBadge = document.getElementById("summary-badge");
  const comparisonContainer = document.getElementById("comparison-container");
  const detailsCard = document.getElementById("details-card");

  // Populate field dropdown
  FIELD_DATA.forEach((field, index) => {
    const option = document.createElement("option");
    option.value = field.id;
    option.textContent = `${field.label}`;
    if (index === 0) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  // Render initial selection
  if (FIELD_DATA.length > 0) {
    renderField(FIELD_DATA[0]);
  }

  select.addEventListener("change", () => {
    const selectedId = select.value;
    const field = FIELD_DATA.find((f) => f.id === selectedId);
    if (!field) return;
    renderField(field);
  });

  function renderField(field) {
    descriptionEl.textContent = field.description;

    const analysis = analyzeField(field);

    // Update summary badge
    summaryBadge.className = "summary-badge";
    summaryBadge.classList.add(`summary-badge-${analysis.overallDriftLevel}`);
    summaryBadge.innerHTML = `
      <span class="count">${analysis.serviceCount} services</span>
      · ${DRIFT_LABELS[analysis.overallDriftLevel]}
      · ${analysis.keySignals.join(" · ")}
    `;

    // Render comparison columns
    renderComparison(field, analysis, comparisonContainer);

    // Render mismatch summary
    renderDetails(field, analysis, detailsCard);
  }
}

// Analyze drift for a field.
function analyzeField(field) {
  const canonical = field.canonical;
  const services = field.services || [];
  const serviceCount = services.length;

  let highestDrift = "low";
  let typeMismatchCount = 0;
  let enumMismatchCount = 0;
  let invariantMismatchCount = 0;

  const driftOrder = ["low", "medium", "high"];

  const perServiceAnalysis = services.map((svc) => {
    // Type mismatch
    const typeMismatch = svc.type.trim() !== canonical.type.trim();

    // Enum mismatch (ignore if canonical has no enums)
    let enumMismatch = false;
    if (canonical.enums && canonical.enums.length > 0) {
      const canonSet = new Set(canonical.enums);
      const svcSet = new Set(svc.enums || []);
      const added = [];
      const missing = [];

      svcSet.forEach((v) => {
        if (!canonSet.has(v)) added.push(v);
      });
      canonSet.forEach((v) => {
        if (!svcSet.has(v)) missing.push(v);
      });

      enumMismatch = added.length > 0 || missing.length > 0;
    }

    // Invariant mismatch: simple heuristic — different text length / content
    let invariantMismatch = false;
    if ((canonical.invariants || []).length && (svc.invariants || []).length) {
      invariantMismatch =
        JSON.stringify(canonical.invariants) !==
        JSON.stringify(svc.invariants);
    }

    if (typeMismatch) typeMismatchCount++;
    if (enumMismatch) enumMismatchCount++;
    if (invariantMismatch) invariantMismatchCount++;

    const driftLevel = svc.driftLevel || "low";
    if (
      driftOrder.indexOf(driftLevel) > driftOrder.indexOf(highestDrift)
    ) {
      highestDrift = driftLevel;
    }

    return {
      service: svc,
      typeMismatch,
      enumMismatch,
      invariantMismatch
    };
  });

  const keySignals = [];
  if (typeMismatchCount > 0) {
    keySignals.push(`${typeMismatchCount} type mismatch${typeMismatchCount > 1 ? "es" : ""}`);
  }
  if (enumMismatchCount > 0) {
    keySignals.push(`${enumMismatchCount} enum drift`);
  }
  if (invariantMismatchCount > 0) {
    keySignals.push(`${invariantMismatchCount} invariant difference`);
  }
  if (keySignals.length === 0) {
    keySignals.push("No critical mismatches detected in sample");
  }

  return {
    serviceCount,
    overallDriftLevel: highestDrift,
    perServiceAnalysis,
    keySignals
  };
}

// Render the comparison grid.
function renderComparison(field, analysis, container) {
  container.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "comparison-grid";

  // Canonical column
  const canonicalCol = document.createElement("div");
  canonicalCol.className = "comparison-column";
  canonicalCol.innerHTML = `
    <div class="comparison-column-header">
      <div>
        <p class="comparison-column-title">Canonical Definition</p>
        <p class="comparison-column-subtitle">Source of truth</p>
      </div>
      <span class="alignment-pill alignment-low">Reference</span>
    </div>
    <div class="comparison-row">
      <div class="comparison-row-label">Description</div>
      <div class="comparison-row-value">${field.canonical.description}</div>
    </div>
    <div class="comparison-row">
      <div class="comparison-row-label">Type</div>
      <div class="comparison-row-value comparison-row-value-mono">${field.canonical.type}</div>
    </div>
    <div class="comparison-row">
      <div class="comparison-row-label">Enums</div>
      <div class="comparison-row-value comparison-row-value-mono">
        ${field.canonical.enums && field.canonical.enums.length
          ? field.canonical.enums.join(", ")
          : "—"}
      </div>
    </div>
    <div class="comparison-row">
      <div class="comparison-row-label">Invariants</div>
      <div class="comparison-row-value">
        ${renderList(field.canonical.invariants)}
      </div>
    </div>
    <div class="comparison-row">
      <div class="comparison-row-label">Example Values</div>
      <div class="comparison-row-value comparison-row-value-mono">
        ${field.canonical.examples && field.canonical.examples.length
          ? field.canonical.examples.join(", ")
          : "—"}
      </div>
    </div>
  `;
  grid.appendChild(canonicalCol);

  // Service columns
  analysis.perServiceAnalysis.forEach((entry) => {
    const svc = entry.service;
    const col = document.createElement("div");
    col.className = "comparison-column";

    const alignmentClass = `alignment-${svc.driftLevel || "low"}`;
    const alignmentLabel = DRIFT_LABELS[svc.driftLevel || "low"] || "Low drift";

    col.innerHTML = `
      <div class="comparison-column-header">
        <div>
          <p class="comparison-column-title">${svc.name}</p>
          <p class="comparison-column-subtitle">${svc.role}</p>
        </div>
        <span class="alignment-pill ${alignmentClass}">${alignmentLabel}</span>
      </div>

      <div class="comparison-row">
        <div class="comparison-row-label">Description</div>
        <div class="comparison-row-value">${svc.notes || svc.description || "—"}</div>
      </div>

      <div class="comparison-row">
        <div class="comparison-row-label">Type</div>
        <div class="comparison-row-value comparison-row-value-mono">
          ${svc.type || "—"}
        </div>
      </div>

      <div class="comparison-row">
        <div class="comparison-row-label">Enums</div>
        <div class="comparison-row-value comparison-row-value-mono">
          ${svc.enums && svc.enums.length ? svc.enums.join(", ") : "—"}
        </div>
      </div>

      <div class="comparison-row">
        <div class="comparison-row-label">Invariants</div>
        <div class="comparison-row-value">
          ${renderList(svc.invariants)}
        </div>
      </div>

      <div class="comparison-row">
        <div class="comparison-row-label">Example Values</div>
        <div class="comparison-row-value comparison-row-value-mono">
          ${svc.examples && svc.examples.length ? svc.examples.join(", ") : "—"}
        </div>
      </div>
    `;

    grid.appendChild(col);
  });

  container.appendChild(grid);
}

// Render mismatch summary in the details card.
function renderDetails(field, analysis, detailsCard) {
  detailsCard.innerHTML = "";

  const title = document.createElement("h3");
  title.textContent = "Mismatch Summary";
  detailsCard.appendChild(title);

  const meta = document.createElement("p");
  meta.className = "details-meta";
  meta.textContent = `${analysis.serviceCount} services compared for "${field.label}".`;
  detailsCard.appendChild(meta);

  const section = document.createElement("div");
  section.className = "details-section";

  const sectionTitle = document.createElement("h4");
  sectionTitle.textContent = "Key Signals";
  section.appendChild(sectionTitle);

  const list = document.createElement("ul");
  analysis.keySignals.forEach((signal) => {
    const li = document.createElement("li");
    li.textContent = signal;
    list.appendChild(li);
  });
  section.appendChild(list);

  detailsCard.appendChild(section);

  const driftSection = document.createElement("div");
  driftSection.className = "details-section";

  const driftTitle = document.createElement("h4");
  driftTitle.textContent = "Per-Service Drift Notes";
  driftSection.appendChild(driftTitle);

  const driftList = document.createElement("ul");
  analysis.perServiceAnalysis.forEach((entry) => {
    const svc = entry.service;
    const li = document.createElement("li");
    const flags = [];

    if (entry.typeMismatch) flags.push("type mismatch");
    if (entry.enumMismatch) flags.push("enum drift");
    if (entry.invariantMismatch) flags.push("invariant differences");

    const driftLabel =
      DRIFT_LABELS[svc.driftLevel || "low"] || "Low drift";

    li.textContent = `${svc.name}: ${driftLabel}${
      flags.length ? ` (${flags.join(", ")})` : ""
    }`;
    driftList.appendChild(li);
  });

  driftSection.appendChild(driftList);
  detailsCard.appendChild(driftSection);
}

// Helper: render list of strings as bullet HTML.
function renderList(items) {
  if (!items || !items.length) {
    return "—";
  }
  const escaped = items
    .map((item) => `<li>${item}</li>`)
    .join("");
  return `<ul>${escaped}</ul>`;
}

document.addEventListener("DOMContentLoaded", init);

// SECTION: State
const state = {
  vehicles: [],
  workOrders: [],
  templates: [],
  mileageLogs: [],
  selectedWorkOrderId: null,
  selectedTemplateId: null,
};

// Demo seed data
function seedDemoData() {
  state.vehicles = [
    {
      id: "v1",
      type: "truck",
      unit: "T-101",
      plate: "ABC 123",
      vin: "1HTMMAAL1AH123456",
      mileage: 423515,
      notes: "Linehaul tractor",
      nextServiceMileage: 425000,
    },
    {
      id: "v2",
      type: "trailer",
      unit: "TR-22",
      plate: "TR 9821",
      vin: "1UYVS2538AM123789",
      mileage: 198200,
      notes: "53' dry van",
      nextServiceMileage: 200000,
    },
  ];

  state.templates = [
    {
      id: "t1",
      name: "Truck A-Service (PM)",
      appliesTo: "truck",
      intervalMiles: 25000,
      notes: "Standard A-service for road tractors.",
      steps: [
        "Drain engine oil and replace filter",
        "Inspect belts and hoses",
        "Inspect steering and suspension components",
        "Check brakes and record lining thickness",
        "Inspect lights and electrical",
      ],
    },
    {
      id: "t2",
      name: "Trailer PMI",
      appliesTo: "trailer",
      intervalMiles: 30000,
      notes: "Visual inspection + brake, lights, and tires.",
      steps: [
        "Inspect landing gear and bracing",
        "Check kingpin and upper coupler",
        "Inspect brake lines and chambers",
        "Check tire condition and pressure",
        "Verify all marker and brake lights",
      ],
    },
  ];

  state.workOrders = [
    {
      id: "wo1",
      vehicleId: "v1",
      type: "PM Service",
      summary: "A-service + chassis inspection",
      status: "open",
      openedDate: new Date().toISOString().slice(0, 10),
      mileage: 423515,
      notes: "Add DOT inspection if time allows.",
      templateId: "t1",
      checklist: [],
      lineItems: [
        {
          id: "li1",
          kind: "labor",
          description: "PM service (A) - tractor",
          qty: 3,
          rate: 115,
        },
        {
          id: "li2",
          kind: "parts",
          description: "Engine oil & filter",
          qty: 1,
          rate: 180,
        },
      ],
    },
  ];

  state.mileageLogs = [
    { id: "m1", vehicleId: "v1", value: 423515, date: new Date().toISOString().slice(0, 10) },
    { id: "m2", vehicleId: "v2", value: 198200, date: new Date().toISOString().slice(0, 10) },
  ];
}

// SECTION: Utilities
function $(selector) {
  return document.querySelector(selector);
}

function createEl(tag, className, attrs = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "text") el.textContent = v;
    else el.setAttribute(k, v);
  });
  return el;
}

function formatMoney(amount) {
  return `$${amount.toFixed(2)}`;
}

function uuid() {
  return Math.random().toString(36).slice(2, 10);
}

// SECTION: Rendering - Fleet
function renderFleet() {
  const list = $("#fleetList");
  const search = $("#fleetSearch").value.toLowerCase();
  const typeFilter = $("#fleetTypeFilter").value;

  list.innerHTML = "";

  let filtered = state.vehicles.filter((v) => {
    if (typeFilter !== "all" && v.type !== typeFilter) return false;
    if (!search) return true;
    const haystack = `${v.unit} ${v.plate} ${v.vin} ${v.notes || ""}`.toLowerCase();
    return haystack.includes(search);
  });

  if (!filtered.length) {
    const empty = createEl("div", "empty-state");
    empty.innerHTML = "<h3>No units yet</h3><p>Add your first truck or trailer.</p>";
    list.appendChild(empty);
  } else {
    filtered.forEach((v) => {
      const row = createEl("div", "table-row");

      const unitCell = createEl("div");
      const unitMain = createEl("div", "unit-label", { text: v.unit });
      const unitMeta = createEl("div", "unit-meta", { text: v.notes || "" });
      unitCell.appendChild(unitMain);
      unitCell.appendChild(unitMeta);

      const type = createEl("span", null, { text: v.type === "truck" ? "Truck" : "Trailer" });
      const plate = createEl("span", null, { text: v.plate || "-" });
      const vin = createEl("span", null, { text: v.vin || "-" });
      const mileage = createEl("span", null, {
        text: v.mileage != null ? `${v.mileage.toLocaleString()} mi` : "-",
      });
      const nextService = createEl("span", null, {
        text:
          v.nextServiceMileage && v.mileage != null
            ? `${v.nextServiceMileage.toLocaleString()} mi`
            : "—",
      });

      const actions = createEl("div", "column-actions");
      const editBtn = createEl("button", "btn btn-ghost btn-ghost-sm line-item-remove", {
        type: "button",
      });
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => openVehicleModal(v));
      const delBtn = createEl("button", "btn btn-ghost btn-ghost-sm line-item-remove", {
        type: "button",
      });
      delBtn.textContent = "Remove";
      delBtn.addEventListener("click", () => removeVehicle(v.id));
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      row.appendChild(unitCell);
      [type, plate, vin, mileage, nextService, actions].forEach((cell) => row.appendChild(cell));

      list.appendChild(row);
    });
  }

  $("#fleetCountMeta").textContent = `${state.vehicles.length} units`;
  renderVehicleSelects();
}

function removeVehicle(id) {
  if (!confirm("Remove this unit from fleet?")) return;
  state.vehicles = state.vehicles.filter((v) => v.id !== id);
  // Also remove related mileage logs and work orders
  state.mileageLogs = state.mileageLogs.filter((m) => m.vehicleId !== id);
  state.workOrders = state.workOrders.filter((wo) => wo.vehicleId !== id);
  if (state.selectedWorkOrderId && !state.workOrders.find((w) => w.id === state.selectedWorkOrderId)) {
    state.selectedWorkOrderId = null;
  }
  renderAll();
}

// SECTION: Rendering - Work Orders
function computeWorkOrderTotals(wo) {
  let labor = 0;
  let parts = 0;
  (wo.lineItems || []).forEach((li) => {
    const total = (Number(li.qty) || 0) * (Number(li.rate) || 0);
    if (li.kind === "labor") labor += total;
    else parts += total;
  });
  return { labor, parts, total: labor + parts };
}

function renderWorkOrders() {
  const list = $("#workOrderList");
  const statusFilter = $("#woStatusFilter").value;
  list.innerHTML = "";

  const filtered = state.workOrders.filter((wo) =>
    statusFilter === "all" ? true : wo.status === statusFilter,
  );

  if (!filtered.length) {
    const empty = createEl("div", "empty-state");
    empty.innerHTML =
      "<h3>No work orders</h3><p>Create a work order to start tracking labor, parts, and checklists.</p>";
    list.appendChild(empty);
  } else {
    filtered.forEach((wo) => {
      const card = createEl("article", "wo-card");
      if (wo.id === state.selectedWorkOrderId) card.classList.add("is-selected");

      const vehicle = state.vehicles.find((v) => v.id === wo.vehicleId);
      const { total } = computeWorkOrderTotals(wo);

      const titleRow = createEl("div", "wo-card-title-row");
      const title = createEl("h3", "wo-card-title", {
        text: wo.summary || `${wo.type} · ${vehicle ? vehicle.unit : "Unknown"}`,
      });
      const statusPill = createEl("span", `status-pill status-${wo.status}`, {
        text: wo.status.replace("-", " "),
      });
      titleRow.appendChild(title);
      titleRow.appendChild(statusPill);

      const sub = createEl("div", "wo-card-sub", {
        text: `${wo.type} • ${vehicle ? vehicle.unit : "?"} • ${
          wo.openedDate || ""
        }`,
      });

      const footer = createEl("div", "wo-card-footer");
      const meta = createEl("div", "wo-meta", {
        text: wo.mileage ? `${wo.mileage.toLocaleString()} mi` : "Mileage n/a",
      });
      const amount = createEl("div", "wo-amount", { text: formatMoney(total) });
      footer.appendChild(meta);
      footer.appendChild(amount);

      card.appendChild(titleRow);
      card.appendChild(sub);
      card.appendChild(footer);

      card.addEventListener("click", () => {
        state.selectedWorkOrderId = wo.id;
        renderWorkOrders();
        renderWorkOrderDetail();
      });

      list.appendChild(card);
    });
  }

  const openCount = state.workOrders.filter((w) => w.status !== "closed").length;
  $("#openWoMeta").textContent = `${openCount} open`;
}

function renderWorkOrderDetail() {
  const container = $("#workOrderDetail");
  const empty = $("#workOrderEmptyState");

  const wo = state.workOrders.find((w) => w.id === state.selectedWorkOrderId);
  if (!wo) {
    container.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  container.classList.remove("hidden");
  empty.classList.add("hidden");

  const vehicle = state.vehicles.find((v) => v.id === wo.vehicleId);
  const { labor, parts, total } = computeWorkOrderTotals(wo);

  $("#woDetailTitle").textContent = `${wo.id.toUpperCase()} · ${wo.type}`;
  $("#woDetailMeta").textContent = `${vehicle ? vehicle.unit : "Unknown unit"} • ${
    wo.openedDate || ""
  }`;
  $("#woDetailUnit").textContent = vehicle ? `${vehicle.unit} (${vehicle.type})` : "-";
  $("#woDetailOpened").textContent = wo.openedDate || "-";
  $("#woDetailMileage").textContent = wo.mileage
    ? `${wo.mileage.toLocaleString()} mi`
    : "-";

  const status = $("#woDetailStatus");
  status.textContent = wo.status.replace("-", " ");
  status.className = `status-pill status-${wo.status}`;

  // Render line items
  const body = $("#lineItemsBody");
  body.innerHTML = "";
  (wo.lineItems || []).forEach((li) => {
    const row = createEl("div", "line-item-row");

    const typeSelect = createEl("select", "input line-item-input");
    [
      { value: "labor", label: "Labor" },
      { value: "parts", label: "Parts" },
    ].forEach((opt) => {
      const o = createEl("option", null, { value: opt.value, text: opt.label });
      if (opt.value === li.kind) o.selected = true;
      typeSelect.appendChild(o);
    });

    const desc = createEl("input", "input line-item-input", {
      type: "text",
      value: li.description || "",
      placeholder: "Description",
    });
    const qty = createEl("input", "input line-item-input", {
      type: "number",
      value: li.qty ?? 1,
      min: "0",
      step: "0.25",
    });
    const rate = createEl("input", "input line-item-input", {
      type: "number",
      value: li.rate ?? 0,
      min: "0",
      step: "1",
    });
    const totalCell = createEl("div", "line-item-total");
    const removeBtn = createEl("button", "icon-button line-item-remove", {
      type: "button",
    });
    removeBtn.textContent = "×";

    function sync() {
      li.kind = typeSelect.value;
      li.description = desc.value;
      li.qty = Number(qty.value) || 0;
      li.rate = Number(rate.value) || 0;
      const total = (li.qty || 0) * (li.rate || 0);
      totalCell.textContent = formatMoney(total);
      const totals = computeWorkOrderTotals(wo);
      $("#woLaborTotal").textContent = formatMoney(totals.labor);
      $("#woPartsTotal").textContent = formatMoney(totals.parts);
      $("#woGrandTotal").textContent = formatMoney(totals.total);
      renderWorkOrders();
    }

    [typeSelect, desc, qty, rate].forEach((input) => {
      input.addEventListener("change", sync);
      input.addEventListener("blur", sync);
    });

    removeBtn.addEventListener("click", () => {
      wo.lineItems = wo.lineItems.filter((x) => x.id !== li.id);
      renderWorkOrderDetail();
      renderWorkOrders();
    });

    sync();

    [typeSelect, desc, qty, rate, totalCell, removeBtn].forEach((cell) => row.appendChild(cell));
    body.appendChild(row);
  });

  $("#woNotes").value = wo.notes || "";
  $("#woNotes").onchange = (e) => {
    wo.notes = e.target.value;
  };

  $("#woLaborTotal").textContent = formatMoney(labor);
  $("#woPartsTotal").textContent = formatMoney(parts);
  $("#woGrandTotal").textContent = formatMoney(total);

  // Checklist: template options + items
  const templateSelect = $("#woTemplateSelect");
  templateSelect.innerHTML = '<option value="">Apply template…</option>';
  state.templates.forEach((t) => {
    const opt = createEl("option", null, {
      value: t.id,
      text: `${t.name} (${t.appliesTo})`,
    });
    if (wo.templateId === t.id) opt.selected = true;
    templateSelect.appendChild(opt);
  });

  templateSelect.onchange = () => {
    if (!templateSelect.value) return;
    const tmpl = state.templates.find((t) => t.id === templateSelect.value);
    if (!tmpl) return;
    wo.templateId = tmpl.id;
    wo.checklist = tmpl.steps.map((step) => ({ id: uuid(), text: step, done: false }));
    renderWorkOrderDetail();
  };

  const list = $("#woChecklist");
  list.innerHTML = "";
  if (!wo.checklist || !wo.checklist.length) {
    const li = createEl("li", "wo-meta", {
      text: "No checklist attached. Apply a template or add steps to the template first.",
    });
    list.appendChild(li);
  } else {
    wo.checklist.forEach((item) => {
      const li = createEl("li", "checklist-item");
      if (item.done) li.classList.add("completed");

      const cb = createEl("input", null, {
        type: "checkbox",
      });
      cb.checked = !!item.done;
      cb.addEventListener("change", () => {
        item.done = cb.checked;
        if (item.done) li.classList.add("completed");
        else li.classList.remove("completed");
      });

      const label = createEl("div", "checklist-label", { text: item.text });

      li.appendChild(cb);
      li.appendChild(label);
      list.appendChild(li);
    });
  }
}

// SECTION: Rendering - Mileage
function renderVehicleSelects() {
  const mileageSelect = $("#mileageVehicle");
  const woVehicleSelect = $("#woVehicle");

  [mileageSelect, woVehicleSelect].forEach((sel) => {
    if (!sel) return;
    sel.innerHTML = "";
    state.vehicles.forEach((v) => {
      const opt = createEl("option", null, {
        value: v.id,
        text: `${v.unit} (${v.type})`,
      });
      sel.appendChild(opt);
    });
  });

  // default mileage unit label
  const label = $("#mileageUnitLabel");
  if (state.vehicles[0]) label.textContent = state.vehicles[0].unit;
}

function renderMileageHistory(vehicleId) {
  const history = $("#mileageHistory");
  const label = $("#mileageUnitLabel");

  const vehicle = state.vehicles.find((v) => v.id === vehicleId);
  history.innerHTML = "";
  if (!vehicle) {
    label.textContent = "Select a unit";
    return;
  }
  label.textContent = vehicle.unit;

  const logs = state.mileageLogs
    .filter((m) => m.vehicleId === vehicleId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (!logs.length) {
    const empty = createEl("div", "wo-meta", { text: "No readings yet." });
    history.appendChild(empty);
    return;
  }

  logs.forEach((log) => {
    const row = createEl("div", "timeline-item");
    const main = createEl("div", "timeline-main", {
      text: `${log.value.toLocaleString()} mi`,
    });
    const meta = createEl("div", "timeline-meta", { text: log.date });
    row.appendChild(main);
    row.appendChild(meta);
    history.appendChild(row);
  });
}

// SECTION: Rendering - Templates
function renderTemplates() {
  const list = $("#templateList");
  list.innerHTML = "";

  if (!state.templates.length) {
    const empty = createEl("div", "empty-state");
    empty.innerHTML =
      "<h3>No templates yet</h3><p>Create a template to standardize inspections.</p>";
    list.appendChild(empty);
  } else {
    state.templates.forEach((t) => {
      const card = createEl("article", "template-card");
      if (t.id === state.selectedTemplateId) card.classList.add("is-selected");

      const title = createEl("h3", "wo-card-title", { text: t.name });
      const sub = createEl("div", "wo-card-sub", {
        text: `${t.appliesTo} • ${t.steps.length} steps${
          t.intervalMiles ? ` • ${t.intervalMiles.toLocaleString()} mi` : ""
        }`,
      });

      card.appendChild(title);
      card.appendChild(sub);
      card.addEventListener("click", () => {
        state.selectedTemplateId = t.id;
        renderTemplates();
        renderTemplateDetail();
      });

      list.appendChild(card);
    });
  }

  $("#templateMeta").textContent = `${state.templates.length} templates`;
}

function renderTemplateDetail() {
  const container = $("#templateDetail");
  const empty = $("#templateEmptyState");

  const tmpl = state.templates.find((t) => t.id === state.selectedTemplateId);
  if (!tmpl) {
    container.classList.add("hidden");
    empty.classList.remove("hidden");
    return;
  }

  container.classList.remove("hidden");
  empty.classList.add("hidden");

  $("#templateDetailName").textContent = tmpl.name;
  $("#templateDetailMeta").textContent = `${tmpl.appliesTo} • ${tmpl.steps.length} steps$${
    tmpl.intervalMiles ? ` • ${tmpl.intervalMiles.toLocaleString()} mi interval` : ""
  }`;
  $("#templateNotes").value = tmpl.notes || "";
  $("#templateNotes").onchange = (e) => {
    tmpl.notes = e.target.value;
  };

  const list = $("#templateSteps");
  list.innerHTML = "";
  tmpl.steps.forEach((step, index) => {
    const li = createEl("li", "checklist-item");
    const labelInput = createEl("input", "checklist-label-input", {
      type: "text",
      value: step,
    });
    labelInput.addEventListener("change", () => {
      tmpl.steps[index] = labelInput.value;
    });

    const removeBtn = createEl("button", "icon-button line-item-remove", {
      type: "button",
    });
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => {
      tmpl.steps.splice(index, 1);
      renderTemplateDetail();
    });

    li.appendChild(labelInput);
    li.appendChild(removeBtn);
    list.appendChild(li);
  });
}

// SECTION: Modals
function openModal(modal) {
  $("#modalBackdrop").classList.add("is-visible");
  modal.classList.remove("hidden");
}

function closeModal(modal) {
  modal.classList.add("hidden");
  $("#modalBackdrop").classList.remove("is-visible");
}

function setupModalCloseHandlers() {
  document.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      if (modal) closeModal(modal);
    });
  });

  $("#modalBackdrop").addEventListener("click", () => {
    document.querySelectorAll(".modal").forEach((m) => m.classList.add("hidden"));
    $("#modalBackdrop").classList.remove("is-visible");
  });
}

// SECTION: Vehicle Modal
function openVehicleModal(vehicle) {
  const modal = $("#vehicleModal");
  const title = $("#vehicleModalTitle");
  const form = $("#vehicleForm");

  if (vehicle) {
    title.textContent = "Edit Unit";
    form.dataset.id = vehicle.id;
    $("#vehicleType").value = vehicle.type;
    $("#vehicleUnit").value = vehicle.unit;
    $("#vehiclePlate").value = vehicle.plate || "";
    $("#vehicleVin").value = vehicle.vin || "";
    $("#vehicleMileage").value = vehicle.mileage ?? "";
    $("#vehicleNotes").value = vehicle.notes || "";
  } else {
    title.textContent = "Add Unit";
    form.dataset.id = "";
    form.reset();
  }

  openModal(modal);
}

function setupVehicleForm() {
  const form = $("#vehicleForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = form.dataset.id || `v_${uuid()}`;
    const existing = state.vehicles.find((v) => v.id === id);

    const payload = {
      id,
      type: $("#vehicleType").value,
      unit: $("#vehicleUnit").value.trim(),
      plate: $("#vehiclePlate").value.trim(),
      vin: $("#vehicleVin").value.trim(),
      mileage: Number($("#vehicleMileage").value) || 0,
      notes: $("#vehicleNotes").value.trim(),
    };

    if (existing) {
      Object.assign(existing, payload);
    } else {
      state.vehicles.push(payload);
    }

    closeModal($("#vehicleModal"));
    renderAll();
  });
}

// SECTION: Work Order Modal & actions
function openWorkOrderModal(wo) {
  const modal = $("#workOrderModal");
  const title = $("#workOrderModalTitle");
  const form = $("#workOrderForm");

  renderVehicleSelects();

  if (wo) {
    title.textContent = "Edit Work Order";
    form.dataset.id = wo.id;
    $("#woVehicle").value = wo.vehicleId;
    $("#woType").value = wo.type;
    $("#woOpened").value = wo.openedDate || "";
    $("#woMileage").value = wo.mileage ?? "";
    $("#woSummary").value = wo.summary || "";
  } else {
    title.textContent = "New Work Order";
    form.dataset.id = "";
    form.reset();
    if (state.vehicles[0]) $("#woVehicle").value = state.vehicles[0].id;
    $("#woOpened").value = new Date().toISOString().slice(0, 10);
  }

  openModal(modal);
}

function setupWorkOrderForm() {
  const form = $("#workOrderForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = form.dataset.id || `wo_${uuid()}`;
    let wo = state.workOrders.find((w) => w.id === id);

    const payload = {
      id,
      vehicleId: $("#woVehicle").value,
      type: $("#woType").value.trim() || "Service",
      openedDate: $("#woOpened").value,
      mileage: Number($("#woMileage").value) || null,
      summary: $("#woSummary").value.trim(),
    };

    if (!wo) {
      wo = {
        ...payload,
        status: "open",
        notes: "",
        lineItems: [],
        templateId: null,
        checklist: [],
      };
      state.workOrders.unshift(wo);
    } else {
      Object.assign(wo, payload);
    }

    state.selectedWorkOrderId = wo.id;
    closeModal($("#workOrderModal"));
    renderAll();
    renderWorkOrderDetail();
  });

  $("#addLineItemBtn").addEventListener("click", () => {
    const wo = state.workOrders.find((w) => w.id === state.selectedWorkOrderId);
    if (!wo) return;
    if (!wo.lineItems) wo.lineItems = [];
    wo.lineItems.push({
      id: `li_${uuid()}`,
      kind: "labor",
      description: "",
      qty: 1,
      rate: 0,
    });
    renderWorkOrderDetail();
    renderWorkOrders();
  });

  $("#woCloseBtn").addEventListener("click", () => {
    const wo = state.workOrders.find((w) => w.id === state.selectedWorkOrderId);
    if (!wo) return;
    if (!confirm("Mark this work order as closed?")) return;
    wo.status = "closed";
    renderWorkOrders();
    renderWorkOrderDetail();
  });

  $("#woDuplicateBtn").addEventListener("click", () => {
    const original = state.workOrders.find((w) => w.id === state.selectedWorkOrderId);
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = `wo_${uuid()}`;
    copy.status = "open";
    copy.openedDate = new Date().toISOString().slice(0, 10);
    state.workOrders.unshift(copy);
    state.selectedWorkOrderId = copy.id;
    renderWorkOrders();
    renderWorkOrderDetail();
  });
}

// SECTION: Template Modal & actions
function openTemplateModal(tmpl) {
  const modal = $("#templateModal");
  const title = $("#templateModalTitle");
  const form = $("#templateForm");

  if (tmpl) {
    title.textContent = "Edit Template";
    form.dataset.id = tmpl.id;
    $("#templateName").value = tmpl.name;
    $("#templateAppliesTo").value = tmpl.appliesTo;
    $("#templateInterval").value = tmpl.intervalMiles ?? "";
  } else {
    title.textContent = "New Template";
    form.dataset.id = "";
    form.reset();
  }

  openModal(modal);
}

function setupTemplateForm() {
  const form = $("#templateForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = form.dataset.id || `t_${uuid()}`;
    let tmpl = state.templates.find((t) => t.id === id);

    const payload = {
      id,
      name: $("#templateName").value.trim(),
      appliesTo: $("#templateAppliesTo").value,
      intervalMiles: Number($("#templateInterval").value) || null,
    };

    if (!tmpl) {
      tmpl = {
        ...payload,
        notes: "",
        steps: [
          "Visual walk-around",
          "Record odometer",
          "Check lights",
        ],
      };
      state.templates.push(tmpl);
    } else {
      Object.assign(tmpl, payload);
    }

    state.selectedTemplateId = tmpl.id;
    closeModal($("#templateModal"));
    renderTemplates();
    renderTemplateDetail();
  });

  $("#addTemplateStepBtn").addEventListener("click", () => {
    const tmpl = state.templates.find((t) => t.id === state.selectedTemplateId);
    if (!tmpl) return;
    tmpl.steps.push("New step");
    renderTemplateDetail();
  });

  $("#templateDeleteBtn").addEventListener("click", () => {
    const tmpl = state.templates.find((t) => t.id === state.selectedTemplateId);
    if (!tmpl) return;
    if (!confirm("Delete this template?")) return;
    state.templates = state.templates.filter((t) => t.id !== tmpl.id);
    state.selectedTemplateId = null;
    renderTemplates();
    renderTemplateDetail();
  });

  $("#templateDuplicateBtn").addEventListener("click", () => {
    const original = state.templates.find((t) => t.id === state.selectedTemplateId);
    if (!original) return;
    const copy = JSON.parse(JSON.stringify(original));
    copy.id = `t_${uuid()}`;
    copy.name = `${copy.name} (Copy)`;
    state.templates.push(copy);
    state.selectedTemplateId = copy.id;
    renderTemplates();
    renderTemplateDetail();
  });
}

// SECTION: Mileage form
function setupMileageForm() {
  const form = $("#mileageForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!state.vehicles.length) return;

    const vehicleId = $("#mileageVehicle").value || state.vehicles[0].id;
    const value = Number($("#mileageValue").value) || 0;
    const date = $("#mileageDate").value || new Date().toISOString().slice(0, 10);

    state.mileageLogs.push({ id: `m_${uuid()}`, vehicleId, value, date });
    const vehicle = state.vehicles.find((v) => v.id === vehicleId);
    if (vehicle) vehicle.mileage = value;

    renderFleet();
    renderMileageHistory(vehicleId);
    form.reset();
  });

  $("#mileageVehicle").addEventListener("change", (e) => {
    renderMileageHistory(e.target.value);
  });
}

// SECTION: Navigation & Global
function setupNav() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.panel;
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("is-active"));
      document.getElementById(target).classList.add("is-active");
    });
  });
}

function setupGlobalButtons() {
  $("#addVehicleBtn").addEventListener("click", () => openVehicleModal());
  $("#addWorkOrderBtn").addEventListener("click", () => openWorkOrderModal());
  $("#addTemplateBtn").addEventListener("click", () => openTemplateModal());

  $("#fleetSearch").addEventListener("input", renderFleet);
  $("#fleetTypeFilter").addEventListener("change", renderFleet);
  $("#woStatusFilter").addEventListener("change", renderWorkOrders);

  $("#resetDemoBtn").addEventListener("click", () => {
    if (!confirm("Reset to demo data? This will clear current changes.")) return;
    seedDemoData();
    renderAll();
  });
}

function renderAll() {
  renderFleet();
  renderWorkOrders();
  renderTemplates();
  if (state.vehicles[0]) renderMileageHistory(state.vehicles[0].id);
}

// SECTION: Init
window.addEventListener("DOMContentLoaded", () => {
  seedDemoData();
  setupNav();
  setupModalCloseHandlers();
  setupVehicleForm();
  setupWorkOrderForm();
  setupTemplateForm();
  setupMileageForm();
  setupGlobalButtons();
  renderAll();
});

/**
 * Blood Bank Management System - Live Inventory & Component Management
 */

document.addEventListener("DOMContentLoaded", () => {
    initInventoryPage();
});

function initInventoryPage() {
    renderInventoryCards();
    renderSummaryMetrics();
    setupStockAdjustmentModal();
    setupCompatibilityChecker();
}

function renderInventoryCards() {
    const grid = document.getElementById("inventoryGrid");
    if (!grid) return;

    const inventory = DataStore.getInventory();
    const groups = Object.keys(inventory);

    grid.innerHTML = groups.map(group => {
        const item = inventory[group];
        const percent = Math.min(100, Math.round((item.units / item.optimal) * 100));
        
        let statusBadge = "";
        let barColor = "";

        if (item.units <= item.critical) {
            statusBadge = `<span class="badge bg-danger-subtle text-danger border border-danger-subtle"><i class="bi bi-exclamation-octagon-fill me-1"></i>Critical Shortage</span>`;
            barColor = "bg-danger";
        } else if (percent < 75) {
            statusBadge = `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="bi bi-exclamation-triangle-fill me-1"></i>Moderate</span>`;
            barColor = "bg-warning";
        } else {
            statusBadge = `<span class="badge bg-success-subtle text-success border border-success-subtle"><i class="bi bi-check-circle-fill me-1"></i>Optimal</span>`;
            barColor = "bg-success";
        }

        return `
            <div class="col-sm-6 col-lg-3 mb-4">
                <div class="inventory-stock-card h-100">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <div class="blood-drop-tag fs-4">
                            ${group}
                        </div>
                        <div>
                            ${statusBadge}
                        </div>
                    </div>

                    <div class="mb-3">
                        <div class="d-flex justify-content-between align-items-baseline">
                            <span class="display-6 fw-bold text-dark">${item.units}</span>
                            <span class="text-muted small">Units in Bank</span>
                        </div>
                        <div class="stock-meter-track">
                            <div class="stock-meter-fill ${barColor}" style="width: ${percent}%;"></div>
                        </div>
                        <div class="d-flex justify-content-between small text-muted">
                            <span>Safety Min: ${item.critical}</span>
                            <span>Target: ${item.optimal}</span>
                        </div>
                    </div>

                    <div class="p-2 bg-light rounded-3 mb-3 small">
                        <div class="d-flex justify-content-between py-1 border-bottom">
                            <span class="text-muted"><i class="bi bi-droplet-half text-danger me-1"></i>PRBC (Red Cells):</span>
                            <strong>${item.redCells || Math.round(item.units * 0.6)} bags</strong>
                        </div>
                        <div class="d-flex justify-content-between py-1 border-bottom">
                            <span class="text-muted"><i class="bi bi-circle-fill text-warning me-1"></i>Platelets:</span>
                            <strong>${item.platelets || Math.round(item.units * 0.25)} bags</strong>
                        </div>
                        <div class="d-flex justify-content-between py-1">
                            <span class="text-muted"><i class="bi bi-water text-primary me-1"></i>Plasma (FFP):</span>
                            <strong>${item.plasma || Math.round(item.units * 0.15)} bags</strong>
                        </div>
                    </div>

                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-success btn-sm flex-grow-1" onclick="openStockModal('${group}', 'ADD')">
                            <i class="bi bi-plus-circle"></i> Add Unit
                        </button>
                        <button class="btn btn-outline-danger btn-sm flex-grow-1" onclick="openStockModal('${group}', 'DISPATCH')">
                            <i class="bi bi-box-arrow-up-right"></i> Dispatch
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function renderSummaryMetrics() {
    const inventory = DataStore.getInventory();
    let totalUnits = 0;
    let criticalGroups = 0;
    let totalRbc = 0;
    let totalPlatelets = 0;

    Object.values(inventory).forEach(item => {
        totalUnits += item.units;
        if (item.units <= item.critical) criticalGroups++;
        totalRbc += (item.redCells || Math.round(item.units * 0.6));
        totalPlatelets += (item.platelets || Math.round(item.units * 0.25));
    });

    const elTotal = document.getElementById("metricTotalUnits");
    const elCrit = document.getElementById("metricCriticalGroups");
    const elRbc = document.getElementById("metricTotalRbc");
    const elPlat = document.getElementById("metricTotalPlatelets");

    if (elTotal) elTotal.textContent = totalUnits.toLocaleString();
    if (elCrit) elCrit.textContent = criticalGroups.toString();
    if (elRbc) elRbc.textContent = totalRbc.toLocaleString();
    if (elPlat) elPlat.textContent = totalPlatelets.toLocaleString();
}

// Quick Stock Adjustment
let selectedStockGroup = "O+";
let selectedStockAction = "ADD";

function openStockModal(group, action) {
    selectedStockGroup = group;
    selectedStockAction = action;

    const modalEl = document.getElementById("stockModal");
    if (!modalEl) return;

    document.getElementById("stockModalGroup").textContent = group;
    document.getElementById("stockModalAction").textContent = action === "ADD" ? "Inward Donation / Add Stock" : "Hospital Dispatch / Outward";
    document.getElementById("stockUnitsCount").value = "1";

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function setupStockAdjustmentModal() {
    const form = document.getElementById("stockAdjustmentForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const units = parseInt(document.getElementById("stockUnitsCount").value, 10);
        const compType = document.getElementById("stockComponentType").value;

        if (isNaN(units) || units <= 0) {
            showToast("Please enter a valid unit quantity", "warning", "bi-exclamation-triangle");
            return;
        }

        const delta = selectedStockAction === "ADD" ? units : -units;
        DataStore.updateStock(selectedStockGroup, delta, compType);

        showToast(
            `${selectedStockAction === 'ADD' ? 'Added' : 'Dispatched'} ${units} units of ${selectedStockGroup} (${compType}). Inventory updated.`,
            "success",
            "bi-clipboard-check"
        );

        const modalEl = document.getElementById("stockModal");
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        renderInventoryCards();
        renderSummaryMetrics();
    });
}

// Blood Compatibility Interactive Matrix
const COMPATIBILITY = {
    "O-": { giveTo: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"], receiveFrom: ["O-"] },
    "O+": { giveTo: ["O+", "A+", "B+", "AB+"], receiveFrom: ["O-", "O+"] },
    "A-": { giveTo: ["A-", "A+", "AB-", "AB+"], receiveFrom: ["O-", "A-"] },
    "A+": { giveTo: ["A+", "AB+"], receiveFrom: ["O-", "O+", "A-", "A+"] },
    "B-": { giveTo: ["B-", "B+", "AB-", "AB+"], receiveFrom: ["O-", "B-"] },
    "B+": { giveTo: ["B+", "AB+"], receiveFrom: ["O-", "O+", "B-", "B+"] },
    "AB-": { giveTo: ["AB-", "AB+"], receiveFrom: ["O-", "A-", "B-", "AB-"] },
    "AB+": { giveTo: ["AB+"], receiveFrom: ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] }
};

function setupCompatibilityChecker() {
    const select = document.getElementById("compatGroupSelect");
    if (!select) return;

    select.addEventListener("change", (e) => {
        updateCompatibilityView(e.target.value);
    });

    // Initial run
    updateCompatibilityView(select.value || "O+");
}

function updateCompatibilityView(group) {
    const data = COMPATIBILITY[group];
    if (!data) return;

    const giveContainer = document.getElementById("compatCanGiveTo");
    const receiveContainer = document.getElementById("compatCanReceiveFrom");

    if (giveContainer) {
        giveContainer.innerHTML = data.giveTo.map(g => `
            <span class="badge bg-danger fs-6 px-3 py-2 m-1 rounded-pill shadow-sm">
                <i class="bi bi-droplet-fill me-1"></i>${g}
            </span>
        `).join("");
    }

    if (receiveContainer) {
        receiveContainer.innerHTML = data.receiveFrom.map(g => `
            <span class="badge bg-success fs-6 px-3 py-2 m-1 rounded-pill shadow-sm">
                <i class="bi bi-shield-plus me-1"></i>${g}
            </span>
        `).join("");
    }
}

/**
 * Blood Bank Management System - Donors Directory Logic
 */

document.addEventListener("DOMContentLoaded", () => {
    initDonorsPage();
});

let currentFilterGroup = "ALL";
let currentSearchTerm = "";
let currentCityFilter = "ALL";
let onlyAvailableFilter = false;

function initDonorsPage() {
    renderDonors();
    setupBloodFilterButtons();
    setupSearchInputs();
    populateCityFilter();
    setupContactModal();
}

function renderDonors() {
    const donorGrid = document.getElementById("donorGrid");
    const countBadge = document.getElementById("donorCountBadge");
    if (!donorGrid) return;

    let donors = DataStore.getDonors();

    // Filter by Blood Group
    if (currentFilterGroup !== "ALL") {
        donors = donors.filter(d => d.bloodGroup.toUpperCase() === currentFilterGroup.toUpperCase());
    }

    // Filter by Search Term (Name or City)
    if (currentSearchTerm.trim() !== "") {
        const term = currentSearchTerm.toLowerCase();
        donors = donors.filter(d => 
            d.name.toLowerCase().includes(term) || 
            d.city.toLowerCase().includes(term) ||
            d.bloodGroup.toLowerCase().includes(term)
        );
    }

    // Filter by City
    if (currentCityFilter !== "ALL") {
        donors = donors.filter(d => d.city.toLowerCase() === currentCityFilter.toLowerCase());
    }

    // Filter by Availability
    if (onlyAvailableFilter) {
        donors = donors.filter(d => d.isAvailable);
    }

    if (countBadge) {
        countBadge.textContent = `${donors.length} Verified Donors Found`;
    }

    if (donors.length === 0) {
        donorGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="bg-white rounded-4 p-5 shadow-sm border text-center">
                    <div class="display-3 text-muted mb-3"><i class="bi bi-search"></i></div>
                    <h4 class="fw-bold">No Donors Found</h4>
                    <p class="text-muted">No donors matched your current filter criteria. Try changing blood group or city.</p>
                    <button class="btn btn-outline-red mt-2" onclick="resetDonorFilters()">
                        <i class="bi bi-arrow-counterclockwise"></i> Reset All Filters
                    </button>
                </div>
            </div>
        `;
        return;
    }

    donorGrid.innerHTML = donors.map(donor => `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="donor-card h-100">
                <div>
                    <div class="d-flex align-items-start justify-content-between mb-3">
                        <div class="d-flex align-items-center gap-3">
                            <img src="${escapeHtml(donor.avatar)}" alt="${escapeHtml(donor.name)}" class="donor-avatar">
                            <div>
                                <h5 class="fw-bold mb-1">${escapeHtml(donor.name)}</h5>
                                <div class="d-flex align-items-center gap-2">
                                    <span class="badge ${donor.isAvailable ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary'} rounded-pill small">
                                        <i class="bi ${donor.isAvailable ? 'bi-check-circle-fill' : 'bi-dash-circle'} me-1"></i>
                                        ${donor.isAvailable ? 'Available Now' : 'Recently Donated'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="blood-drop-tag">
                            ${escapeHtml(donor.bloodGroup)}
                        </div>
                    </div>

                    <div class="p-3 bg-light rounded-3 mb-3">
                        <div class="row g-2 text-muted small">
                            <div class="col-6">
                                <span class="d-block"><i class="bi bi-geo-alt-fill text-danger me-1"></i>${escapeHtml(donor.city)}, ${escapeHtml(donor.state || "")}</span>
                            </div>
                            <div class="col-6">
                                <span class="d-block"><i class="bi bi-person me-1"></i>${donor.age} yrs (${escapeHtml(donor.gender)})</span>
                            </div>
                            <div class="col-6">
                                <span class="d-block"><i class="bi bi-award-fill text-warning me-1"></i>${donor.totalDonations} Donations</span>
                            </div>
                            <div class="col-6">
                                <span class="d-block"><i class="bi bi-shield-check text-primary me-1"></i>Verified Donor</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2 pt-2 border-top">
                    <button class="btn btn-primary-red flex-grow-1 btn-sm" onclick="openContactModal('${escapeHtml(donor.id)}', '${escapeHtml(donor.name)}', '${escapeHtml(donor.bloodGroup)}', '${escapeHtml(donor.phone)}')">
                        <i class="bi bi-telephone-fill"></i> Contact Donor
                    </button>
                    <a href="tel:${escapeHtml(donor.phone)}" class="btn btn-outline-secondary btn-sm px-3" title="Call directly">
                        <i class="bi bi-phone"></i>
                    </a>
                </div>
            </div>
        </div>
    `).join("");
}

function setupBloodFilterButtons() {
    const buttons = document.querySelectorAll(".blood-filter-btn");
    buttons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilterGroup = btn.getAttribute("data-group");
            renderDonors();
        });
    });
}

function setupSearchInputs() {
    const searchInput = document.getElementById("donorSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearchTerm = e.target.value;
            renderDonors();
        });
    }

    const citySelect = document.getElementById("donorCitySelect");
    if (citySelect) {
        citySelect.addEventListener("change", (e) => {
            currentCityFilter = e.target.value;
            renderDonors();
        });
    }

    const availableCheck = document.getElementById("donorAvailableOnly");
    if (availableCheck) {
        availableCheck.addEventListener("change", (e) => {
            onlyAvailableFilter = e.target.checked;
            renderDonors();
        });
    }
}

function populateCityFilter() {
    const citySelect = document.getElementById("donorCitySelect");
    if (!citySelect) return;

    const donors = DataStore.getDonors();
    const cities = Array.from(new Set(donors.map(d => d.city))).sort();

    citySelect.innerHTML = `<option value="ALL">All Cities</option>` +
        cities.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function resetDonorFilters() {
    currentFilterGroup = "ALL";
    currentSearchTerm = "";
    currentCityFilter = "ALL";
    onlyAvailableFilter = false;

    const searchInput = document.getElementById("donorSearchInput");
    if (searchInput) searchInput.value = "";

    const citySelect = document.getElementById("donorCitySelect");
    if (citySelect) citySelect.value = "ALL";

    const availableCheck = document.getElementById("donorAvailableOnly");
    if (availableCheck) availableCheck.checked = false;

    const buttons = document.querySelectorAll(".blood-filter-btn");
    buttons.forEach(b => {
        if (b.getAttribute("data-group") === "ALL") b.classList.add("active");
        else b.classList.remove("active");
    });

    renderDonors();
}

// Modal handling
let targetDonor = null;

function openContactModal(id, name, group, phone) {
    targetDonor = { id, name, group, phone };
    const modalEl = document.getElementById("contactDonorModal");
    if (!modalEl) return;

    document.getElementById("modalDonorName").textContent = name;
    document.getElementById("modalDonorGroup").textContent = group;
    document.getElementById("modalDonorPhone").textContent = phone;

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function setupContactModal() {
    const form = document.getElementById("contactDonorForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const requesterName = document.getElementById("reqName").value.trim();
        const hospitalName = document.getElementById("reqHospital").value.trim();

        showToast(`Request sent to ${targetDonor ? targetDonor.name : 'Donor'}! They will be alerted immediately.`, "success", "bi-send-check");

        const modalEl = document.getElementById("contactDonorModal");
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        form.reset();
    });
}

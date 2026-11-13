/**
 * Blood Bank Management System - Donation Camps & Drives Logic
 */

document.addEventListener("DOMContentLoaded", () => {
    initCampsPage();
});

let currentCampStatus = "ALL";

function initCampsPage() {
    renderCamps();
    setupCampStatusFilters();
    setupCampRegistrationModal();
}

function renderCamps() {
    const container = document.getElementById("campsContainer");
    if (!container) return;

    let camps = DataStore.getCamps();

    if (currentCampStatus !== "ALL") {
        camps = camps.filter(c => c.status.toLowerCase() === currentCampStatus.toLowerCase());
    }

    if (camps.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="bg-white rounded-4 p-5 shadow-sm border">
                    <i class="bi bi-calendar-x text-muted display-4 mb-3 d-block"></i>
                    <h5 class="fw-bold">No Camps Found</h5>
                    <p class="text-muted">There are no camps scheduled under this filter right now.</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = camps.map(camp => {
        const isUpcoming = camp.status === "Upcoming";
        const progressPercent = Math.min(100, Math.round(((camp.registeredCount || 0) / camp.targetUnits) * 100));

        return `
            <div class="col-lg-6 mb-4">
                <div class="custom-card h-100 d-flex flex-column">
                    <div class="position-relative">
                        <img src="${escapeHtml(camp.image)}" alt="${escapeHtml(camp.title)}" class="w-100" style="height: 240px; object-fit: cover;">
                        <span class="position-absolute top-0 start-0 m-3 badge ${isUpcoming ? 'bg-danger badge-pulse' : 'bg-secondary'} px-3 py-2">
                            ${escapeHtml(camp.status)}
                        </span>
                        <div class="position-absolute bottom-0 start-0 w-100 p-3" style="background: linear-gradient(transparent, rgba(15, 23, 42, 0.9));">
                            <span class="text-white-50 small"><i class="bi bi-building me-1"></i>${escapeHtml(camp.organizer)}</span>
                            <h4 class="text-white fw-bold mb-0">${escapeHtml(camp.title)}</h4>
                        </div>
                    </div>

                    <div class="p-4 flex-grow-1 d-flex flex-column justify-content-between">
                        <div>
                            <p class="text-muted mb-3">${escapeHtml(camp.description)}</p>

                            <div class="row g-2 p-3 bg-light rounded-3 mb-3">
                                <div class="col-sm-6">
                                    <div class="d-flex align-items-center gap-2">
                                        <i class="bi bi-calendar-event text-danger fs-5"></i>
                                        <div>
                                            <span class="text-muted d-block small">Camp Date</span>
                                            <strong class="text-dark">${escapeHtml(camp.date)}</strong>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-sm-6">
                                    <div class="d-flex align-items-center gap-2">
                                        <i class="bi bi-clock text-danger fs-5"></i>
                                        <div>
                                            <span class="text-muted d-block small">Camp Hours</span>
                                            <strong class="text-dark">${escapeHtml(camp.time)}</strong>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-12 mt-2 pt-2 border-top">
                                    <div class="d-flex align-items-center gap-2">
                                        <i class="bi bi-geo-alt-fill text-danger fs-5"></i>
                                        <div>
                                            <span class="text-muted d-block small">Location / Venue</span>
                                            <strong class="text-dark">${escapeHtml(camp.venue)}, ${escapeHtml(camp.city)}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-3">
                                <div class="d-flex justify-content-between text-muted small mb-1">
                                    <span>Pledged Donors: <strong>${camp.registeredCount} / ${camp.targetUnits}</strong></span>
                                    <span>${progressPercent}% Goal</span>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-danger" role="progressbar" style="width: ${progressPercent}%;"></div>
                                </div>
                            </div>
                        </div>

                        <div class="d-flex align-items-center justify-content-between pt-3 border-top gap-2">
                            <span class="text-muted small">
                                <i class="bi bi-shield-check text-success me-1"></i> Certified Safe Drive
                            </span>
                            ${isUpcoming ? `
                                <button class="btn btn-primary-red btn-sm px-4" onclick="openCampRegisterModal('${escapeHtml(camp.id)}', '${escapeHtml(camp.title)}', '${escapeHtml(camp.date)}')">
                                    <i class="bi bi-person-check-fill"></i> Register Slot
                                </button>
                            ` : `
                                <button class="btn btn-outline-secondary btn-sm px-3" disabled>
                                    <i class="bi bi-check2-all"></i> Drive Completed
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function setupCampStatusFilters() {
    const filterBtns = document.querySelectorAll(".camp-status-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentCampStatus = btn.getAttribute("data-status");
            renderCamps();
        });
    });
}

let activeCampForReg = null;

function openCampRegisterModal(campId, title, date) {
    activeCampForReg = { campId, title, date };
    const modalEl = document.getElementById("campRegisterModal");
    if (!modalEl) return;

    document.getElementById("modalCampTitle").textContent = title;
    document.getElementById("modalCampDate").textContent = date;

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function setupCampRegistrationModal() {
    const form = document.getElementById("campRegisterForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const donorName = document.getElementById("campRegName").value.trim();
        const phone = document.getElementById("campRegPhone").value.trim();
        const bloodGroup = document.getElementById("campRegGroup").value;

        if (!donorName || !phone) {
            showToast("Please provide your name and phone number", "warning", "bi-exclamation-circle");
            return;
        }

        if (activeCampForReg) {
            DataStore.registerForCamp(activeCampForReg.campId);
        }

        const passId = "SLOT-" + Math.floor(100000 + Math.random() * 900000);
        showToast(`Registration Successful! Pass ID: ${passId}. An SMS confirmation has been simulated to ${phone}.`, "success", "bi-ticket-perforated-fill");

        const modalEl = document.getElementById("campRegisterModal");
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }

        form.reset();
        renderCamps();
    });
}

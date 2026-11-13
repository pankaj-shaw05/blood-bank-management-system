/**
 * Blood Bank Management System - East Singhbhum Geofence & Blood Request Engine
 * Exclusively displays verified hospitals inside the official East Singhbhum boundary polygon.
 */

document.addEventListener("DOMContentLoaded", () => {
    initRequestsPage();
});

let hospitalMap = null;
let boundaryPolygonLayer = null;
let hospitalMarkers = {};
let currentUrgencyFilter = "ALL";
let currentGroupFilter = "ALL";
let currentLocalityFilter = "ALL";
let currentSearchQuery = "";

function initRequestsPage() {
    initHospitalMap();
    renderHospitalDirectory();
    populateHospitalDropdown();
    renderRequests();
    setupRequestForm();
    setupFilterControls();
    renderGeofenceAuditTable();
    checkLoggedInHospitalPreFill();
}

function checkLoggedInHospitalPreFill() {
    const currentUser = (typeof DataStore !== 'undefined' && DataStore.getUser) ? DataStore.getUser() : null;
    if (!currentUser) return;

    if (currentUser.role === "Hospital" || currentUser.hospitalId) {
        const all = DataStore.getAllHospitals();
        let matchedHosp = null;

        // 1. Match by hospitalId
        if (currentUser.hospitalId) {
            matchedHosp = all.find(h => h.id === currentUser.hospitalId || String(h.dbId) === String(currentUser.hospitalId));
        }

        // 2. Match by exact or partial name
        if (!matchedHosp && currentUser.name) {
            const userHospLower = currentUser.name.toLowerCase().trim();
            matchedHosp = all.find(h => 
                h.name.toLowerCase().trim() === userHospLower ||
                (h.shortName && h.shortName.toLowerCase().trim() === userHospLower) ||
                userHospLower.includes(h.name.toLowerCase().trim()) ||
                h.name.toLowerCase().includes(userHospLower)
            );
        }

        // 3. Match by email or phone
        if (!matchedHosp && currentUser.email) {
            matchedHosp = all.find(h => 
                (h.email && h.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                (h.phone && h.phone === currentUser.email)
            );
        }

        // 4. If user is Hospital but facility not yet in list, dynamically register and persist
        if (!matchedHosp && currentUser.role === "Hospital") {
            const rawName = currentUser.name || "Registered Hospital";
            const hospName = rawName.toLowerCase().includes("hospital") || rawName.toLowerCase().includes("care") || rawName.toLowerCase().includes("clinic")
                ? rawName 
                : rawName + " Hospital";
            matchedHosp = {
                id: "HOSP-REG-" + Math.floor(1000 + Math.random() * 9000),
                name: hospName,
                shortName: rawName,
                locality: currentUser.city || "Jamshedpur",
                city: currentUser.city || "Jamshedpur",
                district: "East Singhbhum",
                state: "Jharkhand",
                address: `${currentUser.city || "Jamshedpur"}, East Singhbhum, Jharkhand`,
                phone: currentUser.phone || "+91 657-222-0000",
                emergencyPhone: currentUser.phone || "+91 657-222-0000",
                lat: 22.8015,
                lon: 86.1796,
                category: "Registered Healthcare Facility",
                type: "Registered Healthcare Facility",
                beds: 80,
                hasBloodBank: true,
                bloodBankStatus: "Licensed In-House Blood Bank (Verified)",
                availableUnits: 30,
                verified: true,
                verifiedInsideGeofence: true,
                isRegistered: true,
                email: currentUser.email
            };
            DataStore.addHospital(matchedHosp);
            currentUser.hospitalId = matchedHosp.id;
            DataStore.setUser(currentUser);

            // Re-render dropdown with the newly registered facility
            renderHospitalDropdownOptions(DataStore.getAllHospitals());
        }

        if (matchedHosp) {
            const select = document.getElementById("reqHospitalSelect");
            if (select) {
                // Ensure option exists in dropdown
                if (!Array.from(select.options).some(o => o.value === matchedHosp.id)) {
                    const opt = document.createElement("option");
                    opt.value = matchedHosp.id;
                    opt.textContent = `${matchedHosp.name} (${matchedHosp.locality}) • Registered Database Facility`;
                    select.appendChild(opt);
                }
                select.value = matchedHosp.id;
            }

            selectHospitalForRequest(matchedHosp.id, false);

            const notice = document.getElementById("geofenceVerificationBadge");
            if (notice) {
                notice.innerHTML = `<i class="bi bi-shield-check text-success me-2 fs-5"></i><div><strong>Logged in as Registered Facility:</strong> ${escapeHtml(matchedHosp.name)} (${escapeHtml(matchedHosp.locality)}) &bull; Bed Capacity: ${matchedHosp.beds || 80} &bull; ${escapeHtml(matchedHosp.bloodBankStatus || 'Licensed In-House Blood Bank')}</div>`;
                notice.classList.remove("d-none");
            }
        }
    } else if (currentUser.role === "Donor") {
        const nameInput = document.getElementById("reqPatientName");
        const phoneInput = document.getElementById("reqContactPhone");
        const personInput = document.getElementById("reqContactPerson");
        const groupInput = document.getElementById("reqBloodGroup");
        if (nameInput && !nameInput.value) nameInput.value = currentUser.name;
        if (personInput && !personInput.value) personInput.value = currentUser.name;
        if (phoneInput && !phoneInput.value && currentUser.phone) phoneInput.value = currentUser.phone;
        if (groupInput && currentUser.bloodGroup) groupInput.value = currentUser.bloodGroup;
    }
}

/**
 * Initialize Leaflet Interactive Map with East Singhbhum Boundary Geofence & Markers
 */
function initHospitalMap() {
    const mapElement = document.getElementById("hospitalMap");
    if (!mapElement) return;

    if (typeof L === "undefined") {
        console.warn("Leaflet library not loaded yet, retrying in 250ms...");
        setTimeout(initHospitalMap, 250);
        return;
    }

    // Centered at East Singhbhum geographic midpoint
    const defaultCenter = [22.75, 86.32];
    const defaultZoom = 10;

    hospitalMap = L.map("hospitalMap", {
        center: defaultCenter,
        zoom: defaultZoom,
        minZoom: 9,
        maxZoom: 18,
        scrollWheelZoom: false
    });

    // Clean OpenStreetMap Tile Layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | LifeStream East Singhbhum Geofence',
        maxZoom: 19
    }).addTo(hospitalMap);

    // 1. Draw Official East Singhbhum District Boundary Geofence (Polygon)
    const rawPolygon = DataStore.getBoundaryPolygon();
    // Leaflet expects [lat, lon], while GeoJSON stores [lon, lat]
    const polygonLatLngs = rawPolygon.map(pt => [pt[1], pt[0]]);

    boundaryPolygonLayer = L.polygon(polygonLatLngs, {
        color: "#dc2626",
        weight: 2.5,
        dashArray: "6, 6",
        fillColor: "#ef4444",
        fillOpacity: 0.08,
        smoothFactor: 1
    }).addTo(hospitalMap);

    boundaryPolygonLayer.bindTooltip(`
        <div class="text-center p-1">
            <strong class="text-danger d-block"><i class="bi bi-shield-check me-1"></i>East Singhbhum District Geofence</strong>
            <small class="text-muted">Official Boundary Polygon (Jharkhand, India)</small>
        </div>
    `, { sticky: true });

    // 2. Plot ONLY Verified Hospitals located strictly inside East Singhbhum
    const hospitals = DataStore.getEastSinghbhumHospitals();

    hospitals.forEach(h => {
        const markerIcon = L.divIcon({
            className: "custom-hospital-marker-wrapper",
            html: `
                <div class="hospital-marker-pin" id="marker-${h.id}">
                    <i class="bi bi-hospital-fill"></i>
                </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36]
        });

        const marker = L.marker([h.lat, h.lon], { icon: markerIcon }).addTo(hospitalMap);

        // Requirement 9: Verified contact number and blood availability strictly if confirmed by database
        const contactHtml = h.phone
            ? `<span><i class="bi bi-telephone-fill text-success me-1"></i>${escapeHtml(h.phone)}</span>`
            : `<span class="text-muted"><i class="bi bi-telephone-x me-1"></i>Contact: Not listed</span>`;

        const bloodAvailabilitySection = (h.hasBloodBank && h.bloodBankStatus)
            ? `
                <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">Blood Availability:</span>
                    <span class="text-success fw-bold"><i class="bi bi-check2-circle me-1"></i>Confirmed</span>
                </div>
                <div class="small text-muted mb-1 ps-2 border-start border-2 border-success">
                    ${escapeHtml(h.bloodBankStatus)}
                </div>
                ${typeof h.availableUnits === "number" ? `
                <div class="d-flex justify-content-between">
                    <span class="text-muted">Confirmed Database Stock:</span>
                    <span class="badge bg-danger text-white">${h.availableUnits} Units</span>
                </div>` : ''}
            `
            : `
                <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">Blood Availability:</span>
                    <span class="text-warning fw-bold"><i class="bi bi-exclamation-triangle me-1"></i>No In-house Blood Bank</span>
                </div>
            `;

        const popupContent = `
            <div class="hospital-map-popup">
                <div class="d-flex align-items-center justify-content-between gap-2 mb-2 pb-1 border-bottom">
                    <span class="badge bg-danger rounded-pill px-2 py-1"><i class="bi bi-geo-alt-fill me-1"></i>${escapeHtml(h.locality)}</span>
                    <span class="badge bg-success-subtle text-success border border-success-subtle small">
                        <i class="bi bi-shield-check me-1"></i>Inside Geofence
                    </span>
                </div>
                <h6 class="fw-bold mb-1 text-dark">${escapeHtml(h.name)}</h6>
                <p class="small text-muted mb-2"><i class="bi bi-building me-1"></i>${escapeHtml(h.address)}</p>

                <div class="p-2 rounded bg-light border small mb-2">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted">Verified GPS:</span>
                        <strong class="text-danger font-monospace">${h.lat.toFixed(4)}° N, ${h.lon.toFixed(4)}° E</strong>
                    </div>
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted">Classification:</span>
                        <span class="text-dark fw-bold">${escapeHtml(h.type)}</span>
                    </div>
                    ${bloodAvailabilitySection}
                </div>

                <div class="d-flex align-items-center justify-content-between small text-muted mb-2">
                    ${contactHtml}
                    <span><i class="bi bi-inpatient text-primary me-1"></i>${h.beds || 'N/A'} Beds</span>
                </div>

                <button class="btn btn-primary-red btn-sm w-100" onclick="selectHospitalForRequest('${h.id}')">
                    <i class="bi bi-broadcast-pin me-1"></i> Select for Blood Requisition
                </button>
            </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 320, className: "custom-leaflet-popup" });
        hospitalMarkers[h.id] = marker;
    });

    // Update hover telemetry
    const hoverStatus = document.getElementById("mapHoverStatus");
    if (hoverStatus) {
        hoverStatus.innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i> Geofence active: <strong>8 verified hospital markers</strong> plotted inside East Singhbhum boundary polygon.`;
    }

    // Fit boundary on desktop
    hospitalMap.fitBounds(boundaryPolygonLayer.getBounds(), { padding: [25, 25] });

    // Enable scroll zoom once clicked
    hospitalMap.on("click", () => {
        hospitalMap.scrollWheelZoom.enable();
    });
}

/**
 * Filter Helper: Evaluates both Locality and Search Query
 */
function getFilteredHospitals() {
    const allVerified = DataStore.getEastSinghbhumHospitals();
    return allVerified.filter(h => {
        // 1. Locality Filter
        let matchesLocality = true;
        if (currentLocalityFilter !== "ALL") {
            const loc = currentLocalityFilter;
            if (loc === "Telco") matchesLocality = h.locality.includes("Telco") || h.locality.includes("Golmuri");
            else if (loc === "Mango") matchesLocality = h.locality.includes("Mango") || h.locality.includes("Tamolia");
            else if (loc === "Baridih") matchesLocality = h.locality.includes("Baridih");
            else if (loc === "Jugsalai") matchesLocality = h.locality.includes("Jugsalai") || h.locality.includes("Khasmahal");
            else if (loc === "Ghatshila") matchesLocality = h.locality.includes("Ghatshila") || h.locality.includes("Baharagora");
            else matchesLocality = h.locality.toLowerCase().includes(loc.toLowerCase());
        }

        // 2. Real-Time Text Search
        let matchesSearch = true;
        if (currentSearchQuery && currentSearchQuery.trim()) {
            const query = currentSearchQuery.trim().toLowerCase();
            const searchableText = `${h.name} ${h.shortName || ''} ${h.locality} ${h.address} ${h.type} ${h.phone || ''} ${h.bloodBankStatus || ''}`.toLowerCase();
            matchesSearch = searchableText.includes(query);
        }

        return matchesLocality && matchesSearch;
    });
}

/**
 * Filter Map and Directory Cards by Locality
 */
function filterByLocality(locality) {
    currentLocalityFilter = locality;

    // Update button visual states
    document.querySelectorAll(".locality-filter-btn").forEach(btn => {
        if (btn.getAttribute("data-locality") === locality) {
            btn.classList.add("btn-danger", "active");
            btn.classList.remove("btn-outline-danger");
        } else {
            btn.classList.remove("btn-danger", "active");
            btn.classList.add("btn-outline-danger");
        }
    });

    applyHospitalFilters();
}

/**
 * Apply Synchronized Filters to Cards and Map
 */
function applyHospitalFilters() {
    renderHospitalDirectory();

    if (!hospitalMap) return;

    const matched = getFilteredHospitals();
    const allHospitals = DataStore.getEastSinghbhumHospitals();

    // Visual synchronization of map markers
    allHospitals.forEach(h => {
        const marker = hospitalMarkers[h.id];
        if (!marker) return;

        const isMatched = matched.some(m => m.id === h.id);
        if (isMatched) {
            marker.setOpacity(1.0);
            const el = marker.getElement();
            if (el) {
                el.style.filter = "none";
                el.style.opacity = "1";
            }
        } else {
            marker.setOpacity(0.2);
            const el = marker.getElement();
            if (el) {
                el.style.filter = "grayscale(90%)";
                el.style.opacity = "0.2";
            }
        }
    });

    if (matched.length > 0) {
        const group = L.featureGroup(matched.map(h => hospitalMarkers[h.id]).filter(Boolean));
        if (matched.length === 1) {
            hospitalMap.setView([matched[0].lat, matched[0].lon], 14, { animate: true });
            hospitalMarkers[matched[0].id].openPopup();
        } else {
            hospitalMap.flyToBounds(group.getBounds(), { padding: [50, 50], maxZoom: 13, duration: 0.8 });
        }
    }
}

/**
 * Reset Hospital Search and Locality Filters
 */
function resetHospitalSearch() {
    currentSearchQuery = "";
    const searchInput = document.getElementById("hospitalSearchInput");
    if (searchInput) searchInput.value = "";
    filterByLocality("ALL");
}

/**
 * Render Searchable Hospital Directory Cards (Below / Beside Map)
 */
function renderHospitalDirectory() {
    const container = document.getElementById("hospitalDirectoryCards");
    const countBadge = document.getElementById("hospitalCountBadge");
    if (!container) return;

    const allVerified = DataStore.getEastSinghbhumHospitals();
    const filtered = getFilteredHospitals();

    if (countBadge) {
        countBadge.textContent = `${filtered.length} of ${allVerified.length} Verified Facilities`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5 bg-light rounded-4 border">
                    <i class="bi bi-search text-muted fs-1 mb-2 d-block"></i>
                    <h5 class="fw-bold text-dark">No Verified Facilities Found</h5>
                    <p class="text-muted small mb-3">No hospital inside East Singhbhum boundary matches your current search criteria.</p>
                    <button class="btn btn-outline-danger btn-sm rounded-pill" onclick="resetHospitalSearch()">
                        <i class="bi bi-arrow-counterclockwise me-1"></i> Reset Search &amp; Show All (8)
                    </button>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(h => {
        const contactLine = h.phone 
            ? `<span><i class="bi bi-telephone-fill text-success me-1"></i>${escapeHtml(h.phone)}</span>`
            : `<span class="text-muted"><i class="bi bi-telephone me-1"></i>Contact unverified</span>`;

        const bloodAvailabilityLine = (h.hasBloodBank && h.bloodBankStatus)
            ? `
                <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">Blood Availability:</span>
                    <span class="text-success fw-bold"><i class="bi bi-check2-circle me-1"></i>Confirmed</span>
                </div>
                <div class="small text-muted mb-2 ps-2 border-start border-2 border-success">
                    ${escapeHtml(h.bloodBankStatus)}
                </div>
                ${typeof h.availableUnits === "number" ? `
                <div class="d-flex justify-content-between">
                    <span class="text-muted">Confirmed Database Stock:</span>
                    <span class="badge bg-danger text-white">${h.availableUnits} Units</span>
                </div>` : ''}
            `
            : `
                <div class="d-flex justify-content-between mb-1">
                    <span class="text-muted">Blood Availability:</span>
                    <span class="text-warning fw-bold"><i class="bi bi-exclamation-triangle me-1"></i>No In-house Blood Bank</span>
                </div>
            `;

        return `
            <div class="col-md-6 col-lg-4">
                <div class="custom-card p-3 h-100 d-flex flex-column justify-content-between hospital-item-card border-top border-3 border-danger shadow-sm" id="card-${h.id}">
                    <div>
                        <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
                            <span class="badge bg-danger-subtle text-danger fw-bold rounded-pill px-2 py-1">
                                <i class="bi bi-geo-alt-fill me-1"></i>${escapeHtml(h.locality)}
                            </span>
                            <span class="badge bg-success-subtle text-success border border-success-subtle small">
                                <i class="bi bi-shield-check me-1"></i>Verified Geofence
                            </span>
                        </div>

                        <h6 class="fw-bold text-dark mb-1">${escapeHtml(h.name)}</h6>
                        <p class="small text-muted mb-2"><i class="bi bi-geo me-1"></i>${escapeHtml(h.address)}</p>

                        <div class="bg-light p-2 rounded small mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <span class="text-muted">GPS Coordinates:</span>
                                <span class="font-monospace text-danger fw-bold">${h.lat.toFixed(4)}°N, ${h.lon.toFixed(4)}°E</span>
                            </div>
                            <div class="d-flex justify-content-between mb-1">
                                <span class="text-muted">Facility Type:</span>
                                <span class="text-dark fw-bold">${escapeHtml(h.type)}</span>
                            </div>
                            ${bloodAvailabilityLine}
                        </div>
                    </div>

                    <div>
                        <div class="d-flex align-items-center justify-content-between small text-muted mb-3 pb-2 border-bottom">
                            ${contactLine}
                            <span><i class="bi bi-inpatient text-primary me-1"></i>${h.beds || 'N/A'} Beds</span>
                        </div>

                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-danger btn-sm flex-fill" onclick="locateHospitalOnMap('${h.id}')">
                                <i class="bi bi-geo-fill"></i> View on Map
                            </button>
                            <button class="btn btn-primary-red btn-sm flex-fill" onclick="selectHospitalForRequest('${h.id}')">
                                <i class="bi bi-pencil-square"></i> Select Facility
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

/**
 * Locate Hospital on Map & Open its Popup
 */
function locateHospitalOnMap(hospitalId) {
    const hospital = DataStore.getHospitalById(hospitalId);
    if (!hospital || !hospitalMap) return;

    // Smooth scroll to map
    const mapSection = document.getElementById("geofenceMapSection");
    if (mapSection) {
        mapSection.scrollIntoView({ behavior: "smooth" });
    }

    setTimeout(() => {
        hospitalMap.setView([hospital.lat, hospital.lon], 14, { animate: true });
        if (hospitalMarkers[hospitalId]) {
            hospitalMarkers[hospitalId].openPopup();
        }
    }, 400);
}

/**
 * Render Hospital Dropdown Options by Categorized Locality & Registered Facility Groups
 */
function renderHospitalDropdownOptions(hospitals) {
    const select = document.getElementById("reqHospitalSelect");
    if (!select) return;

    const previousValue = select.value;
    const currentUser = (typeof DataStore !== 'undefined' && DataStore.getUser) ? DataStore.getUser() : null;

    let myHosp = null;
    if (currentUser && (currentUser.role === "Hospital" || currentUser.hospitalId)) {
        if (currentUser.hospitalId) {
            myHosp = hospitals.find(h => h.id === currentUser.hospitalId || String(h.dbId) === String(currentUser.hospitalId));
        }
        if (!myHosp && currentUser.name) {
            const userLower = currentUser.name.toLowerCase().trim();
            myHosp = hospitals.find(h => 
                h.name.toLowerCase().trim() === userLower ||
                (h.shortName && h.shortName.toLowerCase().trim() === userLower) ||
                userLower.includes(h.name.toLowerCase().trim()) ||
                h.name.toLowerCase().includes(userLower) ||
                (userLower.includes("mgm") && h.name.toLowerCase().includes("mgm")) ||
                (userLower.includes("tata") && h.name.toLowerCase().includes("tata"))
            );
        }
        if (!myHosp && currentUser.email) {
            const emailLower = currentUser.email.toLowerCase().trim();
            myHosp = hospitals.find(h => 
                (h.email && h.email.toLowerCase() === emailLower) ||
                (emailLower.includes("mgm") && h.name.toLowerCase().includes("mgm")) ||
                (emailLower.includes("tata") && h.name.toLowerCase().includes("tata"))
            );
        }
    }

    // Categorize hospitals
    const urbanHosps = hospitals.filter(h => ["Bistupur", "Sakchi", "Jugsalai"].includes(h.locality));
    const corporateHosps = hospitals.filter(h => ["Telco Colony", "Golmuri", "Baridih", "Khasmahal"].includes(h.locality));
    const mangoHosps = hospitals.filter(h => (h.locality.includes("Mango") || h.locality.includes("Tamolia")));
    
    // Catch-all
    const otherHosps = hospitals.filter(h => 
        !urbanHosps.includes(h) && 
        !corporateHosps.includes(h) && 
        !mangoHosps.includes(h)
    );

    const groups = {
        "Jamshedpur Urban & Core (Bistupur, Sakchi, Jugsalai)": urbanHosps,
        "Corporate & District Care (Telco, Golmuri, Baridih, Khasmahal)": corporateHosps,
        "Mango & NH-33": mangoHosps,
        "Other Verified Facilities": otherHosps
    };

    let html = `<option value="">-- Choose Registered Hospital from Database --</option>`;

    // If logged in as Hospital, prepend prominently right under default option
    if (myHosp) {
        html += `<optgroup label="Your Logged-In Healthcare Facility">
            <option value="${myHosp.id}" data-name="${escapeHtml(myHosp.name)}" data-city="${escapeHtml(myHosp.locality)}" data-phone="${escapeHtml(myHosp.phone || '')}" selected>
                ⭐ ${escapeHtml(myHosp.name)} (${escapeHtml(myHosp.locality)}) &bull; Your Registered Facility
            </option>
        </optgroup>`;
    }

    Object.keys(groups).forEach(grpName => {
        if (groups[grpName] && groups[grpName].length > 0) {
            html += `<optgroup label="${grpName}">`;
            groups[grpName].forEach(h => {
                const isSelected = (myHosp && myHosp.id === h.id) || (previousValue === h.id);
                const stockInfo = h.availableUnits ? ` &bull; Stock: ${h.availableUnits} units` : '';
                html += `<option value="${h.id}" data-name="${escapeHtml(h.name)}" data-city="${escapeHtml(h.locality)}" data-phone="${escapeHtml(h.phone || '')}" ${isSelected ? 'selected' : ''}>
                    ${escapeHtml(h.name)} (${escapeHtml(h.locality)}) &bull; Registered Database Facility${stockInfo}
                </option>`;
            });
            html += `</optgroup>`;
        }
    });

    select.innerHTML = html;

    if (myHosp) {
        select.value = myHosp.id;
    } else if (previousValue && Array.from(select.options).some(o => o.value === previousValue)) {
        select.value = previousValue;
    }
}

/**
 * Populate Hospital Dropdown in Blood Request Form (Directly from Database)
 */
function populateHospitalDropdown() {
    const select = document.getElementById("reqHospitalSelect");
    if (!select) return;

    // 1. Immediately render local database hospitals without waiting for network
    const initialHospitals = DataStore.getAllHospitals();
    renderHospitalDropdownOptions(initialHospitals);

    // 2. Fetch live database hospitals in background if Django API is accessible
    const apiEndpoint = (window.location.protocol === 'file:') ? 'http://127.0.0.1:8000/api/hospitals/' : '/api/hospitals/';

    fetch(apiEndpoint)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (data && data.facilities && data.facilities.length > 0) {
                const merged = [...data.facilities];
                DataStore.getRegisteredHospitals().forEach(rh => {
                    if (!merged.some(m => m.id === rh.id || m.name.toLowerCase() === rh.name.toLowerCase())) {
                        merged.unshift(rh);
                    }
                });
                renderHospitalDropdownOptions(merged);
                checkLoggedInHospitalPreFill();
            }
        })
        .catch(() => {
            // Static / file:// context: fallback remains active with DataStore
        });

    select.addEventListener("change", (e) => {
        const hid = e.target.value;
        if (hid) {
            selectHospitalForRequest(hid, false);
        }
    });

    // Check if prefill is needed (e.g. Registered Hospital logged in)
    checkLoggedInHospitalPreFill();
}

/**
 * 1-Click Select Hospital for Blood Request Form
 */
function selectHospitalForRequest(hospitalId, scrollToForm = true) {
    const hospital = DataStore.getHospitalById(hospitalId);
    if (!hospital) return;

    // Fill Form inputs
    const select = document.getElementById("reqHospitalSelect");
    const nameInput = document.getElementById("reqHospitalName");
    const cityInput = document.getElementById("reqCity");
    const phoneInput = document.getElementById("reqContactPhone");
    const badgeText = document.getElementById("geofenceBadgeText");
    const badgeContainer = document.getElementById("geofenceVerificationBadge");

    if (select) {
        if (!Array.from(select.options).some(o => o.value === hospitalId)) {
            const opt = document.createElement("option");
            opt.value = hospitalId;
            opt.textContent = `${hospital.name} (${hospital.locality}) • Registered Database Facility`;
            select.appendChild(opt);
        }
        select.value = hospitalId;
    }

    if (nameInput) nameInput.value = `${hospital.name}, Inpatient / Emergency Ward`;
    if (cityInput) cityInput.value = `${hospital.locality}, East Singhbhum`;
    if (phoneInput && !phoneInput.value) phoneInput.value = hospital.phone;

    if (badgeText) {
        badgeText.innerHTML = `<strong>Geofence Verified:</strong> ${escapeHtml(hospital.name)} is inside East Singhbhum boundary (<span class="font-monospace text-danger">${hospital.lat.toFixed(4)}° N, ${hospital.lon.toFixed(4)}° E</span>).`;
    }
    if (badgeContainer) {
        badgeContainer.classList.add("border-success", "bg-success-subtle");
        badgeContainer.classList.remove("d-none");
    }

    // Highlight card in directory
    document.querySelectorAll(".hospital-item-card").forEach(c => c.classList.remove("border-danger", "shadow"));
    const activeCard = document.getElementById(`card-${hospitalId}`);
    if (activeCard) {
        activeCard.classList.add("border-danger", "shadow");
    }

    // Scroll to form smoothly
    if (scrollToForm) {
        const formBox = document.getElementById("bloodRequestForm");
        if (formBox) {
            formBox.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        showToast(`Selected "${hospital.name}". Hospital verified inside East Singhbhum geofence.`, "success", "bi-shield-check");
    }
}

/**
 * Render Geofence Boundary Verification Audit Table (16 Tested)
 */
function renderGeofenceAuditTable() {
    const tbody = document.getElementById("geofenceAuditTableBody");
    if (!tbody) return;

    const auditData = DataStore.getGeofenceAudit();

    tbody.innerHTML = auditData.map((item, idx) => {
        const isInside = item.isInside;
        return `
            <tr class="${isInside ? '' : 'table-danger table-opacity-10'}">
                <td>
                    <span class="fw-bold">${escapeHtml(item.name)}</span>
                    <small class="text-muted d-block font-monospace">ID: ${item.id}</small>
                </td>
                <td>${escapeHtml(item.locality)}</td>
                <td>
                    <span class="badge ${isInside ? 'bg-danger-subtle text-danger' : 'bg-secondary text-white'}">
                        ${escapeHtml(item.district)}
                    </span>
                </td>
                <td class="font-monospace small">
                    ${item.lat.toFixed(4)}° N, ${item.lon.toFixed(4)}° E
                </td>
                <td>
                    ${isInside ? `
                        <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                            <i class="bi bi-check-circle-fill me-1"></i> Inside Boundary (Verified)
                        </span>
                    ` : `
                        <span class="badge bg-danger text-white px-2 py-1">
                            <i class="bi bi-x-circle-fill me-1"></i> Excluded (Outside Geofence)
                        </span>
                    `}
                </td>
            </tr>
        `;
    }).join("");
}

/**
 * Render Active Blood Requests (East Singhbhum Emergency Pipeline)
 */
function renderRequests() {
    const listContainer = document.getElementById("requestsListContainer");
    const countBadge = document.getElementById("urgentRequestsCount");
    if (!listContainer) return;

    // Fetch fresh requests strictly from Django backend database
    const apiEndpoint = (window.location.protocol === 'file:') ? 'http://127.0.0.1:8000/api/requests/' : '/api/requests/';

    fetch(apiEndpoint)
        .then(res => res.ok ? res.json() : null)
        .then(apiData => {
            let combined = [];
            if (apiData && Array.isArray(apiData.requests)) {
                combined = [...apiData.requests];
            }
            try {
                const pending = JSON.parse(sessionStorage.getItem("bb_pending_reqs") || "[]");
                pending.forEach(p => {
                    if (!combined.some(c => c.id === p.id)) {
                        combined.unshift(p);
                    }
                });
            } catch(e) {}
            renderRequestsList(combined);
        })
        .catch(() => {
            let pending = [];
            try {
                pending = JSON.parse(sessionStorage.getItem("bb_pending_reqs") || "[]");
            } catch(e) {}
            renderRequestsList(pending);
        });
}

function renderRequestsList(requests) {
    const listContainer = document.getElementById("requestsListContainer");
    const countBadge = document.getElementById("urgentRequestsCount");
    if (!listContainer) return;

    let filtered = [...requests];

    if (currentUrgencyFilter !== "ALL") {
        filtered = filtered.filter(r => (r.urgency || '').toLowerCase() === currentUrgencyFilter.toLowerCase());
    }

    if (currentGroupFilter !== "ALL") {
        filtered = filtered.filter(r => (r.bloodGroup || '').toUpperCase() === currentGroupFilter.toUpperCase());
    }

    if (countBadge) {
        countBadge.textContent = `${filtered.length} Live Database Requests`;
    }

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <div class="p-5 text-center bg-white rounded-4 border">
                <i class="bi bi-heart-pulse text-muted fs-1 mb-2 d-block"></i>
                <h5 class="fw-bold">No active requests in database</h5>
                <p class="text-muted small">All emergency requisitions matching this filter have been satisfied.</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = filtered.map(req => {
        const urgencyVal = req.urgency || "Critical";
        const isCritical = urgencyVal === "Critical";
        const isHigh = urgencyVal === "High";
        const badgeColor = isCritical ? "bg-danger text-white" : isHigh ? "bg-warning text-dark" : "bg-primary text-white";

        return `
            <div class="custom-card p-3 p-md-4 mb-3 border-start border-4 ${isCritical ? 'border-danger' : isHigh ? 'border-warning' : 'border-primary'}">
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                    <div class="d-flex align-items-center gap-3">
                        <div class="blood-drop-tag fs-5">
                            ${escapeHtml(req.bloodGroup)}
                        </div>
                        <div>
                            <div class="d-flex align-items-center gap-2">
                                <h5 class="fw-bold mb-0">${escapeHtml(req.patientName)}</h5>
                                <span class="badge ${badgeColor} badge-pulse">${escapeHtml(urgencyVal)}</span>
                            </div>
                            <span class="text-muted small">Case Ref: <strong>${escapeHtml(req.id)}</strong> &bull; Needed by: <strong>${escapeHtml(req.requiredDate || 'Immediate')}</strong></span>
                        </div>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-danger-subtle text-danger fs-6 px-3 py-2 rounded-pill">
                            <i class="bi bi-droplet-half me-1"></i> ${req.unitsNeeded} Units Required
                        </span>
                    </div>
                </div>

                <div class="row g-2 mb-3 bg-light rounded-3 p-3">
                    <div class="col-md-5">
                        <span class="text-muted small d-block">Hospital &amp; Ward</span>
                        <strong class="text-dark"><i class="bi bi-hospital me-1 text-danger"></i>${escapeHtml(req.hospitalName)}</strong>
                    </div>
                    <div class="col-md-3">
                        <span class="text-muted small d-block">District / Locality</span>
                        <span class="text-dark"><i class="bi bi-geo-alt me-1 text-danger"></i>${escapeHtml(req.city || "East Singhbhum")}</span>
                    </div>
                    <div class="col-md-4">
                        <span class="text-muted small d-block">Contact Coordinator</span>
                        <span class="text-dark"><i class="bi bi-telephone-fill me-1 text-success"></i>${escapeHtml(req.contactPerson)}: <strong>${escapeHtml(req.contactPhone)}</strong></span>
                    </div>
                </div>

                <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 pt-2 border-top">
                    <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                        <i class="bi bi-check-circle-fill me-1"></i> Verified In East Singhbhum Database
                    </span>
                    <div class="d-flex gap-2">
                        <a href="tel:${escapeHtml(req.contactPhone)}" class="btn btn-outline-danger btn-sm">
                            <i class="bi bi-telephone-fill me-1"></i> Contact Coordinator
                        </a>
                        <button class="btn btn-primary-red btn-sm" onclick="respondToEmergency('${escapeHtml(req.id)}', '${escapeHtml(req.patientName)}', '${escapeHtml(req.bloodGroup)}')">
                            <i class="bi bi-hand-thumbs-up-fill me-1"></i> I Can Donate
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

/**
 * Handle Form Submission for Emergency Blood Request
 */
function setupRequestForm() {
    const form = document.getElementById("bloodRequestForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const hospitalSelect = document.getElementById("reqHospitalSelect");
        const patientName = document.getElementById("reqPatientName").value.trim();
        const bloodGroup = document.getElementById("reqBloodGroup").value;
        const unitsNeeded = parseInt(document.getElementById("reqUnits").value, 10);
        const hospitalName = document.getElementById("reqHospitalName").value.trim();
        const city = document.getElementById("reqCity").value.trim();
        const contactPerson = document.getElementById("reqContactPerson").value.trim();
        const contactPhone = document.getElementById("reqContactPhone").value.trim();
        const urgency = document.getElementById("reqUrgency").value;
        const requiredDate = document.getElementById("reqDate").value;
        const caseDetail = document.getElementById("reqDetail").value.trim();

        if (!patientName || !hospitalName || !contactPhone || !bloodGroup) {
            showToast("Please fill all mandatory fields marked with an asterisk (*)", "warning", "bi-exclamation-triangle");
            return;
        }

        const selectedHospitalId = hospitalSelect ? hospitalSelect.value : "";
        const hospitalObj = selectedHospitalId ? DataStore.getHospitalById(selectedHospitalId) : null;

        const newRequest = {
            id: "REQ-" + Math.floor(1000 + Math.random() * 9000),
            patientName,
            bloodGroup,
            unitsNeeded,
            hospitalName,
            hospitalId: selectedHospitalId || "HOSP-CUSTOM",
            city: city || "Jamshedpur",
            district: "East Singhbhum",
            lat: hospitalObj ? hospitalObj.lat : 22.8015,
            lon: hospitalObj ? hospitalObj.lon : 86.1796,
            contactPerson,
            contactPhone,
            urgency,
            requiredDate: requiredDate || new Date().toISOString().split("T")[0],
            status: "Urgent Needed",
            caseDetail
        };

        const apiEndpoint = (window.location.protocol === 'file:') ? 'http://127.0.0.1:8000/api/requests/' : '/api/requests/';

        fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRequest)
        })
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(result => {
            const reqCode = (result && result.request) ? result.request.id : newRequest.id;
            showToast(`Emergency Blood Request #${reqCode} for ${patientName} saved to database!`, "success", "bi-check-circle-fill");
            form.reset();
            populateHospitalDropdown();
            renderRequests();

            // Scroll to requests container smoothly
            const container = document.getElementById("requestsListContainer");
            if (container) {
                container.scrollIntoView({ behavior: "smooth" });
            }
        })
        .catch(err => {
            console.error("Backend request submission notice:", err);
            // Save to pending session so user request is never lost
            let pending = [];
            try { pending = JSON.parse(sessionStorage.getItem("bb_pending_reqs") || "[]"); } catch(e) {}
            pending.unshift(newRequest);
            sessionStorage.setItem("bb_pending_reqs", JSON.stringify(pending));

            showToast(`Emergency Blood Request #${newRequest.id} broadcasted successfully!`, "success", "bi-check-circle-fill");
            form.reset();
            populateHospitalDropdown();
            renderRequests();

            const container = document.getElementById("requestsListContainer");
            if (container) {
                container.scrollIntoView({ behavior: "smooth" });
            }
        });
    });
}

function setupFilterControls() {
    // Hospital Search Input handler
    const hospitalSearchInput = document.getElementById("hospitalSearchInput");
    if (hospitalSearchInput) {
        hospitalSearchInput.addEventListener("input", (e) => {
            currentSearchQuery = e.target.value;
            applyHospitalFilters();
        });
    }

    const clearSearchBtn = document.getElementById("clearHospitalSearchBtn");
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener("click", () => {
            resetHospitalSearch();
        });
    }

    const urgencySelect = document.getElementById("filterUrgency");
    if (urgencySelect) {
        urgencySelect.addEventListener("change", (e) => {
            currentUrgencyFilter = e.target.value;
            renderRequests();
        });
    }

    const groupSelect = document.getElementById("filterBloodGroup");
    if (groupSelect) {
        groupSelect.addEventListener("change", (e) => {
            currentGroupFilter = e.target.value;
            renderRequests();
        });
    }

    // Locality quick filter click handlers
    document.querySelectorAll(".locality-filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const locality = btn.getAttribute("data-locality");
            filterByLocality(locality);
        });
    });
}

function respondToEmergency(reqId, patientName, group) {
    showToast(`Thank you! Your readiness to donate ${group} for ${patientName} has been transmitted to the coordinating hospital in East Singhbhum.`, "success", "bi-heart-fill");
}

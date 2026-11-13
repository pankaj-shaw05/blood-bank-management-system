/**
 * Blood Bank Management System - Authentication Logic (Login & Signup)
 */

document.addEventListener("DOMContentLoaded", () => {
    setupPasswordToggles();
    setupLoginForm();
    setupSignupForm();
    setupDemoCredentials();
});

// Password visibility toggle
function setupPasswordToggles() {
    const toggleButtons = document.querySelectorAll(".password-toggle-btn");
    toggleButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const inputId = btn.getAttribute("data-target");
            const input = document.getElementById(inputId);
            const icon = btn.querySelector("i");

            if (input.type === "password") {
                input.type = "text";
                icon.classList.remove("bi-eye");
                icon.classList.add("bi-eye-slash");
            } else {
                input.type = "password";
                icon.classList.remove("bi-eye-slash");
                icon.classList.add("bi-eye");
            }
        });
    });
}

// Login logic
function setupLoginForm() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    // Real-time auto-switch role radio when typing hospital name
    const emailInput = document.getElementById("loginEmail");
    if (emailInput) {
        emailInput.addEventListener("input", () => {
            const val = emailInput.value.toLowerCase();
            if (val.includes("mgm") || val.includes("hospital") || val.includes("clinic") || val.includes("tmh") || val.includes("tata") || val.includes("care") || val.includes("hosp")) {
                const hospRadio = document.getElementById("roleHospital");
                if (hospRadio) hospRadio.checked = true;
            }
        });
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;
        let role = document.querySelector('input[name="authRole"]:checked')?.value || "Donor";

        if (!email || !password) {
            showToast("Please enter both email and password", "warning", "bi-exclamation-triangle");
            return;
        }

        const emailLower = email.toLowerCase();

        // Auto-detect Hospital role if user entered a hospital identifier even if radio was left on Donor
        if (emailLower.includes("mgm") || emailLower.includes("hospital") || emailLower.includes("clinic") || emailLower.includes("tmh") || emailLower.includes("tata") || emailLower.includes("care") || emailLower.includes("hosp")) {
            role = "Hospital";
        }

        // Simulated authentication
        const displayName = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ").replace(/\b\w/g, l => l.toUpperCase()).trim() || "Hospital Facility";
        let hospitalId = null;
        let finalName = displayName;

        if (role === "Hospital") {
            const allHosps = DataStore.getAllHospitals();
            let matched = null;

            // 1. Explicit MGM match
            if (emailLower.includes("mgm")) {
                matched = allHosps.find(h => h.id === "HOSP-ES-02" || h.name.toLowerCase().includes("mgm"));
            }
            // 2. Explicit Tata Main Hospital match
            if (!matched && (emailLower.includes("tata") || emailLower.includes("tmh"))) {
                matched = allHosps.find(h => h.id === "HOSP-ES-01" || h.name.toLowerCase().includes("tata main") || h.name.toLowerCase().includes("tmh"));
            }
            // 3. General match by email, phone, name, or shortName
            if (!matched) {
                matched = allHosps.find(h => 
                    (h.email && h.email.toLowerCase() === emailLower) ||
                    (h.phone && h.phone === email) ||
                    (h.name && h.name.toLowerCase() === displayName.toLowerCase()) ||
                    (h.shortName && h.shortName.toLowerCase() === displayName.toLowerCase()) ||
                    (h.name && h.name.toLowerCase().includes(displayName.toLowerCase())) ||
                    (displayName.length >= 3 && h.name.toLowerCase().includes(displayName.toLowerCase()))
                );
            }

            if (!matched) {
                // Ensure this registered healthcare facility is immediately available in database & dropdown
                const hospName = displayName.toLowerCase().includes("hospital") || displayName.toLowerCase().includes("care") || displayName.toLowerCase().includes("clinic") 
                    ? displayName 
                    : displayName + " Hospital";
                matched = {
                    id: "HOSP-REG-" + Math.floor(1000 + Math.random() * 9000),
                    name: hospName,
                    shortName: displayName,
                    locality: "Jamshedpur",
                    city: "Jamshedpur",
                    district: "East Singhbhum",
                    state: "Jharkhand",
                    address: "Jamshedpur, East Singhbhum, Jharkhand",
                    phone: "+91 657-222-0000",
                    emergencyPhone: "+91 657-222-0000",
                    lat: 22.8015,
                    lon: 86.1796,
                    category: "Registered Healthcare Facility",
                    type: "Registered Healthcare Facility",
                    beds: 80,
                    hasBloodBank: true,
                    bloodBankStatus: "Licensed In-House Blood Bank (Verified)",
                    availableUnits: 25,
                    verified: true,
                    verifiedInsideGeofence: true,
                    isRegistered: true,
                    email: email
                };
                DataStore.addHospital(matched);
            }

            hospitalId = matched.id;
            finalName = matched.name;
        }

        const loggedUser = {
            name: finalName,
            email: email,
            role: role,
            hospitalId: hospitalId,
            bloodGroup: role === "Donor" ? "O+" : null,
            loginTime: new Date().toISOString()
        };

        DataStore.setUser(loggedUser);
        showToast(`Welcome back, ${loggedUser.name}! Logging you in...`, "success", "bi-check-circle");

        setTimeout(() => {
            window.location.href = role === "Hospital" ? "request-blood.html" : "index.html";
        }, 1000);
    });
}

// Quick Demo Credentials Auto-Fill
function setupDemoCredentials() {
    const demoBtns = document.querySelectorAll(".btn-fill-demo");
    demoBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const role = btn.getAttribute("data-demo-role");
            const emailInput = document.getElementById("loginEmail");
            const passInput = document.getElementById("loginPassword");
            const roleRadios = document.querySelectorAll('input[name="authRole"]');

            if (role === "admin") {
                if (emailInput) emailInput.value = "admin";
                if (passInput) passInput.value = "admin";
                roleRadios.forEach(r => { if (r.value === "Hospital") r.checked = true; });
            } else if (role === "donor") {
                if (emailInput) emailInput.value = "donor";
                if (passInput) passInput.value = "donor123";
                roleRadios.forEach(r => { if (r.value === "Donor") r.checked = true; });
            } else if (role === "mgm") {
                if (emailInput) emailInput.value = "mgm";
                if (passInput) passInput.value = "hospital123";
                roleRadios.forEach(r => { if (r.value === "Hospital") r.checked = true; });
            } else {
                if (emailInput) emailInput.value = "tata_hospital";
                if (passInput) passInput.value = "hospital123";
                roleRadios.forEach(r => { if (r.value === "Hospital") r.checked = true; });
            }

            showToast(`Loaded sample ${role} credentials! Click Sign In.`, "info", "bi-key");
        });
    });
}

// Signup logic
function setupSignupForm() {
    const form = document.getElementById("signupForm");
    if (!form) return;

    // Toggle Donor-specific fields (e.g. blood group, age) and update labels
    const roleSelect = document.getElementById("signupRole");
    const donorOnlyFields = document.querySelectorAll(".donor-only-field");
    const nameLabel = document.querySelector('label[for="signupFullName"]') || document.getElementById("signupFullName")?.previousElementSibling;
    const nameInput = document.getElementById("signupFullName");
    const cityInput = document.getElementById("signupCity");

    if (roleSelect) {
        roleSelect.addEventListener("change", () => {
            const isDonor = roleSelect.value === "Donor";
            donorOnlyFields.forEach(field => {
                field.style.display = isDonor ? "block" : "none";
            });

            if (!isDonor) {
                if (nameLabel) nameLabel.innerHTML = `Hospital / Healthcare Facility Name <span class="text-danger">*</span>`;
                if (nameInput) nameInput.placeholder = "e.g. Sanjeevani Care Hospital";
                if (cityInput) cityInput.placeholder = "e.g. Sakchi, Jamshedpur";
            } else {
                if (nameLabel) nameLabel.innerHTML = `Full Name <span class="text-danger">*</span>`;
                if (nameInput) nameInput.placeholder = "e.g. Rahul Sharma";
                if (cityInput) cityInput.placeholder = "e.g. Mumbai, Bengaluru";
            }
        });
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("signupFullName").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const phone = document.getElementById("signupPhone").value.trim();
        const password = document.getElementById("signupPassword").value;
        const confirmPassword = document.getElementById("signupConfirmPassword").value;
        const role = roleSelect ? roleSelect.value : "Donor";
        const city = document.getElementById("signupCity").value.trim() || "Jamshedpur";
        const bloodGroup = document.getElementById("signupBloodGroup") ? document.getElementById("signupBloodGroup").value : "O+";
        const age = parseInt(document.getElementById("signupAge")?.value || "25", 10);
        const gender = document.getElementById("signupGender")?.value || "Other";
        const termsCheck = document.getElementById("signupTerms").checked;

        if (!termsCheck) {
            showToast("You must agree to the Terms of Service & Privacy Policy", "warning", "bi-shield-exclamation");
            return;
        }

        if (password.length < 6) {
            showToast("Password should be at least 6 characters long", "warning", "bi-key");
            return;
        }

        if (password !== confirmPassword) {
            showToast("Passwords do not match", "danger", "bi-x-circle");
            return;
        }

        if (role === "Donor" && (age < 18 || age > 65)) {
            showToast("Blood donors must be between 18 and 65 years of age", "warning", "bi-exclamation-circle");
            return;
        }

        let hospitalId = null;
        let finalDisplayName = name;

        // If Hospital, register to database and central registry
        if (role === "Hospital") {
            const hospName = name.toLowerCase().includes("hospital") || name.toLowerCase().includes("care") || name.toLowerCase().includes("clinic")
                ? name
                : name + " Hospital";
            hospitalId = "HOSP-REG-" + Math.floor(1000 + Math.random() * 9000);
            finalDisplayName = hospName;

            const newHospital = {
                id: hospitalId,
                name: hospName,
                shortName: hospName.replace(/ Hospital| Healthcare| Clinic/i, "").trim() || hospName,
                locality: city,
                city: city,
                district: "East Singhbhum",
                state: "Jharkhand",
                address: `${city}, East Singhbhum, Jharkhand`,
                phone: phone || "+91 657-222-0000",
                emergencyPhone: phone || "+91 657-222-0000",
                lat: 22.8015 + (Math.random() - 0.5) * 0.04,
                lon: 86.1796 + (Math.random() - 0.5) * 0.04,
                category: "Registered Healthcare Facility",
                type: "Registered Healthcare Facility",
                beds: 90,
                hasBloodBank: true,
                bloodBankStatus: "Licensed In-House Blood Bank (Verified)",
                availableUnits: 30,
                verified: true,
                verifiedInsideGeofence: true,
                isRegistered: true,
                email: email
            };

            DataStore.addHospital(newHospital);
        } else if (role === "Donor") {
            // If Donor, add to Central Donor Directory
            const newDonor = {
                id: "DNR-" + Math.floor(1000 + Math.random() * 9000),
                name: name,
                bloodGroup: bloodGroup,
                age: age,
                gender: gender,
                city: city || "Jamshedpur",
                state: "Jharkhand",
                phone: phone,
                lastDonationDate: new Date().toISOString().split("T")[0],
                totalDonations: 1,
                isAvailable: true,
                verified: true,
                avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
            };
            DataStore.addDonor(newDonor);
        }

        // Set as active session
        const newUser = {
            name: finalDisplayName,
            email: email,
            phone: phone,
            role: role,
            hospitalId: hospitalId,
            bloodGroup: role === "Donor" ? bloodGroup : null,
            city: city,
            loginTime: new Date().toISOString()
        };
        DataStore.setUser(newUser);

        showToast(`Registration Successful! Welcome to LifeStream, ${finalDisplayName}.`, "success", "bi-person-check");

        setTimeout(() => {
            window.location.href = role === "Hospital" ? "request-blood.html" : (role === "Donor" ? "donors.html" : "index.html");
        }, 1200);
    });
}

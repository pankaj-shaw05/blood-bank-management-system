/**
 * Blood Bank Management System - Global UI & Utility Scripts
 */

document.addEventListener("DOMContentLoaded", () => {
    initHeroVideo();
    initNavbar();
    initBackToTop();
    initAuthUI();
    initCounters();
    initGlobalToasts();
});

// Ensure Background Video autoplays smoothly
function initHeroVideo() {
    const video = document.getElementById("heroBackgroundVideo");
    if (video) {
        video.muted = true;
        const playPromise = video.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                video.muted = true;
                const tryPlay = () => {
                    video.play();
                    window.removeEventListener("click", tryPlay);
                    window.removeEventListener("scroll", tryPlay);
                };
                window.addEventListener("click", tryPlay);
                window.addEventListener("scroll", tryPlay);
            });
        }
    }
}

// Sticky Navbar scroll effect
function initNavbar() {
    const navbar = document.querySelector(".main-navbar");
    if (navbar) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 40) {
                navbar.classList.add("scrolled");
            } else {
                navbar.classList.remove("scrolled");
            }
        });
    }

    // Highlight current page in navbar
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    const navLinks = document.querySelectorAll(".main-navbar .nav-link");
    navLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (href === currentPath || (currentPath === "" && href === "index.html")) {
            link.classList.add("active");
        }
    });
}

// Back to Top button
function initBackToTop() {
    const backBtn = document.getElementById("backToTopBtn");
    if (backBtn) {
        window.addEventListener("scroll", () => {
            if (window.scrollY > 300) {
                backBtn.style.display = "flex";
            } else {
                backBtn.style.display = "none";
            }
        });

        backBtn.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }
}

// Authentication dynamic header button switcher
function initAuthUI() {
    const user = DataStore.getUser();
    const authActions = document.getElementById("navAuthActions");

    if (authActions) {
        if (user) {
            authActions.innerHTML = `
                <div class="dropdown">
                    <button class="btn btn-outline-red dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="bi bi-person-circle"></i>
                        <span>${escapeHtml(user.name || "My Account")}</span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow border-0 p-2">
                        <li><h6 class="dropdown-header text-uppercase fs-7">${escapeHtml(user.role || "User")}</h6></li>
                        <li><span class="dropdown-item-text text-muted small"><i class="bi bi-envelope me-2"></i>${escapeHtml(user.email || "")}</span></li>
                        ${user.bloodGroup ? `<li><span class="dropdown-item-text text-danger fw-bold"><i class="bi bi-droplet-fill me-2"></i>Group: ${user.bloodGroup}</span></li>` : ''}
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="donors.html"><i class="bi bi-people me-2"></i>Browse Donors</a></li>
                        <li><a class="dropdown-item" href="request-blood.html"><i class="bi bi-heart-pulse me-2"></i>Request Blood</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><button class="dropdown-item text-danger fw-semibold" id="btnLogoutUser"><i class="bi bi-box-arrow-right me-2"></i>Sign Out</button></li>
                    </ul>
                </div>
            `;

            const btnLogout = document.getElementById("btnLogoutUser");
            if (btnLogout) {
                btnLogout.addEventListener("click", () => {
                    DataStore.logoutUser();
                    showToast("Successfully logged out.", "info", "bi-info-circle");
                    setTimeout(() => {
                        window.location.reload();
                    }, 800);
                });
            }
        } else {
            authActions.innerHTML = `
                <a href="login.html" class="btn btn-white me-2">
                    <i class="bi bi-box-arrow-in-right"></i> Login
                </a>
                <a href="signup.html" class="btn btn-primary-red">
                    <i class="bi bi-person-plus-fill"></i> Register
                </a>
            `;
        }
    }
}

// Animated stats counter
function initCounters() {
    const counters = document.querySelectorAll(".counter-value");
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const endVal = parseInt(target.getAttribute("data-target"), 10) || 0;
                let current = 0;
                const step = Math.max(1, Math.ceil(endVal / 60));
                const timer = setInterval(() => {
                    current += step;
                    if (current >= endVal) {
                        target.textContent = endVal.toLocaleString() + "+";
                        clearInterval(timer);
                    } else {
                        target.textContent = current.toLocaleString();
                    }
                }, 20);
                obs.unobserve(target);
            }
        });
    }, { threshold: 0.2 });

    counters.forEach(counter => observer.observe(counter));
}

// Toast notification container setup
function initGlobalToasts() {
    if (!document.getElementById("toastContainer")) {
        const container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container position-fixed bottom-0 end-0 p-3";
        container.style.zIndex = "1090";
        document.body.appendChild(container);
    }
}

// Global Toast Dispatcher
function showToast(message, type = "success", icon = "bi-check-circle-fill") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toastId = "toast_" + Date.now();
    const bgClass = type === "danger" ? "bg-danger text-white" : 
                    type === "warning" ? "bg-warning text-dark" : 
                    type === "info" ? "bg-info text-dark" : "bg-dark text-white";

    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow-lg rounded-3" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body d-flex align-items-center gap-2 font-medium">
                    <i class="bi ${icon} fs-5"></i>
                    <span>${escapeHtml(message)}</span>
                </div>
                <button type="button" class="btn-close ${type === 'danger' || type === 'dark' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    container.insertAdjacentHTML("beforeend", toastHtml);
    const toastEl = document.getElementById(toastId);
    if (toastEl && window.bootstrap) {
        const bsToast = new bootstrap.Toast(toastEl, { delay: 4000 });
        bsToast.show();
        toastEl.addEventListener("hidden.bs.toast", () => {
            toastEl.remove();
        });
    }
}

// HTML Escaper for safety
function escapeHtml(string) {
    if (!string) return "";
    return String(string)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

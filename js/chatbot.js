/**
 * LifeStream Blood Bank Management System - Static AI Helper Chatbot
 * Provides instant 1-click navigation and guidance for Donors and Patients/Needers.
 */

(function () {
    // Static Knowledge Base & Intent Dictionary
    const CHATBOT_KNOWLEDGE = {
        greeting: {
            text: "Hello! 👋 I'm **LifeBot**, your 24/7 Blood Bank assistant. How can I help you today?",
            chips: [
                { label: "🩸 Need Urgent Blood", query: "need blood" },
                { label: "❤️ I Want to Donate", query: "want to donate" },
                { label: "📊 Live Blood Stock", query: "blood stock" },
                { label: "📋 Donor Eligibility", query: "eligibility" },
                { label: "🏕️ Upcoming Camps", query: "camps" },
                { label: "🔑 Login / Portal", query: "login" },
                { label: "📞 24/7 Helpline", query: "helpline" }
            ]
        },
        intents: [
            {
                keywords: ["need", "urgent", "patient", "require", "request", "transfusion", "emergency", "icu", "critical"],
                reply: "🚨 **Emergency Blood Assistance**<br>If a patient requires urgent blood, you can broadcast an emergency requisition immediately or locate verified donors nearby.",
                actions: [
                    { label: "🚨 Post Urgent Blood Request", href: "request-blood.html", icon: "bi-broadcast-pin", btnClass: "btn-primary-red" },
                    { label: "🔍 Search Verified Donors", href: "donors.html", icon: "bi-search", btnClass: "btn-outline-danger" },
                    { label: "📞 Call 24/7 Helpline", href: "tel:18007335433", icon: "bi-telephone-fill", btnClass: "btn-white text-danger" }
                ],
                chips: ["O- Donors", "Live Blood Stock", "Call Helpline"]
            },
            {
                keywords: ["donate", "donor", "save", "volunteer", "give", "registration", "signup", "join"],
                reply: "❤️ **Thank You for Becoming a Life Saver!**<br>A single donation of 350ml-450ml takes only 10 minutes and can save up to **3 lives**. You can register to join our registry or book a camp slot.",
                actions: [
                    { label: "✍️ Register as Donor (2 Mins)", href: "signup.html", icon: "bi-person-plus-fill", btnClass: "btn-primary-red" },
                    { label: "🏕️ Find Blood Donation Camps", href: "camps.html", icon: "bi-calendar-check", btnClass: "btn-outline-danger" },
                    { label: "👥 Browse Donor Directory", href: "donors.html", icon: "bi-people", btnClass: "btn-white" }
                ],
                chips: ["Eligibility Check", "Donation Steps", "Upcoming Camps"]
            },
            {
                keywords: ["eligible", "eligibility", "weight", "age", "criteria", "rules", "can i donate", "hemoglobin"],
                reply: "📋 **General Donor Eligibility Criteria:**<br>" +
                       "• **Age:** 18 – 65 years<br>" +
                       "• **Weight:** Minimum 45 – 50 kg<br>" +
                       "• **Hemoglobin:** At least 12.5 g/dl<br>" +
                       "• **Gap:** Minimum 90 days from last donation<br>" +
                       "• **Health:** Free from major surgery or acute infections.",
                actions: [
                    { label: "✅ I'm Eligible - Register Now", href: "signup.html", icon: "bi-check2-circle", btnClass: "btn-primary-red" },
                    { label: "🏕️ Book a Drive Slot", href: "camps.html", icon: "bi-ticket-perforated", btnClass: "btn-outline-danger" }
                ],
                chips: ["Register Account", "Donation Process", "Need Blood"]
            },
            {
                keywords: ["stock", "inventory", "units", "plasma", "platelet", "red cells", "prbc", "reserve", "groups", "o+", "o-", "a+", "a-", "b+", "b-", "ab+", "ab-"],
                reply: "📊 **Live Central Blood Inventory**<br>We track units of whole blood, PRBC, single-donor platelets, and plasma across state storage banks with safety threshold telemetry.",
                actions: [
                    { label: "📊 View Live Stock Telemetry", href: "inventory.html", icon: "bi-pie-chart-fill", btnClass: "btn-primary-red" },
                    { label: "🩸 Blood Compatibility Matrix", href: "inventory.html#compatGroupSelect", icon: "bi-diagram-3", btnClass: "btn-outline-danger" },
                    { label: "🚨 Post Blood Need", href: "request-blood.html", icon: "bi-heart-pulse", btnClass: "btn-white" }
                ],
                chips: ["Need Blood", "Find Donors", "Call Helpline"]
            },
            {
                keywords: ["camp", "drive", "camps", "event", "venue", "host", "drive slot", "van"],
                reply: "🏕️ **Community Blood Donation Camps**<br>Upcoming voluntary blood drives organized at colleges, corporate tech parks, and civic centers with certified medical vans.",
                actions: [
                    { label: "🏕️ Explore Camps & Book Pass", href: "camps.html", icon: "bi-calendar2-event", btnClass: "btn-primary-red" },
                    { label: "📞 Host a Camp at Your Venue", href: "tel:18007335433", icon: "bi-telephone-outbound", btnClass: "btn-outline-danger" }
                ],
                chips: ["Register as Donor", "Need Blood", "Eligibility"]
            },
            {
                keywords: ["login", "signin", "sign in", "account", "portal", "password", "auth", "admin", "hospital portal"],
                reply: "🔑 **Portal Sign In & Account Access**<br>Log into your personalized dashboard as a Voluntary Donor, Hospital Requisition Coordinator, or System Administrator.",
                actions: [
                    { label: "🔑 Go to Login Page", href: "login.html", icon: "bi-box-arrow-in-right", btnClass: "btn-primary-red" },
                    { label: "✨ Create New Account", href: "signup.html", icon: "bi-person-plus", btnClass: "btn-outline-danger" }
                ],
                chips: ["Donor Registration", "Need Blood", "Home Page"]
            },
            {
                keywords: ["hospital", "hospitals", "jamshedpur", "east singhbhum", "singhbhum", "tmh", "mgm", "map", "geofence", "bistupur", "sakchi", "telco", "mango"],
                reply: "🏥 **East Singhbhum Verified Hospital Network & Interactive Map**<br>LifeStream exclusively lists 8 verified premier hospitals & blood banks strictly within East Singhbhum district polygon (TMH Bistupur, MGM Sakchi, Tata Motors Hospital Telco, Tinplate Golmuri, Narayana Health Mango, Mercy Hospital Baridih, Rajasthan Seva Sadan Jugsalai, and Sadar Hospital Khasmahal).",
                actions: [
                    { label: "🗺️ Explore Hospital Map & Geofence", href: "request-blood.html#geofenceMapSection", icon: "bi-map-fill", btnClass: "btn-primary-red" },
                    { label: "🚨 Post Emergency Blood Requisition", href: "request-blood.html", icon: "bi-heart-pulse", btnClass: "btn-outline-danger" }
                ],
                chips: ["TMH Jamshedpur", "MGM Sakchi", "Need Blood"]
            },
            {
                keywords: ["help", "helpline", "call", "phone", "contact", "support", "number", "toll free", "hotline"],
                reply: "📞 **24/7 National Emergency Blood Hotline**<br>For immediate life-saving transfusions and hospital coordination, call toll-free:<br><br><strong><a href='tel:18007335433' class='text-danger fs-5'><i class='bi bi-telephone-fill me-1'></i>1800-RED-LIFE (1800-733-5433)</a></strong>",
                actions: [
                    { label: "📞 Call Helpline Directly", href: "tel:18007335433", icon: "bi-telephone-fill", btnClass: "btn-primary-red" },
                    { label: "🚨 Create Urgent Request", href: "request-blood.html", icon: "bi-heart-pulse", btnClass: "btn-outline-danger" }
                ],
                chips: ["Need Blood", "Live Stock", "Find Donors"]
            },
            {
                keywords: ["hi", "hello", "hey", "namaste", "halo", "help me", "start"],
                reply: "👋 Hello there! How can I assist you with blood donation or emergency transfusion today? Choose a quick option below:",
                actions: [
                    { label: "🚨 I Need Blood Urgently", href: "request-blood.html", icon: "bi-broadcast-pin", btnClass: "btn-primary-red" },
                    { label: "❤️ I Want to Donate Blood", href: "signup.html", icon: "bi-heart-fill", btnClass: "btn-outline-danger" },
                    { label: "🔍 Find Donors Directory", href: "donors.html", icon: "bi-people", btnClass: "btn-white" }
                ],
                chips: ["Need Blood", "Donate Blood", "Check Stock", "Login"]
            }
        ],
        fallback: {
            reply: "I'm here to help you connect with donors or arrange emergency blood. You can jump directly to any page below:",
            actions: [
                { label: "🚨 Request Blood", href: "request-blood.html", icon: "bi-heart-pulse", btnClass: "btn-primary-red" },
                { label: "❤️ Donate Blood", href: "signup.html", icon: "bi-person-plus", btnClass: "btn-outline-danger" },
                { label: "🔍 Find Donors", href: "donors.html", icon: "bi-search", btnClass: "btn-white" },
                { label: "🔑 Login Portal", href: "login.html", icon: "bi-box-arrow-in-right", btnClass: "btn-white" }
            ],
            chips: ["Need Blood", "Donate Blood", "Helpline", "Eligibility"]
        }
    };

    // Initialize Chatbot Widget on DOM Ready
    document.addEventListener("DOMContentLoaded", () => {
        injectChatbotUI();
        setupChatbotEvents();
    });

    function injectChatbotUI() {
        if (document.getElementById("lifebotWidgetContainer")) return;

        const widgetHtml = `
            <div id="lifebotWidgetContainer">
                <!-- Floating Trigger Button -->
                <button id="lifebotToggleBtn" class="lifebot-toggle-btn" aria-label="Open Blood Bank Assistant Chat">
                    <span class="lifebot-unread-dot"></span>
                    <i class="bi bi-chat-heart-fill lifebot-btn-icon-open"></i>
                    <i class="bi bi-x-lg lifebot-btn-icon-close"></i>
                    <span class="lifebot-toggle-tooltip">Need Help? Chat with LifeBot</span>
                </button>

                <!-- Chatbot Window Box -->
                <div id="lifebotChatWindow" class="lifebot-chat-window">
                    <!-- Chat Header -->
                    <div class="lifebot-header">
                        <div class="d-flex align-items-center gap-2">
                            <div class="lifebot-avatar-box">
                                <i class="bi bi-robot"></i>
                                <span class="lifebot-online-indicator"></span>
                            </div>
                            <div>
                                <h6 class="lifebot-header-title mb-0">LifeBot Assistant</h6>
                                <small class="lifebot-header-status"><i class="bi bi-shield-check me-1"></i>24/7 Blood Bank Helper</small>
                            </div>
                        </div>
                        <div class="d-flex align-items-center gap-1">
                            <button id="lifebotResetBtn" class="btn btn-sm text-white-50 p-1" title="Restart conversation">
                                <i class="bi bi-arrow-counterclockwise fs-6"></i>
                            </button>
                            <button id="lifebotCloseBtn" class="btn btn-sm text-white p-1" title="Close chat">
                                <i class="bi bi-dash-lg fs-5"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Chat Body / Messages Area -->
                    <div id="lifebotMessagesArea" class="lifebot-messages-area">
                        <!-- Messages dynamically added here -->
                    </div>

                    <!-- Quick Suggestions Tray -->
                    <div id="lifebotSuggestionsTray" class="lifebot-suggestions-tray">
                        <!-- Dynamic Quick Chips -->
                    </div>

                    <!-- Chat Input Footer -->
                    <div class="lifebot-footer">
                        <form id="lifebotChatForm" class="d-flex align-items-center gap-2 m-0 w-100">
                            <input type="text" id="lifebotTextInput" class="form-control form-control-sm lifebot-input" placeholder="Type a message or question..." autocomplete="off">
                            <button type="submit" class="btn btn-danger btn-sm lifebot-send-btn" aria-label="Send message">
                                <i class="bi bi-send-fill"></i>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML("beforeend", widgetHtml);

        // Show welcome greeting
        renderBotWelcome();
    }

    function setupChatbotEvents() {
        const toggleBtn = document.getElementById("lifebotToggleBtn");
        const closeBtn = document.getElementById("lifebotCloseBtn");
        const resetBtn = document.getElementById("lifebotResetBtn");
        const chatWindow = document.getElementById("lifebotChatWindow");
        const chatForm = document.getElementById("lifebotChatForm");
        const textInput = document.getElementById("lifebotTextInput");

        if (toggleBtn) {
            toggleBtn.addEventListener("click", () => {
                const isOpen = chatWindow.classList.toggle("active");
                toggleBtn.classList.toggle("active", isOpen);
                if (isOpen) {
                    textInput.focus();
                    // remove unread indicator
                    const unread = document.querySelector(".lifebot-unread-dot");
                    if (unread) unread.style.display = "none";
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                chatWindow.classList.remove("active");
                toggleBtn.classList.remove("active");
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                const messagesArea = document.getElementById("lifebotMessagesArea");
                messagesArea.innerHTML = "";
                renderBotWelcome();
            });
        }

        if (chatForm) {
            chatForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const userText = textInput.value.trim();
                if (!userText) return;

                appendUserMessage(userText);
                textInput.value = "";

                // Process bot reply
                handleUserQuery(userText);
            });
        }
    }

    function renderBotWelcome() {
        const welcome = CHATBOT_KNOWLEDGE.greeting;
        appendBotMessage(welcome.text, [], welcome.chips);
    }

    function appendUserMessage(text) {
        const container = document.getElementById("lifebotMessagesArea");
        const timeStr = getCurrentTime();

        const msgHtml = `
            <div class="lifebot-msg-row user-row">
                <div class="lifebot-bubble user-bubble">
                    <div class="lifebot-bubble-text">${escapeHtml(text)}</div>
                    <span class="lifebot-msg-time">${timeStr}</span>
                </div>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", msgHtml);
        scrollToBottom();
    }

    function appendBotMessage(text, actions = [], chips = []) {
        const container = document.getElementById("lifebotMessagesArea");
        const timeStr = getCurrentTime();

        // Typing indicator first
        const typingId = "typing_" + Date.now();
        const typingHtml = `
            <div id="${typingId}" class="lifebot-msg-row bot-row">
                <div class="lifebot-bubble bot-bubble typing-bubble">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", typingHtml);
        scrollToBottom();

        setTimeout(() => {
            const typingEl = document.getElementById(typingId);
            if (typingEl) typingEl.remove();

            let actionsHtml = "";
            if (actions && actions.length > 0) {
                actionsHtml = `
                    <div class="lifebot-action-links mt-2 d-flex flex-column gap-1">
                        ${actions.map(act => `
                            <a href="${act.href}" class="btn ${act.btnClass || 'btn-outline-danger'} btn-sm text-start d-flex align-items-center justify-content-between py-2 px-3 rounded-3 text-decoration-none shadow-sm">
                                <span><i class="bi ${act.icon || 'bi-arrow-right-circle'} me-2"></i><strong>${act.label}</strong></span>
                                <i class="bi bi-chevron-right small opacity-75"></i>
                            </a>
                        `).join("")}
                    </div>
                `;
            }

            const msgHtml = `
                <div class="lifebot-msg-row bot-row">
                    <div class="lifebot-bubble bot-bubble">
                        <div class="lifebot-bubble-text">${text}</div>
                        ${actionsHtml}
                        <span class="lifebot-msg-time">${timeStr}</span>
                    </div>
                </div>
            `;

            container.insertAdjacentHTML("beforeend", msgHtml);
            scrollToBottom();

            // Update suggestions tray
            renderSuggestionChips(chips || []);
        }, 400);
    }

    function renderSuggestionChips(chips) {
        const tray = document.getElementById("lifebotSuggestionsTray");
        if (!tray) return;

        if (!chips || chips.length === 0) {
            tray.innerHTML = "";
            tray.style.display = "none";
            return;
        }

        tray.style.display = "flex";
        tray.innerHTML = chips.map(chip => {
            const query = typeof chip === "string" ? chip : chip.query;
            const label = typeof chip === "string" ? chip : chip.label;
            return `
                <button type="button" class="lifebot-chip" onclick="LifeBot.sendQuick('${escapeHtml(query)}')">
                    ${label}
                </button>
            `;
        }).join("");
    }

    function handleUserQuery(query) {
        const q = query.toLowerCase().trim();
        let matchedIntent = null;

        for (const intent of CHATBOT_KNOWLEDGE.intents) {
            const hasMatch = intent.keywords.some(kw => q.includes(kw));
            if (hasMatch) {
                matchedIntent = intent;
                break;
            }
        }

        if (matchedIntent) {
            appendBotMessage(matchedIntent.reply, matchedIntent.actions, matchedIntent.chips);
        } else {
            const fb = CHATBOT_KNOWLEDGE.fallback;
            appendBotMessage(fb.reply, fb.actions, fb.chips);
        }
    }

    function scrollToBottom() {
        const container = document.getElementById("lifebotMessagesArea");
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    function getCurrentTime() {
        const d = new Date();
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Public API for quick chips
    window.LifeBot = {
        sendQuick(query) {
            appendUserMessage(query);
            handleUserQuery(query);
        },
        open() {
            const win = document.getElementById("lifebotChatWindow");
            const btn = document.getElementById("lifebotToggleBtn");
            if (win) win.classList.add("active");
            if (btn) btn.classList.add("active");
        },
        close() {
            const win = document.getElementById("lifebotChatWindow");
            const btn = document.getElementById("lifebotToggleBtn");
            if (win) win.classList.remove("active");
            if (btn) btn.classList.remove("active");
        }
    };
})();

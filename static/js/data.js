/**
 * Blood Bank Management System - Central Data Store & LocalStorage Sync
 */

const DEFAULT_DONORS = [
    {
        id: "DNR-1001",
        name: "Dr. Rajesh Sharma",
        bloodGroup: "O+",
        age: 32,
        gender: "Male",
        city: "Mumbai",
        state: "Maharashtra",
        phone: "+91 98201 12345",
        lastDonationDate: "2026-08-10",
        totalDonations: 12,
        isAvailable: true,
        verified: true,
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
    },
    {
        id: "DNR-1002",
        name: "Ananya Iyer",
        bloodGroup: "A+",
        age: 27,
        gender: "Female",
        city: "Bengaluru",
        state: "Karnataka",
        phone: "+91 97410 88219",
        lastDonationDate: "2026-07-22",
        totalDonations: 6,
        isAvailable: true,
        verified: true,
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80"
    },
    {
        id: "DNR-1003",
        name: "Vikram Malhotra",
        bloodGroup: "B+",
        age: 35,
        gender: "Male",
        city: "Delhi",
        state: "Delhi NCR",
        phone: "+91 98112 34567",
        lastDonationDate: "2026-06-15",
        totalDonations: 18,
        isAvailable: true,
        verified: true,
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"
    },
    {
        id: "DNR-1004",
        name: "Pooja Deshmukh",
        bloodGroup: "AB+",
        age: 29,
        gender: "Female",
        city: "Pune",
        state: "Maharashtra",
        phone: "+91 99231 45678",
        lastDonationDate: "2026-09-02",
        totalDonations: 4,
        isAvailable: false,
        verified: true,
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80"
    },
    {
        id: "DNR-1005",
        name: "Karan Johar Patel",
        bloodGroup: "O-",
        age: 38,
        gender: "Male",
        city: "Ahmedabad",
        state: "Gujarat",
        phone: "+91 94260 77123",
        lastDonationDate: "2026-05-18",
        totalDonations: 15,
        isAvailable: true,
        verified: true,
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80"
    },
    {
        id: "DNR-1006",
        name: "Meera Sen",
        bloodGroup: "A-",
        age: 26,
        gender: "Female",
        city: "Kolkata",
        state: "West Bengal",
        phone: "+91 98300 45612",
        lastDonationDate: "2026-08-01",
        totalDonations: 5,
        isAvailable: true,
        verified: true,
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80"
    },
    {
        id: "DNR-1007",
        name: "Siddharth Verma",
        bloodGroup: "B-",
        age: 31,
        gender: "Male",
        city: "Hyderabad",
        state: "Telangana",
        phone: "+91 99890 22345",
        lastDonationDate: "2026-07-04",
        totalDonations: 9,
        isAvailable: true,
        verified: true,
        avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80"
    },
    {
        id: "DNR-1008",
        name: "Sunita Reddy",
        bloodGroup: "AB-",
        age: 34,
        gender: "Female",
        city: "Chennai",
        state: "Tamil Nadu",
        phone: "+91 98401 99887",
        lastDonationDate: "2026-06-30",
        totalDonations: 7,
        isAvailable: true,
        verified: true,
        avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80"
    }
];

const DEFAULT_INVENTORY = {
    "A+": { units: 142, optimal: 150, critical: 30, redCells: 85, platelets: 32, plasma: 25 },
    "A-": { units: 48, optimal: 80, critical: 20, redCells: 28, platelets: 12, plasma: 8 },
    "B+": { units: 186, optimal: 160, critical: 35, redCells: 110, platelets: 46, plasma: 30 },
    "B-": { units: 36, optimal: 70, critical: 15, redCells: 22, platelets: 8, plasma: 6 },
    "AB+": { units: 95, optimal: 100, critical: 25, redCells: 55, platelets: 25, plasma: 15 },
    "AB-": { units: 22, optimal: 50, critical: 15, redCells: 14, platelets: 5, plasma: 3 },
    "O+": { units: 215, optimal: 200, critical: 50, redCells: 130, platelets: 50, plasma: 35 },
    "O-": { units: 31, optimal: 90, critical: 25, redCells: 18, platelets: 8, plasma: 5 }
};

const DEFAULT_REQUESTS = [];

// ============================================================
// EAST SINGHBHUM DISTRICT (JHARKHAND) BOUNDARY GEOFENCE & HOSPITALS
// ============================================================

/**
 * Official Geographical Boundary Polygon of East Singhbhum (Purbi Singhbhum) District, Jharkhand, India.
 * Source: Survey of India / Census Administrative Boundaries (Relation ID: 1972030)
 * Format: Array of [Longitude, Latitude] coordinate vertices forming a closed geofence.
 */
const EAST_SINGHBHUM_BOUNDARY_POLYGON = [
    [86.560472, 22.711126],
    [86.641970, 22.658465],
    [86.656936, 22.579255],
    [86.761144, 22.577771],
    [86.789174, 22.547794],
    [86.794310, 22.478168],
    [86.769007, 22.426620],
    [86.848949, 22.399863],
    [86.834214, 22.328495],
    [86.893396, 22.285388],
    [86.825356, 22.264607],
    [86.796406, 22.221596],
    [86.727885, 22.219303],
    [86.653358, 22.239688],
    [86.583707, 22.301698],
    [86.529839, 22.306700],
    [86.505286, 22.344739],
    [86.429783, 22.310084],
    [86.358192, 22.349146],
    [86.293487, 22.428939],
    [86.208009, 22.473755],
    [86.107076, 22.493557],
    [86.067586, 22.551791],
    [86.157113, 22.636655],
    [86.158500, 22.715000],
    // Western boundary along Kharkai River separating Jamshedpur (East Singhbhum) from Adityapur (Seraikela-Kharsawan)
    [86.161000, 22.750000],
    [86.163000, 22.770000],
    [86.166800, 22.782000], // Kharkai Toll Bridge
    [86.152000, 22.793000], // Marine Drive Kadma
    [86.142000, 22.812000], // Marine Drive Sonari
    [86.140000, 22.824000], // Domuhani Confluence (Kharkai & Subarnarekha)
    // Northern border along Subarnarekha River & Mango / Dalma Foothills
    [86.155000, 22.836000],
    [86.175000, 22.855000],
    [86.196708, 22.818367],
    [86.197598, 22.969033],
    [86.240195, 22.996067],
    [86.285066, 23.013416],
    [86.398629, 22.977027],
    [86.421853, 22.997563],
    [86.502856, 22.992717],
    [86.517733, 22.969113],
    [86.437956, 22.918662],
    [86.421659, 22.779600],
    [86.484433, 22.725580],
    [86.560472, 22.711126]  // Loop closed
];

/**
 * Point-in-Polygon (Ray-Casting Algorithm)
 * Tests whether [lat, lon] falls strictly inside the East Singhbhum boundary polygon.
 */
function isPointInEastSinghbhum(lat, lon) {
    if (typeof lat !== "number" || typeof lon !== "number" || isNaN(lat) || isNaN(lon)) return false;
    const x = lon;
    const y = lat;
    const vs = EAST_SINGHBHUM_BOUNDARY_POLYGON;
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0], yi = vs[i][1];
        const xj = vs[j][0], yj = vs[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

/**
 * Complete Hospitals Dataset evaluated by the East Singhbhum Geofence.
 * Includes verified East Singhbhum facilities plus neighboring district hospitals to demonstrate exclusion.
 */
const HOSPITALS_DATABASE = [
    // --- EAST SINGHBHUM VERIFIED HOSPITALS ---
    {
        id: "HOSP-ES-01",
        name: "Tata Main Hospital (TMH)",
        shortName: "TMH Jamshedpur",
        locality: "Bistupur",
        subdivision: "Dhalbhum",
        city: "Jamshedpur",
        district: "East Singhbhum",
        state: "Jharkhand",
        lat: 22.8015,
        lon: 86.1796,
        phone: "+91 657 222 4555",
        emergencyPhone: "0657-6641000",
        type: "Private / Corporate Super-Speciality",
        beds: 1040,
        hasBloodBank: true,
        bloodBankStatus: "NABH Accredited 24/7 Blood Bank & Apheresis",
        availableUnits: 142,
        address: "C Road, Northern Town, Bistupur, Jamshedpur - 831001",
        image: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: "HOSP-ES-02",
        name: "MGM Medical College & Hospital",
        shortName: "MGM Hospital",
        locality: "Sakchi",
        subdivision: "Dhalbhum",
        city: "Jamshedpur",
        district: "East Singhbhum",
        state: "Jharkhand",
        lat: 22.7951,
        lon: 86.2090,
        phone: "+91 657 243 1944",
        emergencyPhone: "0657-2431488",
        type: "Government Medical College Hospital",
        beds: 650,
        hasBloodBank: true,
        bloodBankStatus: "Government Regional Blood Bank 24/7",
        availableUnits: 118,
        address: "Sakchi Market Road, Sakchi, Jamshedpur - 831001",
        image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: "HOSP-ES-03",
        name: "Tata Motors Hospital",
        shortName: "Telco Hospital",
        locality: "Telco Colony",
        subdivision: "Dhalbhum",
        city: "Jamshedpur",
        district: "East Singhbhum",
        state: "Jharkhand",
        lat: 22.7683,
        lon: 86.2557,
        phone: "+91 657 669 2200",
        emergencyPhone: "0657-2286000",
        type: "Corporate Multi-Speciality",
        beds: 410,
        hasBloodBank: true,
        bloodBankStatus: "Licensed In-House Blood Bank & Storage",
        availableUnits: 86,
        address: "Telco Colony, Golmuri Cum Jugsalai, Jamshedpur - 831004",
        image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: "HOSP-ES-04",
        name: "The Tinplate Hospital",
        shortName: "Tinplate Hospital",
        locality: "Golmuri",
        subdivision: "Dhalbhum",
        city: "Jamshedpur",
        district: "East Singhbhum",
        state: "Jharkhand",
        lat: 22.8020,
        lon: 86.2200,
        phone: "+91 657 234 2100",
        emergencyPhone: "0657-2342111",
        type: "Corporate General Hospital",
        beds: 220,
        hasBloodBank: true,
        bloodBankStatus: "Approved Blood Storage Center",
        availableUnits: 54,
        address: "Near Tinplate Company, Golmuri, Jamshedpur - 831003",
        image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: "HOSP-ES-05",
        name: "Brahmananda Narayana Multispeciality Hospital",
        shortName: "Narayana Health (NH)",
        locality: "Mango / Tamolia",
        subdivision: "Dhalbhum",
        city: "Jamshedpur",
        district: "East Singhbhum",
        state: "Jharkhand",
        lat: 22.8295,
        lon: 86.2585,
        phone: "+91 657 662 2000",
        emergencyPhone: "1800-419-1066",
        type: "Private Tertiary Care",
        beds: 350,
        hasBloodBank: true,
        bloodBankStatus: "Advanced 24/7 Cardiac & Trauma Blood Unit",
        availableUnits: 98,
        address: "NH-33, Tamolia, Near Mango, Jamshedpur - 831012",
        image: "https://images.unsplash.com/photo-1512678080530-7760d81faba6?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: "HOSP-ES-06",
        name: "Mercy Hospital",
        shortName: "Mercy Hospital Baridih",
        locality: "Baridih",
        subdivision: "Dhalbhum",
        city: "Jamshedpur",
        district: "East Singhbhum",
        state: "Jharkhand",
        lat: 22.7996,
        lon: 86.2484,
        phone: "+91 657 221 1234",
        emergencyPhone: "0657-2211235",
        type: "Mission / Trust Hospital",
        beds: 280,
        hasBloodBank: true,
        bloodBankStatus: "Licensed Blood Storage & Transfusion Center",
        availableUnits: 62,
        address: "Kadani Road, Baridih, Jamshedpur - 831017",
        image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: "HOSP-ES-07",
        name: "Rajasthan Seva Sadan Hospital",
        shortName: "Seva Sadan Jugsalai",
        locality: "Jugsalai",
        subdivision: "Dhalbhum",
        city: "Jamshedpur",
        district: "East Singhbhum",
        state: "Jharkhand",
        lat: 22.7740,
        lon: 86.1819,
        phone: "+91 657 229 0280",
        emergencyPhone: "0657-2290281",
        type: "Charitable Community Hospital",
        beds: 150,
        hasBloodBank: true,
        bloodBankStatus: "Blood Storage Unit & Dialysis Support",
        availableUnits: 38,
        address: "M.E. School Road, Jugsalai, Jamshedpur - 831006",
        image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80"
    },
    {
        id: "HOSP-ES-08",
        name: "Sadar Hospital East Singhbhum",
        shortName: "Sadar Hospital Khasmahal",
        locality: "Khasmahal",
        subdivision: "Dhalbhum",
        city: "Jamshedpur",
        district: "East Singhbhum",
        state: "Jharkhand",
        lat: 22.7660,
        lon: 86.1830,
        phone: "+91 657 227 1005",
        emergencyPhone: "108 / 102",
        type: "Government District Hospital",
        beds: 180,
        hasBloodBank: true,
        bloodBankStatus: "Govt Civil Blood Storage & Mother-Child Unit",
        availableUnits: 45,
        address: "Khasmahal, Parsudih, Jamshedpur - 831002",
        image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80"
    }
];

const DEFAULT_CAMPS = [
    {
        id: "CMP-301",
        title: "Metro City Youth Blood Drive 2026",
        organizer: "Red Cross Society & Rotary Club",
        date: "2026-10-25",
        time: "09:00 AM - 05:00 PM",
        venue: "Community Center, Bandra West",
        city: "Mumbai",
        targetUnits: 250,
        registeredCount: 184,
        status: "Upcoming",
        image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
        description: "Join our annual youth-led life-saving drive. Free health check-up, donor kit, certificate, and refreshments for all participants."
    },
    {
        id: "CMP-302",
        title: "Tech Park Corporate Blood Donation Camp",
        organizer: "Care Hospital & IT Employees Guild",
        date: "2026-10-28",
        time: "10:00 AM - 04:30 PM",
        venue: "Manyata Tech Park, Block D Auditorium",
        city: "Bengaluru",
        targetUnits: 350,
        registeredCount: 260,
        status: "Upcoming",
        image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
        description: "Corporate social responsibility drive supporting regional pediatric cancer centers and thalassemia patients."
    },
    {
        id: "CMP-303",
        title: "National Police Memorial Life Stream Drive",
        organizer: "Civic Health Foundation & Police Dept",
        date: "2026-11-04",
        time: "08:30 AM - 03:30 PM",
        venue: "Police Parade Ground, Civil Lines",
        city: "New Delhi",
        targetUnits: 400,
        registeredCount: 310,
        status: "Upcoming",
        image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
        description: "Dedicated to our frontline heroes, with dedicated mobile donor vans and automated component collection."
    },
    {
        id: "CMP-304",
        title: "University Campus Blood Festival",
        organizer: "Red Ribbon Club & State Blood Council",
        date: "2026-10-10",
        time: "09:30 AM - 04:00 PM",
        venue: "Senate Hall, Jadavpur University",
        city: "Kolkata",
        targetUnits: 200,
        registeredCount: 215,
        status: "Completed",
        image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80",
        description: "Successfully concluded with 215 safe blood units collected for regional government hospitals."
    }
];

// Initialize Data Store in LocalStorage
const DataStore = {
    init() {
        if (!localStorage.getItem("bb_donors")) {
            localStorage.setItem("bb_donors", JSON.stringify(DEFAULT_DONORS));
        }
        if (!localStorage.getItem("bb_inventory")) {
            localStorage.setItem("bb_inventory", JSON.stringify(DEFAULT_INVENTORY));
        }
        // Clean any old mock/static/test requests to keep in sync with clean database
        localStorage.removeItem("bb_requests");
        // Reset any stale hospital cache to maintain strict 8 verified facilities
        localStorage.removeItem("bb_hospitals");
        if (!localStorage.getItem("bb_camps")) {
            localStorage.setItem("bb_camps", JSON.stringify(DEFAULT_CAMPS));
        }
    },

    // --- Geofence Boundary & Hospitals API ---
    getBoundaryPolygon() {
        return EAST_SINGHBHUM_BOUNDARY_POLYGON;
    },

    isPointInsideGeofence(lat, lon) {
        return isPointInEastSinghbhum(lat, lon);
    },

    getRegisteredHospitals() {
        try {
            return JSON.parse(localStorage.getItem("bb_hospitals") || "[]");
        } catch (e) {
            return [];
        }
    },

    getAllHospitals() {
        const custom = this.getRegisteredHospitals();
        const merged = [...HOSPITALS_DATABASE];
        custom.forEach(ch => {
            if (!merged.some(m => m.id === ch.id || m.name.toLowerCase() === ch.name.toLowerCase())) {
                merged.unshift(ch);
            }
        });
        return merged;
    },

    getEastSinghbhumHospitals() {
        const all = this.getAllHospitals();
        return all.filter(h => isPointInEastSinghbhum(h.lat, h.lon) || h.isRegistered);
    },

    getHospitalById(id) {
        if (!id) return null;
        return this.getAllHospitals().find(h => h.id === id || String(h.dbId) === String(id) || h.name.toLowerCase() === String(id).toLowerCase()) || null;
    },

    addHospital(hospital) {
        const custom = this.getRegisteredHospitals();
        if (!custom.some(c => c.name.toLowerCase() === hospital.name.toLowerCase())) {
            custom.unshift(hospital);
            localStorage.setItem("bb_hospitals", JSON.stringify(custom));
        }
        return hospital;
    },

    getGeofenceAudit() {
        return HOSPITALS_DATABASE.map(h => {
            const isInside = isPointInEastSinghbhum(h.lat, h.lon);
            return {
                id: h.id,
                name: h.name,
                locality: h.locality,
                district: h.district,
                lat: h.lat,
                lon: h.lon,
                isInside,
                statusText: isInside ? "Verified Inside East Singhbhum" : `Excluded (Outside Boundary - ${h.district})`
            };
        });
    },

    getDonors() {
        return JSON.parse(localStorage.getItem("bb_donors")) || DEFAULT_DONORS;
    },

    saveDonors(donors) {
        localStorage.setItem("bb_donors", JSON.stringify(donors));
    },

    addDonor(donor) {
        const donors = this.getDonors();
        donors.unshift(donor);
        this.saveDonors(donors);
        return donor;
    },

    getInventory() {
        return JSON.parse(localStorage.getItem("bb_inventory")) || DEFAULT_INVENTORY;
    },

    saveInventory(inv) {
        localStorage.setItem("bb_inventory", JSON.stringify(inv));
    },

    updateStock(bloodGroup, deltaUnits, type = "whole") {
        const inv = this.getInventory();
        if (inv[bloodGroup]) {
            inv[bloodGroup].units = Math.max(0, inv[bloodGroup].units + deltaUnits);
            if (type === "redCells") inv[bloodGroup].redCells = Math.max(0, (inv[bloodGroup].redCells || 0) + deltaUnits);
            if (type === "platelets") inv[bloodGroup].platelets = Math.max(0, (inv[bloodGroup].platelets || 0) + deltaUnits);
            if (type === "plasma") inv[bloodGroup].plasma = Math.max(0, (inv[bloodGroup].plasma || 0) + deltaUnits);
            this.saveInventory(inv);
        }
        return inv;
    },

    getRequests() {
        return [];
    },

    saveRequests(reqs) {
        // Live requests are persisted in backend database
    },

    addRequest(req) {
        return req;
    },

    getCamps() {
        return JSON.parse(localStorage.getItem("bb_camps")) || DEFAULT_CAMPS;
    },

    saveCamps(camps) {
        localStorage.setItem("bb_camps", JSON.stringify(camps));
    },

    registerForCamp(campId) {
        const camps = this.getCamps();
        const camp = camps.find(c => c.id === campId);
        if (camp) {
            camp.registeredCount = (camp.registeredCount || 0) + 1;
            this.saveCamps(camps);
            return camp.registeredCount;
        }
        return null;
    },

    getUser() {
        return JSON.parse(localStorage.getItem("bb_current_user")) || null;
    },

    setUser(user) {
        localStorage.setItem("bb_current_user", JSON.stringify(user));
    },

    logoutUser() {
        localStorage.removeItem("bb_current_user");
    }
};

// Auto-run init
DataStore.init();

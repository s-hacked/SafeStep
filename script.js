// 🔥 Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

/* ================= DOM REFERENCES ================= */
const pages = {
    dashboard: document.getElementById("dashboard"),
    preventive: document.getElementById("preventive"),
    sosPage: document.getElementById("sosPage"),
    liveLocationPage: document.getElementById("liveLocationPage"),
    authPage: document.getElementById("authPage"),
    communityPage: document.getElementById("communityPage"),
    heatmapPage: document.getElementById("heatmapPage")
};

const panels = {
    safe: document.getElementById("safePanel"),
    risk: document.getElementById("riskPanel"),
    sos: document.getElementById("sosPanel"),
    voice: document.getElementById("voicePanel"),
    login: document.getElementById("loginPanel"),
    signup: document.getElementById("signupPanel"),
    privacy: document.getElementById("privacyPanel")
};

/* ================= GLOBAL STATE ================= */
let routeMap, liveMap, liveMarker, heatMapInstance;
let recognition;
let isListening = false;
let contacts = JSON.parse(localStorage.getItem("contacts")) || [];

/* ================= NAVIGATION LOGIC ================= */
function hideAll() {
    Object.values(pages).forEach(page => {
        if(page) page.classList.add("hidden");
    });
}

function goBack() {
    hideAll();
    pages.dashboard.classList.remove("hidden");
}

/* ================= AUTHENTICATION & PRIVACY (FIXED) ================= */
function openAuth() {
    hideAll();
    pages.authPage.classList.remove("hidden");
    showLogin(); 
}

function showLogin() {
    panels.login.classList.remove("hidden");
    panels.login.classList.add("active");
    
    // Hide Others
    panels.signup.classList.add("hidden");
    panels.signup.classList.remove("active");
    panels.privacy.classList.add("hidden");
    panels.privacy.classList.remove("active");
    
    updateAuthTabs("loginTab");
}

function showSignup() {
    panels.signup.classList.remove("hidden");
    panels.signup.classList.add("active");
    
    // Hide Others
    panels.login.classList.add("hidden");
    panels.login.classList.remove("active");
    panels.privacy.classList.add("hidden");
    panels.privacy.classList.remove("active");
    
    updateAuthTabs("signupTab");
}

function showPrivacy() {
    panels.privacy.classList.remove("hidden");
    panels.privacy.classList.add("active");
    
    // Hide Others
    panels.login.classList.add("hidden");
    panels.login.classList.remove("active");
    panels.signup.classList.add("hidden");
    panels.signup.classList.remove("active");
    
    updateAuthTabs("privacyTab");
}

function updateAuthTabs(activeId) {
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.getElementById(activeId);
    if(activeTab) activeTab.classList.add('active');
}

function loginUser() {
    const email = document.getElementById("loginEmail").value.trim();
    const pass = document.getElementById("loginPassword").value.trim();
    if(!email || !pass) return alert("Please fill fields");

    auth.signInWithEmailAndPassword(email, pass)
        .then(() => { alert("Logged in successfully!"); goBack(); })
        .catch(err => alert(err.message));
}

function signupUser() {
    const email = document.getElementById("signupEmail").value.trim();
    const pass = document.getElementById("signupPassword").value.trim();
    if(!email || pass.length < 6) return alert("Email required and password 6+ chars");

    auth.createUserWithEmailAndPassword(email, pass)
        .then(() => { alert("Account created!"); showLogin(); })
        .catch(err => alert(err.message));
}

function togglePassword(id) {
    const el = document.getElementById(id);
    el.type = el.type === "password" ? "text" : "password";
}

/* ================= LIVE LOCATION ================= */
function openLiveLocation() {
    hideAll();
    pages.liveLocationPage.classList.remove("hidden");
    renderContacts();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                initLiveMap(latitude, longitude);
                startTracking();
            },
            (err) => alert("Please allow location access."),
            { enableHighAccuracy: true }
        );
    }
}

function startTracking() {
    navigator.geolocation.watchPosition(pos => {
        const { latitude, longitude } = pos.coords;
        if (liveMarker) {
            const newPos = { lat: latitude, lng: longitude };
            liveMarker.setPosition(newPos);
            liveMap.setCenter(newPos);
        }
        const user = auth.currentUser;
        if (user) {
            database.ref('locations/' + user.uid).set({
                lat: latitude, lng: longitude, timestamp: Date.now()
            });
        }
    });
}

function initLiveMap(lat, lng) {
    if (liveMap) return;
    liveMap = new google.maps.Map(document.getElementById("liveMap"), {
        center: { lat, lng }, zoom: 16
    });
    liveMarker = new google.maps.Marker({ position: { lat, lng }, map: liveMap });
}

/* ================= SOS & VOICE ================= */
function openSOS() {
    hideAll();
    pages.sosPage.classList.remove("hidden");
    showSOS();
}

function showSOS() {
    panels.sos.classList.add("active");
    panels.voice.classList.remove("active");
}

function showVoice() {
    panels.voice.classList.add("active");
    panels.sos.classList.remove("active");
}

function triggerSOS() {
    database.ref("sosAlerts").push({
        status: "EMERGENCY",
        timestamp: Date.now(),
        userId: auth.currentUser ? auth.currentUser.uid : "anonymous"
    });
    alert("🚨 SOS ACTIVATED!");
}

function enableVoice() {
    if (!('webkitSpeechRecognition' in window)) return alert("Not supported.");
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.onstart = () => { document.getElementById("voiceStatus").innerText = "🎙 Listening..."; };
    recognition.onresult = (e) => {
        const word = e.results[e.results.length - 1][0].transcript.toLowerCase();
        if (word.includes("help") || word.includes("sos")) triggerSOS();
    };
    recognition.start();
}

/* ================= OTHER SECTIONS ================= */
function openSafeRoutes() { hideAll(); pages.preventive.classList.remove("hidden"); showSafe(); }
function openRiskAlerts() { hideAll(); pages.preventive.classList.remove("hidden"); showRisk(); }

function showSafe() {
    panels.safe.classList.add("active");
    panels.risk.classList.remove("active");
    document.getElementById("safeTab").classList.add("active");
    document.getElementById("riskTab").classList.remove("active");
    setTimeout(loadRouteMap, 300);
}

function showRisk() {
    panels.risk.classList.add("active");
    panels.safe.classList.remove("active");
    document.getElementById("riskTab").classList.add("active");
    document.getElementById("safeTab").classList.remove("active");
}

function loadRouteMap() {
    if (routeMap) return;
    routeMap = new google.maps.Map(document.getElementById("routeMap"), {
        center: { lat: 28.6139, lng: 77.2090 }, zoom: 14
    });
}

function openCommunity() { hideAll(); pages.communityPage.classList.remove("hidden"); }
function openHeatmaps() { hideAll(); pages.heatmapPage.classList.remove("hidden"); setTimeout(loadHeatMap, 300); }

function loadHeatMap() {
    const mapEl = heatmapPage.querySelector(".map-preview");
    const hMap = new google.maps.Map(mapEl, { center: { lat: 28.5355, lng: 77.3910 }, zoom: 12 });
    const points = [new google.maps.LatLng(28.5355, 77.3910)];
    new google.maps.visualization.HeatmapLayer({ data: points, map: hMap });
}

function addContact() {
    const name = prompt("Name:");
    if (name) {
        contacts.push({ name, time: "Active" });
        localStorage.setItem("contacts", JSON.stringify(contacts));
        renderContacts();
    }
}

function renderContacts() {
    const list = document.getElementById("contactList");
    if(!list) return;
    list.innerHTML = "";
    document.getElementById("contactCount").innerText = contacts.length;
    contacts.forEach(c => {
        list.innerHTML += `<div class="route-item"><strong>${c.name}</strong><br><small>Tracking</small></div>`;
    });

}

// Audio Context and Synth Variables
let audioCtx = null;
let ambientHumSource = null;
let isMuted = false;
let isAudioInitialized = false;

// UI Elements
const bootScreen = document.getElementById('boot-screen');
const startBtn = document.getElementById('start-btn');
const terminalContainer = document.getElementById('terminal-container');
const breachTitle = document.getElementById('breach-title');
const apologyText = document.getElementById('apology-text');
const scanSection = document.getElementById('scan-section');
const progressBar = document.getElementById('progress-bar');
const progressPercentage = document.getElementById('progress-percentage');
const consoleScroll = document.getElementById('console-scroll');
const consoleBox = document.getElementById('console-box');
const dataSection = document.getElementById('data-section');
const cliSection = document.getElementById('cli-section');
const cliInput = document.getElementById('cli-input');
const audioToggle = document.getElementById('audio-toggle');

// Data Fields
const dataIp = document.getElementById('data-ip');
const dataLocation = document.getElementById('data-location');
const dataIsp = document.getElementById('data-isp');
const dataPlatform = document.getElementById('data-platform');
const dataConnection = document.getElementById('data-connection');
const dataHardware = document.getElementById('data-hardware');

// Real Data Object
let realUserData = {
    ip: '192.168.1.100 (افتراضي - فشل الاتصال بقاعدة البيانات)',
    location: 'غير محدد (Unknown)',
    isp: 'غير متاح (N/A)',
    platform: '',
    connection: '',
    hardware: ''
};

// ----------------------------------------------------
// 1. Audio Synthesis (Web Audio API)
// ----------------------------------------------------
function initAudio() {
    if (isAudioInitialized) return;
    
    // Create AudioContext (standard + webkit fallback)
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        console.warn("Web Audio API not supported in this browser.");
        return;
    }
    audioCtx = new AudioContextClass();
    isAudioInitialized = true;
    
    // Start ambient hum
    startAmbientHum();
}

// Low frequency server room / CRT hum
function startAmbientHum() {
    if (!audioCtx || isMuted) return;

    try {
        // Main hum oscillator (Low frequency triangle wave)
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc1.type = 'triangle';
        osc1.frequency.value = 55; // A1 note

        osc2.type = 'sine';
        osc2.frequency.value = 55.5; // Slight detune for binaural beat effect

        filter.type = 'lowpass';
        filter.frequency.value = 90; // Muffle high frequencies

        gainNode.gain.value = 0.15; // Soft volume

        // Connect nodes
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start(0);
        osc2.start(0);

        // Keep references to stop them later
        ambientHumSource = {
            stop: function() {
                osc1.stop();
                osc2.stop();
            },
            gain: gainNode
        };
    } catch (e) {
        console.error("Failed to start ambient hum:", e);
    }
}

function stopAmbientHum() {
    if (ambientHumSource) {
        try {
            ambientHumSource.stop();
        } catch (e) {}
        ambientHumSource = null;
    }
}

// Retro computer startup sound
function playStartupSound() {
    if (!audioCtx || isMuted) return;

    const now = audioCtx.currentTime;
    
    // 1. Low frequency rumble sweeping up
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(40, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 1.2);
    
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(1000, now + 1.2);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 1.3);

    // 2. Retro high-pitched system chimes
    const chimeTimes = [0.2, 0.4, 0.6, 0.8];
    const chimeFreqs = [880, 987.77, 1046.50, 1318.51]; // A5, B5, C6, E6 arpeggio
    
    chimeTimes.forEach((delay, idx) => {
        const cOsc = audioCtx.createOscillator();
        const cGain = audioCtx.createGain();
        
        cOsc.type = 'square';
        cOsc.frequency.setValueAtTime(chimeFreqs[idx], now + delay);
        
        cGain.gain.setValueAtTime(0.001, now + delay);
        cGain.gain.linearRampToValueAtTime(0.06, now + delay + 0.05);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.25);
        
        const cFilter = audioCtx.createBiquadFilter();
        cFilter.type = 'bandpass';
        cFilter.frequency.setValueAtTime(chimeFreqs[idx], now + delay);
        
        cOsc.connect(cFilter);
        cFilter.connect(cGain);
        cGain.connect(audioCtx.destination);
        
        cOsc.start(now + delay);
        cOsc.stop(now + delay + 0.3);
    });
}

// Keystroke typing sound
function playKeySound() {
    if (!audioCtx || isMuted) return;

    const now = audioCtx.currentTime;
    
    // Very short high frequency sine chime mixed with filtered white noise
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = 'sine';
    // Randomize pitch slightly for organic typing feel
    osc.frequency.setValueAtTime(1000 + Math.random() * 600, now);
    
    gainNode.gain.setValueAtTime(0.03, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03); // 30ms duration
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 0.04);
}

// Sound played on screen shake / breach trigger
function playBreachSound() {
    if (!audioCtx || isMuted) return;
    
    const now = audioCtx.currentTime;
    
    // Deep heavy explosion rumble
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.8);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, now);
    
    gainNode.gain.setValueAtTime(0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 1.1);
}

// Loading complete success chime
function playSuccessSound() {
    if (!audioCtx || isMuted) return;
    
    const now = audioCtx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    freqs.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + (idx * 0.1));
        
        gainNode.gain.setValueAtTime(0.001, now + (idx * 0.1));
        gainNode.gain.linearRampToValueAtTime(0.08, now + (idx * 0.1) + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.1) + 0.4);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(now + (idx * 0.1));
        osc.stop(now + (idx * 0.1) + 0.5);
    });
}

// ----------------------------------------------------
// 2. Real User Data Extraction
// ----------------------------------------------------
async function fetchRealUserData() {
    // A. Basic browser properties (Instant)
    const ua = navigator.userAgent;
    
    // Operating System detection
    let os = 'Unknown OS';
    if (ua.indexOf('Win') !== -1) os = 'Windows';
    else if (ua.indexOf('Mac') !== -1) os = 'macOS';
    else if (ua.indexOf('Linux') !== -1) os = 'Linux';
    else if (ua.indexOf('Android') !== -1) os = 'Android';
    else if (ua.indexOf('like Mac') !== -1) os = 'iOS';
    
    // Browser detection
    let browser = 'Unknown Browser';
    if (ua.indexOf('Chrome') !== -1) browser = 'Google Chrome';
    else if (ua.indexOf('Safari') !== -1) browser = 'Safari';
    else if (ua.indexOf('Firefox') !== -1) browser = 'Mozilla Firefox';
    else if (ua.indexOf('Edge') !== -1) browser = 'Microsoft Edge';
    
    realUserData.platform = `${os} (${browser})`;
    
    // Connection speed/type
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
        const type = conn.type || 'wifi/ethernet';
        const speed = conn.downlink ? `${conn.downlink} Mbps` : 'N/A';
        const rtt = conn.rtt ? `${conn.rtt} ms` : 'N/A';
        realUserData.connection = `النوع: ${type} | السرعة المقدرة: ${speed} | الكمون: ${rtt}`;
    } else {
        realUserData.connection = 'إيثرنت أو واي فاي (سرعة عالية)';
    }
    
    // CPU & Screen
    const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} أنوية معالج` : 'غير محدد';
    const lang = navigator.language || 'ar-EG';
    const res = `${window.screen.width}x${window.screen.height}`;
    realUserData.hardware = `${cores} | الدقة: ${res} | لغة الجهاز: ${lang}`;

    // B. Fetch IP & Location using an external HTTPS API
    try {
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
            const data = await response.json();
            realUserData.ip = data.ip || '192.168.1.100';
            realUserData.location = `${data.city || 'المدينة غير محددة'}، ${data.region || ''}، ${data.country_name || 'الدولة غير محددة'}`;
            realUserData.isp = data.org || 'مزود خدمة محلي';
        }
    } catch (err) {
        console.error("Error fetching IP details:", err);
        // Fallback: try alternative API
        try {
            const res2 = await fetch('https://api.ipify.org?format=json');
            if (res2.ok) {
                const data2 = await res2.json();
                realUserData.ip = data2.ip;
                realUserData.location = 'مصر (تقديري)';
                realUserData.isp = 'مزود شبكة محلي (Local ISP)';
            }
        } catch (e) {
            // Keep default mocks if offline completely
        }
    }
}

// ----------------------------------------------------
// 3. Typing Animation Logic
// ----------------------------------------------------
function typeText(element, text, speed, cursorClass, onComplete) {
    element.classList.remove('hidden');
    element.innerHTML = '';
    
    // Create cursor
    const cursor = document.createElement('span');
    cursor.className = `cursor ${cursorClass}`;
    element.appendChild(cursor);
    
    let index = 0;
    
    function writeChar() {
        if (index < text.length) {
            const char = text.charAt(index);
            // Insert character before the cursor
            cursor.before(char);
            
            // Play keystroke tick (skip spaces to make it more realistic)
            if (char !== ' ') {
                playKeySound();
            }
            
            index++;
            setTimeout(writeChar, speed + (Math.random() * 30 - 15)); // Slightly randomize typing rate
        } else {
            // Typing complete
            if (onComplete) onComplete();
        }
    }
    
    // Start typing
    writeChar();
}

// ----------------------------------------------------
// 4. Console Logger (Phase 2 Scan logs)
// ----------------------------------------------------
const scanLogTemplates = [
    { text: "Initializing backdoor injection protocol...", type: "info" },
    { text: "Bypassing local router firewall via UPnP exploit...", type: "info" },
    { text: "Target IP Address located in database.", type: "success" },
    { text: "Loading exploits: MS17-010 EternalBlue...", type: "info" },
    { text: "System architecture matches: ARM/x64 structure.", type: "success" },
    { text: "Decrypting device registry keys...", type: "info" },
    { text: "Warning: High-entropy security logs detected.", type: "warning" },
    { text: "Patching audit logs to hide agent footprint...", type: "success" },
    { text: "Downloading system configuration payload...", type: "info" },
    { text: "Analyzing network packets via raw socket routing...", type: "info" },
    { text: "Extracting hardware interface MAC addresses...", type: "info" },
    { text: "Connecting to remote C2 Server (Command & Control)...", type: "success" },
    { text: "Injecting memory DLL payload into kernel process...", type: "info" },
    { text: "Bypassing sandboxing mechanisms...", type: "success" },
    { text: "Reading client environment profile...", type: "success" }
];

function addConsoleRow(text, type = "info") {
    const row = document.createElement('div');
    row.className = 'log-row';
    
    // Time stamp
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}.${(now.getMilliseconds()/10).toFixed(0).padStart(2,'0')}`;
    
    let typeClass = '';
    if (type === 'success') typeClass = 'log-success';
    if (type === 'warning') typeClass = 'log-warning';
    if (type === 'error') typeClass = 'log-error';
    
    row.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="${typeClass}">${text}</span>`;
    consoleScroll.appendChild(row);
    
    // Auto-scroll to bottom
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

// ----------------------------------------------------
// 5. Execution Flow Coordination
// ----------------------------------------------------
function startHackerSequence() {
    // 1. Show terminal container
    terminalContainer.classList.remove('hidden');
    
    // 2. Start Typing Animation Line 1
    // Wait 1 second (requirement: "تظهر شاشة سوداء لمدة ثانية واحدة")
    setTimeout(() => {
        // Line 1: ⚠️ تم اختراقك
        typeText(breachTitle, "⚠️ تم اختراقك", 100, "red-cursor", () => {
            // Trigger breach sound and screen shake on completion
            playBreachSound();
            terminalContainer.classList.add('shake-screen');
            setTimeout(() => {
                terminalContainer.classList.remove('shake-screen');
            }, 600);
            
            // Turn on glitch text styling permanently
            breachTitle.classList.add('glitch');

            // Wait 1.2s then start Line 2
            setTimeout(() => {
                // Line 2: معلش يا ملوك... سامحيني وما تزعليش مني. ❤️
                typeText(apologyText, "معلش يا ملوك... سامحيني وما تزعليش مني. ❤️", 80, "green-cursor", () => {
                    // Start simulated scanning after 1.5 seconds
                    setTimeout(startScanningPhase, 1500);
                });
            }, 1200);
        });
    }, 1000);
}

function startScanningPhase() {
    // Reveal scan section
    scanSection.classList.remove('hidden');
    
    // Begin loading bar increment
    let progress = 0;
    
    // Start injecting simulated log rows rapidly
    let logInterval = setInterval(() => {
        if (progress < 95) {
            const template = scanLogTemplates[Math.floor(Math.random() * scanLogTemplates.length)];
            addConsoleRow(template.text, template.type);
            
            // Play a small beep/keystroke sound occasionally for scan logs
            if (Math.random() > 0.4) {
                playKeySound();
            }
        }
    }, 350);

    // Increment progress bar
    let progressInterval = setInterval(() => {
        if (progress < 100) {
            progress += 1;
            progressBar.style.width = `${progress}%`;
            progressPercentage.innerText = `${progress}%`;
            
            // Simulate reading real metrics as we progress
            if (progress === 20) addConsoleRow(`Located IP Endpoint: ${realUserData.ip}`, 'success');
            if (progress === 45) addConsoleRow(`ISP detected: ${realUserData.isp}`, 'success');
            if (progress === 70) addConsoleRow(`Geo Coordinates mapping to: ${realUserData.location}`, 'success');
            if (progress === 85) addConsoleRow(`Host Machine Architecture: ${realUserData.platform}`, 'success');
        } else {
            clearInterval(progressInterval);
            clearInterval(logInterval);
            completeScanningPhase();
        }
    }, 60); // Roughly 6 seconds total loading time
}

function completeScanningPhase() {
    addConsoleRow("Scan operations completed successfully. Building final dump...", "success");
    playSuccessSound();
    
    setTimeout(() => {
        // Populate HTML fields with retrieved data
        dataIp.innerText = realUserData.ip;
        dataLocation.innerText = realUserData.location;
        dataIsp.innerText = realUserData.isp;
        dataPlatform.innerText = realUserData.platform;
        dataConnection.innerText = realUserData.connection;
        dataHardware.innerText = realUserData.hardware;
        
        // Reveal full data table
        dataSection.classList.remove('hidden');
        
        // Scroll terminal to make sure everything is visible
        const termBody = document.getElementById('terminal-body');
        termBody.scrollTop = termBody.scrollHeight;
        
        // Show interactive CLI command line
        cliSection.classList.remove('hidden');
        cliInput.focus();
    }, 800);
}

// ----------------------------------------------------
// 6. Interactive Terminal Shell Input
// ----------------------------------------------------
cliInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const cmd = cliInput.value.trim().toLowerCase();
        cliInput.value = ''; // Clear input
        
        if (cmd === '') return;

        // Print entered command
        addConsoleRow(`root@hacked_device:~# ${cmd}`, 'info');
        playKeySound();

        // Handle commands
        setTimeout(() => {
            handleCliCommand(cmd);
        }, 100);
    }
});

function handleCliCommand(cmd) {
    const cleanCmd = cmd.replace(/[^a-zA-Z0-9ا-ي]/g, ''); // alphanumeric cleaning

    switch(cleanCmd) {
        case 'help':
        case 'مساعدة':
            addConsoleRow("الأوامر المتاحة:", "success");
            addConsoleRow("  help  - عرض قائمة الأوامر المتاحة", "info");
            addConsoleRow("  info  - عرض بيانات الجهاز الحالية مجدداً", "info");
            addConsoleRow("  clear - مسح شاشة سجلات الفحص والـ CLI", "info");
            addConsoleRow("  sorry - رسالة اعتذار إلكترونية خاصة لملوك", "success");
            addConsoleRow("  exit  - إغلاق الاتصال الآمن بالنظام", "info");
            break;
            
        case 'info':
            addConsoleRow(`[بيانات الهدف] الـ IP: ${realUserData.ip}`, "success");
            addConsoleRow(`[بيانات الهدف] الموقع: ${realUserData.location}`, "success");
            addConsoleRow(`[بيانات الهدف] المزود: ${realUserData.isp}`, "success");
            addConsoleRow(`[بيانات الهدف] النظام: ${realUserData.platform}`, "success");
            break;
            
        case 'clear':
        case 'مسح':
            consoleScroll.innerHTML = '';
            addConsoleRow("تم مسح السجلات بنجاح.", "success");
            break;
            
        case 'sorry':
        case 'اسف':
        case 'أسف':
            addConsoleRow("بث رسالة اعتذار مخصصة...", "warning");
            setTimeout(() => {
                addConsoleRow("« يا ملوك، زعلك غالي عندي جداً.. حقك عليا وسامحيني، متخليش أي زعل يدوم مبينا. أنتِ غالية أوي أوي. ❤️ »", "success");
                playSuccessSound();
            }, 600);
            break;
            
        case 'exit':
            addConsoleRow("جاري قطع الاتصال ونشط عملية التدمير الذاتي للاتصال...", "error");
            setTimeout(() => {
                window.close(); // might be blocked by browser security, fallback below
                document.body.innerHTML = "<div style='color:#ff003c; font-family:var(--monospace-font); text-align:center; margin-top:20vh; font-size:2rem; text-shadow:0 0 10px rgba(255,0,0,0.5);'>[ تم إنهاء الجلسة وإغلاق الاتصال بنجاح ]</div>";
            }, 1000);
            break;
            
        default:
            addConsoleRow(`command not found: '${cmd}'. اكتب 'help' لرؤية الأوامر المتاحة.`, "error");
            break;
    }
    
    // Auto Scroll body
    const termBody = document.getElementById('terminal-body');
    termBody.scrollTop = termBody.scrollHeight;
}

// ----------------------------------------------------
// 7. Initial Events
// ----------------------------------------------------
startBtn.addEventListener('click', () => {
    // Start AudioContext (must trigger on click)
    initAudio();
    playStartupSound();
    
    // Smooth transition
    bootScreen.style.opacity = 0;
    setTimeout(() => {
        bootScreen.style.display = 'none';
        startHackerSequence();
    }, 1000);
});

// Also support clicking anywhere on the boot screen
bootScreen.addEventListener('click', (e) => {
    if (e.target !== startBtn && !startBtn.contains(e.target)) {
        startBtn.click();
    }
});

// Audio Mute/Unmute Toggle
audioToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Avoid triggering boot screen click
    
    isMuted = !isMuted;
    
    if (isMuted) {
        audioToggle.innerText = '🔇';
        audioToggle.classList.add('muted');
        stopAmbientHum();
    } else {
        audioToggle.innerText = '🔊';
        audioToggle.classList.remove('muted');
        
        // Re-initialize audio context if needed
        if (!isAudioInitialized) {
            initAudio();
        } else {
            startAmbientHum();
        }
    }
});

// Pre-fetch real user data in the background as soon as page loads
window.addEventListener('DOMContentLoaded', fetchRealUserData);

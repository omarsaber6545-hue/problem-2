const http = require('http');
const { exec } = require('child_process');

// Helper to detect Wi-Fi SSID across platforms (Windows, macOS, Linux)
function getWifiSSID() {
    return new Promise((resolve) => {
        const platform = process.platform;
        if (platform === 'win32') {
            // Windows Command: netsh wlan show interfaces
            exec('netsh wlan show interfaces', { encoding: 'utf8' }, (err, stdout, stderr) => {
                if (err) {
                    resolve(null);
                    return;
                }
                const lines = stdout.split('\n');
                for (let line of lines) {
                    // Check for "SSID" but exclude "BSSID"
                    // Also support Arabic Windows output ("إس إس آي دي" or SSID)
                    if ((line.includes('SSID') || line.includes('إس إس آي دي')) && !line.includes('BSSID') && !line.includes('بي إس إس آي دي')) {
                        const parts = line.split(':');
                        if (parts.length > 1) {
                            resolve(parts[1].trim());
                            return;
                        }
                    }
                }
                resolve(null);
            });
        } else if (platform === 'darwin') {
            // macOS Command
            exec('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I', (err, stdout, stderr) => {
                if (err) {
                    resolve(null);
                    return;
                }
                const lines = stdout.split('\n');
                for (let line of lines) {
                    if (line.includes(' SSID:')) {
                        const parts = line.split(':');
                        if (parts.length > 1) {
                            resolve(parts[1].trim());
                            return;
                        }
                    }
                }
                resolve(null);
            });
        } else if (platform === 'linux') {
            // Linux Command
            exec('iwgetid -r', (err, stdout, stderr) => {
                if (err) {
                    resolve(null);
                    return;
                }
                resolve(stdout.trim());
            });
        } else {
            resolve(null);
        }
    });
}

// Create native http server (no npm install required!)
const server = http.createServer(async (req, res) => {
    // Enable CORS to allow the frontend file:// or localhost to connect
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/api/wifi' && req.method === 'GET') {
        try {
            const ssid = await getWifiSSID();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ 
                ssid: ssid || 'غير متصل بالواي فاي (اتصال سلكي أو لا هوائي مغلق)' 
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch SSID' }));
        }
    } else {
        res.writeHead(404);
        res.end();
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log('\n======================================================');
    console.log(`📡 [Hacker Local API Server] Running at: http://localhost:${PORT}`);
    console.log('🔓 Allows your browser webpage to securely read your real Wi-Fi SSID.');
    console.log('👉 To run the webpage and see your real Wi-Fi, keep this terminal open.');
    console.log('🛑 Press Ctrl+C to close the server.');
    console.log('======================================================\n');
});

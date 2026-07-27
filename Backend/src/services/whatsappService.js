const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

// Session storage folder path (Persisted session storage)
const SESSION_DIR = path.join(__dirname, '../../uploads/wa_sessions');

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

let socketInstance = null;
let currentQrDataUrl = null;
let connectionStatus = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
let connectedUserInfo = null;
let qrRefreshTimestamp = null;

/**
 * Initializes the Baileys WhatsApp Socket session
 */
async function initWhatsAppSession() {
  if (connectionStatus === 'connected' && socketInstance) {
    return { status: 'connected', user: connectedUserInfo };
  }

  try {
    connectionStatus = 'connecting';
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));

    socketInstance = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false
    });

    socketInstance.ev.on('creds.update', saveCreds);

    socketInstance.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          // Convert WhatsApp's raw cryptographic QR string to Data URL (Base64 PNG)
          currentQrDataUrl = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: 'M',
            margin: 2,
            scale: 8,
            color: { dark: '#0f172a', light: '#ffffff' }
          });
          qrRefreshTimestamp = Date.now();
          console.log('✅ [WhatsApp Service] Generated authentic Baileys QR Code Data URL');
        } catch (err) {
          console.error('❌ [WhatsApp Service] Failed to render QR Data URL:', err);
        }
      }

      if (connection === 'open') {
        connectionStatus = 'connected';
        currentQrDataUrl = null;
        connectedUserInfo = {
          id: socketInstance.user?.id || 'Connected User',
          name: socketInstance.user?.name || 'WhatsApp Session'
        };
        console.log('🎉 [WhatsApp Service] Session Connected Successfully:', connectedUserInfo);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`⚠️ [WhatsApp Service] Connection closed due to ${lastDisconnect?.error}. Reconnecting: ${shouldReconnect}`);
        
        connectionStatus = 'disconnected';
        currentQrDataUrl = null;
        connectedUserInfo = null;

        if (shouldReconnect) {
          setTimeout(() => {
            initWhatsAppSession();
          }, 3000);
        } else {
          console.log('❌ [WhatsApp Service] Session logged out. Cleaning up session files...');
          cleanSessionStorage();
        }
      }
    });

    return { status: connectionStatus, qr: currentQrDataUrl };
  } catch (err) {
    console.error('❌ [WhatsApp Service] Initialization error:', err);
    connectionStatus = 'disconnected';
    return { status: 'disconnected', error: err.message };
  }
}

/**
 * Gets current WhatsApp connection & QR status
 */
async function getStatus() {
  if (connectionStatus === 'disconnected' && !socketInstance) {
    initWhatsAppSession().catch(err => console.error('BG WA Init Error:', err));
  }

  return {
    status: connectionStatus,
    qr: currentQrDataUrl,
    user: connectedUserInfo,
    updatedAt: qrRefreshTimestamp
  };
}

/**
 * Disconnects & logs out session
 */
async function logoutSession() {
  try {
    if (socketInstance) {
      await socketInstance.logout().catch(() => {});
      socketInstance.end(undefined);
      socketInstance = null;
    }
  } catch (e) {
    console.error('Error during logout:', e);
  } finally {
    connectionStatus = 'disconnected';
    currentQrDataUrl = null;
    connectedUserInfo = null;
    cleanSessionStorage();
  }
  return { status: 'disconnected' };
}

/**
 * Cleans session folder files
 */
function cleanSessionStorage() {
  try {
    if (fs.existsSync(SESSION_DIR)) {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to clean session storage:', err);
  }
}

/**
 * Sends a message via active WhatsApp session
 */
async function sendMessage(toJid, text) {
  if (connectionStatus !== 'connected' || !socketInstance) {
    throw new Error('WhatsApp session is not connected');
  }

  const formattedJid = toJid.includes('@s.whatsapp.net') ? toJid : `${toJid.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
  return await socketInstance.sendMessage(formattedJid, { text });
}

module.exports = {
  initWhatsAppSession,
  getStatus,
  logoutSession,
  sendMessage
};

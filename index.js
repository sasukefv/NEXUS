const registeredUsers = new Set();

async function handleMessage(sock, msg) {
  try {
    if (msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    if (!from || from.endsWith('@g.us')) return;

    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
    if (!messageText) return;

    const textTrimmed = messageText.trim();
    const textLower = textTrimmed.toLowerCase();
    const isRegistered = registeredUsers.has(from);

    // 1. Befehl:!reg
    if (textLower === '!reg' || textLower.startsWith('!reg ')) {
      if (isRegistered) {
        await sock.sendMessage(from, { text: 'Du bist bereits registriert!' });
        return;
      }
      registeredUsers.add(from);
      await sock.sendMessage(from, { text: 'Erfolgreich registriert! Du kannst jetzt alle Befehle nutzen.' });
      return;
    }

    // 2. Nur Befehle beachten
    if (!textTrimmed.startsWith('!')) return;

    if (!isRegistered) {
      await sock.sendMessage(from, {
        text: 'Zugriff verweigert! Bitte registriere dich zuerst mit *!reg*.'
      });
      return;
    }

    // 3. Befehle für registrierte Nutzer
    const command = textLower.split(' ')[0];

    switch (command) {
      case '!ping':
        await sock.sendMessage(from, { text: 'Pong!' });
        break;
      case '!hilfe':
        await sock.sendMessage(from, { text: 'Verfügbare Befehle:!ping,!hilfe,!status' });
        break;
      case '!status':
        await sock.sendMessage(from, { text: 'Der Bot läuft einwandfrei.' });
        break;
      default:
        await sock.sendMessage(from, { text: 'Unbekannter Befehl. Schreibe!hilfe für alle Befehle.' });
        break;
    }
  } catch (e) {
    console.error('Fehler in handleMessage:', e);
  }
}
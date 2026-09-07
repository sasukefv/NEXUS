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
const { default: makeWASocket, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        // Befehl prüfen
        if (text.startsWith('!play ')) {
            const query = text.replace('!play ', '').trim();
            if (!query) return;

            // 1. Lade-Nachricht senden
            await sock.sendMessage(from, { text: '🎵 Durchsuche YouTube und Spotify nach dem Song...' }, { quoted: msg });

            try {
                // 2. Suche durchführen (yt-search deckt auch Treffer ab, die von Spotify kopiert wurden)
                const searchResults = await yts(query);
                const video = searchResults.videos[0];

                if (!video) {
                    await sock.sendMessage(from, { text: '❌ Kein passender Song gefunden.' }, { quoted: msg });
                    return;
                }

                const inputPath = path.join(__dirname, `temp_${Date.now()}.mp4`);
                const outputPath = path.join(__dirname, `temp_${Date.now()}.opus`);

                // 3. Audio von YouTube herunterladen
                const stream = ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' });
                const fileStream = fs.createWriteStream(inputPath);
                stream.pipe(fileStream);

                fileStream.on('finish', () => {
                    // 4. In Opus-Format konvertieren (WhatsApp Sprachnachrichten-Standard)
                    ffmpeg(inputPath)
                        .toFormat('opus')
                        .addOutputOptions(['-avoid_negative_ts make_zero', '-ac 1', '-b:a 96k'])
                        .on('end', async () => {
                            // 5. Als Sprachnachricht (ptt: true) senden
                            await sock.sendMessage(from, {
                                audio: { url: outputPath },
                                mimetype: 'audio/mp4',
                                ptt: true
                            }, { quoted: msg });

                            // Temporäre Dateien löschen
                            fs.unlinkSync(inputPath);
                            fs.unlinkSync(outputPath);
                        })
                        .on('error', (err) => {
                            console.error(err);
                            sock.sendMessage(from, { text: '❌ Fehler bei der Audio-Konvertierung.' });
                        })
                        .save(outputPath);
                });

            } catch (error) {
                console.error(error);
                await sock.sendMessage(from, { text: '❌ Es gab einen Fehler beim Verarbeiten der Anfrage.' });
            }
        }
    });
}

startBot();

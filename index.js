import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode-terminal';
import OpenAI from 'openai';
import pino from 'pino';
import fs from 'fs';

// 1. OpenAI Client initialisieren
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'DEIN_OPENAI_API_KEY_HIER'
});

// 2. Hilfsfunktionen zum Speichern & Laden der registrierten Nutzer
const USERS_FILE = './users.json';

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}));
  }
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' })
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('Scanne diesen QR-Code mit WhatsApp:');
      QRCode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) connectToWhatsApp();
    } else if (connection === 'open') {
      console.log('WhatsApp Bot ist erfolgreich verbunden!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Nachrichten-Verarbeitung
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
      if (!text) continue;

      const remoteJid = msg.key.remoteJid;
      const users = loadUsers();

      // --- BEFEHL: !reg Name/Alter ---
      if (text.startsWith('!reg')) {
        const input = text.slice(4).trim(); // Entfernt "!reg"
        const parts = input.split('/');

        if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
          await sock.sendMessage(remoteJid, {
            text: '❌ Ungültiges Format!\nBitte registriere dich so:\n*!reg Name/Alter*\n\nBeispiel: *!reg Max/22*'
          });
          continue;
        }

        const name = parts[0].trim();
        const age = parts[1].trim();

        // Nutzer in der JSON-Datei speichern
        users[remoteJid] = {
          name: name,
          age: age,
          registeredAt: new Date().toISOString()
        };
        saveUsers(users);

        await sock.sendMessage(remoteJid, {
          text: `✅ Registrierung erfolgreich!\nWillkommen, *${name}* (${age} Jahre). Du kannst den Bot ab jetzt nutzen.`
        });
        continue;
      }

      // --- ZUGRIFFSPRÜFUNG ---
      // Prüfen, ob der Absender registriert ist
      if (!users[remoteJid]) {
        await sock.sendMessage(remoteJid, {
          text: '⚠️ Du bist noch nicht registriert!\nBitte registriere dich zuerst mit:\n*!reg Name/Alter*\n\nBeispiel: *!reg Max/22*'
        });
        continue;
      }

      // --- KI-ANTWORT FÜR REGISTRIERTE NUTZER ---
      try {
        const userData = users[remoteJid];

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Du bist ein hilfreicher WhatsApp-Assistent. Du sprichst mit ${userData.name} (${userData.age} Jahre alt).`
            },
            { role: 'user', content: text }
          ]
        });

        const replyText = completion.choices[0].message.content;
        await sock.sendMessage(remoteJid, { text: replyText });
      } catch (error) {
        console.error('Fehler bei OpenAI:', error);
      }
    }
  });
}

connectToWhatsApp();

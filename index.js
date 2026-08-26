import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'

import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./auth_info_baileys')

  const sock = makeWASocket({
    auth: state,
    markOnlineOnConnect: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('Scanne diesen QR-Code mit WhatsApp:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp Bot erfolgreich verbunden!')
    }

    if (connection === 'close') {
      const statusCode =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : 0

      const reconnect =
        statusCode !== DisconnectReason.loggedOut

      console.log('❌ Verbindung geschlossen.')

      if (reconnect) {
        console.log('🔄 Verbinde erneut...')
        startBot()
      } else {
        console.log('⚠️ Du wurdest ausgeloggt.')
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const message of messages) {
      if (!message.message) continue
      if (message.key.fromMe) continue

      const text =
        message.message.conversation ||
        message.message.extendedTextMessage?.text ||
        ''

      console.log('📩 Nachricht:', text)

      const remoteJid = message.key.remoteJid

      const send = (msgText) =>
        sock.sendMessage(remoteJid, { text: msgText })

      if (text.trim().toLowerCase() === '?ping') {
        await send('🏓 Pong!')
        continue
      }

      if (text.startsWith('?join ')) {
        const link = text.slice(6).trim()

        if (!link.includes('chat.whatsapp.com/')) {
          await send(
            '❌ Bitte gib einen gültigen WhatsApp-Gruppenlink ein.\n\nBeispiel:\n?join https://chat.whatsapp.com/XXXXXXXX'
          )
          continue
        }

        try {
          const inviteCode = link.split('chat.whatsapp.com/')[1].split('?')[0]
          const groupInfo = await sock.groupGetInviteInfo(inviteCode)

          if (!groupInfo) {
            await send('❌ Die Gruppe konnte nicht gefunden werden.')
            continue
          }

          const groupJid = groupInfo.id
          const metadata = await sock.groupMetadata(groupJid)
          const memberCount = metadata.participants.length

          if (memberCount < 10) {
            await send(
              `❌ Der Bot kann dieser Gruppe noch nicht beitreten.\n\n` +
              `👥 Mitglieder: ${memberCount}/10\n` +
              `🔒 Mindestens 10 Mitglieder erforderlich.`
            )
            continue
          }

          await sock.groupAcceptInvite(inviteCode)

          await send(
            `✅ Der Bot ist der Gruppe erfolgreich beigetreten!\n\n` +
            `👥 Mitglieder: ${memberCount}`
          )
        } catch (error) {
          console.log('Join-Fehler:', error)

          await send(
            '❌ Der Bot konnte der Gruppe nicht beitreten.\n' +
            'Möglicherweise ist der Link ungültig oder abgelaufen.'
          )
        }

        continue
      }
    }
  })
}

startBot()
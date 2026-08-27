import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys'

import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./auth_info_baileys')

  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    auth: state,
    version,
    browser: ['MeinBot', 'Chrome', '110.0.0'],
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
      console.log('❌ Verbindung geschlossen. Vollständiger Fehler:')
      console.log(JSON.stringify(lastDisconnect?.error, null, 2))

      const statusCode =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : 0

      console.log('StatusCode:', statusCode)

      const reconnect =
        statusCode !== DisconnectReason.loggedOut

      if (reconnect) {
        console.log('🔄 Verbinde in 5 Sekunden erneut...')
        setTimeout(startBot, 5000)
      } else {
        console.log('⚠️ Du wurdest ausgeloggt. Bitte auth_info_baileys löschen und neu starten.')
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
if (cmd === 'marry') {
  const sub = (args[0] || '').toLowerCase();

  if (sub === 'accept') {
    const proposal = pendingMarriageProposals.get(sender);
    if (!proposal) return send('❌ Du hast keinen offenen Heiratsantrag.');
    if (marriages[sender] || marriages[proposal.from]) {
      pendingMarriageProposals.delete(sender);
      return send('❌ Einer von euch ist inzwischen bereits verheiratet.');
    }
    marriages[sender] = { partner: proposal.from, since: Date.now() };
    marriages[proposal.from] = { partner: sender, since: Date.now() };
    save(FILES.marriages, marriages);
    pendingMarriageProposals.delete(sender);

    ensureUser(sender);
    ensureUser(proposal.from);
    users[sender].__isMarried = true;
    users[proposal.from].__isMarried = true;
    save(FILES.users, users);

    await checkProgress({
      users, save, FILES, send, activePrefix,
      guilds, ownerJids: [OWNER_LID, OWNER_LID2, OWNER_PRIV, OWNER_PRIV2]
    }, sender);
    await checkProgress({
      users, save, FILES, send: async (text, opts) => {
        try { await sock.sendMessage(proposal.from, { text, ...opts }); } catch (e) {}
      }, activePrefix,
      guilds, ownerJids: [OWNER_LID, OWNER_LID2, OWNER_PRIV, OWNER_PRIV2]
    }, proposal.from);

    return send(
      `💍 Herzlichen Glückwunsch! @${await displayNum(proposal.from)} und @${await displayNum(sender)} sind jetzt verheiratet! 🎉`,
      { mentions: [sender, proposal.from] }
    );
  }

  if (sub === 'deny' || sub === 'decline') {
    const proposal = pendingMarriageProposals.get(sender);
    if (!proposal) return send('❌ Du hast keinen offenen Heiratsantrag.');
    pendingMarriageProposals.delete(sender);
    return send(`💔 @${await displayNum(sender)} hat den Heiratsantrag abgelehnt.`, { mentions: [sender] });
  }

  if (sub === 'cancel') {
    let found = null;
    for (const [targetJid, v] of pendingMarriageProposals.entries()) {
      if (v.from === sender) { found = targetJid; break; }
    }
    if (!found) return send('❌ Du hast keinen offenen Antrag zum Zurückziehen.');
    pendingMarriageProposals.delete(found);
    return send('✅ Dein Heiratsantrag wurde zurückgezogen.');
  }

  const ctx = m.message?.extendedTextMessage?.contextInfo;
  let target = args[0];
  if (ctx?.mentionedJid?.length) target = ctx.mentionedJid[0];
  else if (ctx?.participant) target = ctx.participant;
  if (!target) return send(`❌ Nutzung: ${activePrefix}marry @user\n${activePrefix}marry accept / deny / cancel`);

  const targetJid = await resolveLidJid(target, sock);
  ensureUser(sender);
  ensureUser(targetJid);

  if (isSameJid(sender, targetJid)) return send('❌ Du kannst dich nicht selbst heiraten! 😅');
  if (marriages[sender]) return send(`❌ Du bist bereits mit @${await displayNum(marriages[sender].partner)} verheiratet. Nutze zuerst ${activePrefix}divorce.`, { mentions: [marriages[sender].partner] });
  if (marriages[targetJid]) return send(`❌ @${await displayNum(targetJid)} ist bereits verheiratet.`, { mentions: [targetJid] });

  const existing = pendingMarriageProposals.get(targetJid);
  if (existing && existing.from === sender) return send('❌ Du hast bereits einen offenen Antrag an diese Person.');

  pendingMarriageProposals.set(targetJid, { from: sender, at: Date.now() });

  return send(
    `💍 @${await displayNum(sender)} möchte @${await displayNum(targetJid)} heiraten!\n\n@${await displayNum(targetJid)}, antworte mit:\n${activePrefix}marry accept — annehmen\n${activePrefix}marry deny — ablehnen`,
    { mentions: [sender, targetJid] }
  );
}

if (cmd === 'divorce') {
  ensureUser(sender);
  const marriage = marriages[sender];
  if (!marriage) return send('❌ Du bist nicht verheiratet.');

  const partnerJid = marriage.partner;
  delete marriages[sender];
  delete marriages[partnerJid];
  save(FILES.marriages, marriages);

  try {
    await sock.sendMessage(partnerJid, {
      text: `💔 @${await displayNum(sender)} hat sich von dir scheiden lassen.`,
      mentions: [sender]
    });
  } catch (e) {}

  return send(`💔 Du hast dich von @${await displayNum(partnerJid)} scheiden lassen.`, { mentions: [partnerJid] });
}

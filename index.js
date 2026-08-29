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
// 1. "Const" muss kleingeschrieben werden: const
const registeredUsers = new Map();

// ===============================
// REGISTRIERUNG
// ===============================
if (command === "/reg") {
    const args = text.slice(4).trim();

    if (!args.includes("/")) {
        return sock.sendMessage(from, {
            text: "❌ *Fehler!*\n\nNutze:\n`/reg Name/Alter`\n\nBeispiel:\n`/reg Sasuke/16`"
        });
    }

    // Splittet beim ersten "/" und bereinigt direkte Leerzeichen
    const parts = args.split("/");
    const name = parts[0]?.trim();
    const alter = parts[1]?.trim();

    if (!name || !alter) {
        return sock.sendMessage(from, {
            text: "❌ Bitte gib deinen Namen und dein Alter an.\n\nBeispiel: `/reg Sasuke/16`"
        });
    }

    // Prüft auf gültige Zahl und logisches Alter
    if (isNaN(alter) || Number(alter) <= 0 || Number(alter) > 120) {
        return sock.sendMessage(from, {
            text: "❌ Bitte gib ein gültiges Alter an."
        });
    }

    // Bereits registriert?
    if (registeredUsers.has(sender)) {
        return sock.sendMessage(from, {
            text: "⚠️ Du bist bereits registriert!"
        });
    }

    // Nutzer speichern
    registeredUsers.set(sender, {
        name: name,
        alter: Number(alter)
    });

    return sock.sendMessage(from, {
        text:
`╭━━━〔 ✅ REGISTRIERUNG 〕━━━╮
┃
┃ 👤 Name: ${name}
┃ 🎂 Alter: ${alter}
┃
┃ ✅ Erfolgreich registriert!
┃
┃ Du kannst nun die Commands
┃ des NEXUS BOTs verwenden.
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
    });
}


// ===============================
// REGISTRIERUNG PRÜFEN
// ===============================
if (command !== "/reg" && !registeredUsers.has(sender)) {
    return sock.sendMessage(from, {
        text:
`╭━━━〔 ⚠️ NICHT REGISTRIERT 〕━━━╮
┃
┃ ❌ Du bist noch nicht registriert.
┃
┃ Registriere dich zuerst mit:
┃
┃ /reg Name/Alter
┃
┃ Beispiel:
┃ /reg Sasuke/16
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`
    });
}


// ===============================
// /ME
// ===============================
if (command === "/me") {
    const user = registeredUsers.get(sender);

    return sock.sendMessage(from, {
        text:
`╭━━━〔 👤 DEIN PROFIL 〕━━━╮
┃
┃ 👤 Name: ${user.name}
┃ 🎂 Alter: ${user.alter}
┃ 📝 Status: Registriert
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
    });
}
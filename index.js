// ===============================
// REGISTRIERUNG
// ===============================
if (command === "!reg") {
    const args = text.slice(4).trim();

    if (!args.includes("/")) {
            text: "❌ *Fehler!*\n\nNutze:\n`/reg Name/Alter`\n\nBeispiel:\n`/reg Sasuke/16`"
    }

    // Splittet beim ersten "/" und bereinigt direkte Leerzeichen
    const parts = args.split("/");
    const name = parts[0]?.trim();
    const alter = parts[1]?.trim();

    if (!name || !alter) {
            text: "❌ Bitte gib deinen Namen und dein Alter an.\n\nBeispiel: `/reg Sasuke/16`"
    }

    // Prüft auf gültige Zahl und logisches Alter
    if (isNaN(alter) || Number(alter) <= 0 || Number(alter) > 120) {
            text: "❌ Bitte gib ein gültiges Alter an."
    }

    // Bereits registriert?
    if (registeredUsers.has(sender)) {
            text: "⚠️ Du bist bereits registriert!"
    }

    // Nutzer speichern
    registeredUsers.set(sender, {
        name: name,
        alter: Number(alter)
    });

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
}


// ===============================
// REGISTRIERUNG PRÜFEN
// ===============================
if (command !== "/reg" && !registeredUsers.has(sender)) {
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
}


// ===============================
// /ME
// ===============================
if (command === "/me") {
    const user = registeredUsers.get(sender);

        text:
`╭━━━〔 👤 DEIN PROFIL 〕━━━╮
┃
┃ 👤 Name: ${user.name}
┃ 🎂 Alter: ${user.alter}
┃ 📝 Status: Registriert
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯`
}
// Beispiel für einen Team-Befehl (z.B. Coins cheaten / generieren)
async function cmdAddCoins(sock, chatId, senderId, args, mentionedJids) {
    const role = getUserRole(senderId);

    // Nur Owner & Co-Owner haben Zugriff hierdrauf!
    if (role !== 'owner' && role !== 'coowner') {
        return await sock.sendMessage(chatId, { 
            text: '❌ Dieser Befehl ist nur für die Inhaber & Co-Owner reserved!' 
        });
    }

    const targetUser = mentionedJids[0];
    const amount = parseInt(args[1]);

    if (!targetUser || isNaN(amount)) {
        return await sock.sendMessage(chatId, { text: '⚠️ Nutzung: !addcoins @User 1000' });
    }

    addCoins(targetUser, amount);
    await sock.sendMessage(chatId, {
        text: `✅ @${targetUser.split('@')[0]} wurden *+${amount} Coins* gutgeschrieben!`,
        mentions: [targetUser]
    });
}
switch (command) {
    case '!setrank':
    case '!setrole':
        await cmdSetRank(sock, chatId, senderId, args, mentionedJid ? [mentionedJid] : []);
        break;
    case '!addcoins':
        await cmdAddCoins(sock, chatId, senderId, args, mentionedJid ? [mentionedJid] : []);
        break;
    case '!me':
        await cmdMe(sock, chatId, senderId);
        break;
}
// Beispiel für eine Event-basierte Nachrichtenverarbeitung (z. B. WhatsApp / Telegram / Discord)
const afkUsers = new Map(); // Speichert: UserId -> Grund

function handleMessage(message) {
  const userId = message.sender; // ID des Absenders
  const text = message.body;     // Nachrichtentext

  // 1. Prüfen, ob der Sender selbst noch als AFK markiert ist
  if (afkUsers.has(userId)) {
    afkUsers.delete(userId);
    console.log(`Willkommen zurück! Dein AFK-Status wurde entfernt.`);
  }

  // 2. Befehl: /afk [Grund]
  if (text.startsWith("/afk")) {
    const reason = text.split(" ").slice(1).join(" ") || "Kein Grund angegeben";
    afkUsers.set(userId, reason);
    console.log(`Du bist jetzt AFK. Grund: ${reason}`);
    return;
  }

  // 3. Automatischer Hinweis, wenn ein AFK-Nutzer erwaehnt/angeschrieben wird
  if (message.mentionedJid) { 
    message.mentionedJid.forEach(mentionedId => {
      if (afkUsers.has(mentionedId)) {
        const reason = afkUsers.get(mentionedId);
        console.log(`Der Nutzer ist aktuell AFK. Grund: ${reason}`);
      }
    });
  }
}
const afkData = new Map(); // UserId -> { reason, time }

if (text.startsWith("/afk")) {
  const reason = text.split(" ").slice(1).join(" ") || "Beschäftigt";
  afkData.set(userId, {
    reason: reason,
    time: Date.now()
  });
  console.log(`💤 AFK-Modus aktiviert!`);
}

// Wenn jemand den AFK-Nutzer anschreibt:
if (afkData.has(targetUserId)) {
  const data = afkData.get(targetUserId);
  const minutes = Math.floor((Date.now() - data.time) / 60000);
  console.log(`🤖 Diese Person ist seit ${minutes} Minute(n) AFK. (Grund: ${data.reason})`);
}
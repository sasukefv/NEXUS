// ===============================
// REGISTRIERUNG
// ===============================
if (command === "/reg") {
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
import discord
from discord.ext import commands

# Bot-Instanz erstellen (Befehls-Präfix ist '!')
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix='!', intents=intents)

# Speicher für registrierte Nutzer (Beispiel)
registered_users = {}

@bot.event
async def on_ready():
    print(f'Bot ist online als {bot.user}')

# Der !register Befehl
@bot.command()
async def register(ctx, username: str = None):
    if username is None:
        await ctx.send("❌ Bitte gib einen Benutzernamen an! Syntax: `!register <DeinName>`")
        return
    
    user_id = ctx.author.id
    registered_users[user_id] = username
    await ctx.send(f"✅ Erfolgreich registriert als **{username}**!")

# Starte den Bot (Ersetze TOKEN mit deinem echten Discord-Bot-Token)
bot.run('DEIN_BOT_TOKEN_HIER')
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
// !daily (Tägliche Coins abholen)
async function cmdDaily(sock, chatId, senderId) {
    if (!checkRegistration(senderId)) {
        return await sock.sendMessage(chatId, { text: '❌ Du bist nicht registriert!' });
    }

    const data = loadData();
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24 Stunden in Millisekunden
    const rewardAmount = 500; // Festgelegte tägliche Belohnung

    // Erstes Mal !daily nutzen -> User-Objekt anlegen
    if (!data[senderId]) {
        data[senderId] = { coins: 0, lastWork: 0, lastDaily: 0 };
    }

    const lastDaily = data[senderId].lastDaily || 0;
    const timePassed = now - lastDaily;

    // Prüfen, ob 24 Stunden vergangen sind
    if (timePassed < cooldown) {
        const remainingMs = cooldown - timePassed;
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

        return await sock.sendMessage(chatId, {
            text: `⏳ Du hast deine tägliche Belohnung bereits abgeholt!\nKomm in *${hours} Std. und ${minutes} Min.* wieder.`,
            mentions: [senderId]
        });
    }

    // Belohnung gutschreiben & Zeitstempel aktualisieren
    data[senderId].coins += rewardAmount;
    data[senderId].lastDaily = now;
    saveData(data);

    await sock.sendMessage(chatId, {
        text: `🎁 *TÄGLICHE BELOHNUNG!*\n\nDu hast *+${rewardAmount} Coins* erhalten!\nNeuer Kontostand: *${data[senderId].coins} Coins*.`,
        mentions: [senderId]
    });
}
switch (command) {
    case '!daily':
        await cmdDaily(sock, chatId, senderId);
        break;
}
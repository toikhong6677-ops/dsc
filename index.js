const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// File lưu token
const DB_FILE = './tokens.json';

function loadData() {
    if (!fs.existsSync(DB_FILE)) return {};
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
        return {};
    }
}

function saveData(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Danh sách ID Admin (Thay ID Discord thật của ní vào đây để nhận quyền admin)
const ADMIN_IDS = ["1464407506397823061"]; 

client.once('ready', async () => {
    console.log(`Bot đã online: ${client.user.tag}`);

    // Đăng ký Slash Commands
    const commands = [
        new SlashCommandBuilder().setName('daily').setDescription('Nhận 100 token miễn phí mỗi ngày'),
        new SlashCommandBuilder().setName('tokens').setDescription('Kiểm tra số token hiện tại của bạn'),
        new SlashCommandBuilder().setName('admintokens').setDescription('Nhận token vô hạn dành riêng cho Admin')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken('TOKEN_CỦA_MÀY_Ở_ĐÂY');

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Đã đăng ký slash commands thành công!');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user } = interaction;
    let db = loadData();
    if (!db[user.id]) {
        db[user.id] = { tokens: 0, lastDaily: 0 };
    }

    if (commandName === 'daily') {
        const now = Date.now();
        const cooldownTime = 24 * 60 * 60 * 1000; // 24 tiếng

        if (now - db[user.id].lastDaily < cooldownTime) {
            const remainingTime = Math.ceil((cooldownTime - (now - db[user.id].lastDaily)) / (1000 * 60 * 60));
            return interaction.reply({ content: `⏱️ Đang hồi chiêu! Hãy quay lại sau khoảng ${remainingTime} tiếng nữa để nhận tiếp.`, ephemeral: true });
        }

        db[user.id].tokens += 100;
        db[user.id].lastDaily = now;
        saveData(db);

        return interaction.reply(`🎉 Chúc mừng! Bạn đã nhận thành công **100 token**. Tổng số token hiện có: **${db[user.id].tokens}**`);
    }

    if (commandName === 'tokens') {
        const currentTokens = db[user.id].tokens;
        return interaction.reply(`💰 Bạn đang có **${currentTokens} token** trong tài khoản.`);
    }

    if (commandName === 'admintokens') {
        // Kiểm tra quyền admin theo danh sách ID hoặc quyền Administrator trong server
        if (!ADMIN_IDS.includes(user.id) && !interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: `❌ Mày không phải Admin, tuổi tôm dùng lệnh này!`, ephemeral: true });
        }

        // Cho token vô hạn (dùng kiểu chuỗi hiển thị vô cực cho oách hoặc số cực lớn)
        db[user.id].tokens = "Infinity (Vô hạn)";
        saveData(db);

        return interaction.reply(`👑 Xác nhận Admin thành công! Tài khoản của bạn đã được bơm **VÔ HẠN TOKEN** 🚀.`);
    }
});

// Thay "TOKEN_CỦA_MÀY_Ở_ĐÂY" bằng token thật của bot
client.login('MTUzODE3NjY0MTUzNTMxMTg4Mg.GbHiDg.CPS-DsO1clH7MYVkU4LdwpbEQcWTdxYS9D8p6w');

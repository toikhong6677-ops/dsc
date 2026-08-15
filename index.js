const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

// 👉 ĐIỀN TOKEN CỦA BẠN VÀO ĐÂY
const TOKEN = 'ĐIỀN_TOKEN_VÀO_ĐÂY';

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

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

const ADMIN_IDS = ["1464407506397823061"]; 

// Hàm xác định Rank
function getUserRank(userId, dbData, isAdmin) {
    if (isAdmin) return { name: 'Admin Rank 👑', perk: 'Vô hạn token, Tier 5 max, /brbank +100k mỗi giây, /giverank không bị tụt cấp' };
    
    const tokens = dbData.tokens || 0;
    if (tokens >= 30000) return { name: 'Diamond Rank 💎', perk: 'Mỗi phút giảm 30 token nợ' };
    if (tokens >= 10000) return { name: 'Gold Rank 🥇', perk: 'Hạng nhà giàu' };
    if (tokens >= 5000) return { name: 'Token Tycoon 💰', perk: 'Đại gia tiền tệ' };
    if (tokens <= -50 || dbData.isHomeless) return { name: 'Homeless (Vô gia cư) 乞', perk: 'Đang nợ ngập đầu, +10 token mỗi khi brbank' };
    
    return { name: 'Newbie Rank 🌱', perk: 'Khởi đầu bình thường' };
}

// Hàm tính Tier tự động dựa trên số tin nhắn (Cứ mỗi 50 tin nhắn lên 1 Tier, tối đa Tier 5)
function calculateTier(messagesCount, isAdmin) {
    if (isAdmin) return 5;
    let tier = Math.floor(messagesCount / 50) + 1;
    return tier > 5 ? 5 : tier;
}

client.once('ready', async () => {
    console.log(`Bot đã online: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('daily').setDescription('Nhận 100 token miễn phí mỗi ngày'),
        new SlashCommandBuilder().setName('tokens').setDescription('Kiểm tra số token hiện tại của bạn'),
        new SlashCommandBuilder().setName('admintokens').setDescription('Nhận token vô hạn dành riêng cho Admin'),
        new SlashCommandBuilder()
            .setName('give')
            .setDescription('Chuyển token cho người dùng khác')
            .addUserOption(option => option.setName('user').setDescription('Người nhận token').setRequired(true))
            .addIntegerOption(option => option.setName('amount').setDescription('Số token muốn chuyển').setRequired(true)),
        new SlashCommandBuilder()
            .setName('gacha')
            .setDescription('Quay gacha thử thách nhân phẩm')
            .addIntegerOption(option => option.setName('amount').setDescription('Số token bỏ ra gacha').setRequired(true)),
        new SlashCommandBuilder()
            .setName('brbank')
            .setDescription('Vay tiền ngân hàng không tính lãi')
            .addIntegerOption(opt => opt.setName('amount').setDescription('Số token muốn vay').setRequired(true))
            .addIntegerOption(opt => opt.setName('days').setDescription('Số ngày phải trả').setRequired(true)),
        new SlashCommandBuilder()
            .setName('paybank')
            .setDescription('Trả nợ ngân hàng')
            .addIntegerOption(opt => opt.setName('amount').setDescription('Số token muốn trả').setRequired(true)),
        new SlashCommandBuilder()
            .setName('rank')
            .setDescription('Kiểm tra rank và tier hiện tại của bạn'),
        new SlashCommandBuilder()
            .setName('ranklist')
            .setDescription('Xem danh sách tất cả các rank'),
        new SlashCommandBuilder()
            .setName('giverank')
            .setDescription('Cho rank/từ thiện token cho người khác')
            .addUserOption(opt => opt.setName('user').setDescription('Người nhận').setRequired(true))
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Đã đăng ký toàn bộ slash commands thành công!');
    } catch (error) {
        console.error(error);
    }
});

// Tự động kiểm tra nợ ngầm mỗi phút
setInterval(() => {
    let db = loadData();
    let updated = false;
    const now = Date.now();

    for (let id in db) {
        if (db[id].loan > 0 && db[id].loanDueDate && now > db[id].loanDueDate) {
            if (db[id].tokens >= db[id].loan) {
                db[id].tokens -= db[id].loan;
                db[id].loan = 0;
                db[id].loanDueDate = 0;
            } else {
                db[id].tokens = 0;
                db[id].loan = 0;
                db[id].isHomeless = true;
            }
            updated = true;
        }
    }
    if (updated) saveData(db);
}, 60000);

// Lắng nghe tin nhắn chat để tích lũy tăng Tier tự động
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    let db = loadData();
    const userId = message.author.id;
    const isAdmin = ADMIN_IDS.includes(userId) || (message.member && message.member.permissions.has('Administrator'));

    if (!db[userId]) {
        db[userId] = { tokens: 100, lastDaily: 0, loan: 0, loanDueDate: 0, messagesCount: 0, isHomeless: false };
    }

    // Tăng số tin nhắn trò chuyện lên mỗi khi chat
    db[userId].messagesCount = (db[userId].messagesCount || 0) + 1;
    db[userId].tier = calculateTier(db[userId].messagesCount, isAdmin);

    saveData(db);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, user } = interaction;
    let db = loadData();
    const isAdmin = ADMIN_IDS.includes(user.id) || interaction.member.permissions.has('Administrator');

    if (!db[user.id]) {
        db[user.id] = { tokens: 100, lastDaily: 0, loan: 0, loanDueDate: 0, messagesCount: 0, isHomeless: false };
    }

    // Cập nhật lại Tier liên tục theo hoạt động & quyền hạn
    db[user.id].tier = calculateTier(db[user.id].messagesCount || 0, isAdmin);

    // 1. Lệnh /daily
    if (commandName === 'daily') {
        const now = Date.now();
        const cooldownTime = 24 * 60 * 60 * 1000;

        if (now - db[user.id].lastDaily < cooldownTime) {
            const remainingTime = Math.ceil((cooldownTime - (now - db[user.id].lastDaily)) / (1000 * 60 * 60));
            return interaction.reply({ content: `⏱️ Đang hồi chiêu! Hãy quay lại sau khoảng ${remainingTime} tiếng nữa để nhận tiếp.`, ephemeral: true });
        }

        db[user.id].tokens += 100;
        db[user.id].lastDaily = now;
        saveData(db);

        return interaction.reply(`🎉 Chúc mừng! Bạn đã nhận thành công **100 token**. Tổng số token hiện có: **${db[user.id].tokens}**`);
    }

    // 2. Lệnh /tokens
    if (commandName === 'tokens') {
        return interaction.reply(`💰 Bạn đang có **${db[user.id].tokens} token** trong tài khoản.`);
    }

    // 3. Lệnh /admintokens
    if (commandName === 'admintokens') {
        if (!isAdmin) {
            return interaction.reply({ content: `❌ Mày không phải Admin, tuổi tôm dùng lệnh này!`, ephemeral: true });
        }

        db[user.id].tokens = 999999999; 
        saveData(db);

        return interaction.reply(`👑 Xác nhận Admin thành công! Tài khoản của bạn đã được bơm **VÔ HẠN TOKEN** 🚀.`);
    }

    // 4. Lệnh /give
    if (commandName === 'give') {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');

        if (target.bot) return interaction.reply({ content: '❌ Không thể chuyển token cho bot!', ephemeral: true });
        if (target.id === user.id) return interaction.reply({ content: '❌ Không thể tự chuyển token cho chính mình!', ephemeral: true });
        if (amount <= 0) return interaction.reply({ content: '❌ Số token chuyển phải lớn hơn 0!', ephemeral: true });
        if (db[user.id].tokens < amount) return interaction.reply({ content: `❌ Bạn không đủ token để chuyển! Số dư: **${db[user.id].tokens}**`, ephemeral: true });

        if (!db[target.id]) db[target.id] = { tokens: 100, lastDaily: 0, loan: 0, messagesCount: 0, isHomeless: false };

        db[user.id].tokens -= amount;
        db[target.id].tokens += amount;
        saveData(db);

        return interaction.reply(`💸 Bạn đã chuyển thành công **${amount} token** cho <@${target.id}>!`);
    }

    // 5. Lệnh /gacha
    if (commandName === 'gacha') {
        const bet = interaction.options.getInteger('amount');

        if (bet <= 0) return interaction.reply({ content: '❌ Số token bỏ ra phải lớn hơn 0!', ephemeral: true });
        if (db[user.id].tokens < bet) return interaction.reply({ content: `❌ Bạn không đủ token để gacha! Số dư: **${db[user.id].tokens}**`, ephemeral: true });

        db[user.id].tokens -= bet;
        let reward = 0;
        let tierDesc = '';

        if (bet < 10) {
            reward = Math.floor(Math.random() * 20) + 1;
            tierDesc = 'Mức cược thấp (< 10)';
        } else if (bet >= 10 && bet <= 30) {
            const possibleMax = [5, 20, 50];
            const chosenMax = possibleMax[Math.floor(Math.random() * possibleMax.length)];
            reward = Math.floor(Math.random() * chosenMax) + 1;
            tierDesc = `Mức cược vừa (10 - 30, tối đa: ${chosenMax})`;
        } else {
            const luck = Math.random();
            if (luck < 0.15) reward = 100;
            else if (luck < 0.65) reward = 90;
            else reward = Math.floor(Math.random() * 70) + 20;
            tierDesc = 'Mức cược đại gia (>= 40)';
        }

        db[user.id].tokens += reward;
        saveData(db);

        return interaction.reply(`🎰 **KẾT QUẢ GACHA** (${tierDesc})\n- Đã cược: **${bet} token**\n- Nhận về: **${reward} token**\n- Số dư: **${db[user.id].tokens}**`);
    }

    // 6. Lệnh /brbank
    if (commandName === 'brbank') {
        const amount = interaction.options.getInteger('amount');
        const days = interaction.options.getInteger('days');

        if (amount <= 0 || days <= 0) return interaction.reply({ content: '❌ Số tiền và số ngày vay phải lớn hơn 0!', ephemeral: true });

        if (isAdmin) {
            db[user.id].tokens += amount + 100000000;
            saveData(db);
            return interaction.reply(`👑 **Admin Buff:** Đã bơm tiền vay kèm đặc quyền vô hạn! Số dư: **${db[user.id].tokens}**`);
        }

        if (db[user.id].loan > 0) {
            return interaction.reply({ content: `❌ Bạn còn khoản nợ chưa trả (${db[user.id].loan} token)!`, ephemeral: true });
        }

        const currentRank = getUserRank(user.id, db[user.id], false);
        let bonusMsg = '';

        if (currentRank.name.includes('Homeless')) {
            db[user.id].tokens += 10;
            bonusMsg = ' (Hỗ trợ +10 token do Vô gia cư)';
        }

        db[user.id].tokens += amount;
        db[user.id].loan = amount;
        db[user.id].loanDueDate = Date.now() + (days * 24 * 60 * 60 * 1000);
        saveData(db);

        return interaction.reply(`🏦 Vay thành công **${amount} token** trong **${days} ngày**!${bonusMsg}`);
    }

    // 7. Lệnh /paybank
    if (commandName === 'paybank') {
        const amount = interaction.options.getInteger('amount');
        if (amount <= 0) return interaction.reply({ content: '❌ Số tiền trả phải lớn hơn 0!', ephemeral: true });

        if (db[user.id].loan <= 0) {
            return interaction.reply({ content: '🎉 Bạn hiện tại không nợ nần ai cả!', ephemeral: true });
        }
        if (db[user.id].tokens < amount) {
            return interaction.reply({ content: `❌ Không đủ token để trả! Số dư: **${db[user.id].tokens}**, Nợ: **${db[user.id].loan}**`, ephemeral: true });
        }

        db[user.id].tokens -= amount;
        db[user.id].loan -= amount;

        if (db[user.id].loan <= 0) {
            db[user.id].loan = 0;
            db[user.id].loanDueDate = 0;
            db[user.id].isHomeless = false;
        }

        saveData(db);
        return interaction.reply(`✅ Đã trả thành công **${amount} token**. Nợ còn lại: **${db[user.id].loan} token**.`);
    }

    // 8. Lệnh /rank
    if (commandName === 'rank') {
        const rankInfo = getUserRank(user.id, db[user.id], isAdmin);
        const tier = db[user.id].tier || 1;

        return interaction.reply(`📊 **THÔNG TIN RANK & TIER**\n- **Rank:** ${rankInfo.name}\n- **Tier:** ${tier} / 5 ${isAdmin ? '(Admin mặc định Max Tier 5)' : ''}\n- **Số tin nhắn trò chuyện:** ${db[user.id].messagesCount || 0}\n- **Token:** ${db[user.id].tokens}\n- **Đang nợ:** ${db[user.id].loan || 0}`);
    }

    // 9. Lệnh /ranklist
    if (commandName === 'ranklist') {
        return interaction.reply(
            `📜 **DANH SÁCH RANK & TIER:**\n` +
            `1. **Homeless (Vô gia cư):** Nhận +10 token khi brbank.\n` +
            `2. **Newbie Rank:** Khởi đầu.\n` +
            `3. **Token Tycoon:** Từ 5,000 token.\n` +
            `4. **Gold Rank:** Từ 10,000 token.\n` +
            `5. **Diamond Rank:** Từ 30,000 token (Giảm 30 token nợ/phút).\n` +
            `6. **Admin Rank:** Vô hạn (Mặc định Tier 5).\n` +
            `*Hệ thống Tier từ 1 đến 5: Tăng dần tự động khi người dùng tích cực trò chuyện nhắn tin trong server!*`
        );
    }

    // 10. Lệnh /giverank
    if (commandName === 'giverank') {
        const target = interaction.options.getUser('user');
        if (target.bot || target.id === user.id) return interaction.reply({ content: '❌ Không hợp lệ!', ephemeral: true });

        const senderRank = getUserRank(user.id, db[user.id], isAdmin);

        if (!isAdmin && (senderRank.name.includes('Homeless') || senderRank.name.includes('Newbie'))) {
            db[user.id].messagesCount = Math.max(0, (db[user.id].messagesCount || 0) - 50); // Phạt tụt tier tương đương mất mốc tin nhắn
            db[user.id].tier = calculateTier(db[user.id].messagesCount, false);
            saveData(db);
            return interaction.reply({ content: `❌ Hạng ${senderRank.name} không thể dùng lệnh này! Phạt tụt 1 cấp Tier.`, ephemeral: true });
        }

        if (!db[target.id]) db[target.id] = { tokens: 100, lastDaily: 0, loan: 0, messagesCount: 0, isHomeless: false };
        let logMsg = '';

        if (db[target.id].isHomeless || db[target.id].tokens < 0) {
            db[target.id].isHomeless = false;
            db[target.id].loan = 0;
            db[target.id].tokens = Math.max(db[target.id].tokens, 100);

            if (!senderRank.name.includes('Token Tycoon') && !isAdmin) {
                db[user.id].messagesCount = Math.max(0, (db[user.id].messagesCount || 0) - 50);
                db[user.id].tier = calculateTier(db[user.id].messagesCount, false);
                logMsg = ' (Cứu vô gia cư, nhận 5000 token nhưng tụt nhẹ tier vì không phải Tycoon)';
            } else {
                logMsg = ' (Token Tycoon cứu người, nhận thưởng 5000 token nguyên vẹn)';
            }
            db[user.id].tokens += 5000;
        } else {
            if (!isAdmin) {
                db[user.id].messagesCount = Math.max(0, (db[user.id].messagesCount || 0) - 50);
                db[user.id].tier = calculateTier(db[user.id].messagesCount, false);
            }
            logMsg = ' (Đã ban phát và điều chỉnh tiến trình cấp bậc)';
        }

        saveData(db);
        return interaction.reply(`🎁 Đã thực hiện lệnh /giverank thành công cho <@${target.id}>!${logMsg}`);
    }
});

client.login(TOKEN);
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

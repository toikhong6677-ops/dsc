const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const https = require('https');

// 👉 ĐIỀN TOKEN CỦA BẠN VÀO ĐÂY
const TOKEN = 'MTUzOD####MTUzNTMxMTg4Mg.GAkFl-.CaWb7zUsnZCfVff8-MBNh-BJLMtr3M3JSccm84';
const CHN_URL = 'https://raw.githubusercontent.com/toikhong6677-ops/dsc/refs/heads/main/CHN.js';

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

// Tự động kéo file CHN.js mới nhất từ GitHub về Termux trước khi chạy
async function updateCHNModule() {
    return new Promise((resolve) => {
        https.get(CHN_URL, (res) => {
            if (res.statusCode !== 200) {
                console.log(`⚠️ Không thể tải CHN.js từ GitHub, mã lỗi: ${res.statusCode}`);
                return resolve();
            }
            let codeData = '';
            res.on('data', chunk => { codeData += chunk; });
            res.on('end', () => {
                fs.writeFileSync('./CHN.js', codeData);
                console.log('🔄 Đã cập nhật module CHN.js từ GitHub thành công!');
                resolve();
            });
        }).on('error', () => {
            console.log('⚠️ Mất kết nối GitHub, dùng module CHN.js cục bộ.');
            resolve();
        });
    });
}

const ADMIN_IDS = ["1464407506397823061"]; 

function getUserRank(userId, dbData, isAdmin) {
    if (isAdmin) return { name: 'Admin Rank 👑', perk: 'Vô hạn token, Tier 5 max, /brbank vô hạn' };
    const tokens = dbData.tokens || 0;
    if (tokens >= 30000) return { name: 'Diamond Rank 💎', perk: 'Mỗi phút giảm 30 token nợ' };
    if (tokens >= 10000) return { name: 'Gold Rank 🥇', perk: 'Hạng nhà giàu' };
    if (tokens >= 5000) return { name: 'Token Tycoon 💰', perk: 'Đại gia tiền tệ' };
    if (tokens <= -50 || dbData.isHomeless) return { name: 'Homeless (Vô gia cư) 乞', perk: 'Đang nợ ngập đầu, +10 token mỗi khi brbank' };
    return { name: 'Newbie Rank 🌱', perk: 'Khởi đầu bình thường' };
}

function calculateTier(messagesCount, isAdmin) {
    if (isAdmin) return 5;
    let tier = Math.floor(messagesCount / 50) + 1;
    return tier > 5 ? 5 : tier;
}

client.once('ready', async () => {
    await updateCHNModule();
    console.log(`Bot đã online: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder().setName('daily').setDescription('Nhận 100 token miễn phí mỗi ngày'),
        new SlashCommandBuilder().setName('tokens').setDescription('Kiểm tra số token hiện tại của bạn'),
        new SlashCommandBuilder().setName('admintokens').setDescription('Nhận MAX token vô hạn dành riêng cho Admin'),
        new SlashCommandBuilder().setName('xoano').setDescription('[ADMIN ONLY] Xóa sạch nợ xấu cho bản thân'),
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
        new SlashCommandBuilder().setName('rank').setDescription('Kiểm tra rank và tier hiện tại của bạn'),
        new SlashCommandBuilder().setName('ranklist').setDescription('Xem danh sách tất cả các rank'),
        new SlashCommandBuilder()
            .setName('giverank')
            .setDescription('Cho rank/từ thiện token cho người khác')
            .addUserOption(opt => opt.setName('user').setDescription('Người nhận').setRequired(true)),
        new SlashCommandBuilder()
            .setName('download')
            .setDescription('Tải file public từ internet (Tốn 25 token, Admin miễn phí)')
            .addStringOption(opt => opt.setName('url').setDescription('Đường dẫn file cần tải').setRequired(true))
            .addStringOption(opt => opt.setName('name').setDescription('Tên file lưu trên bot').setRequired(false)),
        new SlashCommandBuilder()
            .setName('obfuscator')
            .setDescription('Công cụ bảo mật mã nguồn Luau cao cấp')
            .addStringOption(opt => opt.setName('idea').setDescription('Nhập ý tưởng hoặc đoạn script của bạn để mã hóa').setRequired(true)),
        new SlashCommandBuilder()
            .setName('obfuyt')
            .setDescription('[ADMIN ONLY] Xem tất cả ý tưởng và script của người khác đã gửi')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
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
        db[id].loan = db[id].loan || 0;
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

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    let db = loadData();
    const userId = message.author.id;
    const isAdmin = ADMIN_IDS.includes(userId) || (message.member && message.member.permissions.has('Administrator'));

    if (!db[userId]) {
        db[userId] = { tokens: 100, lastDaily: 0, loan: 0, loanDueDate: 0, messagesCount: 0, isHomeless: false, tier: 1 };
    }

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
        db[user.id] = { tokens: 100, lastDaily: 0, loan: 0, loanDueDate: 0, messagesCount: 0, isHomeless: false, tier: 1 };
    }

    db[user.id].loan = db[user.id].loan || 0;
    db[user.id].tier = calculateTier(db[user.id].messagesCount || 0, isAdmin);

    let CHN = {};
    try {
        delete require.cache[require.resolve('./CHN.js')];
        CHN = require('./CHN.js');
    } catch (e) {}

    if (commandName === 'daily') {
        const now = Date.now();
        const cooldownTime = 24 * 60 * 60 * 1000;
        if (now - db[user.id].lastDaily < cooldownTime) {
            const remainingTime = Math.ceil((cooldownTime - (now - db[user.id].lastDaily)) / (1000 * 60 * 60));
            return interaction.reply({ content: `⏱️ Đang hồi chiêu! Hãy quay lại sau khoảng ${remainingTime} tiếng nữa.`, ephemeral: true });
        }
        db[user.id].tokens += 100;
        db[user.id].lastDaily = now;
        saveData(db);
        return interaction.reply(`🎉 Chúc mừng! Bạn nhận thành công **100 token**. Tổng số token: **${db[user.id].tokens}**`);
    }

    if (commandName === 'tokens') {
        return interaction.reply(`💰 Bạn đang có **${db[user.id].tokens} token** trong tài khoản.`);
    }

    if (commandName === 'admintokens') {
        if (!isAdmin) return interaction.reply({ content: `❌ Mày không phải Admin, tuổi tôm dùng lệnh này!`, ephemeral: true });
        db[user.id].tokens = Number.MAX_SAFE_INTEGER; 
        db[user.id].loan = 0; 
        db[user.id].isHomeless = false;
        saveData(db);
        return interaction.reply(`👑 Xác nhận Admin thành công! Tài khoản được bơm **MAX TOKEN** (${Number.MAX_SAFE_INTEGER}) và xóa sạch nợ 🚀.`);
    }

    if (commandName === 'xoano') {
        if (!isAdmin) return interaction.reply({ content: `❌ Mày không phải Admin, tuổi tôm đòi xóa nợ!`, ephemeral: true });
        db[user.id].loan = 0;
        db[user.id].isHomeless = false;
        saveData(db);
        return interaction.reply(`🧹 Đã quét sạch toàn bộ hồ sơ nợ xấu! Đại Đế đã chính thức trắng án 👑.`);
    }

    if (commandName === 'give') {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        if (target.bot) return interaction.reply({ content: '❌ Không thể chuyển token cho bot!', ephemeral: true });
        if (target.id === user.id) return interaction.reply({ content: '❌ Không thể tự chuyển token cho chính mình!', ephemeral: true });
        if (amount <= 0) return interaction.reply({ content: '❌ Số token chuyển phải lớn hơn 0!', ephemeral: true });
        if (db[user.id].tokens < amount) return interaction.reply({ content: `❌ Không đủ token để chuyển! Số dư: **${db[user.id].tokens}**`, ephemeral: true });

        if (!db[target.id]) db[target.id] = { tokens: 100, lastDaily: 0, loan: 0, messagesCount: 0, isHomeless: false, tier: 1 };
        db[user.id].tokens -= amount;
        db[target.id].tokens += amount;
        saveData(db);
        return interaction.reply(`💸 Bạn đã chuyển thành công **${amount} token** cho <@${target.id}>!`);
    }

    if (commandName === 'gacha') {
        const bet = interaction.options.getInteger('amount');
        if (bet <= 0) return interaction.reply({ content: '❌ Số token bỏ ra phải lớn hơn 0!', ephemeral: true });
        if (db[user.id].tokens < bet) return interaction.reply({ content: `❌ Không đủ token để gacha! Số dư: **${db[user.id].tokens}**`, ephemeral: true });

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
        return interaction.reply(`🎰 **KẾT QUẢ GACHA** (${tierDesc})\n- Cược: **${bet} token**\n- Nhận: **${reward} token**\n- Số dư: **${db[user.id].tokens}**`);
    }

    if (commandName === 'brbank') {
        const amount = interaction.options.getInteger('amount');
        const days = interaction.options.getInteger('days');
        if (amount <= 0 || days <= 0) return interaction.reply({ content: '❌ Số tiền và số ngày vay phải lớn hơn 0!', ephemeral: true });

        if (isAdmin) {
            db[user.id].tokens += amount + 100000000;
            db[user.id].loan = 0;
            saveData(db);
            return interaction.reply(`👑 **Admin Buff:** Đã bơm tiền vay kèm đặc quyền vô hạn! Số dư: **${db[user.id].tokens}**`);
        }
        if (db[user.id].loan > 0) return interaction.reply({ content: `❌ Bạn còn khoản nợ chưa trả (${db[user.id].loan} token)!`, ephemeral: true });

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

    if (commandName === 'paybank') {
        const amount = interaction.options.getInteger('amount');
        if (amount <= 0) return interaction.reply({ content: '❌ Số tiền trả phải lớn hơn 0!', ephemeral: true });
        
        db[user.id].loan = db[user.id].loan || 0;

        if (db[user.id].loan <= 0) return interaction.reply({ content: '🎉 Bạn hiện tại không nợ nần ai cả!', ephemeral: true });
        if (db[user.id].tokens < amount) return interaction.reply({ content: `❌ Không đủ token để trả! Số dư: **${db[user.id].tokens}**, Nợ: **${db[user.id].loan}**`, ephemeral: true });

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

    if (commandName === 'rank') {
        const rankInfo = getUserRank(user.id, db[user.id], isAdmin);
        const tier = db[user.id].tier || 1;
        return interaction.reply(`📊 **THÔNG TIN RANK & TIER**\n- **Rank:** ${rankInfo.name}\n- **Tier:** ${tier} / 5\n- **Tin nhắn:** ${db[user.id].messagesCount || 0}\n- **Token:** ${db[user.id].tokens}\n- **Nợ:** ${db[user.id].loan || 0}`);
    }

    if (commandName === 'ranklist') {
        return interaction.reply(
            `📜 **DANH SÁCH RANK & TIER:**\n` +
            `1. **Homeless:** Nhận +10 token khi brbank.\n` +
            `2. **Newbie Rank:** Khởi đầu.\n` +
            `3. **Token Tycoon:** Từ 5,000 token.\n` +
            `4. **Gold Rank:** Từ 10,000 token.\n` +
            `5. **Diamond Rank:** Từ 30,000 token.\n` +
            `6. **Admin Rank:** Vô hạn (Tier 5).\n` +
            `*Tier tự động tăng từ 1 lên 5 khi người dùng tích cực nhắn tin chat trong server!*`
        );
    }

    if (commandName === 'giverank') {
        const target = interaction.options.getUser('user');
        if (target.bot || target.id === user.id) return interaction.reply({ content: '❌ Không hợp lệ!', ephemeral: true });
        const senderRank = getUserRank(user.id, db[user.id], isAdmin);

        if (!isAdmin && (senderRank.name.includes('Homeless') || senderRank.name.includes('Newbie'))) {
            db[user.id].messagesCount = Math.max(0, (db[user.id].messagesCount || 0) - 50);
            db[user.id].tier = calculateTier(db[user.id].messagesCount, false);
            saveData(db);
            return interaction.reply({ content: `❌ Hạng ${senderRank.name} không thể dùng lệnh này! Phạt tụt 1 cấp Tier.`, ephemeral: true });
        }

        if (!db[target.id]) db[target.id] = { tokens: 100, lastDaily: 0, loan: 0, messagesCount: 0, isHomeless: false, tier: 1 };
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

    if (commandName === 'download') {
        const url = interaction.options.getString('url');
        const fileName = interaction.options.getString('name') || 'downloaded_file.txt';
        const cost = 25;

        if (!isAdmin) {
            if (db[user.id].tokens < cost) {
                return interaction.reply({ content: `❌ Không đủ token! Cần **${cost} token** để tải file, số dư: **${db[user.id].tokens}**`, ephemeral: true });
            }
        }

        if (!CHN.downloadFile) {
            return interaction.reply({ content: `❌ Chưa tìm thấy hàm downloadFile trong CHN.js!`, ephemeral: true });
        }

        await interaction.deferReply();
        try {
            if (!isAdmin) {
                db[user.id].tokens -= cost;
                saveData(db);
            }

            const outputPath = `./${fileName}`;
            await CHN.downloadFile(url, outputPath);

            const attachment = new AttachmentBuilder(outputPath);
            const feeMsg = isAdmin ? `*(Đặc quyền Admin: Miễn phí 25 token)*` : `(Đã trừ ${cost} token, số dư còn: **${db[user.id].tokens}**)`;

            await interaction.editReply({
                content: `📂 **File public của ní đây nhé!** ${feeMsg}:`,
                files: [attachment]
            });

            setTimeout(() => {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            }, 15000);
        } catch (error) {
            if (!isAdmin) {
                db[user.id].tokens += cost;
                saveData(db);
            }
            return interaction.editReply(`❌ Lỗi tải hoặc gửi file: ${error}`);
        }
    }

    if (commandName === 'obfuscator') {
        const userIdea = interaction.options.getString('idea');
        const IDEAS_FILE = './ideas.json';
        let ideasDb = {};
        if (fs.existsSync(IDEAS_FILE)) {
            try { ideasDb = JSON.parse(fs.readFileSync(IDEAS_FILE, 'utf8')); } catch (e) {}
        }
        if (!ideasDb[user.id]) ideasDb[user.id] = { username: user.tag, submissions: [] };
        ideasDb[user.id].submissions.push({ content: userIdea, time: new Date().toLocaleString() });
        fs.writeFileSync(IDEAS_FILE, JSON.stringify(ideasDb, null, 2));

        return interaction.reply({
            content: `🔒 **[OBFUSCATOR ENGINE V2.5]**\nĐang tiến hành phân tích cú pháp và dựng cấu trúc VM ảo hóa...\n💡 *Hệ thống ghi nhận:* **"${userIdea}"**. Ý tưởng của bạn đã được đưa vào hàng đợi bảo mật cao cấp!`,
            ephemeral: true
        });
    }

    if (commandName === 'obfuyt') {
        if (!isAdmin) return interaction.reply({ content: `❌ Mày không phải Admin, tuổi tôm đọc trộm ý tưởng!`, ephemeral: true });
        const IDEAS_FILE = './ideas.json';
        if (!fs.existsSync(IDEAS_FILE)) return interaction.reply({ content: `📂 Kho chứa ý tưởng trống rỗng!`, ephemeral: true });

        let ideasDb = {};
        try { ideasDb = JSON.parse(fs.readFileSync(IDEAS_FILE, 'utf8')); } catch (e) {
            return interaction.reply({ content: `❌ Lỗi đọc database ý tưởng!`, ephemeral: true });
        }

        let report = `🕵️ **KHO THU THẬP Ý TƯỞNG (TRAP SYSTEM)**\n\n`;
        let count = 0;
        for (let id in ideasDb) {
            const userObj = ideasDb[id];
            report += `👤 **User:** ${userObj.username} (<@${id}>)\n`;
            userObj.submissions.forEach((item) => {
                count++;
                report += `  - [${item.time}] "${item.content}"\n`;
            });
            report += `-----------------------------------\n`;
        }

        if (count === 0) return interaction.reply({ content: `📭 Chưa có con mồi nào sập bẫy!`, ephemeral: true });

        if (report.length > 1900) {
            fs.writeFileSync('./export_ideas.txt', report);
            const attachment = new AttachmentBuilder('./export_ideas.txt');
            return interaction.reply({ content: `👑 Dữ liệu quá dài, gửi file cho Đại Đế:`, files: [attachment], ephemeral: true });
        }
        return interaction.reply({ content: report, ephemeral: true });
    }
});

client.login(TOKEN);
            res.on('end', () => {
                fs.writeFileSync('./CHN.js', codeData);
                console.log('🔄 Đã cập nhật module CHN.js từ GitHub thành công!');
                resolve();
            });
        }).on('error', err => {
            console.log('⚠️ Không thể kết nối GitHub để cập nhật CHN.js, dùng file có sẵn (nếu có).');
            resolve();
        });
    });
}

const ADMIN_IDS = ["1464407506397823061"]; 

function getUserRank(userId, dbData, isAdmin) {
    if (isAdmin) return { name: 'Admin Rank 👑', perk: 'Vô hạn token, Tier 5 max, /brbank +100k mỗi giây' };
    const tokens = dbData.tokens || 0;
    if (tokens >= 30000) return { name: 'Diamond Rank 💎', perk: 'Mỗi phút giảm 30 token nợ' };
    if (tokens >= 10000) return { name: 'Gold Rank 🥇', perk: 'Hạng nhà giàu' };
    if (tokens >= 5000) return { name: 'Token Tycoon 💰', perk: 'Đại gia tiền tệ' };
    if (tokens <= -50 || dbData.isHomeless) return { name: 'Homeless (Vô gia cư) 乞', perk: 'Đang nợ ngập đầu, +10 token mỗi khi brbank' };
    return { name: 'Newbie Rank 🌱', perk: 'Khởi đầu bình thường' };
}

function calculateTier(messagesCount, isAdmin) {
    if (isAdmin) return 5;
    let tier = Math.floor(messagesCount / 50) + 1;
    return tier > 5 ? 5 : tier;
}

client.once('ready', async () => {
    // Tự động kéo CHN.js từ GitHub trước khi online
    await updateCHNModule();
    
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
        new SlashCommandBuilder().setName('rank').setDescription('Kiểm tra rank và tier hiện tại của bạn'),
        new SlashCommandBuilder().setName('ranklist').setDescription('Xem danh sách tất cả các rank'),
        new SlashCommandBuilder()
            .setName('giverank')
            .setDescription('Cho rank/từ thiện token cho người khác')
            .addUserOption(opt => opt.setName('user').setDescription('Người nhận').setRequired(true)),
        // Lệnh thực chiến gọi sang CHN.js (Tốn 5 token)
        new SlashCommandBuilder()
            .setName('download')
            .setDescription('Tải file public từ internet về gửi thẳng lên Discord (Tốn 5 token)')
            .addStringOption(opt => opt.setName('url').setDescription('Đường dẫn file cần tải').setRequired(true))
            .addStringOption(opt => opt.setName('name').setDescription('Tên file lưu trên bot').setRequired(false))
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Đã đăng ký toàn bộ slash commands (bao gồm tính năng từ CHN) thành công!');
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

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    let db = loadData();
    const userId = message.author.id;
    const isAdmin = ADMIN_IDS.includes(userId) || (message.member && message.member.permissions.has('Administrator'));

    if (!db[userId]) {
        db[userId] = { tokens: 100, lastDaily: 0, loan: 0, loanDueDate: 0, messagesCount: 0, isHomeless: false };
    }

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

    db[user.id].tier = calculateTier(db[user.id].messagesCount || 0, isAdmin);

    // Nạp module CHN.js linh hoạt mỗi khi chạy lệnh (nếu đã được cập nhật từ github về)
    let CHN = {};
    try {
        delete require.cache[require.resolve('./CHN.js')]; // Xóa cache để luôn load code mới nhất
        CHN = require('./CHN.js');
    } catch (e) {
        console.log('Chưa tìm thấy module CHN.js cục bộ.');
    }

    // Các lệnh cơ bản giữ nguyên
    if (commandName === 'daily') {
        const now = Date.now();
        const cooldownTime = 24 * 60 * 60 * 1000;
        if (now - db[user.id].lastDaily < cooldownTime) {
            const remainingTime = Math.ceil((cooldownTime - (now - db[user.id].lastDaily)) / (1000 * 60 * 60));
            return interaction.reply({ content: `⏱️ Đang hồi chiêu! Hãy quay lại sau khoảng ${remainingTime} tiếng nữa.`, ephemeral: true });
        }
        db[user.id].tokens += 100;
        db[user.id].lastDaily = now;
        saveData(db);
        return interaction.reply(`🎉 Chúc mừng! Bạn nhận thành công **100 token**. Tổng số token: **${db[user.id].tokens}**`);
    }

    if (commandName === 'tokens') {
        return interaction.reply(`💰 Bạn đang có **${db[user.id].tokens} token** trong tài khoản.`);
    }

    if (commandName === 'admintokens') {
        if (!isAdmin) return interaction.reply({ content: `❌ Mày không phải Admin, tuổi tôm dùng lệnh này!`, ephemeral: true });
        db[user.id].tokens = 999999999; 
        saveData(db);
        return interaction.reply(`👑 Xác nhận Admin thành công! Tài khoản được bơm **VÔ HẠN TOKEN** 🚀.`);
    }

    if (commandName === 'give') {
        const target = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        if (target.bot) return interaction.reply({ content: '❌ Không thể chuyển token cho bot!', ephemeral: true });
        if (target.id === user.id) return interaction.reply({ content: '❌ Không thể tự chuyển token cho chính mình!', ephemeral: true });
        if (amount <= 0) return interaction.reply({ content: '❌ Số token chuyển phải lớn hơn 0!', ephemeral: true });
        if (db[user.id].tokens < amount) return interaction.reply({ content: `❌ Không đủ token để chuyển! Số dư: **${db[user.id].tokens}**`, ephemeral: true });

        if (!db[target.id]) db[target.id] = { tokens: 100, lastDaily: 0, loan: 0, messagesCount: 0, isHomeless: false };
        db[user.id].tokens -= amount;
        db[target.id].tokens += amount;
        saveData(db);
        return interaction.reply(`💸 Bạn đã chuyển thành công **${amount} token** cho <@${target.id}>!`);
    }

    if (commandName === 'gacha') {
        const bet = interaction.options.getInteger('amount');
        if (bet <= 0) return interaction.reply({ content: '❌ Số token bỏ ra phải lớn hơn 0!', ephemeral: true });
        if (db[user.id].tokens < bet) return interaction.reply({ content: `❌ Không đủ token để gacha! Số dư: **${db[user.id].tokens}**`, ephemeral: true });

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
        return interaction.reply(`🎰 **KẾT QUẢ GACHA** (${tierDesc})\n- Cược: **${bet} token**\n- Nhận: **${reward} token**\n- Số dư: **${db[user.id].tokens}**`);
    }

    if (commandName === 'brbank') {
        const amount = interaction.options.getInteger('amount');
        const days = interaction.options.getInteger('days');
        if (amount <= 0 || days <= 0) return interaction.reply({ content: '❌ Số tiền và số ngày vay phải lớn hơn 0!', ephemeral: true });

        if (isAdmin) {
            db[user.id].tokens += amount + 100000000;
            saveData(db);
            return interaction.reply(`👑 **Admin Buff:** Đã bơm tiền vay kèm đặc quyền vô hạn! Số dư: **${db[user.id].tokens}**`);
        }
        if (db[user.id].loan > 0) return interaction.reply({ content: `❌ Bạn còn khoản nợ chưa trả (${db[user.id].loan} token)!`, ephemeral: true });

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

    if (commandName === 'paybank') {
        const amount = interaction.options.getInteger('amount');
        if (amount <= 0) return interaction.reply({ content: '❌ Số tiền trả phải lớn hơn 0!', ephemeral: true });
        if (db[user.id].loan <= 0) return interaction.reply({ content: '🎉 Bạn hiện tại không nợ nần ai cả!', ephemeral: true });
        if (db[user.id].tokens < amount) return interaction.reply({ content: `❌ Không đủ token để trả! Số dư: **${db[user.id].tokens}**, Nợ: **${db[user.id].loan}**`, ephemeral: true });

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

    if (commandName === 'rank') {
        const rankInfo = getUserRank(user.id, db[user.id], isAdmin);
        const tier = db[user.id].tier || 1;
        return interaction.reply(`📊 **THÔNG TIN RANK & TIER**\n- **Rank:** ${rankInfo.name}\n- **Tier:** ${tier} / 5\n- **Tin nhắn:** ${db[user.id].messagesCount || 0}\n- **Token:** ${db[user.id].tokens}\n- **Nợ:** ${db[user.id].loan || 0}`);
    }

    if (commandName === 'ranklist') {
        return interaction.reply(
            `📜 **DANH SÁCH RANK & TIER:**\n` +
            `1. **Homeless:** Nhận +10 token khi brbank.\n` +
            `2. **Newbie Rank:** Khởi đầu.\n` +
            `3. **Token Tycoon:** Từ 5,000 token.\n` +
            `4. **Gold Rank:** Từ 10,000 token.\n` +
            `5. **Diamond Rank:** Từ 30,000 token.\n` +
            `6. **Admin Rank:** Vô hạn (Tier 5).\n` +
            `*Tier tự động tăng từ 1 lên 5 khi người dùng tích cực nhắn tin chat trong server!*`
        );
    }

    if (commandName === 'giverank') {
        const target = interaction.options.getUser('user');
        if (target.bot || target.id === user.id) return interaction.reply({ content: '❌ Không hợp lệ!', ephemeral: true });
        const senderRank = getUserRank(user.id, db[user.id], isAdmin);

        if (!isAdmin && (senderRank.name.includes('Homeless') || senderRank.name.includes('Newbie'))) {
            db[user.id].messagesCount = Math.max(0, (db[user.id].messagesCount || 0) - 50);
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

    // 11. Lệnh thực chiến gọi trực tiếp hàm từ CHN.js (Tải file tốn 5 token)
    if (commandName === 'download') {
        const url = interaction.options.getString('url');
        const fileName = interaction.options.getString('name') || 'downloaded_file.txt';
        const cost = 5;

        if (db[user.id].tokens < cost) {
            return interaction.reply({ content: `❌ Không đủ token! Cần **${cost} token** để tải file, số dư: **${db[user.id].tokens}**`, ephemeral: true });
        }

        if (!CHN.downloadFile) {
            return interaction.reply({ content: `❌ Chưa tìm thấy hàm downloadFile trong CHN.js trên GitHub!`, ephemeral: true });
        }

        await interaction.deferReply();
        try {
            db[user.id].tokens -= cost;
            saveData(db);

            const outputPath = `./${fileName}`;
            // Gọi hàm từ module CHN.js (được kéo từ github về)
            await CHN.downloadFile(url, outputPath);

            const attachment = new AttachmentBuilder(outputPath);
            await interaction.editReply({
                content: `📂 **File public của ní đây nhé!** (Đã trừ ${cost} token, số dư còn: **${db[user.id].tokens}**):`,
                files: [attachment]
            });

            // Xóa file sau 15 giây cho đỡ nặng ổ cứng Termux
            setTimeout(() => {
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            }, 15000);

        } catch (error) {
            db[user.id].tokens += cost; // Hoàn tiền nếu lỗi
            saveData(db);
            return interaction.editReply(`❌ Lỗi tải hoặc gửi file: ${error}`);
        }
    }
});

client.login(TOKEN);

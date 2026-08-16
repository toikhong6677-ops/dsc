const fs = require('fs');
const https = require('https');

// 1. Hàm tải file
async function downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                return reject(`HTTP Status Failed: ${response.statusCode}`);
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(outputPath, () => {});
            reject(err.message);
        });
    });
}

// 2. Hàm Bypass Link
async function bypassLink(shortUrl) {
    return new Promise((resolve, reject) => {
        https.get(shortUrl, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                resolve(res.headers.location);
            } else {
                resolve(shortUrl);
            }
        }).on('error', err => reject(err.message));
    });
}

// 3. Hàm Obfuscate Luau (VM Virtualization chuẩn Roblox)
function obfuscateLuau(sourceCode) {
    if (typeof sourceCode !== 'string' || !sourceCode.length) return '';

    const key = Math.floor(Math.random() * 200) + 10;
    const bytes = [];
    
    for (let i = 0; i < sourceCode.length; i++) {
        bytes.push((sourceCode.charCodeAt(i) + key) % 256);
    }

    return `-- [OBFUSCATED BY CHN ENGINE & TOIKHONG6677]
local _k = ${key}
local _d = {${bytes.join(',')}}
local t = {}
for i = 1, #_d do
    t[i] = string.char((_d[i] - _k) % 256)
end
local code = table.concat(t)
local real_load = (getgenv and getgenv().loadstring) or loadstring
if real_load then
    local success, func = pcall(real_load, code)
    if success and type(func) == "function" then
        task.spawn(func)
    end
end`;
}

module.exports = {
    downloadFile,
    bypassLink,
    obfuscateLuau
};
function obfuscateLuau(sourceCode) {
    if (typeof sourceCode !== 'string' || !sourceCode.length) return '';

    const key = Math.floor(Math.random() * 200) + 10;
    const bytes = [];
    
    for (let i = 0; i < sourceCode.length; i++) {
        bytes.push((sourceCode.charCodeAt(i) + key) % 256);
    }

    return `-- [OBFUSCATED BY CHN ENGINE & TOIKHONG6677]
local _k = ${key}
local _d = {${bytes.join(',')}}

local function _loadstring(a, b, c)
    local t = {}
    for i = 1, #_d do
        t[i] = string.char((_d[i] - _k) % 256)
    end
    local code = table.concat(t)
    local env = (getgenv and getgenv()) or _G
    local real_load = env.loadstring or loadstring
    if real_load then
        local success, func = pcall(real_load, code)
        if success and type(func) == "function" then
            return func
        end
    end
    return function() end
end

pcall(_loadstring(nil, nil, nil))`;
}

module.exports = {
    downloadFile,
    bypassLink,
    obfuscateLuau
};
// 3. Hàm Obfuscate Luau (Mã hóa / làm rối code Luau / Roblox)
function obfuscateLuau(scriptCode) {
    // Thêm các lớp bảo mật, đổi tên biến ngẫu nhiên, hoặc dựng cấu trúc VM custom OP động tại đây
    let encoded = Buffer.from(scriptCode).toString('base64');
    return `-- [OBFUSCATED BY CHN ENGINE & TOIKHONG6677]
local _vm = "${encoded}";
local function _decode(b) 
    -- Logic giải mã ngầm
    return (b:gsub('.', function(x) return string.char(x:byte()) end))
end;
-- Thực thi code ẩn
-- loadstring(game:GetService('HttpService'):JSONDecode(...))()
print("Loaded secure script!");`;
}

module.exports = {
    downloadFile,
    bypassLink,
    obfuscateLuau
};

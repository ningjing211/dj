const fs = require("fs");
const path = require("path");

// 遍歷目錄中的所有文件
const files = fs.readdirSync(".");

console.log(`\n開始移除文件名中的 "new-" 前綴...`);

// 只處理帶有 "new-" 前綴的 PNG 文件
files.forEach(oldName => {
    if (oldName.startsWith("new-") && oldName.endsWith(".png")) {
        try {
            const newName = oldName.replace("new-", "");
            
            // 如果新文件名已存在，先備份
            if (fs.existsSync(newName)) {
                const backupName = `${newName}.bak`;
                fs.renameSync(newName, backupName);
                console.log(`⚠️  ${newName} 已存在，暫時改名為 ${backupName}`);
            }

            // 重命名文件
            fs.renameSync(oldName, newName);
            console.log(`✅ ${oldName} → ${newName}`);
        } catch (err) {
            console.error(`❌ 重新命名失敗 ${oldName}: ${err.message}`);
        }
    }
});

console.log("\n重新命名完成！");

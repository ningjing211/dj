const fs = require('fs');
const path = require('path');

// 獲取所有 Group 資料夾
const getGroupFolders = () => {
    const folders = fs.readdirSync('.')
        .filter(item => {
            const match = item.match(/^(\d{2,3})_\d{4}-\d{2}-\d{2}-\d{6}pm_Group$/);
            if (!match) return false;
            const num = parseInt(match[1]);
            return num >= 41 && num <= 100;
        })
        .sort((a, b) => {
            const numA = parseInt(a.match(/^(\d{2,3})/)[1]);
            const numB = parseInt(b.match(/^(\d{2,3})/)[1]);
            return numA - numB;
        });
    return folders;
};

// 獲取 imagesByOrder 資料夾中的所有 PNG 檔案
const getPngFiles = () => {
    const files = fs.readdirSync('imagesByOrder')
        .filter(file => file.endsWith('.png'))
        .sort((a, b) => {
            const numA = parseInt(a.match(/^(\d+)/)[1]);
            const numB = parseInt(b.match(/^(\d+)/)[1]);
            return numA - numB;
        });
    return files;
};

// 主函數
const main = async () => {
    try {
        const groupFolders = getGroupFolders();
        const pngFiles = getPngFiles();

        console.log(`找到 ${groupFolders.length} 個 Group 資料夾`);
        console.log(`找到 ${pngFiles.length} 個 PNG 檔案`);

        for (const folder of groupFolders) {
            const folderNum = folder.match(/^(\d{2,3})/)[1];
            const pngFile = pngFiles.find(file => file.startsWith(folderNum + '.'));
            
            if (pngFile) {
                const sourcePath = path.join('imagesByOrder', pngFile);
                const targetPath = path.join(folder, pngFile);
                
                fs.copyFileSync(sourcePath, targetPath);
                console.log(`已複製 ${pngFile} 到 ${folder}`);
            } else {
                console.log(`警告：找不到對應的 PNG 檔案給資料夾 ${folder}`);
            }
        }

        console.log('所有檔案複製完成！');
    } catch (error) {
        console.error('發生錯誤：', error);
    }
};

main(); 
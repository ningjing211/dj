const fs = require('fs');
const path = require('path');
const ContentGenerator = require('./content-generator');

async function generateSetInfoForGroup(groupIndex) {
    const generator = new ContentGenerator();
    
    // 找到對應的組合目錄
    const dirName = fs.readdirSync('.')
        .find(f => f.startsWith(`${String(groupIndex).padStart(2, '0')}_2025`));
    
    if (!dirName) {
        console.error(`找不到第 ${groupIndex} 組的目錄`);
        return;
    }

    try {
        // 讀取tracklist
        const tracklistFiles = fs.readdirSync(dirName).filter(f => f.startsWith('tracklist_'));
        const tracklistPath = path.join(dirName, tracklistFiles[0]);
        const tracklist = fs.readFileSync(tracklistPath, 'utf8');
        const tracklistContent = tracklist.split('\n').slice(2).join('\n').trim();

        // 讀取tags
        const tagsFiles = fs.readdirSync(dirName).filter(f => f.startsWith('tagsForSet_'));
        const tagsPath = path.join(dirName, tagsFiles[0]);
        const tagsContent = fs.readFileSync(tagsPath, 'utf8');
        const specificTags = Array.from(new Set(
            tagsContent.match(/#\w+/g) || []
        ));

        // 讀取通用標籤
        const generalTagsContent = fs.readFileSync('general_tags.txt', 'utf8');
        const generalTags = Array.from(new Set(
            generalTagsContent.match(/#\w+/g) || []
        ));

        // 生成set_info內容
        const setInfo = generator.generateSetInfo({
            groupIndex,
            tracklistContent,
            specificTags,
            generalTags
        });

        // 從現有文件名提取時間戳
        const timestamp = tracklistFiles[0].split('tracklist_')[1].split('.txt')[0];
        
        // 生成set_info文件
        const setInfoFileName = `set_info_${String(groupIndex).padStart(2, '0')}_${timestamp}.txt`;
        const setInfoPath = path.join(dirName, setInfoFileName);
        fs.writeFileSync(setInfoPath, setInfo, 'utf8');
        
        console.log(`已生成set_info文件: ${setInfoPath}`);
    } catch (error) {
        console.error(`處理第 ${groupIndex} 組時發生錯誤:`, error);
    }
}

// 主程序
async function main() {
    const groupsToProcess = process.argv.slice(2).map(Number);
    
    if (groupsToProcess.length === 0) {
        console.error('請指定要處理的組別，例如: node generate-set-info.js 5 6 7');
        return;
    }

    console.log(`開始處理第 ${groupsToProcess.join(', ')} 組的set_info文件...`);
    
    for (const groupIndex of groupsToProcess) {
        await generateSetInfoForGroup(groupIndex);
    }
    
    console.log('\n處理完成！');
}

// 執行主程序
main(); 
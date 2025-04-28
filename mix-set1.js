const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// 讀取drawResult.json
function readDrawResult() {
    try {
        const data = fs.readFileSync('drawResult.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('讀取drawResult.json失敗:', error);
        return null;
    }
}

// 生成時間戳記檔名
function generateTimestampFileName(baseFileName) {
    const now = new Date();
    // 轉換為台灣時間（UTC+8）
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    // 格式化時間
    const year = twTime.getUTCFullYear();
    const month = String(twTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(twTime.getUTCDate()).padStart(2, '0');
    const hours = twTime.getUTCHours();
    const minutes = String(twTime.getUTCMinutes()).padStart(2, '0');
    
    // 確定AM/PM
    const period = hours >= 12 ? 'pm' : 'am';
    const twelveHour = hours % 12 || 12;
    
    // 組合時間戳
    const timestamp = `${year}-${month}-${day}_${String(twelveHour).padStart(2, '0')}${minutes}${period}`;
    
    const ext = path.extname(baseFileName);
    const baseName = path.basename(baseFileName, ext);
    return `${baseName}_${timestamp}${ext}`;
}

// 從檔名提取標籤
function extractTagsFromFilename(filename) {
    const tags = new Set();
    
    // 移除副檔名和BPM資訊
    const nameWithoutExt = filename.split('.')[0];
    const stylePart = nameWithoutExt.split('__BPM')[0];
    
    // 提取風格標籤
    const styles = stylePart.toLowerCase().split('_');
    styles.forEach(style => {
        if (style) {
            // 特殊處理 R&B
            if ((style === 'r' && styles.includes('b')) || (style === 'b' && styles.includes('r'))) {
                tags.add('#rnb');
                return;
            }
            
            // 過濾掉單字母標籤
            if (style.length <= 1) {
                return;
            }
            
            tags.add('#' + style);
            
            // 添加相關的標籤
            if (style.includes('lofi')) {
                tags.add('#chillhop');
                tags.add('#studymusic');
                tags.add('#relaxingmusic');
            }
            if (style.includes('jazz')) {
                tags.add('#smoothjazz');
                tags.add('#jazzyhop');
            }
            if (style.includes('chill')) {
                tags.add('#chillbeats');
                tags.add('#chillvibes');
            }
            if (style.includes('ambient')) {
                tags.add('#atmospheric');
                tags.add('#peaceful');
            }
            if (style.includes('piano')) {
                tags.add('#instrumental');
                tags.add('#acoustic');
            }
            if (style.includes('guitar')) {
                tags.add('#acoustic');
                tags.add('#instrumental');
            }
            if (style.includes('beats')) {
                tags.add('#instrumental');
                tags.add('#producerlife');
            }
            if (style.includes('study')) {
                tags.add('#focusmusic');
                tags.add('#concentration');
            }
            if (style.includes('relax')) {
                tags.add('#meditation');
                tags.add('#mindfulness');
            }
        }
    });
    
    // 添加通用標籤
    tags.add('#playlist');
    tags.add('#musicmix');
    tags.add('#chillmusic');
    tags.add('#ambient');
    tags.add('#instrumental');
    tags.add('#backgroundmusic');
    
    return Array.from(tags);
}

// 生成標籤文件
function generateTagsFile(files) {
    const allTags = new Set();
    const fileDetails = [];
    
    // 收集所有檔案的標籤
    files.forEach((file, index) => {
        const tags = extractTagsFromFilename(file);
        const trackNumber = (index + 1).toString().padStart(2, '0');
        fileDetails.push({
            trackNumber,
            filename: file.split('__BPM')[0], // 只顯示風格部分
            tags
        });
        tags.forEach(tag => allTags.add(tag));
    });
    
    // 生成標籤文件內容
    let content = '🎵 Playlist Tags Summary 🎵\n\n';
    content += '=== Track List with Tags ===\n\n';
    
    fileDetails.forEach(detail => {
        content += `Track ${detail.trackNumber}: ${detail.filename}\n`;
        content += `Tags: ${detail.tags.join(' ')}\n\n`;
    });
    
    content += '=== All Tags Used ===\n\n';
    
    // 將標籤按字母順序排序並每個標籤佔一行，但排除通用標籤
    const generalTags = new Set([
        '#playlist',
        '#chillmix',
        '#lofichill',
        '#studyplaylist',
        '#focusmusic',
        '#focusbeats',
        '#productivitymusic',
        '#lofiaesthetic',
        '#chillbeats',
        '#matchamoment',
        '#groovybeats',
        '#relaxmusic',
        '#peacefulstudy',
        '#studylofi',
        '#stressrelief',
        '#workmusic',
        '#citypop',
        '#citypopbeats',
        '#downtempo',
        '#minimal',
        '#breakfast',
        '#soulbeats',
        '#lofihiphop',
        '#instrumental',
        '#lofihiphopbeats',
        '#funkbeats',
        '#focus',
        '#peace'
    ]);
    
    Array.from(allTags)
        .filter(tag => !generalTags.has(tag))
        .sort((a, b) => a.localeCompare(b))
        .forEach(tag => {
            content += `${tag}\n`;
        });
    
    // 在最後添加 general tags
    content += '\n=== General Tags ===\n';
    Array.from(generalTags)
        .sort((a, b) => a.localeCompare(b))
        .forEach(tag => {
            content += `${tag}\n`;
        });
    
    content += `\n=== Tag Count ===\n`;
    content += `Total unique tags: ${allTags.size + generalTags.size}`;
    
    // 生成檔名並寫入文件
    const tagsFileName = generateTimestampFileName('tagsForSet.txt');
    try {
        fs.writeFileSync(tagsFileName, content, 'utf8');
        console.log(`標籤文件已生成: ${tagsFileName}`);
        return tagsFileName;
    } catch (error) {
        console.error('生成標籤文件時發生錯誤:', error);
        return null;
    }
}

// 創建臨時目錄
function createTempDir() {
    const tempDir = 'temp-set1';
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }
    return tempDir;
}

// 複製檔案到臨時目錄
function copyFilesToTemp(files, tempDir) {
    const sourceDir = 'music-310-04-25-2025';
    files.forEach((file, index) => {
        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(tempDir, `${index.toString().padStart(2, '0')}-${file}`);
        try {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`已複製: ${file}`);
        } catch (error) {
            console.error(`複製檔案失敗 ${file}:`, error);
        }
    });
}

// 主程序
function main() {
    console.log('開始處理第一組混音...');
    
    // 讀取組合
    const sets = readDrawResult();
    if (!sets || sets.length === 0) {
        console.error('無法讀取組合數據');
        return;
    }
    
    // 獲取第一組
    const firstSet = sets[0];
    console.log(`\n選擇的音樂組合：`);
    firstSet.files.forEach(file => {
        // 移除BPM和時間戳記部分來顯示風格組合
        const stylePart = file.split('__BPM')[0];
        console.log(`- ${stylePart}`);
    });
    
    // 生成標籤文件
    console.log('\n正在生成標籤文件...');
    const tagsFile = generateTagsFile(firstSet.files);
    if (!tagsFile) {
        console.error('生成標籤文件失敗');
        return;
    }
    
    // 創建臨時目錄
    const tempDir = createTempDir();
    console.log(`\n創建臨時目錄: ${tempDir}`);
    
    // 複製檔案
    console.log('正在複製檔案...');
    copyFilesToTemp(firstSet.files, tempDir);
    
    // 使用merge-mp3.js合併檔案
    console.log('\n開始合併檔案...');
    try {
        execSync(`node merge-mp3.js ${tempDir}`, { stdio: 'inherit' });
        console.log('\n合併完成！輸出檔案: full_set.mp3');
    } catch (error) {
        console.error('合併過程發生錯誤:', error);
    }
    
    // 清理臨時目錄
    console.log('\n清理臨時檔案...');
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('清理完成');
    } catch (error) {
        console.error('清理臨時檔案失敗:', error);
    }
}

// 執行主程序
main(); 
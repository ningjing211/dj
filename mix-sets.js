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

// 生成台灣格式時間戳
function generateTaiwanTimestamp() {
    const now = new Date();
    // 轉換為台灣時間（UTC+8）
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    // 格式化時間
    const year = twTime.getUTCFullYear();
    const month = String(twTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(twTime.getUTCDate()).padStart(2, '0');
    const hours = twTime.getUTCHours();
    const minutes = String(twTime.getUTCMinutes()).padStart(2, '0');
    const seconds = String(twTime.getUTCSeconds()).padStart(2, '0');
    
    // 確定AM/PM
    const period = hours >= 12 ? 'pm' : 'am';
    const twelveHour = hours % 12 || 12;
    
    return `${year}-${month}-${day}-${String(twelveHour).padStart(2, '0')}${minutes}${seconds}${period}`;
}

// 生成時間戳記檔名
function generateTimestampFileName(baseFileName, timestamp = null) {
    if (!timestamp) {
        timestamp = generateTaiwanTimestamp();
    }
    
    const ext = path.extname(baseFileName);
    const baseName = path.basename(baseFileName, ext);
    return `${baseName}_${timestamp}${ext}`;
}

// 創建輸出目錄
function createOutputDirectory(groupIndex, timestamp) {
    const dirName = `${String(groupIndex).padStart(2, '0')}_${timestamp}_Group`;
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName);
    }
    return dirName;
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
function generateTagsFile(files, outputDir, timestamp) {
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
    
    // 將標籤按字母順序排序並用空格分隔
    content += Array.from(allTags)
        .sort((a, b) => a.localeCompare(b))
        .join(' ');
    
    content += '\n\n=== Tag Count ===\n';
    content += `Total unique tags: ${allTags.size}`;
    
    // 生成檔名並寫入文件
    const tagsFileName = generateTimestampFileName('tagsForSet.txt', timestamp);
    const tagsFilePath = path.join(outputDir, tagsFileName);
    
    try {
        fs.writeFileSync(tagsFilePath, content, 'utf8');
        console.log(`標籤文件已生成: ${tagsFilePath}`);
        return tagsFileName;
    } catch (error) {
        console.error('生成標籤文件時發生錯誤:', error);
        return null;
    }
}

// 生成創意歌名
function generateCreativeTitle(filename) {
    // 形容詞庫
    const adjectives = [
        'serene', 'mellow', 'tender', 'tranquil', 'dreamy',
        'peaceful', 'gentle', 'soft', 'warm', 'sweet',
        'misty', 'golden', 'silver', 'azure', 'amber'
    ];

    // 名詞庫
    const nouns = [
        'breeze', 'sunset', 'moonlight', 'whisper', 'garden',
        'morning', 'twilight', 'moment', 'river', 'cloud',
        'melody', 'dream', 'wave', 'echo', 'path'
    ];

    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];

    return `${adj} ${noun}`;
}

// 生成播放列表
async function generateTrackList(files, outputDir, timestamp) {
    let trackList = '音軌列表：\n\n';
    let currentTime = 0;

    for (let i = 0; i < files.length; i++) {
        const creativeTitle = generateCreativeTitle(files[i]);
        const minutes = Math.floor(currentTime / 60);
        const seconds = Math.round(currentTime % 60);
        const timeStamp = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        trackList += `${timeStamp} ${creativeTitle}\n`;
        currentTime += 180; // 假設每首歌3分鐘
    }

    const tracklistFileName = generateTimestampFileName('tracklist.txt', timestamp);
    const tracklistPath = path.join(outputDir, tracklistFileName);
    
    fs.writeFileSync(tracklistPath, trackList, 'utf8');
    console.log(`播放列表已保存到 ${tracklistPath}`);
    
    return tracklistFileName;
}

// 處理單個組合
async function processGroup(groupData, groupIndex) {
    const musicDir = 'music-310-04-25-2025';
    const timestamp = generateTaiwanTimestamp();
    
    // 創建輸出目錄
    const outputDir = createOutputDirectory(groupIndex + 1, timestamp);
    console.log(`\n處理第 ${groupIndex + 1} 組，輸出目錄: ${outputDir}`);

    // 準備音樂文件
    const tempDir = `temp-group-${groupIndex + 1}`;
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    try {
    // 複製並重命名音樂文件
    groupData.files.forEach((file, index) => {
        const sourcePath = path.join(musicDir, file);
        const targetPath = path.join(tempDir, `${index.toString().padStart(2, '0')}-${file}`);
            
            // 檢查源文件是否存在
            if (!fs.existsSync(sourcePath)) {
                throw new Error(`找不到音樂文件: ${file}`);
            }
            
        fs.copyFileSync(sourcePath, targetPath);
    });

    // 生成各種文件
    const mp3FileName = generateTimestampFileName('full_set.mp3', timestamp);
    const jsonFileName = generateTimestampFileName('aboutToMergeTracks.json', timestamp);
    
    // 生成標籤文件
    await generateTagsFile(groupData.files, outputDir, timestamp);
    
    // 生成播放列表
    await generateTrackList(groupData.files, outputDir, timestamp);

    // 使用 sox 合併音樂文件
    const outputMp3Path = path.join(outputDir, mp3FileName);
    const soxCommand = `sox ${path.join(tempDir, '*.mp3')} "${outputMp3Path}"`;
    
        execSync(soxCommand);
        console.log(`音樂文件已合併: ${outputMp3Path}`);
        
        // 生成 JSON 信息文件
        const jsonContent = {
            timestamp: timestamp,
            numbers: groupData.numbers,
            trackMapping: groupData.files.map((file, index) => ({
                number: groupData.numbers[index],
                file: file
            })),
            files: groupData.files,
            outputFile: mp3FileName
        };
        
        fs.writeFileSync(
            path.join(outputDir, jsonFileName),
            JSON.stringify(jsonContent, null, 2)
        );
        
    } catch (error) {
        console.error(`處理第 ${groupIndex + 1} 組時發生錯誤：`, error.message);
        // 清理臨時文件和目錄
        if (fs.existsSync(outputDir)) {
            fs.rmSync(outputDir, { recursive: true, force: true });
        }
    } finally {
        // 清理臨時目錄
        if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }
}

// 主程序
async function main() {
    console.log('開始處理音樂組合...');
    
    // 讀取組合數據
    const sets = readDrawResult();
    if (!sets || sets.length === 0) {
        console.error('無法讀取組合數據');
        return;
    }

    console.log(`找到 ${sets.length} 組組合`);
    console.log('從第 8 組開始處理...');

    // 從第8組開始處理所有組合
    for (let i = 7; i < sets.length; i++) {  // 因為索引從0開始，所以第8組是索引7
        console.log(`\n處理第 ${i + 1}/${sets.length} 組`);
        await processGroup(sets[i], i);
    }

    console.log('\n所有組合處理完成！');
    console.log('請執行 generate-set-info.js 來生成所有組合的 set_info 文件');
}

// 執行主程序
main(); 
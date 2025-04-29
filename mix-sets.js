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

// 從emoji_group.txt讀取已使用的emoji記錄
function readUsedEmojis() {
    try {
        const emojiGroupContent = fs.readFileSync('marketing_data/emoji_group.txt', 'utf8');
        const lines = emojiGroupContent.split('\n');
        // 檢查是否有used_emoji記錄行
        const usedEmojiLine = lines.find(line => line.startsWith('used_emoji='));
        if (usedEmojiLine) {
            return JSON.parse(usedEmojiLine.replace('used_emoji=', ''));
        }
        return [];
    } catch (error) {
        console.error('讀取used_emoji記錄失敗:', error);
        return [];
    }
}

// 更新emoji_group.txt中的used_emoji記錄
function updateUsedEmojis(usedEmojis) {
    try {
        const emojiGroupContent = fs.readFileSync('marketing_data/emoji_group.txt', 'utf8');
        const lines = emojiGroupContent.split('\n');
        const emojiLine = lines[0];
        let newContent = emojiLine + '\n';
        newContent += `used_emoji=${JSON.stringify(usedEmojis)}`;
        fs.writeFileSync('marketing_data/emoji_group.txt', newContent, 'utf8');
    } catch (error) {
        console.error('更新used_emoji記錄失敗:', error);
    }
}

// 從emoji_group.txt隨機選擇一個未使用的emoji
function selectRandomEmoji() {
    const emojiGroupContent = fs.readFileSync('marketing_data/emoji_group.txt', 'utf8');
    const emojis = Array.from(emojiGroupContent.split('\n')[0]);
    const usedEmojis = readUsedEmojis();
    
    // 過濾掉已使用的emoji
    const availableEmojis = emojis.filter((_, index) => !usedEmojis.includes(index));
    
    if (availableEmojis.length === 0) {
        console.warn('所有emoji都已使用，重置使用記錄');
        updateUsedEmojis([]);
        return selectRandomEmoji();
    }
    
    const randomIndex = Math.floor(Math.random() * availableEmojis.length);
    const selectedEmoji = availableEmojis[randomIndex];
    const originalIndex = emojis.indexOf(selectedEmoji);
    
    // 更新使用記錄
    usedEmojis.push(originalIndex);
    updateUsedEmojis(usedEmojis);
    
    return selectedEmoji;
}

// 從kaomoji_group.txt讀取指定索引的kaomoji
function getKaomojiByIndex(index) {
    try {
        const kaomojiContent = fs.readFileSync('marketing_data/kaomoji_group.txt', 'utf8');
        const lines = kaomojiContent.split('\n');
        const groupSize = 4; // 每組佔用4行（包括空行）
        const startLine = (index - 1) * groupSize;
        
        // 確認這是正確的組
        if (lines[startLine].trim() === String(index).padStart(2, '0')) {
            // 提取 [] 中的內容
            const startMatch = lines[startLine + 1].match(/\[(.*?)\]/);
            const endMatch = lines[startLine + 2].match(/\[(.*?)\]/);
            
            if (startMatch && endMatch) {
                return {
                    start: startMatch[1],
                    end: endMatch[1]
                };
            }
        }
        
        // 如果沒找到對應的組，嘗試手動搜索
        for (let i = 0; i < lines.length - 2; i++) {
            if (lines[i].trim() === String(index).padStart(2, '0')) {
                const startMatch = lines[i + 1].match(/\[(.*?)\]/);
                const endMatch = lines[i + 2].match(/\[(.*?)\]/);
                
                if (startMatch && endMatch) {
                    return {
                        start: startMatch[1],
                        end: endMatch[1]
                    };
                }
            }
        }
        
        console.error(`無法找到索引 ${index} 的 kaomoji`);
        return { start: '', end: '' };
    } catch (error) {
        console.error('讀取 kaomoji 失敗:', error);
        return { start: '', end: '' };
    }
}

// 生成set_info.txt
async function generateSetInfo(groupIndex, outputDir, timestamp) {
    try {
        // 讀取模板
        const template = fs.readFileSync('marketing_data/description_template.txt', 'utf8');
        
        // 讀取titles
        const titles = fs.readFileSync('marketing_data/titles_for_video_with_emoji.txt', 'utf8');
        const titleLines = titles.split('\n').filter(line => line.trim());
        // 移除標題中的序號部分
        const selectedTitle = titleLines[groupIndex - 1]
            .trim()
            .replace(/^\d+\.\s+/, '');
            
        // 獲取對應的kaomoji
        const kaomoji = getKaomojiByIndex(groupIndex);
        
        // 讀取description
        const descriptions = fs.readFileSync('marketing_data/description_content_each_indivisual.txt', 'utf8');
        const allLines = descriptions.split('\n');
        
        // 找到當前標題和下一個標題的位置
        let startIndex = -1;
        let endIndex = -1;
        
        // 找到當前標題的位置
        for (let i = 0; i < allLines.length; i++) {
            if (allLines[i].trim() === titleLines[groupIndex - 1].trim()) {
                startIndex = i + 1;  // 從標題的下一行開始
                break;
            }
        }
        
        // 找到下一個標題的位置
        for (let i = startIndex; i < allLines.length; i++) {
            if (i + 1 < titleLines.length && allLines[i].trim() === titleLines[groupIndex].trim()) {
                endIndex = i - 1;  // 到下一個標題的前一行結束
                break;
            }
        }
        
        // 如果找到了正確的範圍，提取描述內容
        let selectedDescription = '';
        if (startIndex !== -1 && endIndex !== -1) {
            selectedDescription = allLines.slice(startIndex, endIndex + 1)
                .map(line => line.trimEnd())  // 只清理行尾空白
                .join('\n')
                .replace(/\n{3,}/g, '\n\n');  // 將連續3個以上的換行替換為2個
        } else {
            console.error(`無法找到第 ${groupIndex} 組的描述內容範圍`);
            selectedDescription = '描述內容提取錯誤';
        }
        
        // 讀取tracklist
        const tracklistPath = path.join(outputDir, `tracklist_${timestamp}.txt`);
        const tracklist = fs.readFileSync(tracklistPath, 'utf8');
        const tracklistContent = tracklist.split('\n').slice(2).join('\n').trim();
        
        // 讀取tags
        const tagsPath = path.join(outputDir, `tagsForSet_${timestamp}.txt`);
        const tagsContent = fs.readFileSync(tagsPath, 'utf8');
        const specificTags = Array.from(new Set(
            tagsContent.match(/#\w+/g) || []
        ));
        
        const generalTagsContent = fs.readFileSync('general_tags.txt', 'utf8');
        const generalTags = Array.from(new Set(
            generalTagsContent.match(/#\w+/g) || []
        ));
        
        // 合併並去重所有標籤，每5個標籤一組
        const allTagsArray = Array.from(new Set([...specificTags, ...generalTags]));
        const formattedTags = allTagsArray.reduce((acc, tag, index) => {
            if (index > 0 && index % 5 === 0) {
                return acc + '\n' + tag;
            }
            return acc + ' ' + tag;
        }).trim();
        
        // 選擇emoji
        const selectedEmoji = selectRandomEmoji();
        
        // 替換模板內容
        let setInfo = template
            .replace('${kaomoji-start}', kaomoji.start)
            .replace('${kaomoji-end}', kaomoji.end)
            .replace('${title}', selectedTitle)
            .replace('${description}', selectedDescription)
            .replace('${tracklist}', tracklistContent)
            .replace('${emojiForCreater}', selectedEmoji)
            .replace('${All Tags}', formattedTags);
            
        // 生成set_info文件
        const setInfoFileName = `set_info_${String(groupIndex).padStart(2, '0')}_${timestamp}.txt`;
        const setInfoPath = path.join(outputDir, setInfoFileName);
        fs.writeFileSync(setInfoPath, setInfo, 'utf8');
        
        console.log(`已生成set_info文件: ${setInfoPath}`);
        return setInfoFileName;
    } catch (error) {
        console.error('生成set_info文件時發生錯誤:', error);
        return null;
    }
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

    // 複製並重命名音樂文件
    groupData.files.forEach((file, index) => {
        const sourcePath = path.join(musicDir, file);
        const targetPath = path.join(tempDir, `${index.toString().padStart(2, '0')}-${file}`);
        fs.copyFileSync(sourcePath, targetPath);
    });

    // 生成各種文件
    const mp3FileName = generateTimestampFileName('full_set.mp3', timestamp);
    const jsonFileName = generateTimestampFileName('aboutToMergeTracks.json', timestamp);
    
    // 生成標籤文件
    await generateTagsFile(groupData.files, outputDir, timestamp);
    
    // 生成播放列表
    await generateTrackList(groupData.files, outputDir, timestamp);
    
    // 生成set_info文件
    await generateSetInfo(groupIndex + 1, outputDir, timestamp);

    // 使用 sox 合併音樂文件
    const outputMp3Path = path.join(outputDir, mp3FileName);
    const soxCommand = `sox ${path.join(tempDir, '*.mp3')} "${outputMp3Path}"`;
    
    try {
        execSync(soxCommand);
        console.log(`音樂文件已合併: ${outputMp3Path}`);
        
        // 生成 JSON 信息文件，包含文件編號
        const jsonContent = {
            timestamp: timestamp,
            numbers: groupData.numbers,  // 添加編號數組
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
        
        // 清理臨時目錄
        fs.rmSync(tempDir, { recursive: true, force: true });
        
    } catch (error) {
        console.error('處理音樂文件時出錯：', error);
    }
}

// 主程序
async function main() {
    console.log('開始處理音樂組合...');
    
    // 讀取組合數據
    const sets = readDrawResult();
    if (!sets || sets.length < 2) {
        console.error('無法讀取足夠的組合數據');
        return;
    }

    // 處理前兩組
    for (let i = 0; i < 2; i++) {
        await processGroup(sets[i], i);
    }

    console.log('\n所有組合處理完成！');
}

// 執行主程序
main(); 
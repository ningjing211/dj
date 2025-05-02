const fs = require('fs');
const path = require('path');

// 從mix-sets.js複製需要的函數
function getKaomojiByIndex(index) {
    try {
        const kaomojiContent = fs.readFileSync('marketing_data/kaomoji_group.txt', 'utf8');
        const lines = kaomojiContent.split('\n');
        const groupSize = 4; // 每組佔用4行（包括空行）
        const startLine = (index - 1) * groupSize;
        
        if (lines[startLine].trim() === String(index).padStart(2, '0')) {
            const startMatch = lines[startLine + 1].match(/\[(.*?)\]/);
            const endMatch = lines[startLine + 2].match(/\[(.*?)\]/);
            
            if (startMatch && endMatch) {
                return {
                    start: startMatch[1],
                    end: endMatch[1]
                };
            }
        }
        
        return { start: '', end: '' };
    } catch (error) {
        console.error('讀取 kaomoji 失敗:', error);
        return { start: '', end: '' };
    }
}

function readUsedEmojis() {
    try {
        const emojiGroupContent = fs.readFileSync('marketing_data/emoji_group.txt', 'utf8');
        const lines = emojiGroupContent.split('\n');
        const usedEmojiLine = lines.find(line => line.startsWith('used_emoji='));
        if (usedEmojiLine) {
            return JSON.parse(usedEmojiLine.replace('used_emoji=', ''));
        }
        return [];
    } catch (error) {
        return [];
    }
}

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

function selectRandomEmoji() {
    const emojiGroupContent = fs.readFileSync('marketing_data/emoji_group.txt', 'utf8');
    const emojis = Array.from(emojiGroupContent.split('\n')[0]);
    const usedEmojis = readUsedEmojis();
    
    const availableEmojis = emojis.filter((_, index) => !usedEmojis.includes(index));
    
    if (availableEmojis.length === 0) {
        updateUsedEmojis([]);
        return selectRandomEmoji();
    }
    
    const randomIndex = Math.floor(Math.random() * availableEmojis.length);
    const selectedEmoji = availableEmojis[randomIndex];
    const originalIndex = emojis.indexOf(selectedEmoji);
    
    usedEmojis.push(originalIndex);
    updateUsedEmojis(usedEmojis);
    
    return selectedEmoji;
}

async function generateSetInfo(groupIndex, outputDir) {
    try {
        // 讀取模板
        const template = fs.readFileSync('marketing_data/description_template.txt', 'utf8');
        
        // 讀取titles
        const titles = fs.readFileSync('marketing_data/titles_for_video_with_emoji.txt', 'utf8');
        const titleLines = titles.split('\n').filter(line => line.trim());
        const selectedTitle = titleLines[groupIndex - 1]
            .trim()
            .replace(/^\d+\.\s+/, '');
            
        // 獲取對應的kaomoji
        const kaomoji = getKaomojiByIndex(groupIndex);
        
        // 讀取description
        const descriptions = fs.readFileSync('marketing_data/description_content_each_indivisual.txt', 'utf8');
        const allLines = descriptions.split('\n');
        
        // 找到當前標題的位置
        let startIndex = -1;
        for (let i = 0; i < allLines.length; i++) {
            if (allLines[i].trim().startsWith(`${groupIndex}.`)) {
                startIndex = i + 1;
                break;
            }
        }
        
        // 找到下一個標題的位置或文件結尾
        let endIndex = -1;
        for (let i = startIndex; i < allLines.length; i++) {
            if (allLines[i].trim().match(/^\d+\./)) {
                endIndex = i - 1;
                break;
            }
        }
        if (endIndex === -1) {
            endIndex = allLines.length - 1;
        }
        
        // 提取描述內容
        let selectedDescription = '';
        if (startIndex !== -1 && endIndex !== -1) {
            selectedDescription = allLines.slice(startIndex, endIndex + 1)
                .filter(line => line.trim())
                .join('\n')
                .trim();
        }
        
        if (!selectedDescription) {
            selectedDescription = '今天讓音樂帶你進入一個全新的世界。\n' +
                                '讓每個音符都成為你旅程中的一顆星星。\n' +
                                '聆聽、感受、享受這段美妙的音樂時光。';
        }
        
        // 讀取tracklist
        const tracklistFiles = fs.readdirSync(outputDir).filter(f => f.startsWith('tracklist_'));
        const tracklistPath = path.join(outputDir, tracklistFiles[0]);
        const tracklist = fs.readFileSync(tracklistPath, 'utf8');
        const tracklistContent = tracklist.split('\n').slice(2).join('\n').trim();
        
        // 讀取tags
        const tagsFiles = fs.readdirSync(outputDir).filter(f => f.startsWith('tagsForSet_'));
        const tagsPath = path.join(outputDir, tagsFiles[0]);
        const tagsContent = fs.readFileSync(tagsPath, 'utf8');
        const specificTags = Array.from(new Set(
            tagsContent.match(/#\w+/g) || []
        ));
        
        const generalTagsContent = fs.readFileSync('general_tags.txt', 'utf8');
        const generalTags = Array.from(new Set(
            generalTagsContent.match(/#\w+/g) || []
        ));
        
        // 合併並去重所有標籤
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
            
        // 從現有文件名提取時間戳
        const existingFile = fs.readdirSync(outputDir).find(f => f.startsWith('tracklist_'));
        const timestamp = existingFile.split('tracklist_')[1].split('.txt')[0];
        
        // 生成set_info文件
        const setInfoFileName = `set_info_${String(groupIndex).padStart(2, '0')}_${timestamp}.txt`;
        const setInfoPath = path.join(outputDir, setInfoFileName);
        fs.writeFileSync(setInfoPath, setInfo, 'utf8');
        
        console.log(`已生成set_info文件: ${setInfoPath}`);
        return setInfoFileName;
    } catch (error) {
        console.error(`處理第 ${groupIndex} 組時發生錯誤:`, error);
        return null;
    }
}

// 主程序
async function main() {
    console.log('開始修復第5-7組的set_info文件...');
    
    for (let i = 5; i <= 7; i++) {
        const dirName = fs.readdirSync('.')
            .find(f => f.startsWith(`${String(i).padStart(2, '0')}_2025`));
        
        if (dirName) {
            console.log(`\n處理第 ${i} 組，目錄: ${dirName}`);
            await generateSetInfo(i, dirName);
        } else {
            console.error(`找不到第 ${i} 組的目錄`);
        }
    }
    
    console.log('\n修復完成！');
}

// 執行主程序
main(); 
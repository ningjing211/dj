const fs = require('fs');
const path = require('path');

class ContentGenerator {
    constructor(marketingDataPath = 'marketing_data') {
        this.marketingDataPath = marketingDataPath;
        this.template = this.readTemplate();
    }

    // 讀取模板文件
    readTemplate() {
        try {
            return fs.readFileSync(path.join(this.marketingDataPath, 'description_template.txt'), 'utf8');
        } catch (error) {
            console.error('讀取模板失敗:', error);
            return '';
        }
    }

    // 獲取標題
    getTitle(groupIndex) {
        try {
            const titles = fs.readFileSync(path.join(this.marketingDataPath, 'titles_for_video_with_emoji.txt'), 'utf8');
            const titleLines = titles.split('\n').filter(line => line.trim());
            return titleLines[groupIndex - 1].trim().replace(/^\d+\.\s+/, '');
        } catch (error) {
            console.error('讀取標題失敗:', error);
            return `Set ${groupIndex}`;
        }
    }

    // 獲取描述
    getDescription(groupIndex) {
        try {
            const descriptions = fs.readFileSync(
                path.join(this.marketingDataPath, 'description_content_each_indivisual.txt'), 
                'utf8'
            );
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
            
            if (startIndex !== -1 && endIndex !== -1) {
                return allLines.slice(startIndex, endIndex + 1)
                    .filter(line => line.trim())
                    .join('\n')
                    .trim();
            }
        } catch (error) {
            console.error('讀取描述失敗:', error);
        }

        return '今天讓音樂帶你進入一個全新的世界。\n' +
               '讓每個音符都成為你旅程中的一顆星星。\n' +
               '聆聽、感受、享受這段美妙的音樂時光。';
    }

    // 獲取Kaomoji
    getKaomoji(index) {
        try {
            const kaomojiContent = fs.readFileSync(
                path.join(this.marketingDataPath, 'kaomoji_group.txt'), 
                'utf8'
            );
            const lines = kaomojiContent.split('\n');
            const groupSize = 4;
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
        } catch (error) {
            console.error('讀取 kaomoji 失敗:', error);
        }
        
        return { start: '', end: '' };
    }

    // 獲取Emoji
    getEmoji() {
        try {
            const emojiGroupContent = fs.readFileSync(
                path.join(this.marketingDataPath, 'emoji_group.txt'), 
                'utf8'
            );
            const emojis = Array.from(emojiGroupContent.split('\n')[0]);
            const usedEmojis = this.readUsedEmojis();
            
            const availableEmojis = emojis.filter((_, index) => !usedEmojis.includes(index));
            
            if (availableEmojis.length === 0) {
                this.updateUsedEmojis([]);
                return this.getEmoji();
            }
            
            const randomIndex = Math.floor(Math.random() * availableEmojis.length);
            const selectedEmoji = availableEmojis[randomIndex];
            const originalIndex = emojis.indexOf(selectedEmoji);
            
            usedEmojis.push(originalIndex);
            this.updateUsedEmojis(usedEmojis);
            
            return selectedEmoji;
        } catch (error) {
            console.error('獲取 emoji 失敗:', error);
            return '🎵';
        }
    }

    // 讀取已使用的Emoji記錄
    readUsedEmojis() {
        try {
            const emojiGroupContent = fs.readFileSync(
                path.join(this.marketingDataPath, 'emoji_group.txt'), 
                'utf8'
            );
            const lines = emojiGroupContent.split('\n');
            const usedEmojiLine = lines.find(line => line.startsWith('used_emoji='));
            if (usedEmojiLine) {
                return JSON.parse(usedEmojiLine.replace('used_emoji=', ''));
            }
        } catch (error) {
            console.error('讀取used_emoji記錄失敗:', error);
        }
        return [];
    }

    // 更新已使用的Emoji記錄
    updateUsedEmojis(usedEmojis) {
        try {
            const emojiGroupContent = fs.readFileSync(
                path.join(this.marketingDataPath, 'emoji_group.txt'), 
                'utf8'
            );
            const lines = emojiGroupContent.split('\n');
            const emojiLine = lines[0];
            let newContent = emojiLine + '\n';
            newContent += `used_emoji=${JSON.stringify(usedEmojis)}`;
            fs.writeFileSync(
                path.join(this.marketingDataPath, 'emoji_group.txt'), 
                newContent, 
                'utf8'
            );
        } catch (error) {
            console.error('更新used_emoji記錄失敗:', error);
        }
    }

    // 格式化標籤
    formatTags(specificTags, generalTags) {
        const allTagsArray = Array.from(new Set([...specificTags, ...generalTags]));
        return allTagsArray.reduce((acc, tag, index) => {
            if (index > 0 && index % 5 === 0) {
                return acc + '\n' + tag;
            }
            return acc + ' ' + tag;
        }).trim();
    }

    // 生成完整的set_info內容
    generateSetInfo({
        groupIndex,
        tracklistContent,
        specificTags = [],
        generalTags = []
    }) {
        const title = this.getTitle(groupIndex);
        const description = this.getDescription(groupIndex);
        const kaomoji = this.getKaomoji(groupIndex);
        const emoji = this.getEmoji();
        const formattedTags = this.formatTags(specificTags, generalTags);

        return this.template
            .replace('${kaomoji-start}', kaomoji.start)
            .replace('${kaomoji-end}', kaomoji.end)
            .replace('${title}', title)
            .replace('${description}', description)
            .replace('${tracklist}', tracklistContent)
            .replace('${emojiForCreater}', emoji)
            .replace('${All Tags}', formattedTags);
    }
}

module.exports = ContentGenerator; 
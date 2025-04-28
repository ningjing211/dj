const fs = require('fs');
const path = require('path');

// 讀取文件內容
function readFileContent(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.error(`讀取文件失敗 ${filePath}:`, error);
        return null;
    }
}

// 將文本分割成段落
function splitIntoParagraphs(text) {
    return text.split('\n\n').filter(para => para.trim());
}

// 從段落中提取標題
function extractTitle(paragraph) {
    const lines = paragraph.split('\n');
    return lines[0].trim();
}

// 主程序
function main() {
    // 設定文件路徑
    const titlesFile = path.join('marketing_data', 'titles_for_video_with_emoji.txt');
    const descriptionFile = path.join('marketing_data', 'description_content_each_indivisual.txt');
    const outputFile = path.join('marketing_data', 'newArticle.txt');

    // 讀取文件
    const titles = readFileContent(titlesFile);
    const descriptions = readFileContent(descriptionFile);

    if (!titles || !descriptions) {
        console.error('讀取文件失敗');
        return;
    }

    // 將標題分行並存入數組
    const titleLines = titles.split('\n').filter(line => line.trim());
    
    // 將描述文本分成段落
    const descriptionParagraphs = splitIntoParagraphs(descriptions);
    
    // 處理每個段落
    let newContent = '';
    let currentTitleIndex = 0;
    
    for (const paragraph of descriptionParagraphs) {
        if (currentTitleIndex >= titleLines.length) break;
        
        const paragraphTitle = extractTitle(paragraph);
        const paragraphContent = paragraph.split('\n').slice(1).join('\n').trim();
        
        // 使用原始標題替換段落標題
        newContent += titleLines[currentTitleIndex] + '\n';
        if (paragraphContent) {
            newContent += paragraphContent + '\n';
        }
        newContent += '\n';
        
        currentTitleIndex++;
    }

    // 寫入新文件
    try {
        fs.writeFileSync(outputFile, newContent.trim(), 'utf8');
        console.log('新文件已生成：', outputFile);
    } catch (error) {
        console.error('生成新文件失敗:', error);
    }
}

// 執行主程序
main(); 
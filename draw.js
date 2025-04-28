const fs = require('fs');
const path = require('path');

// 生成隨機數組（不重複）
function generateRandomSet(min, max, count) {
    const numbers = [];
    while (numbers.length < count) {
        const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!numbers.includes(randomNum)) {
            numbers.push(randomNum);
        }
    }
    return numbers;
}

// 生成100個不同的組合
function generateSets() {
    const sets = [];
    const usedSets = new Set(); // 用於檢查組合是否重複
    
    while (sets.length < 100) {
        const newSet = generateRandomSet(0, 309, 15);
        const setString = newSet.join(',');
        
        // 檢查這個組合是否已經存在
        if (!usedSets.has(setString)) {
            usedSets.add(setString);
            sets.push(newSet);
        }
    }
    
    return sets;
}

// 讀取音樂檔案目錄
function getMusicFiles(directory) {
    try {
        const files = fs.readdirSync(directory);
        return files.filter(file => file.endsWith('.mp3')).sort();
    } catch (error) {
        console.error('讀取目錄失敗:', error);
        return [];
    }
}

// 將數字轉換為對應的檔案名
function numberToFileName(number, musicFiles) {
    // 確保數字在有效範圍內
    if (number >= 0 && number < musicFiles.length) {
        return musicFiles[number];
    }
    return `未知檔案_${number}`;
}

// 生成帶有檔案名的組合
function generateSetsWithFiles() {
    const musicDir = 'music-310-04-25-2025';
    const musicFiles = getMusicFiles(musicDir);
    
    if (musicFiles.length === 0) {
        console.error('未找到音樂檔案');
        return;
    }

    console.log(`找到 ${musicFiles.length} 個音樂檔案`);
    
    const sets = generateSets();
    const setsWithFiles = sets.map(set => ({
        numbers: set,
        files: set.map(num => numberToFileName(num, musicFiles))
    }));

    // 將結果寫入文件
    fs.writeFileSync('drawResult.json', JSON.stringify(setsWithFiles, null, 2));
    console.log('已生成100個組合並保存到 drawResult.json');

    // 生成一個更易讀的文本版本
    const textContent = setsWithFiles.map((set, index) => {
        return `組合 ${index + 1}:\n` +
               `編號: [${set.numbers.join(', ')}]\n` +
               `檔案: [${set.files.join(', ')}]\n`;
    }).join('\n');

    fs.writeFileSync('drawResult.txt', textContent);
    console.log('已生成易讀版本並保存到 drawResult.txt');
}

// 執行主程序
generateSetsWithFiles(); 
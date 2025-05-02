const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// 處理文件路徑中的空格
const escapePath = (filePath) => {
    return `"${filePath.replace(/"/g, '\\"')}"`;
};

// 格式化持續時間
function formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    return `${hours}小時${remainingMinutes}分${remainingSeconds}秒`;
}

// 保存處理記錄的函數
function saveProcessingRecord(audioFile, imageFile, outputFile, startTime, endTime, duration) {
    const logFile = 'processing_history.log';
    const record = {
        audioFile,
        imageFile,
        outputFile,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: duration,
        date: new Date().toLocaleDateString()
    };

    let history = [];
    try {
        if (fs.existsSync(logFile)) {
            const data = fs.readFileSync(logFile, 'utf8');
            history = JSON.parse(data);
        }
    } catch (err) {
        console.log('創建新的歷史記錄文件');
    }

    history.push(record);
    fs.writeFileSync(logFile, JSON.stringify(history, null, 2));
}

// 生成高清 JPG 備份的函數
async function createHighQualityJPGBackup(dirPath) {
    const files = fs.readdirSync(dirPath);
    const pngFile = files.find(file => file.endsWith('.png'));

    if (!pngFile) {
        console.log(`在目錄 ${dirPath} 中未找到 PNG 文件`);
        return;
    }

    const imagePath = path.join(dirPath, pngFile);
    const outputPath = path.join(dirPath, `${path.basename(pngFile, '.png')}-high-quality.jpg`);

    console.log(`\n開始生成高清 JPG 備份: ${outputPath}`);
    
    const ffmpegCommand = `ffmpeg -i ${escapePath(imagePath)} \
-q:v 1 \
${escapePath(outputPath)}`;

    return new Promise((resolve, reject) => {
        exec(ffmpegCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`生成 JPG 備份時出錯: ${error}`);
                console.error('FFmpeg錯誤輸出:', stderr);
                reject(error);
                return;
            }
            console.log(`高清 JPG 備份生成完成: ${outputPath}`);
            resolve();
        });
    });
}

// 處理單個目錄的函數
async function processDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    const mp3File = files.find(file => file.endsWith('.mp3'));
    const pngFile = files.find(file => file.endsWith('.png'));

    if (!mp3File || !pngFile) {
        console.log(`在目錄 ${dirPath} 中未找到所需的 MP3 或 PNG 文件`);
        return;
    }

    // 先生成高清 JPG 備份
    await createHighQualityJPGBackup(dirPath);

    const audioPath = path.join(dirPath, mp3File);
    const imagePath = path.join(dirPath, pngFile);
    const outputPath = path.join(dirPath, `${path.basename(mp3File, '.mp3')}.mov`);

    // 記錄開始時間
    const startTime = new Date();
    console.log(`\n開始處理目錄: ${dirPath}`);
    console.log(`開始時間: ${startTime.toLocaleString()}`);

    // FFmpeg命令
    const ffmpegCommand = `ffmpeg -loop 1 -i ${escapePath(imagePath)} -i ${escapePath(audioPath)} \
-c:v libx264 -preset veryslow -crf 15 \
-c:a aac -b:a 320k \
-pix_fmt yuv420p \
-movflags +faststart \
-vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
-shortest \
-threads 0 \
-progress pipe:1 \
${escapePath(outputPath)}`;

    console.log('開始處理...');
    console.log('這可能需要一些時間，請耐心等待...');

    return new Promise((resolve, reject) => {
        exec(ffmpegCommand, (error, stdout, stderr) => {
            const endTime = new Date();
            const processingTime = endTime - startTime;
            
            if (error) {
                console.error(`執行出錯: ${error}`);
                console.error('FFmpeg錯誤輸出:', stderr);
                reject(error);
                return;
            }
            
            console.log('處理完成！');
            console.log(`結束時間: ${endTime.toLocaleString()}`);
            console.log(`總處理時長: ${formatDuration(processingTime)}`);
            
            // 保存處理記錄
            saveProcessingRecord(
                audioPath,
                imagePath,
                outputPath,
                startTime,
                endTime,
                formatDuration(processingTime)
            );
            
            resolve(endTime); // 返回結束時間，用於下一個目錄的開始時間
        });
    });
}

// 主函數
async function main() {
    const baseDir = process.argv[2] || 'sets-product-example';
    
    if (!fs.existsSync(baseDir)) {
        console.error(`目錄 ${baseDir} 不存在！`);
        process.exit(1);
    }

    const subDirs = fs.readdirSync(baseDir)
        .filter(item => fs.statSync(path.join(baseDir, item)).isDirectory())
        .map(item => path.join(baseDir, item));

    console.log(`找到 ${subDirs.length} 個子目錄需要處理`);

    let lastEndTime = null;
    for (const dir of subDirs) {
        try {
            if (lastEndTime) {
                console.log(`\n等待上一個處理完成...`);
                // 等待上一個處理完成
                const waitTime = lastEndTime - new Date();
                if (waitTime > 0) {
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
            lastEndTime = await processDirectory(dir);
        } catch (error) {
            console.error(`處理目錄 ${dir} 時發生錯誤:`, error);
        }
    }

    console.log('\n所有目錄處理完成！');
}

// 執行主函數
main().catch(console.error); 
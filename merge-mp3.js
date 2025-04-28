const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const path = require('path');

async function analyzeSilence(file) {
    try {
        console.log('正在分析音頻...');
        // 使用 sox 的 stats 效果來分析音頻
        const command = `sox "${file}" -n stats 2>&1`;
        const { stdout, stderr } = await execAsync(command);
        const output = stdout + stderr;
        
        // 解析輸出找到音量信息
        const rmsMatch = output.match(/RMS\s+lev\s+dB\s+([-\d.]+)/);
        if (rmsMatch) {
            const rmsLevel = parseFloat(rmsMatch[1]);
            console.log(`音頻 RMS 電平: ${rmsLevel} dB`);
        }

        // 使用 sox 的 silence 效果來檢測靜音
        const trimCommand = `sox "${file}" -n silence 1 0.1 0.1% reverse silence 1 0.1 0.1% reverse 2>&1`;
        const { stdout: trimOut } = await execAsync(trimCommand);
        console.log('靜音分析完成');
        
        return trimOut;
    } catch (error) {
        console.error('分析音頻時出錯：', error);
        return null;
    }
}

async function trimAudio(inputFile, outputFile) {
    try {
        console.log(`正在處理音頻：${path.basename(inputFile)}...`);
        // 使用 sox 的 silence 效果來自動修剪靜音部分
        const command = `sox "${inputFile}" "${outputFile}" silence 1 0.1 0.1% reverse silence 1 0.1 0.1% reverse`;
        await execAsync(command);
        console.log('處理完成！');
    } catch (error) {
        console.error('處理音頻時出錯：', error);
    }
}

async function getAudioDuration(file) {
    try {
        const command = `soxi -D "${file}"`;
        const { stdout } = await execAsync(command);
        return parseFloat(stdout);
    } catch (error) {
        console.error(`获取音频时长时出错 ${file}:`, error);
        return 0;
    }
}

async function generateTracksInfo(tracks, outputJsonFile) {
    try {
        console.log('正在分析所有音軌信息...');
        const tracksInfo = {
            scanTime: new Date().toISOString(),
            tracks: [],
            totalDuration: 0
        };

        // 只處理選擇的歌曲，並確保正確排序
        const selectedTracks = tracks
            .map(track => {
                const filename = path.basename(track);
                const match = filename.match(/^(\d{2})-/);
                return {
                    track,
                    index: match ? parseInt(match[1]) : 999 // 使用999作為非匹配文件的索引
                };
            })
            .filter(item => item.index <= 14) // 只選擇前15首歌
            .sort((a, b) => a.index - b.index) // 按照索引排序
            .map(item => item.track);

        for (const track of selectedTracks) {
            const duration = await getAudioDuration(track);
            const minutes = Math.floor(duration / 60);
            const seconds = Math.round(duration % 60);
            
            tracksInfo.tracks.push({
                filename: path.basename(track),
                fullPath: track,
                duration: duration,
                formattedDuration: `${minutes}:${seconds.toString().padStart(2, '0')}`
            });
            
            tracksInfo.totalDuration += duration;
        }

        // 計算總時長
        const totalMinutes = Math.floor(tracksInfo.totalDuration / 60);
        const totalSeconds = Math.round(tracksInfo.totalDuration % 60);
        tracksInfo.formattedTotalDuration = `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
        tracksInfo.numberOfTracks = tracksInfo.tracks.length;

        // 寫入JSON文件
        await fs.writeFile(outputJsonFile, JSON.stringify(tracksInfo, null, 2));
        console.log(`音軌信息已保存到 ${outputJsonFile}`);
        return tracksInfo;
    } catch (error) {
        console.error('生成音軌信息時出錯：', error);
        return null;
    }
}

async function mergeTracks(tracks, outputFile, fadeInDuration = 3, fadeOutDuration = 3, crossfade = 2) {
    try {
        const tempDir = 'temp_tracks';
        await fs.mkdir(tempDir, { recursive: true });

        console.log('正在處理所有音軌...');
        
        // 轉換所有文件為 wav 格式並修剪靜音
        const wavFiles = [];
        for (let i = 0; i < tracks.length; i++) {
            const wavFile = path.join(tempDir, `track${i}.wav`);
            const trimmedFile = path.join(tempDir, `trimmed${i}.wav`);
            console.log(`正在轉換 ${path.basename(tracks[i])}...`);
            await execAsync(`sox "${tracks[i]}" "${wavFile}"`);
            await trimAudio(wavFile, trimmedFile);
            wavFiles.push(trimmedFile);
        }

        // 準備 sox 命令來合併所有文件
        console.log('正在合併所有音軌...');
        
        // 第一首歌不使用淡入效果，只在最後使用淡出效果
        const soxCommand = `sox \
            --combine concatenate \
            ${wavFiles.map(f => `"${f}"`).join(' ')} \
            "${outputFile}" \
            fade 0 0 ${fadeOutDuration}`;

        await execAsync(soxCommand);

        // 清理臨時文件
        console.log('正在清理臨時文件...');
        await execAsync(`rm -rf "${tempDir}"`);

        // 確認輸出文件存在
        try {
            await fs.access(outputFile);
            console.log(`處理完成！輸出文件： ${outputFile}`);
            
            // 在確認輸出文件存在後，清理temp_mix目錄
            try {
                await execAsync('rm -rf temp_mix');
                console.log('temp_mix目錄清理完成');
            } catch (error) {
                console.error('清理temp_mix目錄時出錯：', error);
            }
        } catch (error) {
            console.error('輸出文件生成失敗：', error);
        }
    } catch (error) {
        console.error('處理音頻文件時出錯：', error);
    }
}

// 新增扫描目录函数
async function scanDirectory(directoryPath) {
    try {
        const files = await fs.readdir(directoryPath);
        return files
            .filter(file => file.toLowerCase().endsWith('.mp3'))
            .filter(file => file !== '.DS_Store')
            .map(file => path.join(directoryPath, file))
            .sort(); // 保持文件顺序一致
    } catch (error) {
        console.error('扫描目录时出错：', error);
        return [];
    }
}

// 新增检查文件变化的函数
async function checkFileChanges(previousInfo, currentTracks) {
    if (!previousInfo || !previousInfo.tracks) {
        console.log('首次扫描，生成完整信息...');
        return {
            added: currentTracks,
            removed: [],
            unchanged: []
        };
    }

    const previousFiles = new Set(previousInfo.tracks.map(t => t.fullPath));
    const currentFiles = new Set(currentTracks);

    const added = currentTracks.filter(track => !previousFiles.has(track));
    const removed = previousInfo.tracks
        .map(t => t.fullPath)
        .filter(track => !currentFiles.has(track));
    const unchanged = currentTracks.filter(track => previousFiles.has(track));

    return { added, removed, unchanged };
}

// 新增读取之前的JSON信息的函数
async function readPreviousInfo(jsonFile) {
    try {
        const data = await fs.readFile(jsonFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('未找到之前的记录或文件损坏，将创建新的记录');
        return null;
    }
}

// 新增生成时间戳文件名的函数
function generateTimestampFileName(baseFileName) {
    const now = new Date();
    // 转换为台湾时间（UTC+8）
    const twTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    // 格式化时间
    const year = twTime.getUTCFullYear();
    const month = String(twTime.getUTCMonth() + 1).padStart(2, '0');
    const day = String(twTime.getUTCDate()).padStart(2, '0');
    const hours = twTime.getUTCHours();
    const minutes = String(twTime.getUTCMinutes()).padStart(2, '0');
    
    // 确定AM/PM
    const period = hours >= 12 ? 'pm' : 'am';
    const twelveHour = hours % 12 || 12;
    
    // 组合时间戳 (格式: aboutToMergeTracks_2025-04-23_0859pm)
    const timestamp = `${year}-${month}-${day}_${String(twelveHour).padStart(2, '0')}${minutes}${period}`;
    
    const ext = path.extname(baseFileName);
    const baseName = path.basename(baseFileName, ext);
    return `${baseName}_${timestamp}${ext}`;
}

// 新增创意歌名生成函数
function generateCreativeTitle(filename) {
    // 形容词库（从inspiration.txt中提取）
    const adjectives = [
        // Mood & Emotion
        'serene', 'mellow', 'tender', 'tranquil', 'wistful', 'vibrant', 'dreamy',
        'lonesome', 'melancholy', 'cozy', 'peaceful', 'joyful', 'nostalgic',
        'bittersweet', 'soulful', 'pensive', 'blissful', 'whimsical', 'gentle',
        'solemn', 'vivid', 'passionate', 'intimate', 'lighthearted',
        
        // Sensory
        'smooth', 'crisp', 'velvet', 'silky', 'soft', 'warm', 'cool', 'sweet',
        'fragrant', 'bright', 'dim', 'hazy', 'sharp', 'muted', 'fuzzy', 'creamy',
        'misty', 'balmy', 'frosty', 'rich', 'buttery', 'fresh', 'juicy', 'toasty',
        
        // Colors & Light
        'golden', 'silver', 'azure', 'crimson', 'amber', 'emerald', 'indigo',
        'violet', 'scarlet', 'ivory', 'cobalt', 'jade', 'bronze', 'lavender',
        'coral', 'pearl', 'ruby', 'sapphire', 'aqua', 'lilac'
    ];

    // 名词库（从inspiration.txt中提取）
    const nouns = [
        // Nature
        'rain', 'breeze', 'dew', 'sunset', 'leaves', 'frost', 'cloud', 'bloom',
        'shade', 'petals', 'snow', 'mist', 'path', 'forest', 'moonlight',
        'tide', 'river', 'lake', 'field', 'garden',
        
        // Places
        'nook', 'street', 'corner', 'window', 'terrace', 'harbor', 'gallery',
        'bridge', 'cottage', 'cabin', 'canal', 'alley', 'shore', 'garden',
        
        // Time
        'sunday', 'morning', 'twilight', 'dawn', 'dusk', 'midnight', 'moment',
        'afternoon', 'evening', 'night',
        
        // Objects
        'lamp', 'mirror', 'book', 'chair', 'blanket', 'candle', 'piano',
        'letter', 'camera', 'record', 'journal', 'scarf', 'crystal'
    ];

    // 用于记录已使用的词，确保不重复
    if (!generateCreativeTitle.usedWords) {
        generateCreativeTitle.usedWords = new Set();
    }

    function getUnusedWord(wordArray) {
        const availableWords = wordArray.filter(word => !generateCreativeTitle.usedWords.has(word));
        if (availableWords.length === 0) {
            generateCreativeTitle.usedWords.clear(); // 如果所有词都用完了，重置
            return wordArray[Math.floor(Math.random() * wordArray.length)];
        }
        const word = availableWords[Math.floor(Math.random() * availableWords.length)];
        generateCreativeTitle.usedWords.add(word);
        return word;
    }

    // 根据文件名特征选择合适的词组
    let adj, noun;
    
    if (filename.match(/^z[0-9]/i)) {
        // 为特殊文件选择更抽象或情感化的词组
        adj = getUnusedWord(['dreamy', 'serene', 'peaceful', 'gentle', 'tranquil']);
        noun = getUnusedWord(['moment', 'whisper', 'dream', 'memory', 'silence']);
    } else if (filename.toLowerCase().includes('lofi')) {
        adj = getUnusedWord(['mellow', 'soft', 'gentle', 'quiet', 'peaceful']);
        noun = getUnusedWord(['rain', 'breeze', 'morning', 'twilight', 'moment']);
    } else if (filename.toLowerCase().includes('city_pop')) {
        adj = getUnusedWord(['neon', 'crystal', 'silver', 'azure', 'vibrant']);
        noun = getUnusedWord(['lights', 'street', 'window', 'night', 'city']);
    } else if (filename.toLowerCase().includes('tropical')) {
        adj = getUnusedWord(['golden', 'warm', 'balmy', 'bright', 'fresh']);
        noun = getUnusedWord(['shore', 'breeze', 'sunset', 'tide', 'palm']);
    } else {
        // 默认随机组合
        adj = getUnusedWord(adjectives);
        noun = getUnusedWord(nouns);
    }

    return `${adj} ${noun}`;
}

// 新增生成播放列表的函数
async function generateTrackList(tracksInfo) {
    let currentTime = 0;
    let trackList = '音軌列表：\n\n';

    // 用于记录已使用的歌名，避免重复
    const usedTitles = new Set();

    for (const track of tracksInfo.tracks) {
        // 格式化当前时间为 HH:MM:SS 格式
        const hours = Math.floor(currentTime / 3600);
        const minutes = Math.floor((currentTime % 3600) / 60);
        const seconds = Math.round(currentTime % 60);
        const timeStamp = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // 生成创意歌名
        let creativeTitle;
        do {
            creativeTitle = generateCreativeTitle(track.filename);
        } while (usedTitles.has(creativeTitle));
        usedTitles.add(creativeTitle);

        trackList += `${timeStamp} ${creativeTitle}\n`;
        currentTime += track.duration;
    }

    // 格式化总时长为 HH:MM:SS 格式
    const totalHours = Math.floor(tracksInfo.totalDuration / 3600);
    const totalMinutes = Math.floor((tracksInfo.totalDuration % 3600) / 60);
    const totalSeconds = Math.round(tracksInfo.totalDuration % 60);
    const formattedTotalDuration = `${String(totalHours).padStart(2, '0')}:${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`;
    
    // 添加总时长
    trackList += `\n总时长: ${formattedTotalDuration}`;
    
    // 生成带时间戳的文件名
    const baseTrackListFile = 'tracklist.txt';
    const trackListFile = generateTimestampFileName(baseTrackListFile);
    
    // 保存播放列表到文件
    await fs.writeFile(trackListFile, trackList, 'utf8');
    console.log(`播放列表已保存到 ${trackListFile}`);
    
    return trackList;
}

// 更新主程序
async function main() {
    // 獲取命令行參數中的目錄
    const inputDir = process.argv[2] || 'music-310-04-25-2025';
    const BASE_JSON_FILE = 'aboutToMergeTracks.json';
    // 生成帶時間戳的JSON文件名
    const TIMESTAMP_JSON_FILE = generateTimestampFileName(BASE_JSON_FILE);
    
    // 生成帶時間戳的MP3輸出文件名
    const timestamp = TIMESTAMP_JSON_FILE.match(/_([\d-]+_[\d]+[ap]m)/)[1];
    const OUTPUT_MP3_FILE = `full_set_${timestamp}.mp3`;
    
    console.log('正在掃描音頻文件目錄...');
    
    // 掃描指定目錄獲取所有MP3文件
    const tracks = await scanDirectory(inputDir);
    
    if (tracks.length === 0) {
        console.error('錯誤：未找到任何MP3文件！');
        return;
    }

    // 讀取之前的信息並檢查變化
    const previousInfo = await readPreviousInfo(BASE_JSON_FILE);
    const changes = await checkFileChanges(previousInfo, tracks);

    // 顯示變化的數量，而不是詳細列表
    if (changes.added.length > 0) {
        console.log(`\n新增了 ${changes.added.length} 個文件`);
    }
    if (changes.removed.length > 0) {
        console.log(`\n刪除了 ${changes.removed.length} 個文件`);
    }
    console.log(`\n總計 ${tracks.length} 個音頻文件`);

    // 生成新的音軌信息並同時保存到兩個文件
    console.log('\n生成音軌信息...');
    const tracksInfo = await generateTracksInfo(tracks, BASE_JSON_FILE);
    
    if (!tracksInfo) {
        console.error('生成音軌信息失敗，停止合併操作');
        return;
    }

    // 保存帶時間戳的版本
    await fs.writeFile(TIMESTAMP_JSON_FILE, JSON.stringify(tracksInfo, null, 2));
    console.log(`歷史記錄已保存到 ${TIMESTAMP_JSON_FILE}`);
    
    // 生成並顯示播放列表
    console.log('\n生成播放列表...');
    const trackList = await generateTrackList(tracksInfo);
    console.log('\n' + trackList);
    
    // 詢問是否繼續合併
    console.log('\n準備開始合併音軌...');
    
    // 執行合併操作
    await mergeTracks(tracks, OUTPUT_MP3_FILE, 3, 3, 2);

    // 清理臨時目錄
    console.log('\n清理臨時檔案...');
    try {
        await execAsync('rm -rf temp-set1');
        console.log('清理完成');
    } catch (error) {
        console.error('清理臨時檔案失敗:', error);
    }
}

main(); 
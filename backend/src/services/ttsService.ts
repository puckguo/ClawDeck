/**
 * 阿里云 TTS 服务
 * 将宠物对话转换为语音
 */

import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// 阿里云API配置
const ALIYUN_API_KEY = 'sk-e6bc9404eac143aa8d0f01ac947b3675';
const ALIYUN_TTS_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

// OpenClaw 根目录
const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
const TTS_DIR = path.join(OPENCLAW_ROOT, 'tts');

// 支持的音色列表
export const TTS_VOICES = [
  { id: 'Cherry', name: '樱桃', description: '活泼可爱女声', language: 'Chinese' },
  { id: 'Xiaoxue', name: '小雪', description: '温柔女声', language: 'Chinese' },
  { id: 'Xiaowen', name: '小文', description: '成熟女声', language: 'Chinese' },
  { id: 'Xiaomei', name: '小美', description: '甜美女声', language: 'Chinese' },
  { id: 'Xiaoyu', name: '小雨', description: '清新女声', language: 'Chinese' },
  { id: 'Aixuan', name: '艾轩', description: '温柔男声', language: 'Chinese' },
  { id: 'Xiaoming', name: '小明', description: '阳光男声', language: 'Chinese' },
  { id: 'Xiaogang', name: '小刚', description: '磁性男声', language: 'Chinese' },
  { id: 'Xiaobao', name: '小宝', description: '童声', language: 'Chinese' },
  { id: 'Longxia', name: '龙夏', description: '卡通声音', language: 'Chinese' },
];

export interface TTSResult {
  success: boolean;
  audioUrl?: string;
  localPath?: string;
  voice?: string;
  error?: string;
}

export class TTSService {
  private static instance: TTSService;

  private constructor() {
    fs.ensureDirSync(TTS_DIR);
  }

  static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  /**
   * 文本转语音
   */
  async textToSpeech(
    text: string,
    agentId: string,
    voice: string = 'Cherry',
    languageType: string = 'Chinese'
  ): Promise<TTSResult> {
    try {
      // 清理文本（移除JSON状态块等）
      const cleanText = this.cleanTextForTTS(text);

      const requestBody = {
        model: 'qwen3-tts-flash',
        input: {
          text: cleanText,
          voice: voice,
          language_type: languageType
        }
      };

      const response = await axios.post(ALIYUN_TTS_URL, requestBody, {
        headers: {
          'Authorization': `Bearer ${ALIYUN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      // 解析响应获取音频URL
      const audioUrl = this.extractAudioUrl(response.data);

      if (!audioUrl) {
        return {
          success: false,
          error: 'No audio URL in response',
          voice
        };
      }

      // 下载音频到本地
      const localPath = await this.downloadAudio(audioUrl, agentId);

      return {
        success: true,
        audioUrl,
        localPath,
        voice
      };
    } catch (error: any) {
      console.error('TTS generation failed:', error.message);
      return {
        success: false,
        error: error.message,
        voice
      };
    }
  }

  /**
   * 从响应中提取音频URL
   */
  private extractAudioUrl(response: any): string | null {
    try {
      const output = response?.output;
      if (!output) return null;

      const audio = output.audio;
      if (audio && audio.url) {
        return audio.url;
      }

      return null;
    } catch (error) {
      console.error('Failed to extract audio URL:', error);
      return null;
    }
  }

  /**
   * 下载音频到本地
   */
  private async downloadAudio(audioUrl: string, agentId: string): Promise<string> {
    const agentTtsDir = path.join(TTS_DIR, agentId);
    await fs.ensureDir(agentTtsDir);

    const timestamp = Date.now();
    const filename = `tts_${timestamp}.wav`;
    const localPath = path.join(agentTtsDir, filename);

    // 下载音频
    const response = await axios.get(audioUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    await fs.writeFile(localPath, Buffer.from(response.data));

    return localPath;
  }

  /**
   * 清理文本，移除不适合TTS的内容
   */
  private cleanTextForTTS(text: string): string {
    // 移除状态JSON块
    let cleaned = text.replace(/%%%STATE%%%[\s\S]*?%%%END%%%/g, '');

    // 移除表情符号和动作描述（括号内的内容）
    cleaned = cleaned.replace(/[（(][^）)]*[）)]/g, '');

    // 移除多余的空白
    cleaned = cleaned.replace(/\n+/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ');

    // 限制长度（TTS有长度限制）
    if (cleaned.length > 500) {
      cleaned = cleaned.substring(0, 500) + '...';
    }

    return cleaned.trim();
  }

  /**
   * 获取宠物最新的TTS音频
   */
  async getLatestAudio(agentId: string): Promise<string | null> {
    try {
      const agentTtsDir = path.join(TTS_DIR, agentId);

      if (!await fs.pathExists(agentTtsDir)) {
        return null;
      }

      const files = await fs.readdir(agentTtsDir);
      const audioFiles = files
        .filter(f => f.startsWith('tts_') && f.endsWith('.wav'))
        .sort((a, b) => {
          const timeA = parseInt(a.match(/\d+/)?.[0] || '0');
          const timeB = parseInt(b.match(/\d+/)?.[0] || '0');
          return timeB - timeA;
        });

      if (audioFiles.length === 0) {
        return null;
      }

      return path.join(agentTtsDir, audioFiles[0]);
    } catch (error) {
      console.error('Failed to get latest audio:', error);
      return null;
    }
  }

  /**
   * 获取可用音色列表
   */
  getVoices() {
    return TTS_VOICES;
  }

  /**
   * 为宠物选择合适的默认音色
   */
  getDefaultVoice(personalityType: string): string {
    const voiceMap: Record<string, string> = {
      'cheerful': 'Cherry',
      'calm': 'Xiaoxue',
      'curious': 'Xiaobao',
      'stubborn': 'Xiaogang',
      'gentle': 'Xiaomei'
    };

    return voiceMap[personalityType] || 'Cherry';
  }
}

// 导出单例
export const ttsService = TTSService.getInstance();

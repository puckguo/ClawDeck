/**
 * 阿里云文生图服务
 * 集成DashScope Qwen-Image API，为宠物生成形象图和状态图
 */

import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { imageDatabaseService } from './imageDatabaseService';

// 阿里云API配置
const ALIYUN_API_KEY = 'sk-e6bc9404eac143aa8d0f01ac947b3675';
const ALIYUN_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation';

// OpenClaw 根目录
const OPENCLAW_ROOT = process.env.OPENCLAW_ROOT || path.join(os.homedir(), '.openclaw');
// 图片存储目录（SQLite 只存路径，图片文件存这里）
const IMAGES_DIR = path.join(OPENCLAW_ROOT, 'images');

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  localPath?: string;
  prompt?: string;
  error?: string;
}

export class ImageGenerationService {
  private static instance: ImageGenerationService;

  private constructor() {}

  static getInstance(): ImageGenerationService {
    if (!ImageGenerationService.instance) {
      ImageGenerationService.instance = new ImageGenerationService();
    }
    return ImageGenerationService.instance;
  }

  /**
   * 调用阿里云文生图API
   */
  async generateImage(prompt: string, agentId: string, imageType: 'avatar' | 'status'): Promise<ImageGenerationResult> {
    try {
      const requestBody = {
        model: 'qwen-image-2.0-pro',
        input: {
          messages: [
            {
              role: 'user',
              content: [{ text: prompt }]
            }
          ]
        },
        parameters: {
          negative_prompt: 'low quality, blurry, distorted, ugly, deformed',
          prompt_extend: true,
          watermark: false,
          size: '1024*1024'
        }
      };

      const response = await axios.post(ALIYUN_API_URL, requestBody, {
        headers: {
          'Authorization': `Bearer ${ALIYUN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2分钟超时
      });

      // 解析响应获取图片URL
      const imageUrl = this.extractImageUrl(response.data);

      if (!imageUrl) {
        return {
          success: false,
          error: 'No image URL in response',
          prompt
        };
      }

      // 下载图片到本地
      const localPath = await this.downloadImage(imageUrl, agentId, imageType, prompt);

      return {
        success: true,
        imageUrl,
        localPath,
        prompt
      };
    } catch (error: any) {
      console.error('Image generation failed:', error.message);
      return {
        success: false,
        error: error.message,
        prompt
      };
    }
  }

  /**
   * 从响应中提取图片URL
   */
  private extractImageUrl(response: any): string | null {
    try {
      // 根据阿里云API文档解析响应
      const output = response?.output;
      if (!output) return null;

      // 检查choices中的content
      const choices = output.choices;
      if (choices && choices.length > 0) {
        const message = choices[0].message;
        if (message && message.content) {
          // content是数组格式
          for (const content of message.content) {
            if (content.image) {
              return content.image;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to extract image URL:', error);
      return null;
    }
  }

  /**
   * 下载图片到本地并保存到数据库
   */
  private async downloadImage(
    imageUrl: string,
    agentId: string,
    imageType: 'avatar' | 'status',
    prompt: string
  ): Promise<string> {
    // 图片存储目录：~/.openclaw/images/{agentId}/
    const agentImagesDir = path.join(IMAGES_DIR, agentId);
    await fs.ensureDir(agentImagesDir);

    const timestamp = Date.now();
    const filename = `${imageType}_${timestamp}.png`;
    const localPath = path.join(agentImagesDir, filename);
    const relativePath = path.join(agentId, filename); // 用于API返回的相对路径

    // 下载图片
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 60000
    });

    await fs.writeFile(localPath, Buffer.from(response.data));

    // 获取图片尺寸（简化处理，实际应该使用图像库）
    const fileSize = response.data.length;
    const width = 1024;
    const height = 1024;

    // 保存到数据库
    imageDatabaseService.saveImageRecord({
      agentId,
      imageType,
      prompt,
      localPath: relativePath, // 存储相对路径
      url: imageUrl,
      fileSize,
      width,
      height,
      isActive: true
    });

    // 返回完整路径用于文件读取
    return localPath;
  }

  /**
   * 获取宠物最新的图片路径
   * 从数据库查询，返回完整本地路径
   */
  async getLatestImage(agentId: string, imageType: 'avatar' | 'status'): Promise<string | null> {
    try {
      const record = imageDatabaseService.getLatestImage(agentId, imageType);

      if (!record) {
        return null;
      }

      // 将相对路径转换为完整路径
      return path.join(IMAGES_DIR, record.localPath);
    } catch (error) {
      console.error('Failed to get latest image:', error);
      return null;
    }
  }

  /**
   * 获取所有图片列表
   * 从数据库查询
   */
  async getAllImages(agentId: string): Promise<Array<{ type: string; path: string; createdAt: string }>> {
    try {
      const records = imageDatabaseService.getAllImages(agentId);

      return records.map(record => ({
        type: record.imageType,
        path: path.join(IMAGES_DIR, record.localPath),
        createdAt: record.createdAt
      }));
    } catch (error) {
      console.error('Failed to get all images:', error);
      return [];
    }
  }

  /**
   * 获取图片信息（用于API响应）
   */
  getImageInfo(agentId: string, imageType: 'avatar' | 'status'): {
    path: string | null;
    prompt: string | null;
    createdAt: string | null;
  } {
    const record = imageDatabaseService.getLatestImage(agentId, imageType);

    if (!record) {
      return { path: null, prompt: null, createdAt: null };
    }

    return {
      path: path.join(IMAGES_DIR, record.localPath),
      prompt: record.prompt,
      createdAt: record.createdAt
    };
  }

  /**
   * 生成宠物形象图提示词（由AI决定具体内容）
   * 这里提供基础模板，实际prompt由AI根据状态生成
   */
  generateAvatarPromptTemplate(petName: string, stage: string, personality: string): string {
    return `Create a cute digital pet character named "${petName}".
Stage: ${stage}
Personality: ${personality}
Style: Cute, high-quality digital art, soft colors, adorable character design
Background: Simple gradient or soft pattern
Quality: Professional, detailed, suitable for avatar use`;
  }

  /**
   * 生成状态图提示词模板
   */
  generateStatusPromptTemplate(petName: string, status: string, mood: string): string {
    return `Create an image of a cute digital pet named "${petName}" that is currently ${status}.
Mood: ${mood}
Style: Expressive, emotional, high-quality digital art
The image should clearly convey the pet's current state and mood
Background: Appropriate to the mood and status
Quality: Professional, detailed, emotionally engaging`;
  }
}

// 导出单例
export const imageGenerationService = ImageGenerationService.getInstance();

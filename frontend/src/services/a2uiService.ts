/**
 * A2UI 服务
 * 处理Canvas渲染和与宠物的交互
 */

export interface A2UISurface {
  surfaceId: string;
  title: string;
  components: A2UIComponent[];
}

export interface A2UIComponent {
  id: string;
  type: 'text' | 'button' | 'image' | 'progress' | 'container' | 'pet_avatar';
  properties: Record<string, any>;
  children?: A2UIComponent[];
}

export interface A2UIMessage {
  type: string;
  surfaceId?: string;
  [key: string]: any;
}

export class A2UIService {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number = 0;
  private petState: any = null;
  private petImage: HTMLImageElement | null = null;
  private imageLoading: boolean = false;
  private agentId: string | null = null;

  // 心情表情配置
  private moodEmojis: Record<string, string> = {
    ecstatic: '🤩',
    happy: '😊',
    content: '😌',
    neutral: '😐',
    sad: '😢',
    angry: '😠',
    sick: '🤒',
    sleepy: '😴',
    sleeping: '💤'
  };

  // 单例模式
  private static instance: A2UIService | null = null;

  private constructor() {}

  static getInstance(): A2UIService {
    if (!A2UIService.instance) {
      A2UIService.instance = new A2UIService();
    }
    return A2UIService.instance;
  }

  /**
   * 初始化Canvas - 由页面组件调用
   */
  initCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resizeCanvas();

    // 延迟再次调整大小，确保父元素已渲染
    setTimeout(() => this.resizeCanvas(), 100);

    // 开始渲染循环
    this.startRenderLoop();
  }

  /**
   * 设置宠物ID并加载图片
   */
  setAgentId(agentId: string): void {
    this.agentId = agentId;
    this.loadPetImage();
  }

  /**
   * 加载宠物图片
   */
  private loadPetImage(): void {
    if (!this.agentId || this.imageLoading) return;

    this.imageLoading = true;
    // 添加时间戳避免缓存
    const timestamp = Date.now();
    const imageUrl = `/api/pets/${this.agentId}/images/latest?t=${timestamp}`;

    console.log('[A2UI] Loading pet image:', imageUrl);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      console.log('[A2UI] Pet image loaded successfully, size:', img.width, 'x', img.height);
      this.petImage = img;
      this.imageLoading = false;
      // 触发一次重绘
      this.render();
    };
    img.onerror = (err) => {
      console.error('[A2UI] Failed to load pet image:', err);
      this.petImage = null;
      this.imageLoading = false;
      // 3秒后重试
      setTimeout(() => {
        this.imageLoading = false;
        this.loadPetImage();
      }, 3000);
    };
    img.src = imageUrl;
  }

  /**
   * 刷新宠物图片（状态变化时调用）
   */
  refreshPetImage(): void {
    this.petImage = null;
    this.imageLoading = false; // 重置加载标志
    // 添加时间戳避免缓存
    this.loadPetImage();
  }

  /**
   * 调整Canvas大小 - 适配父容器
   */
  private resizeCanvas(): void {
    if (!this.canvas) return;

    const parent = this.canvas.parentElement;
    if (parent) {
      const width = parent.clientWidth || 800;
      const height = parent.clientHeight || 600;
      this.canvas.width = width;
      this.canvas.height = height;
      console.log(`[A2UI] Canvas resized to ${width}x${height}`);
    }
  }

  /**
   * 开始渲染循环
   */
  private startRenderLoop(): void {
    const render = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  /**
   * 渲染函数
   */
  private render(): void {
    if (!this.ctx || !this.canvas) return;

    // 清空画布（使用透明）
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 调试：绘制背景色确保Canvas可见
    this.ctx.fillStyle = '#e8e8e8';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 渲染宠物
    this.renderPet();

    // 渲染状态面板
    this.renderStatusPanel();

    // 渲染操作按钮
    this.renderActionButtons();
  }

  /**
   * 渲染宠物形象
   */
  private renderPet(): void {
    if (!this.ctx || !this.petState) return;

    const centerX = this.canvas!.width / 2;
    const centerY = this.canvas!.height / 2 - 50;
    const size = 120;

    // 绘制背景光环
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, size * 1.5
    );

    // 根据心情调整光环颜色
    const moodColors: Record<string, string> = {
      happy: 'rgba(255, 200, 100, 0.3)',
      ecstatic: 'rgba(255, 150, 200, 0.4)',
      sad: 'rgba(100, 150, 255, 0.3)',
      angry: 'rgba(255, 100, 100, 0.3)',
      sick: 'rgba(200, 200, 200, 0.3)',
      sleepy: 'rgba(150, 100, 200, 0.3)',
      sleeping: 'rgba(100, 100, 150, 0.2)',
      neutral: 'rgba(200, 200, 200, 0.2)',
      content: 'rgba(150, 255, 150, 0.3)'
    };

    gradient.addColorStop(0, moodColors[this.petState.mood] || moodColors.neutral);
    gradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas!.width, this.canvas!.height);

    // 如果有图片则绘制图片，否则使用emoji
    if (this.petImage && this.petImage.complete) {
      this.renderPetImage(centerX, centerY, size);
    } else {
      this.renderPetEmoji(centerX, centerY, size);
    }

    // 如果是睡觉状态，绘制Zzz动画
    if (this.petState.isSleeping) {
      this.renderSleepAnimation(centerX + 60, centerY - 60);
    }

    // 绘制宠物名字
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillStyle = '#333';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(this.petState.name || '宠物', centerX, centerY + size / 2 + 30);

    // 绘制内心想法
    if (this.petState.thought) {
      this.ctx.font = '16px Arial';
      this.ctx.fillStyle = '#666';
      const maxWidth = 300;
      this.wrapText(this.petState.thought, centerX, centerY + size / 2 + 60, maxWidth, 22);
    }
  }

  /**
   * 渲染宠物图片
   */
  private renderPetImage(centerX: number, centerY: number, size: number): void {
    if (!this.ctx || !this.petImage) return;

    const imgSize = size * 2;
    const x = centerX - imgSize / 2;
    const y = centerY - imgSize / 2;

    // 绘制圆角裁剪区域
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, imgSize / 2, 0, Math.PI * 2);
    this.ctx.closePath();
    this.ctx.clip();

    // 绘制图片
    this.ctx.drawImage(this.petImage, x, y, imgSize, imgSize);

    this.ctx.restore();

    // 绘制边框
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, imgSize / 2, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  /**
   * 渲染宠物表情（Emoji方式）
   */
  private renderPetEmoji(centerX: number, centerY: number, size: number): void {
    if (!this.ctx) return;

    // 绘制宠物主体
    this.ctx.font = `${size}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // 如果有心情表情，叠加显示
    const moodEmoji = this.moodEmojis[this.petState.mood] || this.moodEmojis.neutral;

    // 绘制表情阴影
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillText(moodEmoji, centerX + 3, centerY + 3);

    // 绘制表情
    this.ctx.fillStyle = '#000';
    this.ctx.fillText(moodEmoji, centerX, centerY);
  }

  /**
   * 绘制睡眠动画
   */
  private renderSleepAnimation(x: number, y: number): void {
    if (!this.ctx) return;

    const time = Date.now() / 1000;
    const offset = Math.sin(time * 2) * 5;

    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = 'rgba(100, 100, 200, 0.6)';
    this.ctx.fillText('Z', x + offset, y - offset);
    this.ctx.fillText('z', x + 15 + offset * 0.7, y - 15 - offset * 0.7);
    this.ctx.fillText('z', x + 25 + offset * 0.5, y - 25 - offset * 0.5);
  }

  /**
   * 自动换行文本
   */
  private wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
    if (!this.ctx) return;

    const words = text.split('');
    let line = '';
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && i > 0) {
        this.ctx.fillText(line, x, currentY);
        line = words[i];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    this.ctx.fillText(line, x, currentY);
  }

  /**
   * 渲染状态面板
   */
  private renderStatusPanel(): void {
    if (!this.ctx || !this.petState) return;

    const panelX = 20;
    const panelY = 20;
    const panelWidth = 200;
    const panelHeight = 200;

    // 绘制面板背景
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.strokeStyle = '#ddd';
    this.ctx.lineWidth = 1;

    // 圆角矩形
    this.roundRect(panelX, panelY, panelWidth, panelHeight, 10);
    this.ctx.fill();
    this.ctx.stroke();

    // 绘制状态条
    const stats = [
      { label: '饱食度', value: this.petState.hunger, color: '#ff9f43' },
      { label: '开心度', value: this.petState.happiness, color: '#ff6b6b' },
      { label: '精力值', value: this.petState.energy, color: '#54a0ff' },
      { label: '健康值', value: this.petState.health, color: '#5f27cd' },
      { label: '亲密度', value: this.petState.affection, color: '#ff9ff3' }
    ];

    let currentY = panelY + 30;

    this.ctx.font = '14px Arial';

    stats.forEach(stat => {
      if (!this.ctx) return;

      // 标签
      this.ctx.fillStyle = '#333';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(stat.label, panelX + 15, currentY);

      // 进度条背景
      const barX = panelX + 70;
      const barY = currentY - 10;
      const barWidth = 110;
      const barHeight = 12;

      this.ctx.fillStyle = '#eee';
      this.roundRect(barX, barY, barWidth, barHeight, 6);
      this.ctx.fill();

      // 进度条
      this.ctx.fillStyle = stat.color;
      this.roundRect(barX, barY, barWidth * (stat.value / 100), barHeight, 6);
      this.ctx.fill();

      // 数值
      this.ctx.fillStyle = '#666';
      this.ctx.font = '11px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${Math.round(stat.value)}`, barX + barWidth / 2, barY + 9);
      this.ctx.font = '14px Arial';

      currentY += 35;
    });
  }

  /**
   * 渲染操作按钮
   */
  private renderActionButtons(): void {
    if (!this.ctx) return;

    const buttons = [
      { id: 'feed', label: '🍖 喂食', x: 0, color: '#ff9f43' },
      { id: 'play', label: '🎾 玩耍', x: 1, color: '#54a0ff' },
      { id: 'pet', label: '✋ 抚摸', x: 2, color: '#ff6b6b' },
      { id: 'sleep', label: '😴 睡觉', x: 3, color: '#5f27cd' }
    ];

    const buttonWidth = 100;
    const buttonHeight = 40;
    const startX = (this.canvas!.width - buttons.length * (buttonWidth + 20)) / 2;
    const y = this.canvas!.height - 100;

    buttons.forEach(btn => {
      if (!this.ctx) return;
      const x = startX + btn.x * (buttonWidth + 20);

      // 按钮背景
      this.ctx.fillStyle = btn.color;
      this.roundRect(x, y, buttonWidth, buttonHeight, 20);
      this.ctx.fill();

      // 按钮文字
      this.ctx.font = '16px Arial';
      this.ctx.fillStyle = '#fff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(btn.label, x + buttonWidth / 2, y + buttonHeight / 2);
    });

    // 存储按钮位置用于点击检测
    this.buttonPositions = buttons.map(btn => ({
      ...btn,
      rect: {
        x: startX + btn.x * (buttonWidth + 20),
        y,
        width: buttonWidth,
        height: buttonHeight
      }
    }));
  }

  private buttonPositions: any[] = [];

  /**
   * 绘制圆角矩形
   */
  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  /**
   * 更新宠物状态
   */
  updatePetState(state: any): void {
    this.petState = state;
  }

  /**
   * 检查是否已设置agentId
   */
  hasAgentId(): boolean {
    return this.agentId !== null;
  }

  /**
   * 处理点击事件
   */
  handleClick(x: number, y: number): string | null {
    // 检查是否点击了按钮
    for (const btn of this.buttonPositions) {
      const rect = btn.rect;
      if (x >= rect.x && x <= rect.x + rect.width &&
          y >= rect.y && y <= rect.y + rect.height) {
        return btn.id;
      }
    }
    return null;
  }

  /**
   * 销毁服务
   */
  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

// 导出单例
export const a2uiService = A2UIService.getInstance();

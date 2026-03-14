/**
 * 宠物数据库服务
 * 基于 SQLite 的宠物数据访问层
 */

import { db } from './databaseService';
import type { PetData, PetStatus, PetSummary, Interaction, PetChatMessage } from '../../../shared/types';

export class PetDatabaseService {
  private static instance: PetDatabaseService;

  private constructor() {}

  static getInstance(): PetDatabaseService {
    if (!PetDatabaseService.instance) {
      PetDatabaseService.instance = new PetDatabaseService();
    }
    return PetDatabaseService.instance;
  }

  /**
   * 获取所有宠物摘要
   */
  getPetSummaries(): PetSummary[] {
    const stmt = db.prepare(`
      SELECT agent_id, name, stage, level, mood, avatar, affection,
             last_interaction_at, is_sleeping
      FROM pet_status
    `);

    const rows = stmt.all() as any[];

    return rows.map(row => ({
      agentId: row.agent_id,
      name: row.name,
      stage: row.stage,
      level: row.level,
      mood: row.mood,
      avatar: row.avatar,
      affection: row.affection,
      lastInteractionAt: row.last_interaction_at,
      isSleeping: Boolean(row.is_sleeping),
      needsAttention: row.hunger < 30 || row.health < 30 || row.is_sick
    }));
  }

  /**
   * 获取宠物数据
   */
  getPetData(agentId: string): PetData | null {
    const statusStmt = db.prepare('SELECT * FROM pet_status WHERE agent_id = ?');
    const statusRow = statusStmt.get(agentId) as any;

    if (!statusRow) return null;

    // 构建 PetStatus
    const status: PetStatus = {
      agentId: statusRow.agent_id,
      name: statusRow.name,
      avatar: statusRow.avatar,
      stage: statusRow.stage,
      level: statusRow.level,
      experience: statusRow.experience,
      experienceToNext: statusRow.experience_to_next,
      hunger: statusRow.hunger,
      happiness: statusRow.happiness,
      energy: statusRow.energy,
      health: statusRow.health,
      cleanliness: statusRow.cleanliness,
      intelligence: statusRow.intelligence,
      affection: statusRow.affection,
      strength: statusRow.strength,
      agility: statusRow.agility,
      personality: {
        type: statusRow.personality_type,
        traits: JSON.parse(statusRow.personality_traits || '{}')
      },
      mood: statusRow.mood,
      isSleeping: Boolean(statusRow.is_sleeping),
      isSick: Boolean(statusRow.is_sick),
      evolutionPoints: statusRow.evolution_points,
      bornAt: statusRow.born_at,
      lastFedAt: statusRow.last_fed_at,
      lastPlayedAt: statusRow.last_played_at,
      lastTrainedAt: statusRow.last_trained_at,
      lastSleptAt: statusRow.last_slept_at,
      lastInteractionAt: statusRow.last_interaction_at,
      totalPlayTime: statusRow.total_play_time,
      consecutiveLoginDays: statusRow.consecutive_login_days,
      thought: statusRow.thought
    };

    // 获取外观
    const appearanceStmt = db.prepare('SELECT * FROM pet_appearance WHERE agent_id = ?');
    const appearanceRow = appearanceStmt.get(agentId) as any;

    const appearance = appearanceRow ? {
      baseForm: appearanceRow.base_form,
      color: appearanceRow.color,
      accessories: [],
      unlockedForms: JSON.parse(appearanceRow.unlocked_forms || '["egg"]')
    } : {
      baseForm: 'egg',
      color: '#FFD700',
      accessories: [],
      unlockedForms: ['egg']
    };

    // 获取互动记录
    const interactionsStmt = db.prepare(
      'SELECT * FROM pet_interactions WHERE agent_id = ? ORDER BY timestamp DESC LIMIT 100'
    );
    const interactionRows = interactionsStmt.all(agentId) as any[];

    const interactions: Interaction[] = interactionRows.map(row => ({
      id: row.id.toString(),
      type: row.interaction_type,
      timestamp: row.timestamp,
      data: JSON.parse(row.data || '{}'),
      effects: JSON.parse(row.effects || '[]'),
      note: row.note
    }));

    // 获取聊天记录
    const messagesStmt = db.prepare(
      'SELECT * FROM pet_chat_messages WHERE agent_id = ? ORDER BY timestamp DESC LIMIT 100'
    );
    const messageRows = messagesStmt.all(agentId) as any[];

    const messages: PetChatMessage[] = messageRows.map(row => ({
      id: row.id.toString(),
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
      emotionalTone: row.emotional_tone,
      effects: JSON.parse(row.effects || '[]')
    })).reverse();

    return {
      status,
      appearance,
      evolutionBranches: [],
      currentBranch: undefined,
      interactions,
      conversation: { messages },
      dailyTasks: [],
      achievements: [],
      inventory: []
    };
  }

  /**
   * 保存宠物状态
   */
  savePetStatus(agentId: string, status: PetStatus): void {
    const stmt = db.prepare(`
      INSERT INTO pet_status (
        agent_id, name, avatar, stage, level, experience, experience_to_next,
        hunger, happiness, energy, health, cleanliness,
        intelligence, affection, strength, agility,
        personality_type, personality_traits,
        mood, is_sleeping, is_sick, evolution_points,
        born_at, last_fed_at, last_played_at, last_trained_at,
        last_slept_at, last_interaction_at, total_play_time,
        consecutive_login_days, thought
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(agent_id) DO UPDATE SET
        name = excluded.name,
        avatar = excluded.avatar,
        stage = excluded.stage,
        level = excluded.level,
        experience = excluded.experience,
        experience_to_next = excluded.experience_to_next,
        hunger = excluded.hunger,
        happiness = excluded.happiness,
        energy = excluded.energy,
        health = excluded.health,
        cleanliness = excluded.cleanliness,
        intelligence = excluded.intelligence,
        affection = excluded.affection,
        strength = excluded.strength,
        agility = excluded.agility,
        personality_type = excluded.personality_type,
        personality_traits = excluded.personality_traits,
        mood = excluded.mood,
        is_sleeping = excluded.is_sleeping,
        is_sick = excluded.is_sick,
        evolution_points = excluded.evolution_points,
        last_fed_at = excluded.last_fed_at,
        last_played_at = excluded.last_played_at,
        last_trained_at = excluded.last_trained_at,
        last_slept_at = excluded.last_slept_at,
        last_interaction_at = excluded.last_interaction_at,
        total_play_time = excluded.total_play_time,
        consecutive_login_days = excluded.consecutive_login_days,
        thought = excluded.thought,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      agentId, status.name, status.avatar, status.stage, status.level,
      status.experience, status.experienceToNext,
      status.hunger, status.happiness, status.energy, status.health, status.cleanliness,
      status.intelligence, status.affection, status.strength, status.agility,
      status.personality.type, JSON.stringify(status.personality.traits),
      status.mood, status.isSleeping ? 1 : 0, status.isSick ? 1 : 0, status.evolutionPoints,
      status.bornAt, status.lastFedAt, status.lastPlayedAt, status.lastTrainedAt,
      status.lastSleptAt, status.lastInteractionAt, status.totalPlayTime,
      status.consecutiveLoginDays, status.thought
    );
  }

  /**
   * 添加互动记录
   */
  addInteraction(agentId: string, interaction: Interaction): void {
    const stmt = db.prepare(`
      INSERT INTO pet_interactions (agent_id, interaction_type, data, effects, note)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      agentId,
      interaction.type,
      JSON.stringify(interaction.data || {}),
      JSON.stringify(interaction.effects),
      interaction.note || ''
    );
  }

  /**
   * 添加聊天记录
   */
  addChatMessage(agentId: string, message: PetChatMessage): void {
    const stmt = db.prepare(`
      INSERT INTO pet_chat_messages (agent_id, role, content, emotional_tone, effects)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      agentId,
      message.role,
      message.content,
      message.emotionalTone || '',
      JSON.stringify(message.effects || [])
    );
  }

  /**
   * 检查宠物是否存在
   */
  petExists(agentId: string): boolean {
    const stmt = db.prepare('SELECT 1 FROM pet_status WHERE agent_id = ?');
    const result = stmt.get(agentId);
    return !!result;
  }

  /**
   * 删除宠物
   */
  deletePet(agentId: string): void {
    const stmt = db.prepare('DELETE FROM pet_status WHERE agent_id = ?');
    stmt.run(agentId);
  }
}

// 导出单例
export const petDatabaseService = PetDatabaseService.getInstance();

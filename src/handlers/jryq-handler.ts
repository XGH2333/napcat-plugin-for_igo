/**
 * 今日运气处理器
 *
 * 实现"今日运气"功能：
 * - 用户发送 #今日运气 或 #jryq 获取随机运气值 (0-100)
 * - 每个用户每天只能获取一次（次日凌晨重置）
 * - 不同运气值范围返回不同的文案和图片
 * - 主人可使用 #开后门 / #关后门 指定用户必定获得100运气
 */

import type { OB11Message, OB11PostSendMsg } from 'napcat-types/napcat-onebot';
import type { NapCatPluginContext } from 'napcat-types/napcat-onebot/network/plugin/types';
import { pluginState } from '../core/state';
import { sendReply } from './message-handler';

// ==================== 数据结构 ====================

/** 用户运气记录 */
interface UserLuckRecord {
    /** 运气值 (0-100) */
    num: number;
    /** 获取时间戳 */
    timestamp: number;
}

/** 完整数据文件结构 */
interface JryqData {
    /** 用户运气记录 */
    luck: Record<string, UserLuckRecord>;
    /** 后门用户集合（今天生效） */
    backdoor: string[];
}

const DATA_FILE = 'jryq_data.json';

// ==================== 工具函数 ====================

/**
 * 获取今天凌晨 4 点的时间戳
 * （凌晨 4 点前算前一天）
 */
function getTodayResetTimestamp(): number {
    const now = new Date();
    const reset = new Date(now);
    reset.setHours(4, 0, 0, 0);
    if (now.getHours() < 4) {
        reset.setDate(reset.getDate() - 1);
    }
    return reset.getTime();
}

/**
 * 判断记录是否属于今天
 */
function isToday(record: UserLuckRecord): boolean {
    return record.timestamp >= getTodayResetTimestamp();
}

/**
 * 加载数据
 */
function loadData(): JryqData {
    const raw = pluginState.loadDataFile<Partial<JryqData>>(DATA_FILE, {});
    return {
        luck: raw.luck || {},
        backdoor: (raw.backdoor || []).filter(uid => {
            // 过滤掉过期的后门（不是今天的就清掉）
            // 后门是按天生效的，但这里简化为持久化，主人手动关
            return true;
        }),
    };
}

/**
 * 保存数据
 */
function saveData(data: JryqData): void {
    pluginState.saveDataFile(DATA_FILE, data);
}

/**
 * 检查用户是否是主人
 */
function isMaster(userId: number | string): boolean {
    const masterQQ = pluginState.config.masterQQ;
    return masterQQ !== '' && String(userId) === masterQQ;
}

/**
 * 根据运气值生成消息内容
 */
function buildLuckMessage(userId: number | string, num: number): OB11PostSendMsg['message'] {
    const atSegment = { type: 'at' as const, data: { qq: String(userId) } };
    const imageUrls: string[] = [];

    let text = '';

    if (num >= 0 && num < 40) {
        text = `\n今日你的运气为${num}点,不要灰心,相信自己,明天会变得更差！`;
    } else if (num >= 40 && num < 80) {
        text = `\n今日你的运气为${num}点,人品还行噢,可以安全出门啦！`;
        imageUrls.push('https://api.mtyqx.cn/tapi/random.php');
    } else if (num >= 80 && num < 100) {
        text = `\n今日你的运气为${num}点,建议去买彩票噢！`;
        imageUrls.push('https://t.alcy.cc/ycy');
    } else {
        // num === 100
        text = `\n今日你的运气为${num}点,你今天就是天选之人！！`;
        imageUrls.push('https://api.seaya.link/web?type=file');
    }

    const segments: OB11PostSendMsg['message'] = [
        atSegment,
        { type: 'text', data: { text } },
    ];

    for (const url of imageUrls) {
        segments.push({ type: 'image', data: { file: url } });
    }

    return segments;
}

// ==================== 主处理函数 ====================

/**
 * 处理今日运气命令
 *
 * 支持的命令（在 commandPrefix 之后）：
 *   今日运气 / jryq          - 获取今日运气
 *   重新运气 / jryq重来       - 重置今日运气（允许重新抽取）
 *   开后门 <QQ号>             - （主人）指定用户必定100运气
 *   关后门 <QQ号>             - （主人）取消后门
 */
export async function handleJryq(
    ctx: NapCatPluginContext,
    event: OB11Message,
    args: string[]
): Promise<void> {
    const userId = event.user_id;
    const rawMessage = event.raw_message || '';
    const prefix = pluginState.config.commandPrefix || '#';

    // 开后门: #开后门 <QQ号>
    if (rawMessage.startsWith(`${prefix}开后门`)) {
        await handleBackdoorOn(ctx, event, rawMessage);
        return;
    }

    // 关后门: #关后门 <QQ号>
    if (rawMessage.startsWith(`${prefix}关后门`)) {
        await handleBackdoorOff(ctx, event, rawMessage);
        return;
    }

    // 重新运气
    const subCmd = (args[0] || '').toLowerCase();
    if (subCmd === 'jryq重来' || subCmd === '重新运气') {
        await handleJryqReset(ctx, event);
        return;
    }

    // 主命令：获取今日运气
    const data = loadData();
    const userRecord = data.luck[String(userId)];

    // 检查是否已经获取过
    if (userRecord && isToday(userRecord)) {
        await sendReply(ctx, event, [
            { type: 'at', data: { qq: String(userId) } },
            {
                type: 'text',
                data: {
                    text: `\n你今天已经获取过运气了，是${userRecord.num}点，请明天再来~`
                }
            }
        ]);
        return;
    }

    // 生成随机运气值（检查后门）
    let num: number;
    if (data.backdoor.includes(String(userId))) {
        num = 100;
        pluginState.logger.info(`用户 ${userId} 触发后门，运气值: 100`);
    } else {
        num = Math.ceil(Math.random() * 100);
        pluginState.logger.info(`用户 ${userId} 获取今日运气: ${num}`);
    }

    // 保存记录
    data.luck[String(userId)] = { num, timestamp: Date.now() };
    saveData(data);

    // 构建并发送消息
    const message = buildLuckMessage(userId, num);
    await sendReply(ctx, event, message);

    pluginState.incrementProcessed();
}

/**
 * 重置今日运气（允许重新抽取）
 */
async function handleJryqReset(
    ctx: NapCatPluginContext,
    event: OB11Message
): Promise<void> {
    const userId = String(event.user_id);
    const data = loadData();

    if (!data.luck[userId] || !isToday(data.luck[userId])) {
        await sendReply(ctx, event, [
            { type: 'at', data: { qq: userId } },
            { type: 'text', data: { text: '\n你今天还没获取过运气呢，先试试 #今日运气 吧！' } }
        ]);
        return;
    }

    // 删除记录，允许重新抽取
    delete data.luck[userId];
    saveData(data);

    await sendReply(ctx, event, [
        { type: 'at', data: { qq: userId } },
        { type: 'text', data: { text: '\n好啦,不满意今天的运气值耍赖就好了啦~ 重新来一次吧！' } }
    ]);
}

/**
 * 开后门（仅主人可用）
 * 用法: #开后门 <QQ号>
 */
async function handleBackdoorOn(
    ctx: NapCatPluginContext,
    event: OB11Message,
    rawMessage: string
): Promise<void> {
    if (!isMaster(event.user_id)) {
        await sendReply(ctx, event, '你不是主人走开');
        return;
    }

    const prefix = pluginState.config.commandPrefix || '#';
    const targetQQ = rawMessage.replace(`${prefix}开后门`, '').trim();

    if (!targetQQ) {
        await sendReply(ctx, event, '用法: #开后门 <QQ号>');
        return;
    }

    const data = loadData();
    if (!data.backdoor.includes(targetQQ)) {
        data.backdoor.push(targetQQ);
        saveData(data);
    }

    pluginState.logger.info(`主人为用户 ${targetQQ} 开启后门`);
    await sendReply(ctx, event, `为您打开后门 (${targetQQ})`);
}

/**
 * 关后门（仅主人可用）
 * 用法: #关后门 <QQ号>
 */
async function handleBackdoorOff(
    ctx: NapCatPluginContext,
    event: OB11Message,
    rawMessage: string
): Promise<void> {
    if (!isMaster(event.user_id)) {
        await sendReply(ctx, event, '你不是主人走开');
        return;
    }

    const prefix = pluginState.config.commandPrefix || '#';
    const targetQQ = rawMessage.replace(`${prefix}关后门`, '').trim();

    if (!targetQQ) {
        await sendReply(ctx, event, '用法: #关后门 <QQ号>');
        return;
    }

    const data = loadData();
    const idx = data.backdoor.indexOf(targetQQ);
    if (idx !== -1) {
        data.backdoor.splice(idx, 1);
        saveData(data);
    }

    pluginState.logger.info(`主人为用户 ${targetQQ} 关闭后门`);
    await sendReply(ctx, event, `为您关闭后门 (${targetQQ})`);
}

/**
 * 获取今日运气帮助文本
 */
export function getJryqHelp(prefix: string): string[] {
    return [
        `${prefix} 今日运气 - 获取今日运气值`,
        `${prefix} 重新运气 - 重置今日运气（耍赖重来）`,
        `${prefix} 开后门 <QQ> - （主人）指定用户必定100运气`,
        `${prefix} 关后门 <QQ> - （主人）取消后门`,
    ];
}

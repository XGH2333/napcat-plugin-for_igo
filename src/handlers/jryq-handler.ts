/**
 * 今日运气处理器
 *
 * 实现"今日运气"功能：
 * - 用户发送 #今日运气 或 #jryq 获取随机运气值 (0-100)
 * - 每个用户每天只能获取一次（次日凌晨重置）
 * - 不同运气值范围返回不同的文案和图片
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

/** 运气数据文件结构: { [userId]: UserLuckRecord } */
type LuckData = Record<string, UserLuckRecord>;

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
        // 凌晨4点前，重置时间是昨天4点
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
 * 加载运气数据
 */
function loadLuckData(): LuckData {
    return pluginState.loadDataFile<LuckData>(DATA_FILE, {});
}

/**
 * 保存运气数据
 */
function saveLuckData(data: LuckData): void {
    pluginState.saveDataFile(DATA_FILE, data);
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

/**
 * 生成距明天凌晨 4 点的秒数
 */
function getSecondsUntilReset(): number {
    const now = new Date();
    let reset = new Date(now);
    reset.setHours(4, 0, 0, 0);
    if (now.getHours() >= 4) {
        reset.setDate(reset.getDate() + 1);
    }
    return Math.floor((reset.getTime() - now.getTime()) / 1000);
}

// ==================== 主处理函数 ====================

/**
 * 处理今日运气命令
 *
 * 支持的命令（在 commandPrefix 之后）：
 *   jryq / 今日运气 - 获取今日运气
 *   jryq重来 / 重新运气 - 重置今日运气（允许重新抽取）
 */
export async function handleJryq(
    ctx: NapCatPluginContext,
    event: OB11Message,
    args: string[]
): Promise<void> {
    const userId = event.user_id;
    const subCmd = args[0]?.toLowerCase() || '';

    // 子命令：重来
    if (subCmd === 'jryq重来' || subCmd === '重新运气') {
        await handleJryqReset(ctx, event);
        return;
    }

    // 主命令：获取今日运气
    const data = loadLuckData();
    const userRecord = data[String(userId)];

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

    // 生成随机运气值
    const num = Math.ceil(Math.random() * 100);

    pluginState.logger.info(`用户 ${userId} 获取今日运气: ${num}`);

    // 保存记录
    data[String(userId)] = { num, timestamp: Date.now() };
    saveLuckData(data);

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
    const data = loadLuckData();

    if (!data[userId] || !isToday(data[userId])) {
        await sendReply(ctx, event, [
            { type: 'at', data: { qq: userId } },
            { type: 'text', data: { text: '\n你今天还没获取过运气呢，先试试 #今日运气 吧！' } }
        ]);
        return;
    }

    // 删除记录，允许重新抽取
    delete data[userId];
    saveLuckData(data);

    await sendReply(ctx, event, [
        { type: 'at', data: { qq: userId } },
        { type: 'text', data: { text: '\n好啦,不满意今天的运气值耍赖就好了啦~ 重新来一次吧！' } }
    ]);
}

/**
 * 获取今日运气帮助文本
 */
export function getJryqHelp(prefix: string): string[] {
    return [
        `${prefix} 今日运气 - 获取今日运气值`,
        `${prefix} 重新运气 - 重置今日运气（耍赖重来）`,
    ];
}

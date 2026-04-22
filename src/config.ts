/**
 * 插件配置模块
 * 定义默认配置值和 WebUI 配置 Schema
 */

import type { NapCatPluginContext, PluginConfigSchema } from 'napcat-types/napcat-onebot/network/plugin/types';
import type { PluginConfig } from './types';

/** 默认配置 */
export const DEFAULT_CONFIG: PluginConfig = {
    enabled: true,
    debug: false,
    commandPrefix: '#',
    cooldownSeconds: 60,
    masterQQ: '',
    imageLow: '',
    imageMid: 'https://api.mtyqx.cn/tapi/random.php',
    imageHigh: 'https://t.alcy.cc/ycy',
    imageMax: 'https://api.seaya.link/web?type=file',
    groupConfigs: {},
};

/**
 * 构建 WebUI 配置 Schema
 *
 * 使用 ctx.NapCatConfig 提供的构建器方法生成配置界面：
 *   - boolean(key, label, defaultValue?, description?, reactive?)  → 开关
 *   - text(key, label, defaultValue?, description?, reactive?)     → 文本输入
 *   - number(key, label, defaultValue?, description?, reactive?)   → 数字输入
 *   - select(key, label, options, defaultValue?, description?)     → 下拉单选
 *   - multiSelect(key, label, options, defaultValue?, description?) → 下拉多选
 *   - html(content)     → 自定义 HTML 展示（不保存值）
 *   - plainText(content) → 纯文本说明
 *   - combine(...items)  → 组合多个配置项为 Schema
 */
export function buildConfigSchema(ctx: NapCatPluginContext): PluginConfigSchema {
    return ctx.NapCatConfig.combine(
        // 插件信息头部
        ctx.NapCatConfig.html(`
            <div style="padding: 16px; background: #FB7299; border-radius: 12px; margin-bottom: 20px; color: white;">
                <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600;">今日运气插件</h3>
                <p style="margin: 0; font-size: 13px; opacity: 0.85;">发送 #今日运气 获取今日随机运气值，每天一次</p>
            </div>
        `),
        // 全局开关
        ctx.NapCatConfig.boolean('enabled', '启用插件', true, '是否启用此插件的功能'),
        // 调试模式
        ctx.NapCatConfig.boolean('debug', '调试模式', false, '启用后将输出详细的调试日志'),
        // 命令前缀
        ctx.NapCatConfig.text('commandPrefix', '命令前缀', '#', '触发命令的前缀，默认为 #'),
        // 冷却时间
        ctx.NapCatConfig.number('cooldownSeconds', '冷却时间（秒）', 60, '同一命令请求冷却时间，0 表示不限制'),
        // 主人QQ号
        ctx.NapCatConfig.text('masterQQ', '主人QQ号', '', '拥有管理权限的QQ号，用于开后门等命令'),
        // 图片API配置
        ctx.NapCatConfig.html(`<h4 style="margin: 16px 0 8px 0; color: #666;">图片API配置（留空则不发送图片）</h4>`),
        ctx.NapCatConfig.text('imageLow', '运气差 (0-39) 图片API', '', '运气值 0-39 时附带的随机图片URL，默认不附图'),
        ctx.NapCatConfig.text('imageMid', '运气一般 (40-79) 图片API', 'https://api.mtyqx.cn/tapi/random.php', '运气值 40-79 时附带的随机图片URL'),
        ctx.NapCatConfig.text('imageHigh', '运气好 (80-99) 图片API', 'https://t.alcy.cc/ycy', '运气值 80-99 时附带的随机图片URL'),
        ctx.NapCatConfig.text('imageMax', '天选之人 (100) 图片API', 'https://api.seaya.link/web?type=file', '运气值 100 时附带的随机图片URL')
    );
}

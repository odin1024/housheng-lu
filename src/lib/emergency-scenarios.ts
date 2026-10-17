/**
 * 急救场景 - 共享数据源
 * 任何页面 (首页 / 急救 PWA / 急救详情) 都从这里取数据
 */

export interface EmergencyScenario {
  slug: string;
  title: string;
  desc: string;
  steps: Array<{ n: string; text: string }>;
  source: string;
}

export const EMERGENCY_SCENARIOS: EmergencyScenario[] = [
  {
    slug: '心脏骤停',
    title: '心脏骤停',
    desc: '用力按, 5-6 cm',
    steps: [
      { n: '一', text: '确认无反应, 无呼吸' },
      { n: '二', text: '叫人打 120, 取 AED' },
      { n: '三', text: '用力按, 5-6 cm, 100-120 次/分' },
      { n: '四', text: '不要停, 有人接替再换' },
    ],
    source: 'NEJM 2024 · 中国多中心 · 38,227 例院外心脏骤停',
  },
  {
    slug: '大出血',
    title: '大出血',
    desc: '加压止血',
    steps: [
      { n: '一', text: '戴手套或用塑料袋代替' },
      { n: '二', text: '直接加压, 用干净布料' },
      { n: '三', text: '抬高出血部位高于心脏' },
      { n: '四', text: '持续按压, 等救护车' },
    ],
    source: '《急诊医学》第 5 版',
  },
  {
    slug: '烧烫伤',
    title: '烧烫伤',
    desc: '凉水冲 20 分钟',
    steps: [
      { n: '一', text: '凉水冲 20 分钟, 不是冰水' },
      { n: '二', text: '脱掉非粘连衣物' },
      { n: '三', text: '盖干净纱布, 不要抹油' },
      { n: '四', text: '大面积立即送医' },
    ],
    source: '中华医学会烧伤外科指南 2023',
  },
  {
    slug: '噎住',
    title: '噎住',
    desc: '海姆立克法',
    steps: [
      { n: '一', text: '鼓励咳嗽, 不要拍背' },
      { n: '二', text: '咳不出: 海姆立克法' },
      { n: '三', text: '站在身后, 双手抱肚脐上方' },
      { n: '四', text: '用力向内向上冲击, 直到吐出' },
    ],
    source: '《红十字急救手册》',
  },
  {
    slug: '中暑',
    title: '中暑',
    desc: '阴凉处降温',
    steps: [
      { n: '一', text: '移至阴凉处' },
      { n: '二', text: '脱多余衣物' },
      { n: '三', text: '凉水擦身, 风扇吹' },
      { n: '四', text: '意识不清立即送医' },
    ],
    source: '中国疾控中心 2022',
  },
  {
    slug: '一氧化碳',
    title: '一氧化碳中毒',
    desc: '开门窗, 关气源',
    steps: [
      { n: '一', text: '开门窗, 切勿开火' },
      { n: '二', text: '把患者移到通风处' },
      { n: '三', text: '松开衣领, 侧卧防误吸' },
      { n: '四', text: '拨打 120, 立即送有高压氧舱的医院' },
    ],
    source: '中华急诊医学杂志 2021',
  },
  {
    slug: '心梗',
    title: '心梗(急性心肌梗死)',
    desc: '舌下含服硝酸甘油',
    steps: [
      { n: '一', text: '立即停下所有活动, 坐下或半躺, 不要走动' },
      { n: '二', text: '舌下含服硝酸甘油 0.5 mg, 5 分钟不缓解再含一片' },
      { n: '三', text: '拨打 120, 说明「胸痛」, 等救护车' },
      { n: '四', text: '不缓解就咬碎 300 mg 阿司匹林吞下' },
    ],
    source: '中华医学会心血管病学分会 2019 指南',
  },
  {
    slug: '卒中',
    title: '卒中(中风)',
    desc: '黄金 4.5 小时',
    steps: [
      { n: '一', text: '让患者坐下或躺下, 不要给食物和水' },
      { n: '二', text: '记住症状开始时间, 准确告诉医生' },
      { n: '三', text: '立刻拨打 120, 优先去有溶栓/取栓能力的医院' },
      { n: '四', text: '黄金 4.5 小时, 时间就是脑细胞' },
    ],
    source: '中国卒中学会 2023 指南',
  },
  {
    slug: '过敏性休克',
    title: '过敏性休克',
    desc: '肾上腺素笔',
    steps: [
      { n: '一', text: '立即拨打 120, 平卧, 抬高双腿' },
      { n: '二', text: '检查气道, 呼吸困难要坐起来' },
      { n: '三', text: '若随身有肾上腺素笔(EpiPen), 立刻扎大腿外侧' },
      { n: '四', text: '不缓解 5-15 分钟可再用一次, 等救护车' },
    ],
    source: '世界过敏组织(WAO) 2020 指南',
  },
  {
    slug: '癫痫',
    title: '癫痫大发作',
    desc: '不要塞嘴',
    steps: [
      { n: '一', text: '不要塞东西进嘴, 不要按住' },
      { n: '二', text: '移开周围硬物, 在头下垫软物' },
      { n: '三', text: '发作结束后让患者侧卧, 防止误吸' },
      { n: '四', text: '超过 5 分钟不缓解, 立即拨打 120' },
    ],
    source: '国际抗癫痫联盟(ILAE) 2017',
  },
  {
    slug: '低血糖',
    title: '低血糖',
    desc: '15 克糖',
    steps: [
      { n: '一', text: '意识清楚: 立即吃 15-20 克糖, 15 分钟再测一次' },
      { n: '二', text: '推荐: 葡萄糖片、果汁、蜂蜜、白糖水' },
      { n: '三', text: '意识不清或不能吞咽: 不要喂, 立即拨打 120' },
      { n: '四', text: '缓解后再吃一份主食, 防止再次低血糖' },
    ],
    source: '美国糖尿病协会(ADA) 2024 标准',
  },
  {
    slug: '触电',
    title: '触电',
    desc: '先断电再救人',
    steps: [
      { n: '一', text: '不要直接接触! 先切断电源或用绝缘物(干木棍)挑开' },
      { n: '二', text: '判断意识与呼吸, 无呼吸立即 CPR + 拨打 120' },
      { n: '三', text: '检查烧伤部位, 用干净纱布盖住, 不要涂抹油膏' },
      { n: '四', text: '电流入口与出口都要查, 即使外观正常也要送医' },
    ],
    source: '中华急诊医学杂志 2020',
  },
];

// 找某个 slug 的场景, 返回 undefined 表示不存在
export function getScenarioBySlug(slug: string): EmergencyScenario | undefined {
  return EMERGENCY_SCENARIOS.find((s) => s.slug === slug);
}

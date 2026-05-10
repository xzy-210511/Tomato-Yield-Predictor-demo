// Static map describing nutrient-solution policies returned by the time-series model.
// Backend returns "low" / "high" derived from EC3 / EC6. Unknown names fall back gracefully.

export const NS_POLICIES = {
  low: {
    label: 'Low EC',
    ecBand: '~5.0 mS/cm',
    icon: 'Droplets',
    color: 'cyan',
    tagline: '苗期 / 营养生长',
    when: '营养生长阶段使用，养分需求中等。',
    why: '低 EC 减少幼根渗透压力，支持叶片伸展，避免烧苗。',
  },
  high: {
    label: 'High EC',
    ecBand: '~10.0 mS/cm',
    icon: 'FlaskConical',
    color: 'amber',
    tagline: '坐果 / 转色',
    when: '坐果后果实需求加大时使用。',
    why: '高 EC 促进果实硬度与糖分积累，抑制过度营养生长。',
  },
}

export function getPolicyInfo(name) {
  if (NS_POLICIES[name]) return { name, ...NS_POLICIES[name] }
  return {
    name,
    label: name || 'Unknown',
    ecBand: '—',
    icon: 'HelpCircle',
    color: 'slate',
    tagline: '自定义策略',
    when: '模型返回的策略。',
    why: '暂无定义，使用通用兜底说明。',
  }
}

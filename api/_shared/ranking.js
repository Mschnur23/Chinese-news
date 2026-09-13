const topicRules = Object.freeze([
  { topic: "人工智能", terms: ["人工智能", "AI", "大模型", "机器人", "算力", "芯片", "智能"] },
  { topic: "中国科技", terms: ["科技", "研发", "核聚变", "新能源", "半导体", "数字", "创新"] },
  { topic: "商业与经济", terms: ["经济", "消费", "市场", "企业", "金融", "资本", "投资", "产业"] },
  { topic: "政策", terms: ["政策", "监管", "部门", "国务院", "国家", "标准", "治理"] },
  { topic: "创业", terms: ["创业", "融资", "初创", "独角兽", "创投"] },
  { topic: "中美关系", terms: ["中美", "美国", "贸易", "关税", "出口", "供应链"] },
]);

function inferTopic(text) {
  let best = { topic: "综合", matches: 0 };
  for (const rule of topicRules) {
    const matches = rule.terms.reduce((count, term) => count + (text.includes(term) ? 1 : 0), 0);
    if (matches > best.matches) best = { topic: rule.topic, matches };
  }
  return best.topic;
}

function matchedInterest(text, interests) {
  return interests.find((interest) => {
    const rule = topicRules.find((item) => item.topic === interest);
    return text.includes(interest) || rule?.terms.some((term) => text.includes(term));
  }) || "your standing interests";
}

function recencyScore(publishedAt) {
  if (!publishedAt) return 0;
  const ageHours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 3600000);
  return Math.max(0, 18 - ageHours / 4);
}

const matterByTopic = Object.freeze({
  人工智能: "It tracks how artificial intelligence is moving from technical progress into institutions, products, and everyday economic decisions.",
  中国科技: "It offers a concrete signal about China’s technology capacity, investment priorities, or path to commercialization.",
  商业与经济: "It helps explain a current shift in Chinese companies, markets, or the wider economy.",
  政策: "It shows how a policy decision may shape institutions, industries, or public priorities in China.",
  创业: "It highlights the capital, technology, and market conditions facing Chinese founders and emerging companies.",
  中美关系: "It adds Chinese-source context to the economic and policy forces shaping relations between China and the United States.",
  综合: "It provides timely Chinese-source context on a development with broader public significance.",
});

export function decorateAndRank(candidates, interests, displayedLimit) {
  const seen = new Set();
  const decorated = candidates
    .filter((candidate) => {
      if (!candidate.canonicalUrl || seen.has(candidate.canonicalUrl)) return false;
      seen.add(candidate.canonicalUrl);
      return candidate.titleZh.length >= 8;
    })
    .map((candidate) => {
      const text = `${candidate.titleZh} ${candidate.description}`;
      const topic = inferTopic(text);
      const interest = matchedInterest(text, interests);
      const interestScore = interest === "your standing interests" ? 0 : 24;
      const significanceScore = Math.min(12, candidate.titleZh.length / 5);
      return {
        ...candidate,
        topic,
        whyItMatters: matterByTopic[topic],
        whyItFits: interest === "your standing interests"
          ? "It broadens today’s selection while remaining relevant to contemporary China."
          : `It directly connects with your interest in ${interest}.`,
        difficulty: text.length > 95 || /政策|监管|融资|核聚变|供应链/.test(text) ? "Advanced" : "Intermediate",
        readingMinutes: /快讯|简讯/.test(candidate.titleZh) ? 3 : 7,
        _score: interestScore + significanceScore + recencyScore(candidate.publishedAt),
      };
    })
    .sort((left, right) => right._score - left._score);

  const selected = [];
  for (const sourceId of new Set(decorated.map((item) => item.sourceId))) {
    const first = decorated.find((item) => item.sourceId === sourceId);
    if (first) selected.push(first);
  }
  for (const candidate of decorated) {
    if (selected.length >= displayedLimit) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }

  return selected
    .sort((left, right) => right._score - left._score)
    .slice(0, displayedLimit)
    .map(({ _score, ...candidate }) => candidate);
}


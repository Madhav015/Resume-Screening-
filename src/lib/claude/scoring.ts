import Anthropic from '@anthropic-ai/sdk';
import type { Job, ClaudeScoringResult, Recommendation } from '@/lib/types';

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5';

// Set MOCK_SCORING=true in your environment to test the whole app — upload,
// extraction, the dashboard, sorting/filtering, multi-tenancy — with zero
// Anthropic API cost and no API key required. It returns a keyword-heuristic
// score instead of a real judgment, so it's fine for testing plumbing but
// tells you nothing about actual scoring QUALITY — flip it off (or unset it)
// once you're ready to look at real Claude output.
const MOCK_SCORING = process.env.MOCK_SCORING === 'true';

let _anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

// ----------------------------------------------------------------------------
// SYSTEM PROMPT
//
// This is the core "screening logic" of the product. It is deliberately
// explicit about: (1) grounding every judgment in the resume text only,
// (2) exactly how to combine the job's weights into one score, (3) fairness/
// anti-discrimination rules, since this output can influence real hiring
// decisions, and (4) the requirement to always explain itself.
// ----------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are an expert technical recruiter and resume screener. You evaluate ONE candidate resume against ONE job's requirements and return a structured, evidence-based assessment by calling the submit_resume_score tool. You never respond in plain text — always call the tool.

## Grounding rules
- Base every judgment ONLY on what is actually written in the resume text you are given. Never invent, assume, or infer facts (employers, titles, dates, skills, degrees) that are not stated or very directly implied.
- If the resume is ambiguous, sparse, or missing information needed to judge a requirement, treat that requirement as NOT demonstrated rather than guessing generously. Say so in your reasoning.
- A skill only counts as "matched" if there is real evidence in the resume (it's listed as a skill, used in a project/role description, or implied by a certification/tool). Merely sharing a word with a job title is not evidence.

## Fairness and anti-discrimination — mandatory
- Do NOT consider, mention, or let your score be influenced by: age, gender, race, ethnicity, national origin, religion, marital or family status, pregnancy, disability, or any characteristic you might infer from a candidate's name, photo, address, or the names of schools/employers. Ignore any such cues entirely.
- Do NOT treat an employment gap, career change, non-linear career path, or graduation-date implied age as a red flag by itself. Only flag a gap or transition if the resume's own content around it suggests a genuine, job-relevant concern (e.g. explicit statement of termination for cause). Simply having a gap is normal and not evidence of anything.
- Judge experience and skills on substance and evidence, not on the prestige of schools/employers, unless the job's own requirements specifically call for a credential.

## Scoring methodology
You are given the job's must-have skills and nice-to-have skills (each with a 1-5 importance weight), deal-breakers, and category weights (must_have, nice_to_have, experience, deal_breakers — these four numbers sum to 100).

1. For must-have skills: determine which are matched vs missing, using evidence from the resume. Compute category_scores.must_have (0-100) as the importance-weighted proportion of must-have skills that are clearly matched. Missing high-weight (4-5) must-haves should pull this score down sharply; missing low-weight (1-2) ones should have a smaller effect.
2. For nice-to-have skills: same idea for category_scores.nice_to_have (0-100) — importance-weighted proportion matched. Having none matched is not a failure, just a 0 on this sub-score.
3. For category_scores.experience (0-100): judge the relevance, seniority, and quality of the candidate's professional experience against what the job title/description implies is needed — not just raw years. Populate years_experience with your best-effort estimate of total relevant professional experience in years (a number, or null if it truly cannot be estimated).
4. Check every deal-breaker string against the resume. If a deal-breaker clearly applies to this candidate, add it (verbatim) to deal_breaker_hits.
5. Identify genuine red_flags: concrete, evidence-based concerns such as unexplained inconsistent/overlapping dates, claims that contradict each other, a title/seniority claim unsupported by the described responsibilities, or a required license/certification that is claimed but not detailed. Do not manufacture red flags to fill the list — an empty array is a normal, good outcome. Never use the fairness-protected categories above as red flags.
6. Compute overall_score (0-100) as:
   overall_score = (category_scores.must_have * weights.must_have + category_scores.nice_to_have * weights.nice_to_have + category_scores.experience * weights.experience + deal_breaker_component * weights.deal_breakers) / 100
   where deal_breaker_component = 100 if deal_breaker_hits is empty, else 0.
   Additionally: if deal_breaker_hits is non-empty, cap the final overall_score at 25 regardless of the formula above — a deal-breaker should dominate the result.
7. Set recommendation from the final overall_score, unless deal-breakers or serious red flags argue for going lower:
   - overall_score >= 85: "strong_match"
   - overall_score 65-84: "possible_match"
   - overall_score 40-64: "weak_match"
   - overall_score < 40, or any deal-breaker hit: "not_a_match" (deal-breaker hits should virtually always land here)
8. Write a 1-2 sentence "summary" a recruiter can read in under 5 seconds while skimming a table, and a "reasoning" of 3-6 sentences explaining the score in plain language, citing the specific evidence (or lack of it) that drove your must-have/nice-to-have/experience/deal-breaker judgments.
9. Extract candidate_name and candidate_email from the resume header/contact section if present, else null.

Be decisive and consistent: two similar resumes against the same job should get similar scores. Numbers must be internally consistent with the arrays you return (e.g. category_scores.must_have of 100 should not coexist with several missing high-weight must-haves).`;

const SCORING_TOOL: Anthropic.Tool = {
  name: 'submit_resume_score',
  description: "Submit the structured evaluation of this candidate's resume against the job's requirements.",
  input_schema: {
    type: 'object',
    properties: {
      candidate_name: { type: ['string', 'null'], description: "Candidate's full name as written on the resume, or null." },
      candidate_email: { type: ['string', 'null'], description: 'Candidate email address if present, or null.' },
      years_experience: { type: ['number', 'null'], description: 'Best-effort estimate of total relevant professional experience in years.' },
      matched_must_have: { type: 'array', items: { type: 'string' }, description: 'Must-have skill names clearly evidenced in the resume.' },
      missing_must_have: { type: 'array', items: { type: 'string' }, description: 'Must-have skill names not evidenced in the resume.' },
      matched_nice_to_have: { type: 'array', items: { type: 'string' }, description: 'Nice-to-have skill names clearly evidenced in the resume.' },
      deal_breaker_hits: { type: 'array', items: { type: 'string' }, description: 'Deal-breaker strings (verbatim from the job) that apply to this candidate.' },
      red_flags: { type: 'array', items: { type: 'string' }, description: 'Concrete, evidence-based concerns. Empty array if none.' },
      category_scores: {
        type: 'object',
        properties: {
          must_have: { type: 'number', minimum: 0, maximum: 100 },
          nice_to_have: { type: 'number', minimum: 0, maximum: 100 },
          experience: { type: 'number', minimum: 0, maximum: 100 },
        },
        required: ['must_have', 'nice_to_have', 'experience'],
      },
      overall_score: { type: 'number', minimum: 0, maximum: 100 },
      recommendation: { type: 'string', enum: ['strong_match', 'possible_match', 'weak_match', 'not_a_match'] },
      summary: { type: 'string', description: 'One to two sentence plain-language summary.' },
      reasoning: { type: 'string', description: 'Three to six sentence evidence-based explanation of the score.' },
    },
    required: [
      'candidate_name',
      'candidate_email',
      'years_experience',
      'matched_must_have',
      'missing_must_have',
      'matched_nice_to_have',
      'deal_breaker_hits',
      'red_flags',
      'category_scores',
      'overall_score',
      'recommendation',
      'summary',
      'reasoning',
    ],
  },
};

function buildUserMessage(job: Job, resumeText: string): string {
  return `# Job
Title: ${job.title}
${job.description ? `Description / context:\n${job.description}\n` : ''}
Must-have skills (name — importance weight 1-5):
${job.must_have_skills.map((s) => `- ${s.name} — ${s.weight}`).join('\n') || '(none specified)'}

Nice-to-have skills (name — importance weight 1-5):
${job.nice_to_have_skills.map((s) => `- ${s.name} — ${s.weight}`).join('\n') || '(none specified)'}

Deal-breakers:
${job.deal_breakers.map((d) => `- ${d}`).join('\n') || '(none specified)'}

Category weights (sum to 100): must_have=${job.weights.must_have}, nice_to_have=${job.weights.nice_to_have}, experience=${job.weights.experience}, deal_breakers=${job.weights.deal_breakers}

# Resume text
"""
${resumeText}
"""

Evaluate this resume against this job now and call submit_resume_score.`;
}

export async function scoreResume(job: Job, resumeText: string): Promise<ClaudeScoringResult> {
  if (MOCK_SCORING) return mockScoreResume(job, resumeText);

  const message = await getAnthropicClient().messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    tools: [SCORING_TOOL],
    tool_choice: { type: 'tool', name: 'submit_resume_score' },
    messages: [{ role: 'user', content: buildUserMessage(job, resumeText) }],
  });

  const toolUse = message.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return a scoring result.');

  return toolUse.input as ClaudeScoringResult;
}

// ----------------------------------------------------------------------------
// MOCK SCORER — no API call, $0 cost. Simple keyword/substring matching that
// follows the SAME weighting formula described in the system prompt above,
// so it exercises the real scoring math and every field the UI renders. It
// cannot judge nuance, evidence quality, or catch inconsistencies the way
// Claude does — that's the one thing you still need a real (even $5) API
// balance to verify before trusting this for actual candidates.
// ----------------------------------------------------------------------------
function includesLoose(haystack: string, needle: string): boolean {
  return haystack.includes(needle.toLowerCase());
}

function phraseOverlapHit(haystack: string, phrase: string): boolean {
  const lower = phrase.toLowerCase().trim();

  // Deal-breakers phrased as an absence ("No production on-call experience",
  // "Without X", "Lacks X") can't be judged by keyword presence — the words
  // in that phrase usually appearing in a resume means the candidate DOES
  // have that thing, the opposite of what the phrase is testing for. Skip
  // these entirely in mock mode rather than risk a backwards false positive;
  // detecting a true absence needs real reasoning, which is exactly what
  // mock mode doesn't have.
  if (/^(no|not|without|lacks?|lacking|never)\b/.test(lower)) return false;

  const words = lower.split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  if (words.length === 0) return false;
  const hits = words.filter((w) => haystack.includes(w)).length;
  return hits / words.length >= 0.75;
}

async function mockScoreResume(job: Job, resumeText: string): Promise<ClaudeScoringResult> {
  // Tiny artificial delay so the UI's "Scoring…" state is visible, like a
  // real API call would take.
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

  const text = resumeText.toLowerCase();

  const matchedMustHave = job.must_have_skills.filter((s) => includesLoose(text, s.name));
  const missingMustHave = job.must_have_skills.filter((s) => !includesLoose(text, s.name));
  const matchedNiceToHave = job.nice_to_have_skills.filter((s) => includesLoose(text, s.name));
  const dealBreakerHits = job.deal_breakers.filter((d) => phraseOverlapHit(text, d));

  const weightedRatio = (matched: { weight: number }[], all: { weight: number }[]) => {
    const totalWeight = all.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight === 0) return 100;
    const matchedWeight = matched.reduce((sum, s) => sum + s.weight, 0);
    return Math.round((matchedWeight / totalWeight) * 100);
  };

  const mustHaveScore = weightedRatio(matchedMustHave, job.must_have_skills);
  const niceToHaveScore = weightedRatio(matchedNiceToHave, job.nice_to_have_skills);

  const yearsMatch = [...resumeText.matchAll(/(\d+)\+?\s*years?/gi)].map((m) => parseInt(m[1], 10));
  const yearsExperience = yearsMatch.length ? Math.max(...yearsMatch) : null;
  const experienceScore = yearsExperience == null ? 50 : Math.min(100, yearsExperience * 15);

  const dealBreakerComponent = dealBreakerHits.length === 0 ? 100 : 0;
  let overallScore = Math.round(
    (mustHaveScore * job.weights.must_have +
      niceToHaveScore * job.weights.nice_to_have +
      experienceScore * job.weights.experience +
      dealBreakerComponent * job.weights.deal_breakers) /
      100
  );
  if (dealBreakerHits.length > 0) overallScore = Math.min(overallScore, 25);

  let recommendation: Recommendation;
  if (dealBreakerHits.length > 0 || overallScore < 40) recommendation = 'not_a_match';
  else if (overallScore < 65) recommendation = 'weak_match';
  else if (overallScore < 85) recommendation = 'possible_match';
  else recommendation = 'strong_match';

  const firstLine = resumeText.split('\n').map((l) => l.trim()).find((l) => l.length > 0 && l.length < 60);
  const emailMatch = resumeText.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);

  return {
    candidate_name: firstLine ?? null,
    candidate_email: emailMatch?.[0] ?? null,
    years_experience: yearsExperience,
    matched_must_have: matchedMustHave.map((s) => s.name),
    missing_must_have: missingMustHave.map((s) => s.name),
    matched_nice_to_have: matchedNiceToHave.map((s) => s.name),
    deal_breaker_hits: dealBreakerHits,
    red_flags: [],
    category_scores: { must_have: mustHaveScore, nice_to_have: niceToHaveScore, experience: experienceScore },
    overall_score: overallScore,
    recommendation,
    summary: '[MOCK MODE — no Claude API call was made] Keyword-based estimate only.',
    reasoning:
      '[MOCK MODE] This score was computed by simple keyword matching against the job\'s must-haves, ' +
      'nice-to-haves, and deal-breakers, using the same weighting formula the real prompt uses — it did not ' +
      'call the Claude API and cannot evaluate evidence quality, seniority, or inconsistencies the way a real ' +
      'scoring pass would. Set MOCK_SCORING=false (or remove the env var) to see real Claude-generated scores.',
  };
}

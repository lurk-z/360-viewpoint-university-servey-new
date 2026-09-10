import type { ChatRequest, ChatResponse, RecommendationProfile } from '../chat';
import type { PublicContentSnapshot } from '../content';
import { localize } from '../tour-data';
import { compactChatLookup, contextualProgramIds, isCareerIntent, isContextReferenceIntent, ordinalIndex } from './chat-intents';
import { rankProgramsForProfile } from './chat-program-ranking';

/** Only matches faculties actually present in the published snapshot. */
export function mentionedFacultyIds(message: string, content: PublicContentSnapshot): string[] {
  const question = compactChatLookup(message);
  return content.faculties.flatMap((faculty) => {
    const names = [faculty.name.th, faculty.name.en.replace(/^faculty of /iu, ''), faculty.slug];
    const aliases = [
      { match: /เทคโนโลยีและการจัดการอุตสาหกรรม|industrial technology and management/iu, terms: ['FITM', 'คณะเทคโน', 'คณะเทคโนโลยี'] },
      { match: /บริหารธุรกิจ|business administration/iu, terms: ['BAS', 'คณะบริหาร', 'คณะบริหารธุรกิจ'] },
      { match: /เกษตร|agro/iu, terms: ['AGRO', 'คณะเกษตร', 'คณะอุตสาหกรรมเกษตร'] },
      { match: /คณะวิศวกรรมศาสตร์|faculty of engineering/iu, terms: ['คณะวิศวะ', 'คณะวิศวกรรมศาสตร์'] }
    ].filter((group) => group.match.test(`${faculty.name.th} ${faculty.name.en}`)).flatMap((group) => group.terms);
    return [...names, ...aliases].some((name) => {
      if (/^[a-z]+$/iu.test(name)) return new RegExp(`\\b${name}\\b`, 'iu').test(message);
      return compactChatLookup(name).length >= 5 && question.includes(compactChatLookup(name));
    }) ? [faculty.id] : [];
  });
}

export function academicFacultyIds(request: ChatRequest, content: PublicContentSnapshot): string[] {
  const named = mentionedFacultyIds(request.message, content);
  if (named.length) return named;
  if (!/(คณะนี้|คณะนั้น|this faculty|that faculty)/iu.test(request.message)) return [];
  const previous = request.conversationContext?.lastFacultyIds.filter((id) => content.faculties.some((f) => f.id === id)) ?? [];
  const index = ordinalIndex(request.message);
  if (index !== undefined) return previous[index] ? [previous[index]] : [];
  if (previous.length === 1) return previous;
  return content.faculties.filter((f) => f.sceneId === request.sceneId).map((f) => f.id);
}

const emptyResponse = {
  relatedSceneIds: [], relatedProgramIds: [], relatedActivityIds: [], relatedFacultyIds: [],
  comparisonProgramIds: [], programRecommendations: [], needsRecommendationProfile: false,
  needsTourPreference: false, fallback: false
} as const;

export function academicContentUnavailable(request: ChatRequest, content: PublicContentSnapshot, intent: ChatResponse['intent'], kind: 'programs' | 'faculties' = 'programs'): ChatResponse | undefined {
  if (content[kind].length) return undefined;
  const unavailable = content.source === 'fallback';
  const name = kind === 'programs' ? 'หลักสูตร' : 'คณะ';
  return {
    ...emptyResponse, intent, answered: false,
    answer: unavailable
      ? request.locale === 'th' ? `ขณะนี้โหลดข้อมูล${name}ไม่ได้ กรุณากดลองใหม่ ข้อมูลที่คุณกรอกไว้ยังอยู่ ไม่ต้องกรอกซ้ำ`
        : `Could not load ${kind} right now. Please try again; your entered information has been kept.`
      : request.locale === 'th' ? `ยังไม่มีข้อมูล${name}ที่เผยแพร่ในระบบ จึงยังแนะนำจากข้อมูลจริงไม่ได้`
        : `No ${kind} have been published yet, so guidance is not available.`,
    fallback: unavailable, ...(unavailable ? { fallbackReason: 'no-content' as const } : {})
  };
}

export function createProgramListResponse(request: ChatRequest, content: PublicContentSnapshot): ChatResponse {
  const unavailable = academicContentUnavailable(request, content, 'answer');
  if (unavailable) return unavailable;
  const facultyIds = academicFacultyIds(request, content);
  const programs = content.programs.filter((p) => !facultyIds.length || facultyIds.includes(p.facultyId));
  const th = request.locale === 'th';
  const groups = content.faculties.filter((f) => !facultyIds.length || facultyIds.includes(f.id));
  return {
    ...emptyResponse, intent: 'answer', answered: programs.length > 0,
    answer: programs.length
      ? `${th ? 'หลักสูตรที่มีข้อมูลในวิทยาเขตปราจีนบุรี' : 'Programs with information at Prachinburi Campus'}\n${groups.map((f) => {
        const names = programs.filter((p) => p.facultyId === f.id).map((p) => `• ${localize(p.name, request.locale)} — ${localize(p.level, request.locale)}`);
        return `${localize(f.name, request.locale)}\n${names.join('\n')}`;
      }).join('\n\n')}\n\n${th ? 'บอกความสนใจหรืออาชีพที่อยากทำ พร้อมวุฒิและระดับที่ต้องการเรียน เพื่อช่วยคัดหลักสูตรให้คุณ' : 'Tell me your interests or career goal, qualification and desired study level to find a suitable program.'}`
      : (th ? 'ยังไม่มีข้อมูลหลักสูตรของคณะที่เลือกในขณะนี้' : 'No program information is available for the selected faculty yet.'),
    relatedFacultyIds: groups.map((f) => f.id), relatedProgramIds: programs.map((p) => p.id),
    needsRecommendationProfile: programs.length > 0
  };
}

export function createProgramFacultyResponse(request: ChatRequest, content: PublicContentSnapshot): ChatResponse | undefined {
  if (!/(อยู่คณะ|คณะไหน|สังกัด|which faculty|belongs? to)/iu.test(request.message)) return undefined;
  const programs = contextualProgramIds(request, content).flatMap((id) => {
    const program = content.programs.find((p) => p.id === id);
    const faculty = content.faculties.find((f) => f.id === program?.facultyId);
    return program && faculty ? [{ program, faculty }] : [];
  });
  if (!programs.length) return undefined;
  return {
    ...emptyResponse, intent: 'answer', answered: true,
    answer: programs.map(({ program, faculty }) => `${localize(program.name, request.locale)} — ${localize(faculty.name, request.locale)}`).join('\n'),
    relatedProgramIds: programs.map(({ program }) => program.id),
    relatedFacultyIds: [...new Set(programs.map(({ faculty }) => faculty.id))],
    suggestedReplies: programs.flatMap(({ faculty }) => faculty.sceneId ? [{
      label: request.locale === 'th' ? `ชม${faculty.name.th}` : `Visit ${faculty.name.en}`,
      message: request.locale === 'th' ? `พาไป ${faculty.name.th}` : `Take me to ${faculty.name.en}`,
      sceneId: faculty.sceneId
    }] : []).filter((reply, index, replies) => replies.findIndex((r) => r.sceneId === reply.sceneId) === index)
  };
}

/** Accept explicit details from a typed follow-up; never infer a qualification from an interest. */
export function typedRecommendationProfile(request: ChatRequest): RecommendationProfile | undefined {
  if (request.recommendationProfile) return request.recommendationProfile;
  const text = request.message;
  const qualification = /ปวส|higher vocational/iu.test(text) ? 'high-vocational'
    : /ม\.?\s*6|ปวช|มัธยมปลาย|upper secondary/iu.test(text) ? 'm6-pvoc'
      : /ม\.?\s*3|มัธยมต้น|lower secondary/iu.test(text) ? 'm3'
        : /(?:จบ|วุฒิ|มีวุฒิ)\s*ปริญญาตรี|have a bachelor/iu.test(text) ? 'bachelor' : undefined;
  const desiredLevel = /อยากเรียน.*(?:โท|master)|(?:ต่อ|เรียน)\s*ปริญญาโท|study.*master/iu.test(text) ? 'master'
    : /เทียบโอน|transfer/iu.test(text) ? 'transfer'
      : /(?:เรียน|ต่อ|ระดับ).*ปริญญาตรี|study.*bachelor/iu.test(text) ? 'bachelor'
        : /(?:เรียน|ต่อ).*ปวช|study.*vocational/iu.test(text) ? 'vocational'
          : /ยังไม่แน่ใจ|not sure|unsure/iu.test(text) ? 'unsure' : undefined;
  return qualification && desiredLevel ? { interests: text.slice(0, 300), currentQualification: qualification, desiredLevel } : undefined;
}

export function createAcademicGuidanceResponse(request: ChatRequest, content: PublicContentSnapshot): ChatResponse {
  const th = request.locale === 'th';
  const career = isCareerIntent(request.message) || request.conversationContext?.guidanceGoal === 'career';
  const profile = typedRecommendationProfile(request);
  const intent = career ? 'career-guidance' : 'program-recommendation';
  const unavailable = academicContentUnavailable(request, content, intent);
  if (unavailable) return unavailable;
  const named = contextualProgramIds(request, content);
  const referenced = named.length ? named : isContextReferenceIntent(request.message)
    ? request.conversationContext?.lastProgramIds ?? [] : [];
  const scopedFacultyIds = academicFacultyIds(request, content);
  const scopedContent = { ...content, programs: content.programs.filter((p) =>
    (!scopedFacultyIds.length || scopedFacultyIds.includes(p.facultyId))
    && (!career || !referenced.length || referenced.includes(p.id))) };
  const recommendations = profile ? rankProgramsForProfile(profile, scopedContent, request.locale, 3) : [];
  // A named/ordinal program can provide career information without a profile, but
  // must pass the same qualification checks when the visitor supplies a profile.
  const ids = new Set(!profile && career && referenced.length ? referenced : recommendations.map((r) => r.programId));
  const programs = [...ids].flatMap((id) => {
    const p = content.programs.find((program) => program.id === id);
    return p && content.faculties.some((f) => f.id === p.facultyId) ? [p] : [];
  }).slice(0, 3);
  const careerGuidance = programs.map((p) => ({
    programId: p.id, facultyId: p.facultyId, careers: p.careerTags?.[request.locale].filter((tag) => tag.trim()).slice(0, 5) ?? []
  }));
  const needsProfile = !profile && programs.length === 0;
  const hasCareerData = careerGuidance.some((entry) => entry.careers.length > 0);
  const answer = programs.length
    ? career
      ? hasCareerData
        ? (th ? 'แนวทางอาชีพของหลักสูตรที่เลือกอยู่ด้านล่าง คุณสามารถดูรายละเอียดหรือเปรียบเทียบหลักสูตรต่อได้ อาชีพเป็นแนวทางประกอบการตัดสินใจ ขึ้นอยู่กับทักษะ ประสบการณ์ และข้อกำหนดของงานด้วย' : 'Career directions for the selected programs are below. You can view details or compare programs. Career opportunities depend on skills, experience and job requirements.')
        : (th ? 'พบข้อมูลหลักสูตร แต่ยังไม่มีข้อมูลแนวทางอาชีพที่เผยแพร่สำหรับรายการเหล่านี้ คุณสามารถเปิดรายละเอียดหลักสูตรเพื่อศึกษาต่อได้' : 'Program information is available, but career directions have not been published for these programs yet. You can still view their details.')
      : (th ? `พบ ${programs.length} หลักสูตรที่เกี่ยวข้องกับความสนใจและระดับที่ต้องการเรียน พร้อมคณะและแนวทางอาชีพด้านล่าง โปรดตรวจเงื่อนไขรับสมัครแต่ละหลักสูตรก่อนสมัคร` : `Found ${programs.length} programs related to your interests and desired study level, with their faculties and career directions below. Check each program's admission requirements before applying.`)
    : needsProfile
      ? (th ? 'คุณสนใจด้านไหน หรืออยากทำอาชีพอะไรในอนาคต? บอกวุฒิปัจจุบันและระดับที่ต้องการเรียนด้วย แล้วฉันจะช่วยเชื่อมความสนใจ → หลักสูตร → คณะ → แนวทางอาชีพให้ กรอกด้านล่างหรือพิมพ์ตอบได้เลย' : 'What interests you, or what career would you like to pursue? Tell me your current qualification and desired study level too. I will connect your interests with programs, faculties and career directions. Use the form or type your answer.')
      : (th ? 'ยังไม่พบหลักสูตรที่ตรงกับความสนใจ วุฒิ และระดับที่เลือก ลองบอกงานหรือวิชาที่ชอบเพิ่ม หรือปรับระดับการศึกษาในแบบฟอร์มได้' : 'No published program matches your interests, qualification and selected level yet. Tell me more about subjects or work you enjoy, or change the study level in the form.');
  return {
    ...emptyResponse, intent, answer, answered: programs.length > 0 && (!career || hasCareerData),
    programRecommendations: recommendations.filter((r) => ids.has(r.programId)),
    relatedProgramIds: programs.map((p) => p.id), careerGuidance,
    needsRecommendationProfile: programs.length === 0,
    suggestedInterests: needsProfile && /สนใจ|อยากเป็น|interested|become/iu.test(request.message) ? request.message.slice(0, 300) : undefined,
    suggestedReplies: programs.length ? [
      ...(programs.length > 1 ? [{ label: th ? 'เปรียบเทียบหลักสูตรเหล่านี้' : 'Compare these programs', message: th ? 'เปรียบเทียบหลักสูตรที่แนะนำ' : 'Compare these programs' }] : []),
      { label: th ? 'ดูคณะทั้งหมด' : 'Explore all faculties', message: th ? 'มีคณะอะไรบ้าง' : 'What faculties are available?' }
    ] : [
      { label: th ? 'ดูคณะทั้งหมดก่อน' : 'Explore faculties first', message: th ? 'มีคณะอะไรบ้าง' : 'What faculties are available?' }
    ]
  };
}

export function createDormitoryResponse(request: ChatRequest, content: PublicContentSnapshot): ChatResponse | undefined {
  if (!/(หอพัก|หอชาย|หอหญิง|dormitor|student housing)/iu.test(request.message)) return undefined;
  const targetIds = /(หอชาย|หอพักชาย|หอพักนักศึกษาชาย|\bmale dorm)/iu.test(request.message) ? ['male-dormitory-info']
    : /(?:หอหญิง|หอพักหญิง|หอพักนักศึกษาหญิง).*1|female dormitory 1/iu.test(request.message) ? ['female-dormitory-1-info']
      : /(?:หอหญิง|หอพักหญิง|หอพักนักศึกษาหญิง).*2|female dormitory 2/iu.test(request.message) ? ['female-dormitory-2-info']
        : ['male-dormitory-info', 'female-dormitory-1-info', 'female-dormitory-2-info'];
  const places = content.hotspots.filter((p) => targetIds.includes(p.hotspotId));
  const th = request.locale === 'th';
  const needsCurrentDetails = /ราคา|ค่า(?:หอ|เช่า|พัก)|สมัคร|ว่าง|จอง|เปิดรับ|fees?|cost|price|apply|book|vacan/iu.test(request.message);
  return {
    ...emptyResponse, intent: 'answer', answered: places.length > 0 && !needsCurrentDetails,
    answer: `${needsCurrentDetails ? (th ? 'ราคาห้องพัก ห้องว่าง และการจองต้องตรวจประกาศล่าสุดกับงานหอพัก ข้อมูลทั่วไปที่มีขณะนี้คือ:\n\n' : 'Room fees, vacancies and reservations require the latest dormitory announcement. Available general information:\n\n') : ''}${places.length ? places.map((p) => `${localize(p.title, request.locale)}\n${localize(p.description, request.locale)}`).join('\n\n') : th ? 'ยังไม่มีข้อมูลหอพักที่เผยแพร่ในขณะนี้' : 'No dormitory information is available yet.'}`,
    suggestedReplies: places.map((p) => ({ label: th ? `ชม${p.title.th}` : `Visit ${p.title.en}`, message: th ? `พาไป ${p.title.th}` : `Take me to ${p.title.en}`, sceneId: p.sceneId }))
  };
}

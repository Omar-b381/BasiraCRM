// ═══════════════════════════════════════════════════════════════════
//  خوارزمية تحليل العناوين المصرية — تعمل 100% offline بدون أي API
//  تستخدم قاموس شامل للمدن والمناطق لاستخراج City و Area
// ═══════════════════════════════════════════════════════════════════

import type { ParsedAddress } from '../types/shipping.types';

// ─────────────────────────────────────────────────────────
//  قاموس المدن والمناطق — مرتّب من الأكثر تفصيلاً للأقل
// ─────────────────────────────────────────────────────────

interface CityEntry {
  city: string;
  aliases: string[];   // أسماء بديلة أو شائعة
  areas: AreaEntry[];
}

interface AreaEntry {
  area: string;
  aliases: string[];
}

const EGYPT_CITIES: CityEntry[] = [
  // ══════════════════ القاهرة ══════════════════
  {
    city: 'القاهرة',
    aliases: ['cairo', 'القاهره', 'محافظة القاهرة'],
    areas: [
      { area: 'المقطم', aliases: ['مقطم', 'el moqattam', 'moqattam'] },
      { area: 'مدينة نصر', aliases: ['نصر سيتي', 'ناصر سيتي', 'nasr city', 'nasr', 'نصر'] },
      { area: 'التجمع الخامس', aliases: ['تجمع خامس', 'تجمع 5', 'التجمع', 'new cairo', 'نيو كايرو', 'القاهرة الجديدة'] },
      { area: 'مصر الجديدة', aliases: ['هليوبوليس', 'heliopolis', 'مصر جديدة'] },
      { area: 'الزيتون', aliases: ['zeitoun', 'زيتون'] },
      { area: 'شبرا', aliases: ['شبرا مصر', 'shubra', 'شبره'] },
      { area: 'المطرية', aliases: ['matareya', 'مطريه'] },
      { area: 'عين شمس', aliases: ['ain shams', 'عين شمس شرق', 'عين شمس غرب'] },
      { area: 'المرج', aliases: ['marg', 'المرج القديم', 'المرج الجديد'] },
      { area: 'حلوان', aliases: ['helwan', 'حلوان 1', 'حلوان 2'] },
      { area: 'المعادي', aliases: ['معادي', 'maadi', 'كورنيش المعادي', 'المعادي الجديدة'] },
      { area: 'الدقي', aliases: ['دقي', 'dokki', 'دوكي'] },
      { area: 'الزمالك', aliases: ['zamalek', 'زمالك'] },
      { area: 'العباسية', aliases: ['abbasia', 'عباسيه'] },
      { area: 'المنيل', aliases: ['manial', 'منيل'] },
      { area: 'جاردن سيتي', aliases: ['garden city'] },
      { area: 'وسط البلد', aliases: ['وسط القاهرة', 'downtown', 'داون تاون', 'البلد'] },
      { area: 'باب اللوق', aliases: ['bab el louk'] },
      { area: 'السيدة زينب', aliases: ['سيدة زينب', 'sayeda zeinab'] },
      { area: 'عابدين', aliases: ['abdeen', 'عابدين'] },
      { area: 'الأزهر', aliases: ['azhar', 'منطقة الأزهر'] },
      { area: 'الحسين', aliases: ['el hussein', 'الحسين والأزهر'] },
      { area: 'الجمالية', aliases: ['gamaleyya'] },
      { area: 'باب الشعرية', aliases: ['bab el shareia'] },
      { area: 'بولاق', aliases: ['bulaq', 'بولاق الدكرور', 'بولاق أبو العلا'] },
      { area: 'امبابة', aliases: ['embaba', 'امبابه'] },
      { area: 'أكتوبر', aliases: ['6 اكتوبر', '6th of october', 'سادس اكتوبر', '٦ أكتوبر'] },
      { area: 'الشروق', aliases: ['el shorouk', 'shorouk', 'شروق'] },
      { area: 'بدر', aliases: ['badr city', 'مدينة بدر'] },
      { area: 'العبور', aliases: ['obour', 'el obour', 'عبور'] },
      { area: 'الرحاب', aliases: ['rehab', 'رحاب'] },
      { area: 'مدينتي', aliases: ['madinaty'] },
      { area: 'المعصرة', aliases: ['masara', 'معصره'] },
      { area: 'طره', aliases: ['tura', 'طرة'] },
      { area: 'كوبري القبة', aliases: ['qubba', 'كوبري القبه'] },
      { area: 'الوايلي', aliases: ['wayly', 'وايلي'] },
      { area: 'عزبة النخل', aliases: ['ezbet el nakhl'] },
      { area: 'الأميرية', aliases: ['amireya', 'اميريه'] },
      { area: 'منشية ناصر', aliases: ['manshiet nasser'] },
      { area: 'دار السلام', aliases: ['dar el salam'] },
      { area: 'الخليفة', aliases: ['el khalifa'] },
      { area: 'البساتين', aliases: ['basatin'] },
      { area: 'مصر القديمة', aliases: ['old cairo', 'قبطي'] },
      { area: 'الفسطاط', aliases: ['fustat'] },
      { area: 'مدينة السلام', aliases: ['salam city', 'السلام'] },
      { area: 'زهراء مدينة نصر', aliases: ['zahraa nasr'] },
      { area: 'الهايكستب', aliases: ['hykstep'] },
      { area: 'البنفسج', aliases: ['banafseg'] },
      { area: 'القطامية', aliases: ['katameya'] },
    ],
  },

  // ══════════════════ الجيزة ══════════════════
  {
    city: 'الجيزة',
    aliases: ['giza', 'جيزة', 'محافظة الجيزة'],
    areas: [
      { area: 'الهرم', aliases: ['haram', 'هرم', 'طريق الهرم'] },
      { area: 'فيصل', aliases: ['faisal', 'شارع فيصل'] },
      { area: 'المنيب', aliases: ['menoub', 'منيب'] },
      { area: 'أكتوبر', aliases: ['6 اكتوبر', '6th october', 'six october'] },
      { area: 'الشيخ زايد', aliases: ['sheikh zayed', 'زايد'] },
      { area: 'العجوزة', aliases: ['agouza', 'عجوزه'] },
      { area: 'الدقي', aliases: ['dokki', 'دقي'] },
      { area: 'المهندسين', aliases: ['mohandessin', 'مهندسين'] },
      { area: 'إمبابة', aliases: ['embaba'] },
      { area: 'بولاق الدكرور', aliases: ['bulaq'] },
      { area: 'الوراق', aliases: ['warrak'] },
      { area: 'أوسيم', aliases: ['ausim'] },
      { area: 'كرداسة', aliases: ['kerdasa'] },
      { area: 'الحوامدية', aliases: ['hawamdia'] },
      { area: 'البدرشين', aliases: ['badrashin'] },
      { area: 'العياط', aliases: ['ayat'] },
      { area: 'الصف', aliases: ['saff'] },
      { area: 'أطفيح', aliases: ['atfih'] },
    ],
  },

  // ══════════════════ الإسكندرية ══════════════════
  {
    city: 'الإسكندرية',
    aliases: ['اسكندرية', 'alexandria', 'الإسكندريه', 'اسكندريه', 'iskandareyya'],
    areas: [
      { area: 'محرم بك', aliases: ['moharam bek'] },
      { area: 'كليوباترا', aliases: ['cleopatra', 'كيلوباترا'] },
      { area: 'سيدي بشر', aliases: ['sidi bishr'] },
      { area: 'المنتزه', aliases: ['montazah', 'منتزه'] },
      { area: 'العجمي', aliases: ['agami'] },
      { area: 'المعمورة', aliases: ['maamura'] },
      { area: 'الإبراهيمية', aliases: ['ibrahimia'] },
      { area: 'باكوس', aliases: ['bakos'] },
      { area: 'سموحة', aliases: ['smouha'] },
      { area: 'لوران', aliases: ['lauran', 'جليم', 'gleem'] },
      { area: 'المنشية', aliases: ['mansheya'] },
      { area: 'الشاطبي', aliases: ['shatby'] },
      { area: 'رشدي', aliases: ['rushdy'] },
      { area: 'الورديان', aliases: ['wardian'] },
      { area: 'الدخيلة', aliases: ['dekhela'] },
      { area: 'العامرية', aliases: ['ameriya'] },
      { area: 'برج العرب', aliases: ['borg el arab'] },
    ],
  },

  // ══════════════════ القليوبية ══════════════════
  {
    city: 'القليوبية',
    aliases: ['قليوبية', 'قليوبيه', 'qalyubia', 'qalyubiyya'],
    areas: [
      { area: 'شبرا الخيمة', aliases: ['shubra el kheima', 'شبره الخيمه'] },
      { area: 'قليوب', aliases: ['qalyub'] },
      { area: 'بنها', aliases: ['banha'] },
      { area: 'طوخ', aliases: ['tukh'] },
      { area: 'القناطر', aliases: ['qanater', 'القناطر الخيرية'] },
      { area: 'الخانكة', aliases: ['khanqa', 'خانكه'] },
      { area: 'مشتهر', aliases: ['mushtahar'] },
      { area: 'المرج', aliases: ['marg'] },
      { area: 'كفر شكر', aliases: ['kafr shukr'] },
    ],
  },

  // ══════════════════ الشرقية ══════════════════
  {
    city: 'الشرقية',
    aliases: ['شرقية', 'شرقيه', 'sharqia'],
    areas: [
      { area: 'الزقازيق', aliases: ['zagazig', 'ززازيق'] },
      { area: 'العاشر من رمضان', aliases: ['10th ramadan', 'رمضان', 'عاشر رمضان'] },
      { area: 'بلبيس', aliases: ['bilbeis'] },
      { area: 'منيا القمح', aliases: ['menya el qamh'] },
      { area: 'أبو كبير', aliases: ['abu kebir'] },
      { area: 'فاقوس', aliases: ['faqous'] },
      { area: 'ديرب نجم', aliases: ['derb negm'] },
      { area: 'كفر صقر', aliases: ['kafr saqr'] },
      { area: 'الإبراهيمية', aliases: ['ibrahimia'] },
    ],
  },

  // ══════════════════ الدقهلية ══════════════════
  {
    city: 'الدقهلية',
    aliases: ['دقهلية', 'دقهليه', 'dakahlia'],
    areas: [
      { area: 'المنصورة', aliases: ['mansoura', 'منصوره'] },
      { area: 'طلخا', aliases: ['talha'] },
      { area: 'ميت غمر', aliases: ['meet ghamr', 'مير غمر'] },
      { area: 'دكرنس', aliases: ['dekernes'] },
      { area: 'أجا', aliases: ['agga'] },
      { area: 'شربين', aliases: ['sherbin'] },
      { area: 'بلقاس', aliases: ['belqas'] },
      { area: 'المنزلة', aliases: ['manzala'] },
      { area: 'الجمالية', aliases: ['gamaleya'] },
    ],
  },

  // ══════════════════ البحيرة ══════════════════
  {
    city: 'البحيرة',
    aliases: ['بحيرة', 'بحيره', 'beheira'],
    areas: [
      { area: 'دمنهور', aliases: ['damanhur', 'دمنهور'] },
      { area: 'كفر الدوار', aliases: ['kafr el dawwar'] },
      { area: 'رشيد', aliases: ['rosetta', 'rashid'] },
      { area: 'إيتاي البارود', aliases: ['eitai el barud'] },
      { area: 'أبو حمص', aliases: ['abu homs'] },
      { area: 'المحمودية', aliases: ['mahmudiya'] },
      { area: 'الدلنجات', aliases: ['delengat'] },
    ],
  },

  // ══════════════════ الغربية ══════════════════
  {
    city: 'الغربية',
    aliases: ['غربية', 'غربيه', 'gharbia'],
    areas: [
      { area: 'طنطا', aliases: ['tanta'] },
      { area: 'المحلة الكبرى', aliases: ['mahalla', 'el mahala', 'المحلة'] },
      { area: 'كفر الزيات', aliases: ['kafr el zayat'] },
      { area: 'زفتى', aliases: ['zifta'] },
      { area: 'السنطة', aliases: ['santa'] },
      { area: 'قطور', aliases: ['qutour'] },
    ],
  },

  // ══════════════════ المنوفية ══════════════════
  {
    city: 'المنوفية',
    aliases: ['منوفية', 'منوفيه', 'menofia', 'menoufia'],
    areas: [
      { area: 'شبين الكوم', aliases: ['shibin el kom'] },
      { area: 'مينوف', aliases: ['menuf'] },
      { area: 'أشمون', aliases: ['ashmoun'] },
      { area: 'الباجور', aliases: ['bagour'] },
      { area: 'قويسنا', aliases: ['quesna'] },
      { area: 'بركة السبع', aliases: ['birket el sab'] },
      { area: 'تلا', aliases: ['tala'] },
    ],
  },

  // ══════════════════ الفيوم ══════════════════
  {
    city: 'الفيوم',
    aliases: ['فيوم', 'fayoum', 'faiyum'],
    areas: [
      { area: 'مدينة الفيوم', aliases: ['الفيوم'] },
      { area: 'إطسا', aliases: ['itsa'] },
      { area: 'طامية', aliases: ['tamiya'] },
      { area: 'سنورس', aliases: ['sinnuris'] },
      { area: 'يوسف الصديق', aliases: ['yousef el seddik'] },
    ],
  },

  // ══════════════════ بني سويف ══════════════════
  {
    city: 'بني سويف',
    aliases: ['بنى سويف', 'beni suef', 'benisuef'],
    areas: [
      { area: 'مدينة بني سويف', aliases: ['بني سويف'] },
      { area: 'الواسطى', aliases: ['wasta'] },
      { area: 'ناصر', aliases: ['nasser'] },
      { area: 'إهناسيا', aliases: ['ihnasia'] },
    ],
  },

  // ══════════════════ المنيا ══════════════════
  {
    city: 'المنيا',
    aliases: ['منيا', 'minya', 'el minya'],
    areas: [
      { area: 'مدينة المنيا', aliases: ['المنيا'] },
      { area: 'ملوي', aliases: ['mallawi'] },
      { area: 'سمالوط', aliases: ['samalut'] },
      { area: 'المنيا الجديدة', aliases: ['new minya'] },
      { area: 'مطاي', aliases: ['matai'] },
    ],
  },

  // ══════════════════ أسيوط ══════════════════
  {
    city: 'أسيوط',
    aliases: ['اسيوط', 'asyut', 'assiut', 'assiout'],
    areas: [
      { area: 'مدينة أسيوط', aliases: ['أسيوط'] },
      { area: 'ديروط', aliases: ['dayrut'] },
      { area: 'منفلوط', aliases: ['manfalut'] },
      { area: 'القوصية', aliases: ['qusiya'] },
      { area: 'أبنوب', aliases: ['abnub'] },
    ],
  },

  // ══════════════════ سوهاج ══════════════════
  {
    city: 'سوهاج',
    aliases: ['sohag', 'souhag'],
    areas: [
      { area: 'مدينة سوهاج', aliases: ['سوهاج'] },
      { area: 'أخميم', aliases: ['akhmim'] },
      { area: 'طهطا', aliases: ['tahta'] },
      { area: 'جرجا', aliases: ['gerga'] },
      { area: 'المراغة', aliases: ['maragha'] },
    ],
  },

  // ══════════════════ قنا ══════════════════
  {
    city: 'قنا',
    aliases: ['qena', 'محافظة قنا'],
    areas: [
      { area: 'مدينة قنا', aliases: ['قنا'] },
      { area: 'نجع حمادي', aliases: ['nag hammadi'] },
      { area: 'قوص', aliases: ['qus'] },
      { area: 'دشنا', aliases: ['dishna'] },
    ],
  },

  // ══════════════════ الأقصر ══════════════════
  {
    city: 'الأقصر',
    aliases: ['اقصر', 'luxor'],
    areas: [
      { area: 'مدينة الأقصر', aliases: ['الأقصر'] },
      { area: 'الأقصر الشرقية', aliases: ['east luxor'] },
      { area: 'الأقصر الغربية', aliases: ['west luxor'] },
      { area: 'إسنا', aliases: ['esna'] },
      { area: 'الطود', aliases: ['el toud'] },
    ],
  },

  // ══════════════════ أسوان ══════════════════
  {
    city: 'أسوان',
    aliases: ['اسوان', 'aswan'],
    areas: [
      { area: 'مدينة أسوان', aliases: ['أسوان'] },
      { area: 'كوم أمبو', aliases: ['kom ombo'] },
      { area: 'إدفو', aliases: ['edfu'] },
      { area: 'نصر النوبة', aliases: ['nasr el nuba'] },
    ],
  },

  // ══════════════════ بورسعيد ══════════════════
  {
    city: 'بورسعيد',
    aliases: ['port said', 'borsaid', 'بور سعيد'],
    areas: [
      { area: 'المنطقة الحرة', aliases: ['free zone'] },
      { area: 'الضواحي', aliases: ['dawahi'] },
      { area: 'الشرق', aliases: ['east port said'] },
      { area: 'العرب', aliases: ['arab district'] },
    ],
  },

  // ══════════════════ الإسماعيلية ══════════════════
  {
    city: 'الإسماعيلية',
    aliases: ['اسماعيلية', 'اسماعيليه', 'ismailia'],
    areas: [
      { area: 'مدينة الإسماعيلية', aliases: ['الإسماعيلية'] },
      { area: 'القنطرة', aliases: ['qantara', 'القنطره'] },
      { area: 'أبو صوير', aliases: ['abu suweir'] },
      { area: 'التل الكبير', aliases: ['tel el kebir'] },
    ],
  },

  // ══════════════════ السويس ══════════════════
  {
    city: 'السويس',
    aliases: ['suez', 'سويس'],
    areas: [
      { area: 'مدينة السويس', aliases: ['السويس'] },
      { area: 'الأربعين', aliases: ['arbaeen'] },
      { area: 'فيصل', aliases: ['faisal'] },
      { area: 'عتاقة', aliases: ['ataka'] },
    ],
  },

  // ══════════════════ دمياط ══════════════════
  {
    city: 'دمياط',
    aliases: ['damietta', 'dumyat'],
    areas: [
      { area: 'مدينة دمياط', aliases: ['دمياط'] },
      { area: 'رأس البر', aliases: ['ras el bar'] },
      { area: 'دمياط الجديدة', aliases: ['new damietta'] },
      { area: 'فارسكور', aliases: ['faraskur'] },
    ],
  },

  // ══════════════════ كفر الشيخ ══════════════════
  {
    city: 'كفر الشيخ',
    aliases: ['كفرالشيخ', 'kafr el sheikh', 'kafrelsheikh'],
    areas: [
      { area: 'مدينة كفر الشيخ', aliases: ['كفر الشيخ'] },
      { area: 'بيلا', aliases: ['bela'] },
      { area: 'دسوق', aliases: ['desouk'] },
      { area: 'فوة', aliases: ['fuwa'] },
      { area: 'مطوبس', aliases: ['mutubis'] },
    ],
  },

  // ══════════════════ الوادي الجديد ══════════════════
  {
    city: 'الوادي الجديد',
    aliases: ['وادي جديد', 'new valley', 'el wadi el gadid'],
    areas: [
      { area: 'الخارجة', aliases: ['kharga'] },
      { area: 'الداخلة', aliases: ['dakhla'] },
      { area: 'الفرافرة', aliases: ['farafra'] },
      { area: 'بلاط', aliases: ['balat'] },
    ],
  },

  // ══════════════════ مطروح ══════════════════
  {
    city: 'مطروح',
    aliases: ['matrouh', 'marsa matrouh', 'مرسى مطروح'],
    areas: [
      { area: 'مرسى مطروح', aliases: ['مطروح'] },
      { area: 'الحمام', aliases: ['hammam'] },
      { area: 'العلمين', aliases: ['alamein', 'el alamein'] },
      { area: 'مرسى علم', aliases: ['marsa alam'] },
      { area: 'سيوة', aliases: ['siwa'] },
    ],
  },

  // ══════════════════ شمال سيناء ══════════════════
  {
    city: 'شمال سيناء',
    aliases: ['north sinai', 'سيناء الشمالية'],
    areas: [
      { area: 'العريش', aliases: ['arish', 'ريش'] },
      { area: 'الشيخ زويد', aliases: ['sheikh zuweid'] },
      { area: 'رفح', aliases: ['rafah'] },
    ],
  },

  // ══════════════════ جنوب سيناء ══════════════════
  {
    city: 'جنوب سيناء',
    aliases: ['south sinai', 'سيناء الجنوبية'],
    areas: [
      { area: 'شرم الشيخ', aliases: ['sharm el sheikh', 'شرم'] },
      { area: 'دهب', aliases: ['dahab'] },
      { area: 'طابا', aliases: ['taba'] },
      { area: 'نويبع', aliases: ['nuweiba'] },
      { area: 'الطور', aliases: ['tor sinai'] },
    ],
  },

  // ══════════════════ البحر الأحمر ══════════════════
  {
    city: 'البحر الأحمر',
    aliases: ['red sea', 'bahr el ahmar'],
    areas: [
      { area: 'الغردقة', aliases: ['hurghada', 'هرغادا'] },
      { area: 'سفاجا', aliases: ['safaga'] },
      { area: 'القصير', aliases: ['qoseir'] },
      { area: 'مرسى علم', aliases: ['marsa alam'] },
    ],
  },
];

// ─────────────────────────────────────────────────────────
//  دوال المساعدة
// ─────────────────────────────────────────────────────────

/** تنظيف النص وتوحيد المسافات والتشكيل */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '')  // حذف التشكيل
    .replace(/أ|إ|آ/g, 'ا')           // توحيد الألف
    .replace(/ة/g, 'ه')               // تاء مربوطة → هاء
    .replace(/ى/g, 'ي')               // ألف مقصورة → ياء
    .replace(/\s+/g, ' ')
    .trim();
}

/** التحقق من وجود نص في عنوان */
function textInAddress(needle: string, haystack: string): boolean {
  const n = normalizeText(needle);
  const h = normalizeText(haystack);
  // تطابق كلمة كاملة لتفادي المطابقة الجزئية الخاطئة
  const regex = new RegExp(`(^|[\\s,،/\\-])${escapeRegex(n)}($|[\\s,،/\\-])`, '');
  return regex.test(h) || h.includes(n);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─────────────────────────────────────────────────────────
//  الدالة الرئيسية — parseEgyptianAddress
// ─────────────────────────────────────────────────────────

/**
 * تحليل عنوان مصري لاستخراج المدينة والمنطقة
 * @param address العنوان كامل
 * @returns ParsedAddress مع مستوى الثقة
 */
export function parseEgyptianAddress(address: string): ParsedAddress {
  if (!address || address.trim() === '') {
    return { city: '', area: '', confidence: 'low' };
  }

  let foundCity: string | null = null;
  let foundArea: string | null = null;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // البحث في كل مدينة وكل مناطقها
  for (const cityEntry of EGYPT_CITIES) {
    // فحص اسم المدينة والأسماء البديلة
    const cityMatched =
      textInAddress(cityEntry.city, address) ||
      cityEntry.aliases.some(alias => textInAddress(alias, address));

    // فحص كل المناطق أولاً (الأولوية للمنطقة لأنها أكثر تفصيلاً)
    for (const areaEntry of cityEntry.areas) {
      const areaMatched =
        textInAddress(areaEntry.area, address) ||
        areaEntry.aliases.some(alias => textInAddress(alias, address));

      if (areaMatched) {
        foundArea = areaEntry.area;
        foundCity = cityEntry.city;
        confidence = cityMatched ? 'high' : 'medium';
        return { city: foundCity, area: foundArea, confidence };
      }
    }

    // إذا وُجدت المدينة فقط بدون منطقة محددة
    if (cityMatched && !foundCity) {
      foundCity = cityEntry.city;
      confidence = 'medium';
    }
  }

  // إذا وُجدت المدينة فقط
  if (foundCity) {
    return { city: foundCity, area: '', confidence: 'medium' };
  }

  // لم يتم التعرف على شيء
  return { city: '', area: '', confidence: 'low' };
}

/**
 * تطبيق التحليل على مجموعة عناوين دفعة واحدة
 */
export function parseAddressBatch(
  addresses: string[]
): ParsedAddress[] {
  return addresses.map(parseEgyptianAddress);
}

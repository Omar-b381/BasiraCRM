export interface RFMSegmentInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  description: string;
  color: string;
  bgColor: string;
  recommendedAction: string;
  whatsappTemplate?: string;
}

export const RFM_SEGMENTS_CONFIG: Record<string, RFMSegmentInfo> = {
  champions: {
    id: 'champions',
    nameAr: 'الأبطال',
    nameEn: 'Champions',
    description: 'اشتروا مؤخراً، يشترون كثيراً، وينفقون أكثر',
    color: '#10B981',
    bgColor: '#D1FAE5',
    recommendedAction: 'كافئهم، اطلب مراجعاتهم، أشركهم في المنتجات الجديدة',
    whatsappTemplate: 'مرحباً {name}! أنت من أبطالنا المميزين 🏆 هدية خاصة لك...'
  },
  loyal: {
    id: 'loyal',
    nameAr: 'المخلصون',
    nameEn: 'Loyal Customers',
    description: 'ينفقون جيداً ويستجيبون للعروض',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    recommendedAction: 'اعرض برامج ولاء، اطلب منهم الترقية لمستوى أعلى',
    whatsappTemplate: 'أهلاً {name}! بعد كل مشترياتك معنا، لديك عرض حصري...'
  },
  potential_loyal: {
    id: 'potential_loyal',
    nameAr: 'محتملو الولاء',
    nameEn: 'Potential Loyalists',
    description: 'عملاء جدد نسبياً ولكن اشتروا عدة مرات وبمبالغ جيدة',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    recommendedAction: 'اعرض عليهم الانضمام لنادي الولاء، قدم عروضاً مخصصة لمشترياتهم المفضلة',
    whatsappTemplate: 'أهلاً يا {name}! يسعدنا جداً تكرار تسوقك معنا. هذا كوبون خصم خاص لطلبك القادم...'
  },
  new_customers: {
    id: 'new_customers',
    nameAr: 'عملاء جدد',
    nameEn: 'New Customers',
    description: 'اشتروا مؤخراً ولأول مرة — ليس لديهم تكرار بعد',
    color: '#06B6D4',
    bgColor: '#CFFAFE',
    recommendedAction: 'تواصل معهم للتأكد من رضاهم عن التجربة، وقدم دليلاً لاستخدام المنتج',
    whatsappTemplate: 'مرحباً {name}! نأمل أن تكون تجربتك مع منتجاتنا ممتازة. كيف يمكننا مساعدتك اليوم؟'
  },
  promising: {
    id: 'promising',
    nameAr: 'واعدون',
    nameEn: 'Promising',
    description: 'اشتروا مؤخراً لكن إنفاقهم وتكرارهم متوسط',
    color: '#EC4899',
    bgColor: '#FCE7F3',
    recommendedAction: 'شجعهم على الشراء مجدداً من خلال تقديم هدايا صغيرة مع الطلبات القادمة',
    whatsappTemplate: 'مرحباً {name}! نتمنى لك يوماً سعيداً. متوفر الآن مجموعة جديدة قد تثير اهتمامك...'
  },
  need_attention: {
    id: 'need_attention',
    nameAr: 'يحتاجون اهتمام',
    nameEn: 'Need Attention',
    description: 'معدل الشراء والتكرار فوق المتوسط، لكن لم يشتروا منذ فترة',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    recommendedAction: 'قدم عروضاً محدودة الوقت لتحفيزهم على العودة سريعاً قبل الدخول في مرحلة الخطر',
    whatsappTemplate: 'أهلاً {name}! نود تذكيرك بأن نقاط الولاء الخاصة بك ستنتهي قريباً. تفقد جديدنا اليوم...'
  },
  about_to_sleep: {
    id: 'about_to_sleep',
    nameAr: 'على وشك النوم',
    nameEn: 'About to Sleep',
    description: 'تحت المتوسط في الحداثة والتكرار والإنفاق. سنخسرهم إن لم نتحرك',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    recommendedAction: 'شارك معهم قيم متجرك أو منتجات مميزة حققت مبيعات هائلة مؤخراً لإحياء اهتمامهم',
    whatsappTemplate: 'مرحباً {name}. هل جربت منتجاتنا الشتوية الجديدة؟ متوفرة الآن بخصم خاص...'
  },
  at_risk: {
    id: 'at_risk',
    nameAr: 'في خطر',
    nameEn: 'At Risk',
    description: 'اشتروا كثيراً وسابقاً لكن منذ فترة طويلة — يحتاجون إعادة تفعيل',
    color: '#D97706',
    bgColor: '#FEF3C7',
    recommendedAction: 'تواصل معهم فوراً بعروض شخصية ممتازة، افهم سبب غيابهم، وحاول تذليل أي عقبات واجهتهم',
    whatsappTemplate: 'اشتقنالك يا {name}! مرت فترة ولم نراك. وفرنا لك خصماً خاصاً 20% على أي من منتجاتك المفضلة...'
  },
  cannot_lose: {
    id: 'cannot_lose',
    nameAr: 'لا يمكن خسارتهم',
    nameEn: 'Cannot Lose Them',
    description: 'اشتروا كثيراً وبمبالغ كبيرة لكن لم يعودوا — قيمة عالية جداً تاريخياً',
    color: '#4B5563',
    bgColor: '#E5E7EB',
    recommendedAction: 'تواصل معهم بشكل شخصي ومباشر، قدم خدمات VIP، واستفسر عن سبب التوقف وأصلح أي مشكلة',
    whatsappTemplate: 'أنت من أهم عملائنا {name}. يسعدنا جداً الاستماع لتقييمك وتقديم خدمة خاصة تليق بك...'
  },
  hibernating: {
    id: 'hibernating',
    nameAr: 'سبات',
    nameEn: 'Hibernating',
    description: 'آخر شراء لهم كان منذ فترة طويلة جداً، وعدد مرات الشراء والإنفاق منخفض',
    color: '#9CA3AF',
    bgColor: '#F3F4F6',
    recommendedAction: 'أرسل عروض تصفية أو تخفيضات موسمية عامة جداً لمحاولة تحفيزهم مرة أخيرة',
    whatsappTemplate: 'أهلاً {name}. عروض مواسم الكبرى بدأت اليوم! تفضل بزيارة المتجر للاستفادة من خصومات تصل إلى 40%...'
  },
  lost: {
    id: 'lost',
    nameAr: 'المفقودون',
    nameEn: 'Lost',
    description: 'أقل تكرار وأقل إنفاق ومرت فترة طويلة جداً على آخر تفاعل لهم',
    color: '#EF4444',
    bgColor: '#FEE2E2',
    recommendedAction: 'أعد محاولة إحياءهم بعروض قوية جداً لمرة واحدة، أو استبعدهم لتقليل تكاليف الإرسال',
    whatsappTemplate: 'نفتقدك كثيراً {name}! عرض استثنائي بخصم 50% على طلبك القادم لعودتك الكريمة...'
  }
};

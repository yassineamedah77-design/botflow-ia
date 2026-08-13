import type { LandingCopy } from "./landing";

/**
 * PT-PT and EN dictionaries — same shape as the FR copy (LandingCopy).
 * PT is European Portuguese (marcações, faltas, "a sua clínica").
 */

export const copyPt: LandingCopy = {
  nav: {
    brand: "BotFlow.IA",
    links: [
      { label: "Sofia", href: "#solution" },
      { label: "Ofertas", href: "#offres" },
      { label: "Resultados", href: "#resultats" },
      { label: "Preços", href: "#tarifs" },
      { label: "FAQ", href: "#faq" },
    ],
    cta: "Auditoria grátis",
  },

  hero: {
    badge: "2 vagas de onboarding disponíveis este mês",
    h1Line1: "As suas DM, as chamadas perdidas,",
    h1Accent: "as suas horas vazias,",
    h1Line2: "tornam-se marcações.",
    sub: "A BotFlow IA instala a Sofia, a sua assistente de IA trilingue PT · FR · EN. Responde 24/7 no WhatsApp e Instagram, qualifica as suas clientes, reserva no Treatwell ou Zolmi, recupera as faltas e faz voltar as antigas clientes.",
    ctaPrimary: "Reservar a minha auditoria gratuita (30 min)",
    ctaSecondary: "Conhecer a Sofia",
    compliance: "Conforme RGPD · Alojamento 100 % Europa",
  },

  trust: {
    label: "Ligada às ferramentas da sua clínica",
    headline: "Treatwell, Zolmi, Booksy, WhatsApp, Instagram.",
    sub: "Seguro RGPD, alojado na Europa.",
    tools: [
      "Treatwell",
      "Zolmi",
      "Booksy",
      "Phorest",
      "Planity",
      "Doctolib Pro",
      "WhatsApp Business",
      "Instagram DM",
    ],
  },

  problem: {
    eyebrow: "O que perde todos os meses",
    title: "Cada DM ignorada é uma marcação",
    titleAccent: "na concorrência.",
    items: [
      {
        stat: "68 %",
        statLabel: "das DM fora de horas ficam sem resposta",
        title: "As DM das 22 h",
        body: "Uma cliente escreve depois do trabalho. Sem resposta até ao meio-dia seguinte — já reservou noutro sítio. Em ~80 pedidos Instagram por mês, só 10 a 15 se tornam marcações.",
      },
      {
        stat: "15–20 %",
        statLabel: "de faltas numa agenda sem confirmação",
        title: "As faltas silenciosas",
        body: "Uma vaga de Hydrafacial vazia às 14 h nunca se recupera. Com 15–20 % de faltas, uma clínica com 3 profissionais deixa fugir milhares de euros por mês.",
      },
      {
        stat: "6 meses",
        statLabel: "sem contacto = cliente perdida",
        title: "As clientes adormecidas",
        body: "A Senhora Garcia não volta há 5 meses. Ninguém tem tempo para a contactar. Sem seguimento, a maioria das clientes pontuais nunca volta a marcar.",
      },
    ],
    closing:
      "Entretanto, a sua equipa está em gabinete — é o seu trabalho. Responder à meia-noite, confirmar, recuperar faltas: é o trabalho da Sofia.",
  },

  solution: {
    eyebrow: "Como a Sofia trabalha",
    title: "Da cliente curiosa",
    titleAccent: "à marcação confirmada.",
    steps: [
      { icon: "💬", title: "DM / WhatsApp", body: "Uma cliente escreve às 22 h" },
      { icon: "✨", title: "A Sofia responde", body: "Em PT, FR ou EN — qualifica o tratamento, o orçamento, a urgência" },
      { icon: "📅", title: "Marcação reservada", body: "Link Treatwell / Zolmi enviado, vaga confirmada" },
      { icon: "🔔", title: "Lembretes automáticos", body: "Confirmação D-1 e H-2, recuperação de falta em 30 min" },
      { icon: "⭐", title: "Avaliações Google", body: "Pedido de avaliação a D+3, reativação a M+3" },
    ],
  },

  offers: {
    eyebrow: "As nossas 4 ofertas",
    title: "O sistema completo para",
    titleAccent: "encher a sua agenda em piloto automático.",
    items: [
      {
        num: "01",
        title: "Sofia — Receção 24/7",
        benefit: "Nunca mais uma DM sem resposta, mesmo ao domingo à meia-noite.",
        body: "A Sofia responde no Instagram e WhatsApp, conhece os seus tratamentos, preços e contraindicações, e envia o link de reserva ligado à sua agenda Treatwell ou Zolmi.",
      },
      {
        num: "02",
        title: "Visibilidade IA Local (AEO)",
        benefit: "Quando perguntam ao ChatGPT « melhor clínica perto de mim », é você.",
        body: "As suas clientes já não pesquisam no Google: perguntam ao ChatGPT, Perplexity ou Apple Intelligence. Otimizamos os seus dados para que as IA recomendem o seu espaço.",
      },
      {
        num: "03",
        title: "Máquina de Conteúdos Instagram / TikTok",
        benefit: "5 publicações por semana, sem agência criativa nem noites de edição.",
        body: "Tira a foto antes/depois, preenche um mini-formulário. A IA gera guião de vídeo, legenda e hashtags locais em 2 minutos.",
      },
      {
        num: "04",
        title: "Reativação & Seguimento de Clientes",
        benefit: "Os buracos na agenda preenchem-se sozinhos.",
        body: "A Sofia analisa a sua base de clientes e contacta as que devem voltar (Hydrafacial M+3, tratamento M+1). A D+3, pergunta como correu e pede uma avaliação Google.",
      },
    ],
  },

  process: {
    eyebrow: "O nosso processo",
    title: "Da auditoria à implementação,",
    titleAccent: "sem partir nada.",
    steps: [
      {
        num: "01",
        title: "Auditoria gratuita — 30 min",
        body: "Conhecemos a sua clínica, os tratamentos, as fontes de leads. Calculamos juntos a receita que perde em faltas e DM ignoradas.",
      },
      {
        num: "02",
        title: "Mapeamento",
        body: "Análise dos seus fluxos: Instagram, Treatwell, Zolmi, base de clientes. Identificamos as fugas de receita prioritárias.",
      },
      {
        num: "03",
        title: "Treino da Sofia",
        body: "A Sofia aprende a sua carta de tratamentos, preços, contraindicações e o seu tom. Ligação ao WhatsApp Business, Instagram e à sua agenda.",
      },
      {
        num: "04",
        title: "Implementação em 14 dias",
        body: "Entrada em produção progressiva (10 % do tráfego → 100 %), formação da sua equipa em 1 h, dashboard de acompanhamento.",
      },
      {
        num: "05",
        title: "Acompanhamento contínuo",
        body: "Seguimento mensal dos KPI: marcações geradas, € recuperados, satisfação. A Sofia evolui com os seus novos tratamentos e estações.",
      },
    ],
  },

  results: {
    eyebrow: "Resultados médios observados",
    title: "O que as nossas clínicas observam",
    titleAccent: "após 30 dias.",
    disclaimer:
      "Médias observadas nas clínicas equipadas — os resultados variam consoante o estabelecimento e nunca são garantidos.",
    stats: [
      { value: 82, prefix: "−", suffix: " %", label: "de faltas" },
      { value: 34, prefix: "+", suffix: " %", label: "de marcações qualificadas via Instagram" },
      { value: 15, prefix: "−", suffix: " h", label: "por semana na receção" },
      { value: 27, prefix: "", suffix: " d", label: "de ROI médio no setup" },
    ],
    casesLabel:
      "Casos representativos — cenários-tipo construídos a partir dos resultados médios observados, anonimizados.",
    cases: [
      {
        tag: "Sofia · WhatsApp & Insta",
        place: "Medicina estética · Paris",
        title: "Clínica com 3 profissionais — as DM noturnas convertem",
        body: "A Sofia responde em FR e PT, qualifica os pedidos (botox, peeling, Hydrafacial) e envia o link de reserva.",
        kpis: [
          { v: "×3", l: "marcações via Instagram" },
          { v: "< 1 min", l: "tempo de resposta" },
          { v: "22 h–7 h", l: "conversão noturna" },
        ],
      },
      {
        tag: "Anti-faltas",
        place: "Instituto de beleza · Lisboa",
        title: "Instituto à beira-mar — faltas divididas por 5",
        body: "Confirmação WhatsApp D-1 e H-2, recuperação em 30 min, lista de espera inteligente: a vaga libertada é preenchida em menos de uma hora.",
        kpis: [
          { v: "−82 %", l: "faltas" },
          { v: "+7 100 €", l: "recuperados / mês" },
          { v: "27 d", l: "ROI atingido" },
        ],
      },
      {
        tag: "Reativação",
        place: "Clínica estética · Cascais",
        title: "Base de clientes adormecida — acordada automaticamente",
        body: "Análise da base: Hydrafacial M+3, botox M+4. Mensagem personalizada trilingue com vaga direta.",
        kpis: [
          { v: "+38 %", l: "recorrência de clientes" },
          { v: "×4", l: "avaliações Google / mês" },
          { v: "3 h", l: "ganhas / dia" },
        ],
      },
      {
        tag: "Máquina de conteúdos",
        place: "Spa premium · Bordéus",
        title: "De 0 a 5 publicações por semana, sem agência",
        body: "Foto antes/depois + mini-formulário → guião de vídeo, legenda e hashtags gerados em 2 minutos.",
        kpis: [
          { v: "×5", l: "volume de conteúdo" },
          { v: "+62 %", l: "alcance Instagram" },
          { v: "2 min", l: "criação / publicação" },
        ],
      },
    ],
  },

  pricing: {
    eyebrow: "Preços",
    title: "Três packs,",
    titleAccent: "um único objetivo: a sua agenda cheia.",
    guarantee:
      "Garantia de 30 dias satisfeito ou reembolsado no setup · Compromisso 12 meses · Preços s/ IVA",
    packs: [
      {
        name: "Starter",
        tagline: "Só a Sofia — o essencial para nunca mais perder uma DM",
        setup: "1 990 €",
        monthly: "290 €",
        deploy: "Implementação 14 dias",
        features: [
          "Sofia 24/7 no WhatsApp & Instagram",
          "Qualificação automática dos pedidos",
          "Reserva Treatwell / Zolmi / Booksy",
          "Recuperação de faltas em 30 min",
          "PT · FR · EN",
        ],
        featured: false,
      },
      {
        name: "Growth",
        tagline: "Sofia + visibilidade IA + conteúdos — o motor de crescimento",
        setup: "3 990 €",
        monthly: "590 €",
        deploy: "Implementação 21 dias",
        features: [
          "Tudo do pack Starter",
          "Visibilidade IA Local (AEO)",
          "Máquina de Conteúdos Instagram / TikTok",
          "5 publicações geradas / semana",
          "Relatório mensal",
        ],
        featured: true,
      },
      {
        name: "Full Stack",
        tagline: "As 4 ofertas + bot de voz + dashboard BI",
        setup: "6 990 €",
        monthly: "990 €",
        deploy: "Implementação 30–45 dias",
        features: [
          "Tudo do pack Growth",
          "Reativação & Seguimento de Clientes",
          "Bot de voz para chamadas perdidas",
          "Dashboard BI (receita recuperada, KPI)",
          "Acompanhamento prioritário",
        ],
        featured: false,
      },
    ],
    note: "A auditoria gratuita de 30 min serve precisamente para escolher o pack certo — venha com os seus números, saia com um plano.",
  },

  faq: {
    eyebrow: "Perguntas frequentes",
    title: "Saber tudo",
    titleAccent: "antes de começar.",
    sideText:
      "Gere uma clínica estética, um instituto de beleza, um spa ou um consultório de medicina estética? Estas são as perguntas que mais nos fazem. Para o resto, a auditoria gratuita de 30 min existe para isso.",
    sideCta: "Reservar a minha auditoria gratuita (30 min)",
    items: [
      {
        q: "Quanto tempo para implementar a Sofia na minha clínica?",
        a: "Pack Starter (só Sofia): 14 dias. Pack Growth: 21 dias. Pack Full Stack: 30 a 45 dias. Cada projeto começa com uma auditoria gratuita de 30 minutos para calcular as perdas atuais (faltas, DM sem resposta) e definir um calendário realista. ROI médio observado: 27 dias.",
      },
      {
        q: "É compatível com Treatwell, Zolmi ou Booksy?",
        a: "Sim. Portugal: Treatwell, Zolmi, Booksy, Phorest. França: Planity, Treatwell, Doctolib Pro, Calenso. Medicina estética: Logos, Julie, Veasy, OrisLine. Mensagens: WhatsApp Business API oficial e Instagram DM via API Meta. Se usa outra ferramenta, verificamos a ligação logo na auditoria.",
      },
      {
        q: "Os dados das clientes e as fotos antes/depois estão seguros?",
        a: "Alojamento 100 % europeu (Scaleway Paris, OVH Roubaix, Hetzner Alemanha). RGPD: DPA assinado, registo de tratamentos, direito ao esquecimento automatizado. Encriptação WhatsApp ponta-a-ponta e base AES-256. Fotos antes/depois: consentimento escrito explícito, armazenamento encriptado. Os seus dados nunca servem para treinar modelos públicos.",
      },
      {
        q: "A Sofia fala francês e inglês para as turistas?",
        a: "Sim — é mesmo um argumento decisivo em Portugal. Português europeu, francês e inglês, com deteção automática da língua na primeira mensagem. A Sofia responde na língua da cliente, em Lisboa, Cascais ou no Algarve.",
      },
      {
        q: "Quanto custa?",
        a: "Starter: 1 990 € de setup + 290 €/mês (s/ IVA). Growth: 3 990 € + 590 €/mês. Full Stack: 6 990 € + 990 €/mês. Compromisso de 12 meses, garantia de 30 dias satisfeito ou reembolsado no setup. A auditoria gratuita de 30 min — sem compromisso — serve para escolher o pack certo.",
      },
      {
        q: "A Sofia vai substituir a minha rececionista?",
        a: "Não. A Sofia trata do que a sua equipa não consegue fazer: responder às 22 h de domingo, qualificar 80 DM em paralelo, contactar clientes inativas há 3 meses. A sua rececionista acolhe as clientes, gere os pagamentos e cuida da relação. Resultado: menos stress, mais marcações.",
      },
      {
        q: "E a deontologia médica?",
        a: "Os nossos guiões são validados por um advogado de saúde/RGPD. A Sofia não faz promessas de resultados, não faz comparações públicas de preços, menciona as contraindicações e encaminha qualquer caso complexo para o profissional. Em medicina estética regulada, validação final com o seu médico responsável antes do lançamento.",
      },
      {
        q: "Que resultados posso esperar no primeiro mês?",
        a: "Resultados médios observados nas nossas clínicas em 30 dias: −82 % de faltas, +34 % de marcações qualificadas via Instagram, −15 h por semana na receção, ROI médio em 27 dias. Estes números são médias observadas, nunca uma garantia — a sua auditoria quantificará o seu potencial real.",
      },
    ],
  },

  finalCta: {
    eyebrow: "Auditoria gratuita · 30 min · sem compromisso",
    title: "Reserve a sua auditoria gratuita,",
    titleAccent: "saia com o seu plano quantificado.",
    sub: "30 minutos por videochamada. Calculamos juntos o que a sua clínica perde todos os meses em DM ignoradas e faltas — e o que a Sofia pode recuperar. Garantia de 30 dias satisfeito ou reembolsado no setup.",
    formTitle: "Prefere ser contactada?",
    formSub: "Deixe os seus dados — resposta em 24 h úteis.",
  },

  form: {
    name: "Nome / Apelido",
    namePh: "O seu nome",
    email: "E-mail",
    emailPh: "voce@asuaclinica.pt",
    establishment: "Tipo de estabelecimento",
    establishmentOptions: [
      "Clínica estética / medicina estética",
      "Instituto de beleza",
      "Spa / centro de bem-estar",
      "Consultório de dermatologia estética",
      "Outro",
    ],
    practitioners: "Número de profissionais",
    practitionersOptions: ["Solo (1)", "2 a 3", "4 a 6", "7+"],
    message: "A sua principal dor",
    messagePh: "Ex.: ~80 DM Instagram /mês mas só 12 marcações. 20 % de faltas…",
    submit: "Enviar o meu pedido",
    success: "Obrigado! Voltamos ao seu contacto em 24 h úteis.",
    error: "Ocorreu um erro. Escreva-nos diretamente: contact.botflow@gmail.com",
  },

  ui: {
    select: "Selecione…",
    sending: "A enviar…",
    mostChosen: "O mais escolhido",
    emailLabel: "Email",
    locationLabel: "Localização",
    legalLabel: "Legal",
    euHosting:
      "🇪🇺 Dados alojados na Europa — Scaleway · OVH · Hetzner — DPA assinado, RGPD nativo",
    openCalendar: "Abrir o calendário de reservas ↗",
    calendarAria: "Calendário de reserva da auditoria gratuita de 30 minutos",
    setupLabel: "setup s/ IVA",
    perMonth: "/mês s/ IVA",
  },

  footer: {
    cta: "Falemos.",
    email: "contact.botflow@gmail.com",
    location: "🇫🇷 Paris · 🇵🇹 Lisboa",
    legal: [
      { label: "Menções legais", href: "/mentions-legales" },
      { label: "Política de privacidade", href: "/politique-confidentialite" },
      { label: "CGV", href: "/cgv" },
    ],
    copyright: "© 2026 BotFlow IA — Todos os direitos reservados",
    compliance: "Conforme RGPD · Alojamento 100 % Europa · Deontologia médica respeitada",
  },
};

export const copyEn: LandingCopy = {
  nav: {
    brand: "BotFlow.IA",
    links: [
      { label: "Sofia", href: "#solution" },
      { label: "Services", href: "#offres" },
      { label: "Results", href: "#resultats" },
      { label: "Pricing", href: "#tarifs" },
      { label: "FAQ", href: "#faq" },
    ],
    cta: "Free audit",
  },

  hero: {
    badge: "2 onboarding slots available this month",
    h1Line1: "Your DMs, your missed calls,",
    h1Accent: "your empty hours,",
    h1Line2: "become appointments.",
    sub: "BotFlow IA deploys Sofia, your trilingual AI assistant (EN · FR · PT). She answers 24/7 on WhatsApp and Instagram, qualifies your clients, books into Planity or Treatwell, recovers no-shows and brings back past clients.",
    ctaPrimary: "Book my free audit (30 min)",
    ctaSecondary: "Meet Sofia",
    compliance: "GDPR compliant · 100% EU hosting",
  },

  trust: {
    label: "Connected to your clinic's tools",
    headline: "Planity, Treatwell, Zolmi, WhatsApp, Instagram.",
    sub: "GDPR secure, hosted in Europe.",
    tools: [
      "Planity",
      "Treatwell",
      "Zolmi",
      "Booksy",
      "Doctolib Pro",
      "Phorest",
      "WhatsApp Business",
      "Instagram DM",
    ],
  },

  problem: {
    eyebrow: "What you lose every month",
    title: "Every ignored DM is an appointment",
    titleAccent: "at your competitor's.",
    items: [
      {
        stat: "68%",
        statLabel: "of after-hours DMs never get answered",
        title: "The 10pm DMs",
        body: "A client writes after work. No reply until noon the next day — she's already booked elsewhere. Out of ~80 Instagram enquiries a month, only 10 to 15 become appointments.",
      },
      {
        stat: "15–20%",
        statLabel: "no-show rate on an unconfirmed diary",
        title: "The silent no-shows",
        body: "An empty Hydrafacial slot at 2pm can never be recovered. At 15–20% no-shows, a 3-practitioner clinic lets thousands of euros evaporate each month.",
      },
      {
        stat: "6 months",
        statLabel: "without follow-up = lost client",
        title: "The dormant clients",
        body: "Mrs Garcia hasn't been back in 5 months. Nobody has time to follow up. Without outreach, most one-time clients never book again.",
      },
    ],
    closing:
      "Meanwhile your team is in the treatment room — that's their job. Answering at midnight, confirming, following up: that's Sofia's.",
  },

  solution: {
    eyebrow: "How Sofia works",
    title: "From curious client",
    titleAccent: "to confirmed booking.",
    steps: [
      { icon: "💬", title: "DM / WhatsApp", body: "A client writes at 10pm" },
      { icon: "✨", title: "Sofia replies", body: "In EN, FR or PT — qualifies treatment, budget, urgency" },
      { icon: "📅", title: "Booking made", body: "Planity / Treatwell link sent, slot confirmed" },
      { icon: "🔔", title: "Auto follow-ups", body: "D-1 and H-2 confirmations, no-show recovery within 30 min" },
      { icon: "⭐", title: "Google reviews", body: "Review request at D+3, reactivation at M+3" },
    ],
  },

  offers: {
    eyebrow: "Our 4 services",
    title: "The complete system to",
    titleAccent: "fill your diary on autopilot.",
    items: [
      {
        num: "01",
        title: "Sofia — 24/7 Front Desk",
        benefit: "No DM ever goes unanswered again, even Sunday at midnight.",
        body: "Sofia answers on Instagram and WhatsApp, knows your treatments, prices and contraindications, and sends the booking link connected to your Planity or Treatwell diary.",
      },
      {
        num: "02",
        title: "Local AI Visibility (AEO)",
        benefit: "When someone asks ChatGPT for “the best clinic near me”, it's you.",
        body: "Your clients no longer search Google: they ask ChatGPT, Perplexity or Apple Intelligence. We optimise your data so AI models recommend your business.",
      },
      {
        num: "03",
        title: "Instagram / TikTok Content Machine",
        benefit: "5 posts a week, without a creative agency or late-night editing.",
        body: "You take the before/after photo and fill a mini-form. The AI generates video script, caption and local hashtags in 2 minutes.",
      },
      {
        num: "04",
        title: "Client Reactivation & Follow-up",
        benefit: "Your diary gaps fill themselves.",
        body: "Sofia scans your client base and reaches out to those due back (Hydrafacial M+3, facial M+1). At D+3 she checks in and asks for a Google review.",
      },
    ],
  },

  process: {
    eyebrow: "Our process",
    title: "From audit to deployment,",
    titleAccent: "without breaking anything.",
    steps: [
      {
        num: "01",
        title: "Free audit — 30 min",
        body: "We understand your clinic, your treatments, your lead sources. Together we calculate the revenue you lose to no-shows and ignored DMs.",
      },
      {
        num: "02",
        title: "Mapping",
        body: "Analysis of your flows: Instagram, Planity, Treatwell, client base. We identify the priority revenue leaks.",
      },
      {
        num: "03",
        title: "Training Sofia",
        body: "Sofia learns your treatment menu, prices, contraindications and tone. Connection to WhatsApp Business, Instagram and your diary.",
      },
      {
        num: "04",
        title: "Deployment in 14 days",
        body: "Progressive go-live (10% of traffic → 100%), 1-hour team training, tracking dashboard.",
      },
      {
        num: "05",
        title: "Ongoing management",
        body: "Monthly KPI review: bookings generated, € recovered, satisfaction. Sofia evolves with your new treatments and seasons.",
      },
    ],
  },

  results: {
    eyebrow: "Average observed results",
    title: "What our clinics observe",
    titleAccent: "after 30 days.",
    disclaimer:
      "Averages observed across equipped clinics — results vary by business and are never guaranteed.",
    stats: [
      { value: 82, prefix: "−", suffix: "%", label: "no-shows" },
      { value: 34, prefix: "+", suffix: "%", label: "qualified bookings from Instagram" },
      { value: 15, prefix: "−", suffix: "h", label: "per week at the front desk" },
      { value: 27, prefix: "", suffix: "d", label: "average ROI on setup" },
    ],
    casesLabel:
      "Representative cases — typical scenarios built from average observed results, anonymised.",
    cases: [
      {
        tag: "Sofia · WhatsApp & Insta",
        place: "Aesthetic medicine · Paris",
        title: "3-practitioner clinic — night DMs now convert",
        body: "Sofia replies in FR and PT, qualifies enquiries (botox, peels, Hydrafacial) and sends the Planity link.",
        kpis: [
          { v: "×3", l: "bookings from Instagram" },
          { v: "< 1 min", l: "response time" },
          { v: "10pm–7am", l: "overnight conversion" },
        ],
      },
      {
        tag: "Anti no-show",
        place: "Beauty institute · Lisbon",
        title: "Seaside institute — no-shows divided by 5",
        body: "WhatsApp confirmation D-1 and H-2, recovery within 30 min, smart waitlist: the freed slot is filled in under an hour.",
        kpis: [
          { v: "−82%", l: "no-shows" },
          { v: "+€7,100", l: "recovered / month" },
          { v: "27d", l: "ROI reached" },
        ],
      },
      {
        tag: "Reactivation",
        place: "Aesthetic clinic · Cascais",
        title: "Dormant client base — woken automatically",
        body: "Base scan: Hydrafacial M+3, botox M+4. Personalised trilingual message with a direct slot.",
        kpis: [
          { v: "+38%", l: "client recurrence" },
          { v: "×4", l: "Google reviews / month" },
          { v: "3h", l: "saved / day" },
        ],
      },
      {
        tag: "Content machine",
        place: "Premium spa · Bordeaux",
        title: "From 0 to 5 posts a week, without an agency",
        body: "Before/after photo + mini-form → video script, caption and hashtags generated in 2 minutes.",
        kpis: [
          { v: "×5", l: "content volume" },
          { v: "+62%", l: "Instagram reach" },
          { v: "2 min", l: "creation / post" },
        ],
      },
    ],
  },

  pricing: {
    eyebrow: "Pricing",
    title: "Three packs,",
    titleAccent: "one goal: a full diary.",
    guarantee:
      "30-day money-back guarantee on setup · 12-month commitment · Prices excl. VAT",
    packs: [
      {
        name: "Starter",
        tagline: "Sofia alone — the essentials so you never miss a DM",
        setup: "€1,990",
        monthly: "€290",
        deploy: "14-day deployment",
        features: [
          "Sofia 24/7 on WhatsApp & Instagram",
          "Automatic enquiry qualification",
          "Planity / Treatwell booking",
          "No-show recovery within 30 min",
          "EN · FR · PT",
        ],
        featured: false,
      },
      {
        name: "Growth",
        tagline: "Sofia + AI visibility + content — the growth engine",
        setup: "€3,990",
        monthly: "€590",
        deploy: "21-day deployment",
        features: [
          "Everything in Starter",
          "Local AI Visibility (AEO)",
          "Instagram / TikTok Content Machine",
          "5 generated posts / week",
          "Monthly reporting",
        ],
        featured: true,
      },
      {
        name: "Full Stack",
        tagline: "All 4 services + voice bot + BI dashboard",
        setup: "€6,990",
        monthly: "€990",
        deploy: "30–45-day deployment",
        features: [
          "Everything in Growth",
          "Client Reactivation & Follow-up",
          "Voice bot for missed calls",
          "BI dashboard (recovered revenue, KPIs)",
          "Priority management",
        ],
        featured: false,
      },
    ],
    note: "The free 30-min audit exists precisely to choose the right pack — come with your numbers, leave with a plan.",
  },

  faq: {
    eyebrow: "Frequently asked questions",
    title: "Everything to know",
    titleAccent: "before starting.",
    sideText:
      "You run an aesthetic clinic, beauty institute, spa or aesthetic medicine practice? These are the questions we hear most. For everything else, that's what the free 30-min audit is for.",
    sideCta: "Book my free audit (30 min)",
    items: [
      {
        q: "How long to deploy Sofia in my clinic?",
        a: "Starter pack (Sofia alone): 14 days. Growth pack: 21 days. Full Stack pack: 30 to 45 days. Every project starts with a free 30-minute audit to calculate your current losses (no-shows, unanswered DMs) and set a realistic timeline. Average observed ROI: 27 days.",
      },
      {
        q: "Is it compatible with Planity, Treatwell or Zolmi?",
        a: "Yes. France: Planity, Treatwell, Doctolib Pro, Calenso. Portugal: Treatwell, Zolmi, Booksy, Phorest. Aesthetic medicine: Logos, Julie, Veasy, OrisLine. Messaging: official WhatsApp Business API and Instagram DM via the Meta API. If you use another tool, we check the bridge during the audit.",
      },
      {
        q: "Are my client data and before/after photos safe?",
        a: "100% European hosting (Scaleway Paris, OVH Roubaix, Hetzner Germany). GDPR: signed DPA, processing register, automated right to erasure. WhatsApp end-to-end encryption and AES-256 database. Before/after photos: explicit written consent, encrypted storage. Your data is never used to train public models.",
      },
      {
        q: "Does Sofia speak Portuguese and French?",
        a: "Yes. English, French and European Portuguese, with automatic language detection from the first message. Sofia replies in the client's language — in Paris, Lisbon or Cascais.",
      },
      {
        q: "How much does it cost?",
        a: "Starter: €1,990 setup + €290/month (excl. VAT). Growth: €3,990 + €590/month. Full Stack: €6,990 + €990/month. 12-month commitment, 30-day money-back guarantee on setup. The free 30-min audit — no commitment — helps choose the right pack.",
      },
      {
        q: "Will Sofia replace my receptionist?",
        a: "No. Sofia handles what your team can't: answering at 10pm on a Sunday, qualifying 80 DMs in parallel, reaching out to clients inactive for 3 months. Your receptionist welcomes clients, handles payments and nurtures the relationship. Result: less stress, more bookings.",
      },
      {
        q: "What about medical ethics?",
        a: "Our scripts are validated by a health/GDPR lawyer. Sofia makes no outcome promises, no public price comparisons, mentions contraindications and routes any complex case to the practitioner. For regulated aesthetic medicine, final validation with your referring practitioner before launch.",
      },
      {
        q: "What results can I expect in the first month?",
        a: "Average results observed across our clinics over 30 days: −82% no-shows, +34% qualified bookings from Instagram, −15h per week at the front desk, average ROI in 27 days. These are observed averages, never a guarantee — your audit will quantify your real potential.",
      },
    ],
  },

  finalCta: {
    eyebrow: "Free audit · 30 min · no commitment",
    title: "Book your free audit,",
    titleAccent: "leave with your quantified plan.",
    sub: "30 minutes over video call. Together we calculate what your clinic loses every month to ignored DMs and no-shows — and what Sofia can recover. 30-day money-back guarantee on setup.",
    formTitle: "Prefer to be contacted?",
    formSub: "Leave your details — reply within 24 business hours.",
  },

  form: {
    name: "Name",
    namePh: "Your name",
    email: "Email",
    emailPh: "you@yourclinic.com",
    establishment: "Type of business",
    establishmentOptions: [
      "Aesthetic clinic / aesthetic medicine",
      "Beauty institute",
      "Spa / wellness centre",
      "Aesthetic dermatology practice",
      "Other",
    ],
    practitioners: "Number of practitioners",
    practitionersOptions: ["Solo (1)", "2 to 3", "4 to 6", "7+"],
    message: "Your main pain point",
    messagePh: "E.g.: ~80 Instagram DMs /month but only 12 bookings. 20% no-shows…",
    submit: "Send my request",
    success: "Thank you! We'll get back to you within 24 business hours.",
    error: "Something went wrong. Email us directly: contact.botflow@gmail.com",
  },

  ui: {
    select: "Select…",
    sending: "Sending…",
    mostChosen: "Most popular",
    emailLabel: "Email",
    locationLabel: "Location",
    legalLabel: "Legal",
    euHosting:
      "🇪🇺 Data hosted in Europe — Scaleway · OVH · Hetzner — signed DPA, GDPR native",
    openCalendar: "Open the booking calendar ↗",
    calendarAria: "Booking calendar for the free 30-minute audit",
    setupLabel: "setup excl. VAT",
    perMonth: "/month excl. VAT",
  },

  footer: {
    cta: "Let's talk.",
    email: "contact.botflow@gmail.com",
    location: "🇫🇷 Paris · 🇵🇹 Lisboa",
    legal: [
      { label: "Legal notice", href: "/mentions-legales" },
      { label: "Privacy policy", href: "/politique-confidentialite" },
      { label: "Terms of sale", href: "/cgv" },
    ],
    copyright: "© 2026 BotFlow IA — All rights reserved",
    compliance: "GDPR compliant · 100% EU hosting · Medical ethics respected",
  },
};

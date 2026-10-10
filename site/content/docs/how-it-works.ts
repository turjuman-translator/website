// How it works (/how-it-works). Sources: README, docs/guide.md (caption blocks, the prayer, OBS,
// costs), selfhost/README.md ("How it works", "Costs, data and privacy"), docs/hosting.md ("What a
// mosque does"), languages.yaml, src/text/honorifics.ts ("Allah, never God" in Dutch and
// English), config.example.yaml (the approved Quran translation is Dutch only by default).
import { type DocPage, L } from "../doc.js";

export const howItWorks: DocPage = {
  title: L(
    "How live khutbah translation works · Turjuman",
    "Zo werkt de live vertaling van de khutbah · Turjuman",
    "كيف تعمل الترجمة الفورية للخطبة · ترجمان",
  ),
  desc: L(
    "What happens between the imam's microphone and the screen, what the congregation reads, what you need and what it costs.",
    "Wat er gebeurt tussen de microfoon van de imam en het scherm, wat de gemeenschap leest, wat je nodig hebt en wat het kost.",
    "ما يجري بين ميكروفون الإمام والشاشة، وما يقرؤه المصلّون، وما تحتاج إليه، وكم يكلّف.",
  ),
  h1: L("How it works", "Hoe het werkt", "كيف يعمل"),
  lead: L(
    "The imam speaks Arabic; the screens show the translation seconds after each sentence. It works the same for lessons and talks.",
    "De imam spreekt Arabisch; de schermen tonen de vertaling enkele seconden na elke zin. Het werkt net zo voor lessen en lezingen.",
    "يخطب الإمام بالعربية، وتعرض الشاشات الترجمة بعد ثوانٍ من كل جملة. ويعمل ترجمان كذلك مع الدروس والمحاضرات.",
  ),
  sections: [
    {
      id: "flow",
      h2: L(
        "From the minbar to the screen",
        "Van de minbar naar het scherm",
        "من المنبر إلى الشاشة",
      ),
      blocks: [
        {
          flow: [
            {
              title: L("The microphone", "De microfoon", "الميكروفون"),
              text: L(
                "The mosque's own, with its mixer",
                "Die van de moskee, met het mengpaneel",
                "ميكروفون المسجد ومازج الصوت",
              ),
            },
            {
              title: L(
                "The computer at the screen",
                "De computer bij het scherm",
                "الحاسوب المتصل بالشاشة",
              ),
              text: L(
                "OBS or a browser, listening to its audio input",
                "OBS of een browser, die naar de geluidsingang luistert",
                "OBS أو متصفح يستمع إلى مدخل الصوت",
              ),
            },
            {
              title: L("Turjuman", "Turjuman", "ترجمان"),
              text: L("The server", "De server", "الخادم"),
            },
            {
              title: L("Soniox", "Soniox", "Soniox"),
              text: L(
                "Hears the Arabic and translates it",
                "Hoort het Arabisch en vertaalt het",
                "يسمع العربية ويترجمها",
              ),
            },
            {
              title: L("The screen", "Het scherm", "الشاشة"),
              text: L(
                "A TV, a projector or a stream",
                "Een tv, een beamer of een stream",
                "تلفاز أو جهاز عرض أو بث",
              ),
            },
          ],
        },
        {
          p: L(
            "After 30 seconds of silence the connection to Soniox closes, so long pauses cost nothing.",
            "Na 30 seconden stilte sluit de verbinding met Soniox, dus lange pauzes kosten niets.",
            "يُغلق الاتصال بـ Soniox بعد 30 ثانية من الصمت، فلا تكلّف فترات التوقف الطويلة شيئًا.",
          ),
        },
      ],
    },
    {
      id: "reads",
      h2: L("What the congregation reads", "Wat de gemeenschap leest", "ما يقرؤه المصلّون"),
      blocks: [
        {
          ul: [
            L(
              "Complete sentences, a few seconds after the imam pauses: faithful, never a summary.",
              "Hele zinnen, enkele seconden nadat de imam pauzeert: getrouw, nooit een samenvatting.",
              "جمل كاملة بعد ثوانٍ من توقّف الإمام، مترجمة بأمانة، وليست تلخيصًا.",
            ),
            L(
              "Quran verses in quotes, with a reference such as (2:286) only when the Arabic matches the Quran text exactly.",
              "Koranverzen tussen aanhalingstekens, met een verwijzing zoals (2:286) alleen als het Arabisch precies overeenkomt met de Korantekst.",
              "آيات القرآن بين علامتي تنصيص، مع مرجع مثل (2:286) فقط إذا طابق النص العربي نصَّ القرآن تمامًا.",
            ),
            L("Duas with their own accent.", "Dua's met een eigen accent.", "الأدعية بلون يميّزها."),
            L(
              "Honorifics as one calligraphic glyph after the name: Muhammad ﷺ. In Dutch and English, Allah is always “Allah”, never “God”.",
              "Eretitels als één kalligrafisch teken na de naam: Mohammed ﷺ. In het Nederlands en het Engels is Allah altijd „Allah”, nooit „God”.",
              "صيغ التعظيم رمزًا خطّيًا واحدًا بعد الاسم: محمد ﷺ. وفي الهولندية والإنجليزية يبقى لفظ الجلالة «Allah» ولا يُترجم إلى «God».",
            ),
          ],
        },
      ],
    },
    {
      id: "prayer",
      h2: L("Athan, Iqama and Salah", "Athan, Iqama en Salah", "الأذان والإقامة والصلاة"),
      blocks: [
        {
          p: L(
            "Turjuman recognises the Athan, the Iqama and the prayer from the Arabic; the khutbah's own takbir and shahada never trigger them. A calm card takes the captions' place, nothing is shown during the prayer, and one tap on your phone overrides it.",
            "Turjuman herkent de Athan, de Iqama en het gebed aan het Arabisch; de takbir en shahada in de khutbah zelf zetten ze nooit in gang. Een rustige kaart neemt de plaats van de ondertiteling in, tijdens het gebed wordt niets getoond, en met één tik op je telefoon stuur je het zelf.",
            "يتعرّف ترجمان على الأذان والإقامة والصلاة من النص العربي، ولا يُخطئ فيعدّ تكبير الخطبة وشهادتها أذانًا. تحلّ بطاقة هادئة محلّ الترجمة، ولا يظهر شيء أثناء الصلاة، ويمكنك التبديل يدويًا بلمسة على هاتفك.",
          ),
        },
      ],
    },
    {
      id: "imam",
      h2: L("For the imam", "Voor de imam", "للإمام"),
      blocks: [
        {
          p: L(
            "Nothing changes: he speaks into the usual microphone. A verse gets a reference only when it is certain; a wrong reference is worse than none.",
            "Er verandert niets: hij spreekt in de gewone microfoon. Een vers krijgt alleen een verwijzing als die zeker is; een verkeerde verwijzing is erger dan geen.",
            "لا يتغيّر شيء: يخطب في الميكروفون المعتاد. ولا تُذكر للآية مرجع إلا إذا كان مؤكّدًا، فالمرجع الخاطئ أسوأ من غيابه.",
          ),
        },
      ],
    },
    {
      id: "languages",
      h2: L("60 languages", "60 talen", "60 لغة"),
      blocks: [
        {
          p: L(
            "The khutbah can be in any of these languages, and the captions in any other.",
            "De khutbah kan in elk van deze talen zijn, en de ondertiteling in elke andere.",
            "يمكن أن تكون الخطبة بأيّ من هذه اللغات، والترجمة بأيّ لغة أخرى منها.",
          ),
        },
        { langs: true },
      ],
    },
    {
      id: "need",
      h2: L("What you need", "Wat je nodig hebt", "ما تحتاج إليه"),
      blocks: [
        {
          ul: [
            L(
              "A computer at the screen with the mosque's audio, for example through a USB audio interface on the mixer's aux output.",
              "Een computer bij het scherm met het geluid van de moskee, bijvoorbeeld via een USB-audio-interface op de aux-uitgang van het mengpaneel.",
              "حاسوب بجوار الشاشة يصله صوت المسجد، مثلًا عبر واجهة صوت USB موصولة بمخرج aux في مازج الصوت.",
            ),
            L(
              "A TV or a projector. OBS Studio is optional.",
              "Een tv of een beamer. OBS Studio is optioneel.",
              "تلفاز أو جهاز عرض. أما OBS Studio فاختياري.",
            ),
            L("Internet.", "Internet.", "اتصال بالإنترنت."),
            L(
              "A Soniox account with credit.",
              "Een Soniox-account met tegoed.",
              "حساب في Soniox فيه رصيد.",
            ),
          ],
        },
      ],
    },
    {
      id: "costs",
      h2: L("What it costs", "Wat het kost", "التكلفة"),
      blocks: [
        {
          ul: [
            L("Turjuman is free.", "Turjuman is gratis.", "ترجمان مجاني."),
            L(
              "Soniox bills the mosque's own account directly: about $0.12 per hour for the speech and about $0.06 per hour for the translation, at its list prices.",
              "Soniox rekent rechtstreeks af met het eigen account van de moskee: ongeveer $0,12 per uur voor de spraak en ongeveer $0,06 per uur voor de vertaling, tegen de prijzen van Soniox.",
              "يحاسب Soniox حساب المسجد نفسه مباشرة: نحو 0.12 دولار للساعة مقابل الكلام، ونحو 0.06 دولار للساعة مقابل الترجمة، بحسب أسعاره المعلنة.",
            ),
            L(
              "Silence longer than 30 seconds costs nothing.",
              "Stilte van meer dan 30 seconden kost niets.",
              "الصمت الذي يزيد على 30 ثانية لا يكلّف شيئًا.",
            ),
            L(
              "The app shows this month's usage, with an estimate of the cost.",
              "De app toont het gebruik van deze maand, met een schatting van de kosten.",
              "يعرض التطبيق استهلاك هذا الشهر مع تقدير للتكلفة.",
            ),
          ],
        },
      ],
    },
    {
      id: "start",
      h2: L("Start in four steps", "Begin in vier stappen", "ابدأ في أربع خطوات"),
      blocks: [
        {
          ol: [
            L("Create an account.", "Maak een account.", "أنشئ حسابًا."),
            L(
              "Add your Soniox key: the app guides you, it takes a few minutes.",
              "Voeg je Soniox-sleutel toe: de app helpt je, het kost een paar minuten.",
              "أضف مفتاح Soniox: سيرشدك التطبيق، ولن يستغرق ذلك إلا بضع دقائق.",
            ),
            L(
              "Make a screen: the languages, the layout, the look and the microphone.",
              "Maak een scherm: de talen, de indeling, de stijl en de microfoon.",
              "أنشئ شاشة: اللغتان والتخطيط والنمط والميكروفون.",
            ),
            L(
              "Put its link in OBS or a browser. A new screen starts off: switch it on in the app before the khutbah.",
              "Zet de link in OBS of een browser. Een nieuw scherm staat uit: zet het vóór de khutbah aan in de app.",
              "ضع رابطها في OBS أو في متصفح. تبدأ الشاشة الجديدة متوقفة، فشغّلها من التطبيق قبل الخطبة.",
            ),
          ],
        },
        {
          actions: [
            {
              to: "app:start",
              label: L("Start for free", "Gratis beginnen", "ابدأ مجانًا"),
              primary: true,
            },
            { to: "page:self-host", label: L("Run it yourself", "Zelf hosten", "شغّله بنفسك") },
          ],
        },
      ],
    },
    {
      id: "faq",
      h2: L("Questions", "Vragen", "أسئلة"),
      blocks: [
        {
          faq: [
            {
              q: L("Is it free?", "Is het gratis?", "هل هو مجاني؟"),
              a: L(
                "Yes. Turjuman is free and open source (MIT). You pay only Soniox, for the speech and the translation.",
                "Ja. Turjuman is gratis en open source (MIT). Je betaalt alleen Soniox, voor de spraak en de vertaling.",
                "نعم. ترجمان مجاني ومفتوح المصدر (MIT). لا تدفع إلا لـ Soniox مقابل الكلام والترجمة.",
              ),
            },
            {
              q: L(
                "Who pays Soniox, and how much?",
                "Wie betaalt Soniox, en hoeveel?",
                "من يدفع لـ Soniox، وكم؟",
              ),
              a: L(
                "The mosque, with its own Soniox account: about $0.18 for an hour of speech, at Soniox's list prices.",
                "De moskee, met een eigen Soniox-account: ongeveer $0,18 per uur spraak, tegen de prijzen van Soniox.",
                "المسجد، من حسابه الخاص في Soniox: نحو 0.18 دولار لكل ساعة كلام، بحسب أسعار Soniox المعلنة.",
              ),
            },
            {
              q: L("Is the khutbah stored?", "Wordt de khutbah bewaard?", "هل تُحفظ الخطبة؟"),
              a: L(
                "The captions of each session are kept on the server as a transcript. The server's operator can switch this off.",
                "De ondertiteling van elke sessie wordt als transcript op de server bewaard. De beheerder van de server kan dat uitzetten.",
                "تُحفظ ترجمة كل جلسة على الخادم نصًّا مكتوبًا، ويستطيع القائم على الخادم إيقاف ذلك.",
              ),
            },
            {
              q: L(
                "Which Quran translation is used?",
                "Welke Koranvertaling wordt gebruikt?",
                "أيّ ترجمة للقرآن تُستخدم؟",
              ),
              a: L(
                "In Dutch, the approved translation by Siregar. In other languages, Soniox translates the verse; its reference is checked in every language.",
                "In het Nederlands de erkende vertaling van Siregar. In andere talen vertaalt Soniox het vers; de verwijzing wordt in elke taal gecontroleerd.",
                "بالهولندية، الترجمة المعتمدة لسيريغار. وفي اللغات الأخرى يترجم Soniox الآية، ويُتحقَّق من مرجعها في كل اللغات.",
              ),
            },
            {
              q: L("Does it need internet?", "Is er internet nodig?", "هل يحتاج إلى الإنترنت؟"),
              a: L(
                "Yes: the speech goes to Soniox to be heard and translated.",
                "Ja: de spraak gaat naar Soniox om gehoord en vertaald te worden.",
                "نعم: يُرسل الكلام إلى Soniox ليسمعه ويترجمه.",
              ),
            },
            {
              q: L(
                "Several halls or languages at once?",
                "Meerdere zalen of talen tegelijk?",
                "أكثر من قاعة أو لغة في الوقت نفسه؟",
              ),
              a: L(
                "Make one screen per language. The same screen can be shown on several displays.",
                "Maak één scherm per taal. Hetzelfde scherm kan op meerdere beeldschermen staan.",
                "أنشئ شاشة لكل لغة. ويمكن عرض الشاشة نفسها على أكثر من جهاز عرض.",
              ),
            },
          ],
        },
        {
          cards: [
            {
              to: "page:show-on-a-screen",
              title: L("Show on a screen", "Op een scherm tonen", "عرض على شاشة"),
              text: L(
                "OBS Studio or a browser, the audio, and Friday.",
                "OBS Studio of een browser, het geluid, en de vrijdag.",
                "OBS Studio أو المتصفح، والصوت، ويوم الجمعة.",
              ),
            },
            {
              to: "page:security",
              title: L("Security", "Beveiliging", "الأمان"),
              text: L(
                "How keys, audio and accounts are protected.",
                "Hoe sleutels, geluid en accounts beschermd zijn.",
                "كيف تُحمى المفاتيح والصوت والحسابات.",
              ),
            },
          ],
        },
      ],
    },
  ],
};

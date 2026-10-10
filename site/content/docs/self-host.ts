// Self-host: overview (/self-host). Sources: selfhost/README.md (the intro, "How it works", "What
// you need", "Docker: keep it running", "Update", "Back up"), README ("Run it yourself", "Your
// keys and your data"), docs/hosting.md.
import { type DocPage, L } from "../doc.js";
import { GITHUB_URL, SELF_HOST_COMMANDS, SELF_HOST_REPO } from "../links.js";
import { HOSTING_DOC, START_APP_LINES } from "./shared.js";

export const selfHost: DocPage = {
  title: L(
    "Self-host Turjuman: open source, on your own computer",
    "Turjuman zelf hosten: open source, op je eigen computer",
    "استضف ترجمان بنفسك: مفتوح المصدر وعلى حاسوبك",
  ),
  desc: L(
    "Run Turjuman on your own computer with the turjuman command: what you need, a quick start, and the steps.",
    "Draai Turjuman op je eigen computer met de opdracht turjuman: wat je nodig hebt, een snelle start, en de stappen.",
    "شغّل ترجمان على حاسوبك بالأمر turjuman: ما تحتاج إليه، وبداية سريعة، والخطوات.",
  ),
  h1: L("Run Turjuman yourself", "Draai Turjuman zelf", "شغّل ترجمان بنفسك"),
  lead: L(
    "The same app on your own computer, with the `turjuman` command.",
    "Dezelfde app op je eigen computer, met de opdracht `turjuman`.",
    "التطبيق نفسه على حاسوبك، مع الأمر `turjuman`.",
  ),
  actions: [
    {
      to: "page:install",
      label: L("Install step by step", "Stap voor stap installeren", "التثبيت خطوة بخطوة"),
      primary: true,
    },
    { to: SELF_HOST_REPO, label: "turjuman-translator/cli · GitHub" },
  ],
  sections: [
    {
      id: "compare",
      h2: L(
        "Hosted, or on your own computer?",
        "Gehost, of op je eigen computer?",
        "على خادم مستضاف، أم على حاسوبك؟",
      ),
      blocks: [
        {
          p: L(
            "Both are free, and in both the mosque pays Soniox.",
            "Allebei zijn gratis, en in allebei betaalt de moskee Soniox.",
            "كلاهما مجاني، وفي كليهما يدفع المسجد لـ Soniox.",
          ),
        },
        {
          table: {
            head: [
              "",
              L("Hosted", "Gehost", "مستضاف"),
              L("Self-hosted", "Zelf gehost", "باستضافة ذاتية"),
            ],
            rows: [
              [
                L("Who runs the server", "Wie de server draait", "من يشغّل الخادم"),
                L("The server's operator", "De beheerder van de server", "القائم على الخادم"),
                L("You", "Jij", "أنت"),
              ],
              [
                L("Where the key lives", "Waar de sleutel staat", "أين يُحفظ المفتاح"),
                L("Encrypted on the server", "Versleuteld op de server", "مشفّرًا على الخادم"),
                L(
                  "`.env` on your computer, or encrypted by the app",
                  "`.env` op je computer, of versleuteld door de app",
                  "في `.env` على حاسوبك، أو مشفّرًا في التطبيق",
                ),
              ],
              [
                L("Where the audio goes", "Waar het geluid heen gaat", "إلى أين يذهب الصوت"),
                L("That server, then Soniox", "Die server, dan Soniox", "إلى ذلك الخادم ثم Soniox"),
                L("Your computer, then Soniox", "Je computer, dan Soniox", "إلى حاسوبك ثم Soniox"),
              ],
              [
                L("What you need", "Wat je nodig hebt", "ما تحتاج إليه"),
                L("A browser or OBS", "Een browser of OBS", "متصفح أو OBS"),
                L(
                  "Also Node.js 24 or newer and git (or Docker), and a computer that is on during the khutbah",
                  "Ook Node.js 24 of nieuwer en git (of Docker), en een computer die tijdens de khutbah aanstaat",
                  "إضافةً إلى Node.js 24 أو أحدث وgit (أو Docker)، وحاسوب يعمل أثناء الخطبة",
                ),
              ],
              [
                L("Updates", "Updates", "التحديثات"),
                L("The operator", "De beheerder", "القائم على الخادم"),
                L(
                  "You: `git pull`, or `make update`",
                  "Jij: `git pull`, of `make update`",
                  "أنت: `git pull` أو `make update`",
                ),
              ],
              [
                L("Commands", "Opdrachten", "الأوامر"),
                L("None", "Geen", "لا توجد"),
                L("The `turjuman` command", "De opdracht `turjuman`", "الأمر `turjuman`"),
              ],
            ],
          },
        },
      ],
    },
    {
      id: "need",
      h2: L("What you need", "Wat je nodig hebt", "ما تحتاج إليه"),
      blocks: [
        {
          ul: [
            L(
              "A computer (macOS, Linux or Windows) that is on during the khutbah. The computer that runs OBS works fine.",
              "Een computer (macOS, Linux of Windows) die tijdens de khutbah aanstaat. De computer waarop OBS draait, is prima.",
              "حاسوب (macOS أو Linux أو Windows) يعمل أثناء الخطبة. ويصلح لذلك الحاسوب الذي يعمل عليه OBS.",
            ),
            L(
              "Node.js 24 or newer and git, or Docker.",
              "Node.js 24 of nieuwer en git, of Docker.",
              "Node.js 24 أو أحدث وgit، أو Docker.",
            ),
            L(
              "A Soniox account with credit.",
              "Een Soniox-account met tegoed.",
              "حساب في Soniox فيه رصيد.",
            ),
            L(
              "Internet: outbound HTTPS to Soniox.",
              "Internet: uitgaand HTTPS naar Soniox.",
              "الإنترنت: اتصال HTTPS صادر إلى Soniox.",
            ),
            L(
              "The mosque's audio on the computer that shows the captions: [how it works](page:install#how).",
              "Het geluid van de moskee op de computer die de ondertiteling toont: [hoe het werkt](page:install#how).",
              "صوت المسجد على الحاسوب الذي يعرض الترجمة: [كيف يعمل](page:install#how).",
            ),
          ],
        },
      ],
    },
    {
      id: "quick-start",
      h2: L("Quick start", "Snelle start", "بداية سريعة"),
      blocks: [
        { code: SELF_HOST_COMMANDS },
        {
          p: L(
            "`start` prints where to open the app:",
            "`start` toont waar je de app opent:",
            "يعرض `start` عناوين فتح التطبيق:",
          ),
        },
        { code: START_APP_LINES, kind: "output" },
        {
          p: L(
            "The first start makes `config.yaml` and downloads the Quran data in the background, for verified verse references. With Docker the start is `make up`: [Docker](page:docker). Every step, explained: [Install](page:install).",
            "De eerste start maakt `config.yaml` en haalt op de achtergrond de Korandata op, voor gecontroleerde versverwijzingen. Met Docker is de start `make up`: [Docker](page:docker). Elke stap uitgelegd: [Installeren](page:install).",
            "ينشئ التشغيل الأول `config.yaml` ويُنزّل في الخلفية بيانات القرآن لمراجع الآيات الموثّقة. ومع Docker يكون التشغيل بالأمر `make up`: [Docker](page:docker). وكل خطوة مشروحة في [التثبيت](page:install).",
          ),
        },
      ],
    },
    {
      id: "steps",
      h2: L("The steps", "De stappen", "الخطوات"),
      blocks: [
        {
          cards: [
            {
              to: "page:install",
              title: L("Install", "Installeren", "التثبيت"),
              text: L(
                "Install, set up your keys, start, and make your first screen.",
                "Installeren, je sleutels instellen, starten en je eerste scherm maken.",
                "ثبّت، واضبط مفاتيحك، وشغّل، وأنشئ شاشتك الأولى.",
              ),
            },
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
              to: "page:network",
              title: L("Phone & network", "Telefoon & netwerk", "الهاتف والشبكة"),
              text: L(
                "Your phone on the Wi-Fi, HTTPS for other devices, and access from outside.",
                "Je telefoon op de wifi, HTTPS voor andere apparaten, en toegang van buiten.",
                "هاتفك على شبكة الواي فاي، وHTTPS للأجهزة الأخرى، والوصول من خارج المسجد.",
              ),
            },
            {
              to: "page:docker",
              title: L("Docker", "Docker", "Docker"),
              text: L(
                "Keep it running, also after a restart.",
                "Laat het altijd draaien, ook na een herstart.",
                "أبقِه يعمل دائمًا، حتى بعد إعادة التشغيل.",
              ),
            },
            {
              to: "page:commands",
              title: L("Commands", "Opdrachten", "الأوامر"),
              text: L(
                "Every command, with examples.",
                "Elke opdracht, met voorbeelden.",
                "كل الأوامر، مع أمثلة.",
              ),
            },
          ],
        },
      ],
    },
    {
      id: "take-on",
      h2: L("What you take on", "Waar je zelf voor zorgt", "ما تتولّاه بنفسك"),
      blocks: [
        {
          ul: [
            L(
              "The computer must be on during the khutbah.",
              "De computer moet tijdens de khutbah aanstaan.",
              "يجب أن يعمل الحاسوب أثناء الخطبة.",
            ),
            L(
              "You install the updates, outside a khutbah.",
              "Je installeert de updates, buiten een khutbah.",
              "تثبّت التحديثات بنفسك، في غير وقت الخطبة.",
            ),
            L(
              "You make the backups: [what to keep](page:install#backup), or `make backup` with [Docker](page:docker#backup).",
              "Je maakt zelf de back-ups: [wat je bewaart](page:install#backup), of `make backup` met [Docker](page:docker#backup).",
              "تحتفظ بالنسخ الاحتياطية بنفسك: [ما يجب حفظه](page:install#backup)، أو `make backup` مع [Docker](page:docker#backup).",
            ),
            L(
              "Soniox bills your key: each open caption page is its own stream.",
              "Soniox rekent af op jouw sleutel: elke geopende ondertitelpagina is een eigen stream.",
              "يحاسب Soniox على مفتاحك، وكل صفحة ترجمة مفتوحة بثٌّ مستقل.",
            ),
          ],
        },
      ],
    },
    {
      id: "hosted",
      h2: L("Host it for many mosques", "Host het voor veel moskeeën", "استضفه لمساجد كثيرة"),
      blocks: [
        {
          p: L(
            `With \`mode: hosted\`, one server serves many mosques: they sign up at \`/signup\`, add their own Soniox key and make their own screens. The platform is [the website repository](${GITHUB_URL}): \`make up\` there makes a hosted \`config.yaml\`, the admin token and the Quran data by itself. Your own reverse proxy (nginx) in front of it gives HTTPS, and links follow the hostname of each request. Back up the master key, and see the checklist in [the hosting guide](${HOSTING_DOC}).`,
            `Met \`mode: hosted\` bedient één server veel moskeeën: ze melden zich aan via \`/signup\`, voegen hun eigen Soniox-sleutel toe en maken hun eigen schermen. Het platform is [de website-repository](${GITHUB_URL}): \`make up\` maakt daar zelf een gehoste \`config.yaml\`, het beheertoken en de Korandata. Je eigen reverse proxy (nginx) ervoor zorgt voor HTTPS, en links volgen de hostnaam van elk verzoek. Maak een back-up van de hoofdsleutel, en zie de checklist in [de hostinggids (Engels)](${HOSTING_DOC}).`,
            `مع \`mode: hosted\` يخدم خادم واحد مساجد كثيرة: تسجّل عبر \`/signup\`، وتضيف مفتاح Soniox الخاص بها، وتنشئ شاشاتها بنفسها. والمنصة هي [مستودع الموقع](${GITHUB_URL}): ينشئ \`make up\` فيه بنفسه \`config.yaml\` للاستضافة، ورمز المشرف، وبيانات القرآن. ويوفّر وسيطك العكسي (reverse proxy) الخاص، مثل nginx، أمامه اتصال HTTPS، وتتبع الروابط اسم المضيف في كل طلب. واحفظ نسخة احتياطية من المفتاح الرئيسي، وراجع قائمة التحقق في [دليل الاستضافة (بالإنجليزية)](${HOSTING_DOC}).`,
          ),
        },
      ],
    },
  ],
};

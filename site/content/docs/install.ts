// Install (/install): the steps of selfhost/README.md ("How it works" through "Your phone and
// other devices", then "Update", "Back up", "When something does not work" and "Uninstall"), in
// its words and with its commands, plus `doctor` (docs/cli.md). The first start makes config.yaml
// and downloads the Quran data itself.
import { type DocPage, L } from "../doc.js";
import { SELF_HOST_REPO } from "../links.js";
import { GUIDE_DOC, INSTALL_COMMANDS, START_OUTPUT } from "./shared.js";

export const install: DocPage = {
  title: L(
    "Install Turjuman on your computer, step by step",
    "Turjuman installeren op je computer, stap voor stap",
    "ثبّت ترجمان على حاسوبك خطوة بخطوة",
  ),
  desc: L(
    "Install the self-hosted edition, add your Soniox key, start it, and make your first screen.",
    "Installeer de zelf-gehoste editie, voeg je Soniox-sleutel toe, start hem, en maak je eerste scherm.",
    "ثبّت نسخة الاستضافة الذاتية، وأضف مفتاح Soniox، وشغّلها، وأنشئ شاشتك الأولى.",
  ),
  h1: L("Install", "Installeren", "التثبيت"),
  lead: L(
    "From a computer to your first screen, step by step.",
    "Van een computer naar je eerste scherm, stap voor stap.",
    "من الحاسوب إلى شاشتك الأولى، خطوة بخطوة.",
  ),
  sections: [
    {
      id: "how",
      n: 1,
      h2: L("How it works", "Hoe het werkt", "كيف يعمل"),
      blocks: [
        {
          ul: [
            L(
              "Turjuman runs on one computer. OBS and browsers open its pages.",
              "Turjuman draait op één computer. OBS en browsers openen de pagina's ervan.",
              "يعمل ترجمان على حاسوب واحد، وتفتح برامج OBS والمتصفحات صفحاته.",
            ),
            L(
              "A screen's link, open in OBS or a browser, listens to the microphone input of the computer it is open on. That computer needs the mosque's audio; a smart TV's own browser can't be used.",
              "De link van een scherm, geopend in OBS of een browser, luistert naar de microfooningang van de computer waarop hij openstaat. Die computer heeft het geluid van de moskee nodig; de eigen browser van een smart-tv werkt niet.",
              "رابط الشاشة، حين يُفتح في OBS أو في متصفح، يستمع إلى مدخل الميكروفون في الحاسوب المفتوح عليه. لذا يحتاج ذلك الحاسوب إلى صوت المسجد، ولا يصلح لذلك متصفح التلفاز الذكي نفسه.",
            ),
            L(
              "Simplest: Turjuman and OBS on one computer, with the audio. A page on another computer needs HTTPS: [Phone & network](page:network#https).",
              "Het eenvoudigst: Turjuman en OBS op één computer, met het geluid. Een pagina op een andere computer heeft HTTPS nodig: [Telefoon & netwerk](page:network#https).",
              "الأبسط: ترجمان وOBS على حاسوب واحد يصله الصوت. أما الصفحة على حاسوب آخر فتحتاج إلى HTTPS: [الهاتف والشبكة](page:network#https).",
            ),
            L(
              "Every open caption page is its own Soniox stream: two computers showing captions cost twice.",
              "Elke geopende ondertitelpagina is een eigen Soniox-stream: twee computers met ondertiteling kosten het dubbele.",
              "كل صفحة ترجمة مفتوحة بثٌّ مستقل لدى Soniox: حاسوبان يعرضان الترجمة يكلّفان الضعف.",
            ),
          ],
        },
      ],
    },
    {
      id: "need",
      n: 2,
      h2: L("What you need", "Wat je nodig hebt", "ما تحتاج إليه"),
      blocks: [
        {
          table: {
            rows: [
              [
                L("A computer", "Een computer", "حاسوب"),
                L(
                  "macOS, Linux or Windows. It must be on during the khutbah. The computer that runs OBS works fine.",
                  "macOS, Linux of Windows. Hij moet tijdens de khutbah aanstaan. De computer waarop OBS draait, is prima.",
                  "macOS أو Linux أو Windows. يجب أن يعمل أثناء الخطبة، ويصلح لذلك الحاسوب الذي يعمل عليه OBS.",
                ),
              ],
              [
                L(
                  "Node.js 24 or newer, and git",
                  "Node.js 24 of nieuwer, en git",
                  "Node.js 24 أو أحدث، وgit",
                ),
                L(
                  "From [nodejs.org](https://nodejs.org). Run `corepack enable` once for `pnpm` (if `corepack` is not found: `npm install -g corepack`). About 250 MB on disk. With Docker instead: [Docker](page:docker).",
                  "Via [nodejs.org](https://nodejs.org). Voer één keer `corepack enable` uit voor `pnpm` (wordt `corepack` niet gevonden: `npm install -g corepack`). Ongeveer 250 MB op schijf. Met Docker in plaats daarvan: [Docker](page:docker).",
                  "من [nodejs.org](https://nodejs.org). نفّذ `corepack enable` مرة واحدة ليتوفّر `pnpm` (وإن لم يُعثر على `corepack` فنفّذ `npm install -g corepack`). يشغل نحو 250 ميغابايت. ولاستخدام Docker بدلًا من ذلك: [Docker](page:docker).",
                ),
              ],
              [
                L(
                  "A Soniox account with credit",
                  "Een Soniox-account met tegoed",
                  "حساب في Soniox فيه رصيد",
                ),
                L(
                  "At [console.soniox.com](https://console.soniox.com). Soniox hears the Arabic and translates it.",
                  "Op [console.soniox.com](https://console.soniox.com). Soniox hoort het Arabisch en vertaalt het.",
                  "على [console.soniox.com](https://console.soniox.com). يسمع Soniox العربية ويترجمها.",
                ),
              ],
              [
                L("Internet", "Internet", "الإنترنت"),
                L(
                  "Outbound HTTPS to Soniox; no port needs opening. About 256 kbit/s upload per caption page while someone speaks.",
                  "Uitgaand HTTPS naar Soniox; er hoeft geen poort open. Ongeveer 256 kbit/s upload per ondertitelpagina terwijl er iemand spreekt.",
                  "اتصال HTTPS صادر إلى Soniox، ولا حاجة إلى فتح أي منفذ. ونحو 256 كيلوبت في الثانية رفعًا لكل صفحة ترجمة أثناء الكلام.",
                ),
              ],
              [
                L("The mosque's audio", "Het geluid van de moskee", "صوت المسجد"),
                L(
                  "On the computer that shows the captions, for example from a USB audio interface on the mixer's aux output.",
                  "Op de computer die de ondertiteling toont, bijvoorbeeld via een USB-audio-interface op de aux-uitgang van het mengpaneel.",
                  "على الحاسوب الذي يعرض الترجمة، مثلًا عبر واجهة صوت USB موصولة بمخرج aux في مازج الصوت.",
                ),
              ],
            ],
          },
        },
        {
          p: L(
            "ffmpeg is only needed for server-side capture. On Windows, run the commands in Git Bash (part of Git for Windows): Windows PowerShell 5.1 doesn't accept `&&`, and the HTTPS and backup steps are bash scripts.",
            "ffmpeg is alleen nodig om het geluid op de server zelf op te nemen. Voer op Windows de opdrachten uit in Git Bash (onderdeel van Git for Windows): Windows PowerShell 5.1 kent `&&` niet, en de stappen voor HTTPS en back-ups zijn bash-scripts.",
            "لا حاجة إلى ffmpeg إلا لالتقاط الصوت على الخادم نفسه. وعلى Windows نفّذ الأوامر في Git Bash (يأتي مع Git for Windows)، فـ Windows PowerShell 5.1 لا يقبل `&&`، وخطوات HTTPS والنسخ الاحتياطي سكربتات bash.",
          ),
        },
      ],
    },
    {
      id: "install",
      n: 3,
      h2: L("Install", "Installeren", "ثبّت"),
      blocks: [
        { code: INSTALL_COMMANDS },
        {
          p: L(
            "If `pnpm` is not found, run `corepack enable` first. On its first start Turjuman downloads, in the background, the Quran text from Tanzil, for verified verse references, and the translations listed under `quran.translations` (by default only the Dutch `nl.siregar`). Without internet it tries again later; until the files are there, Turjuman works but verses get no reference. `pnpm exec tsx scripts/quran-data.ts` downloads them again by hand.",
            "Wordt `pnpm` niet gevonden, voer dan eerst `corepack enable` uit. Bij de eerste start haalt Turjuman op de achtergrond de Korantekst op bij Tanzil, voor gecontroleerde versverwijzingen, en de vertalingen onder `quran.translations` (standaard alleen de Nederlandse, `nl.siregar`). Zonder internet probeert het later opnieuw; tot de bestanden er zijn, werkt Turjuman wel, maar krijgen verzen geen verwijzing. `pnpm exec tsx scripts/quran-data.ts` haalt ze met de hand opnieuw op.",
            "إن لم يُعثر على `pnpm` فنفّذ `corepack enable` أولًا. في التشغيل الأول يُنزّل ترجمان في الخلفية نصَّ القرآن من Tanzil لمراجع الآيات الموثّقة، والترجماتِ المذكورة تحت `quran.translations` (افتراضيًا الترجمة الهولندية `nl.siregar` وحدها). وإن لم يتوفّر الإنترنت أعاد المحاولة لاحقًا، وإلى أن تصل الملفات يعمل ترجمان، لكن الآيات لا تحصل على مراجع. ويُنزّلها `pnpm exec tsx scripts/quran-data.ts` من جديد يدويًا.",
          ),
        },
        {
          p: L(
            "Turjuman keeps everything in this folder. Its first start makes `config.yaml` here, with only the settings of this install; to change another setting, add it there and restart. `config.example.yaml` explains every setting.",
            "Turjuman bewaart alles in deze map. De eerste start maakt hier `config.yaml`, met alleen de instellingen van deze installatie; wil je iets anders wijzigen, zet het er dan in en start opnieuw. `config.example.yaml` legt elke instelling uit.",
            "يحفظ ترجمان كل شيء في هذا المجلد. وينشئ التشغيل الأول هنا الملف `config.yaml` وفيه إعدادات هذا التثبيت وحدها، ولتغيير إعداد آخر أضفه إليه ثم أعد التشغيل. ويشرح `config.example.yaml` كل الإعدادات.",
          ),
        },
        {
          p: L(
            "A Quran translation for another language: add a line under `quran.translations` in `config.yaml` with the file name of its Tanzil id, and restart: Turjuman downloads it. For English:",
            "Een Koranvertaling voor een andere taal: zet een regel onder `quran.translations` in `config.yaml` met de bestandsnaam van de Tanzil-id, en start opnieuw: Turjuman haalt hem op. Voor Engels:",
            "لإضافة ترجمة للقرآن بلغة أخرى: أضف سطرًا تحت `quran.translations` في `config.yaml` باسم ملفها حسب معرّفها في Tanzil، ثم أعد التشغيل، فيُنزّلها ترجمان. للإنجليزية مثلًا:",
          ),
        },
        {
          code: [
            "quran:",
            "  translations:",
            "    nl: quran/nl.siregar.txt",
            "    en: quran/en.sahih.txt",
          ],
          kind: "yaml",
        },
        {
          note: L(
            "Tanzil's translations are for non-commercial use only.",
            "De vertalingen van Tanzil zijn alleen voor niet-commercieel gebruik.",
            "ترجمات Tanzil للاستخدام غير التجاري فقط.",
          ),
        },
      ],
    },
    {
      id: "keys",
      n: 4,
      h2: L("Add your Soniox key", "Voeg je Soniox-sleutel toe", "أضف مفتاح Soniox"),
      blocks: [
        { code: ["pnpm turjuman setup"] },
        {
          p: L(
            "Optional: you can also add the key later in the app (below). Setup asks for your Soniox key, checks it with Soniox (a free call) and saves it in `.env` in this folder, readable only by you. Then it offers to create the first admin account: the username and password you log in with.",
            "Optioneel: je kunt de sleutel ook later in de app toevoegen (hieronder). Setup vraagt om je Soniox-sleutel, controleert hem bij Soniox (gratis) en slaat hem op in `.env` in deze map, alleen voor jou leesbaar. Daarna biedt het aan het eerste beheerdersaccount te maken: de gebruikersnaam en het wachtwoord waarmee je inlogt.",
            "هذه الخطوة اختيارية: يمكنك أيضًا إضافة المفتاح لاحقًا في التطبيق (أدناه). يطلب الإعداد مفتاح Soniox، ويتحقّق منه لدى Soniox (مجانًا)، ثم يحفظه في الملف `.env` في هذا المجلد، ولا يقرؤه أحد غيرك. ثم يعرض إنشاء أول حساب مشرف: اسم المستخدم وكلمة المرور اللذين تسجّل الدخول بهما.",
          ),
        },
        {
          ul: [
            L(
              "To change the key, run `setup` again; Enter keeps the current key and checks it again.",
              "Een andere sleutel: voer `setup` opnieuw uit; Enter houdt de huidige sleutel en controleert hem opnieuw.",
              "لتغيير المفتاح نفّذ `setup` من جديد، والضغط على Enter يُبقي المفتاح الحالي ويتحقّق منه مرة أخرى.",
            ),
            L(
              "`pnpm turjuman setup --check` asks Soniox whether it accepts the saved key. It checks the key, not your credit.",
              "`pnpm turjuman setup --check` vraagt Soniox of het de opgeslagen sleutel accepteert. Het controleert de sleutel, niet je tegoed.",
              "يسأل `pnpm turjuman setup --check` خدمةَ Soniox هل تقبل المفتاح المحفوظ. وهو يتحقّق من المفتاح، لا من رصيدك.",
            ),
            L(
              "A key from an EU-region Soniox project (`stt.soniox.region: eu`): check it with `pnpm turjuman doctor --online`.",
              "Een sleutel van een Soniox-project in de EU-regio (`stt.soniox.region: eu`): controleer hem met `pnpm turjuman doctor --online`.",
              "مفتاح من مشروع في Soniox ضمن منطقة الاتحاد الأوروبي (`stt.soniox.region: eu`): تحقّق منه بالأمر `pnpm turjuman doctor --online`.",
            ),
          ],
        },
        {
          note: L(
            "No Soniox key yet? Press Ctrl-C: nothing is saved. Then start Turjuman, create your account at `http://127.0.0.1:8765/login` on this computer, and add the key later in the app under **Keys**, where it is stored encrypted.",
            "Nog geen Soniox-sleutel? Druk op Ctrl-C: er wordt niets opgeslagen. Start dan Turjuman, maak je account op `http://127.0.0.1:8765/login` op deze computer, en voeg de sleutel later in de app toe onder **Sleutels**, waar hij versleuteld wordt opgeslagen.",
            "ليس لديك مفتاح Soniox بعد؟ اضغط Ctrl-C ولن يُحفظ شيء. ثم شغّل ترجمان، وأنشئ حسابك على `http://127.0.0.1:8765/login` في هذا الحاسوب، وأضف المفتاح لاحقًا في التطبيق ضمن **المفاتيح**، حيث يُحفظ مشفّرًا.",
          ),
        },
      ],
    },
    {
      id: "start",
      n: 5,
      h2: L("Start Turjuman", "Start Turjuman", "شغّل ترجمان"),
      blocks: [
        { code: ["pnpm turjuman start"] },
        {
          p: L(
            "It prints its addresses and where to open the app:",
            "Turjuman toont zijn adressen en waar je de app opent:",
            "يعرض عناوينه وعناوين فتح التطبيق:",
          ),
        },
        { code: START_OUTPUT, kind: "output" },
        {
          p: L(
            "Then a log line follows for each request, such as `12:00:05 info  GET /app 200 4 ms`; the log goes to this terminal only. The lines of a first start (the `config.yaml` it made, the Quran data it downloads, no Soniox key yet) don't stop the server.",
            "Daarna volgt een logregel per verzoek, zoals `12:00:05 info  GET /app 200 4 ms`; de log komt alleen in deze terminal. De regels van een eerste start (de `config.yaml` die het maakte, de Korandata die het ophaalt, nog geen Soniox-sleutel) houden de server niet tegen.",
            "ثم يظهر سطر في السجل لكل طلب، مثل `12:00:05 info  GET /app 200 4 ms`، ولا يُكتب السجل إلا في هذه النافذة الطرفية. وأسطر التشغيل الأول (الملف `config.yaml` الذي أنشأه، وبيانات القرآن التي يُنزّلها، وعدم وجود مفتاح Soniox بعد) لا توقف الخادم.",
          ),
        },
        {
          p: L(
            "Keep this terminal open: Turjuman runs while it is open, and Ctrl-C stops it. For the next commands, open a second terminal in the same folder. `pnpm turjuman open` opens the app in your browser.",
            "Laat deze terminal open: Turjuman draait zolang hij open is, en Ctrl-C stopt het. Open voor de volgende opdrachten een tweede terminal in dezelfde map. `pnpm turjuman open` opent de app in je browser.",
            "أبقِ هذه النافذة الطرفية مفتوحة، فترجمان يعمل ما دامت مفتوحة، ويوقفه Ctrl-C. ولتنفيذ الأوامر التالية افتح نافذة طرفية ثانية في المجلد نفسه. ويفتح `pnpm turjuman open` التطبيق في متصفحك.",
          ),
        },
        {
          note: L(
            "Port 8765 taken? `start` stops with `Port 8765 is in use`. Set another under `server:` in `config.yaml`, for example `port: 8766`.",
            "Is poort 8765 bezet? Dan stopt `start` met `Port 8765 is in use`. Zet een andere onder `server:` in `config.yaml`, bijvoorbeeld `port: 8766`.",
            "المنفذ 8765 مشغول؟ يتوقف `start` برسالة `Port 8765 is in use`. اضبط منفذًا آخر تحت `server:` في `config.yaml`، مثل `port: 8766`.",
          ),
        },
      ],
    },
    {
      id: "check",
      n: 6,
      h2: L("Check", "Controleer", "تحقّق"),
      blocks: [
        { code: ["pnpm turjuman doctor"] },
        {
          p: L(
            "It checks the setup and says what is wrong. Each line says `[ok]`, `[warn]` or `[FAIL]`. Fix every `[FAIL]`; a `[warn]` can be fine, for example when ffmpeg is not installed.",
            "Doctor controleert de installatie en zegt wat er mis is. Elke regel zegt `[ok]`, `[warn]` of `[FAIL]`. Los elke `[FAIL]` op; een `[warn]` kan prima zijn, bijvoorbeeld als ffmpeg niet is geïnstalleerd.",
            "يتحقّق من الإعداد ويخبرك بما فيه من خلل. ويبدأ كل سطر بـ `[ok]` أو `[warn]` أو `[FAIL]`. أصلح كل `[FAIL]`، أما `[warn]` فقد لا يضر، مثلًا إذا لم يكن ffmpeg مثبّتًا.",
          ),
        },
        {
          p: L(
            "It only checks that your key is set. `pnpm turjuman doctor --online` also asks Soniox whether it accepts it. Nothing is billed.",
            "Van je sleutel kijkt het alleen of hij is ingesteld. `pnpm turjuman doctor --online` vraagt Soniox ook of het hem accepteert. Er wordt niets in rekening gebracht.",
            "ولا يتحقّق من مفتاحك إلا أنه موجود، أما `pnpm turjuman doctor --online` فيسأل Soniox أيضًا هل يقبله. ولا يُحتسب عليك شيء.",
          ),
        },
      ],
    },
    {
      id: "first-screen",
      n: 7,
      h2: L("Make your first screen", "Maak je eerste scherm", "أنشئ شاشتك الأولى"),
      blocks: [
        {
          p: L(
            "A screen is the captions for one place, for example “Main hall”. It has one link, the screen link, and you show that link on a TV.",
            "Een scherm is de ondertiteling voor één plek, bijvoorbeeld „Grote zaal”. Het heeft één link, de schermlink, en die link toon je op een tv.",
            "الشاشة هي الترجمة المعروضة في مكان واحد، مثل «القاعة الرئيسية». لها رابط واحد هو رابط الشاشة، تعرضه على تلفاز.",
          ),
        },
        {
          p: L(
            "**In the browser:** open **New screen** (`/app/new`):",
            "**In de browser:** open **Nieuw scherm** (`/app/new`):",
            "**في المتصفح:** افتح **شاشة جديدة** (`/app/new`):",
          ),
        },
        {
          ol: [
            L("Choose the languages.", "Kies de talen.", "اختر اللغتين."),
            L(
              "Choose the layout and the look.",
              "Kies de indeling en de stijl.",
              "اختر التخطيط والنمط.",
            ),
            L(
              "Pick the microphone and test it.",
              "Kies de microfoon en test hem.",
              "اختر الميكروفون واختبره.",
            ),
            L("Save.", "Opslaan.", "احفظ."),
          ],
        },
        {
          p: L(
            "The screen appears on your dashboard. A new screen starts **off**: switch it on there before the khutbah.",
            "Het scherm verschijnt op je dashboard. Een nieuw scherm staat **uit**: zet het daar vóór de khutbah aan.",
            "تظهر الشاشة في لوحة التحكم. تبدأ الشاشة الجديدة **متوقفة**، فشغّلها من هناك قبل الخطبة.",
          ),
        },
        {
          p: L("**Or in the terminal:**", "**Of in de terminal:**", "**أو في النافذة الطرفية:**"),
        },
        {
          code: [
            'pnpm turjuman screens add --name "Main hall" --from ar --to nl --enable',
            "pnpm turjuman screens list",
          ],
        },
        {
          p: L(
            "A screen made in the terminal uses the default microphone of the computer that shows it. A microphone picked in the app is saved by its name: on another computer the page takes the first input whose name contains it, else the default input.",
            "Een scherm dat je in de terminal maakt, gebruikt de standaardmicrofoon van de computer die het toont. Een microfoon die je in de app kiest, wordt op naam bewaard: op een andere computer neemt de pagina de eerste ingang waarvan de naam die naam bevat, anders de standaardingang.",
            "الشاشة التي تُنشأ من النافذة الطرفية تستخدم الميكروفون الافتراضي للحاسوب الذي يعرضها. أما الميكروفون الذي تختاره في التطبيق فيُحفظ باسمه: على حاسوب آخر تأخذ الصفحة أول مدخل يحتوي اسمُه ذلك الاسم، وإلا فالمدخل الافتراضي.",
          ),
        },
      ],
    },
    {
      id: "show",
      n: 8,
      h2: L("Show it on a screen", "Toon het op een scherm", "اعرضها على شاشة"),
      blocks: [
        {
          p: L(
            "Every screen has a screen link, like `http://127.0.0.1:8765/feed/1f0c…`. Copy it from the dashboard, or print it:",
            "Elk scherm heeft een schermlink, zoals `http://127.0.0.1:8765/feed/1f0c…`. Kopieer hem vanaf het dashboard, of laat hem zien:",
            "لكل شاشة رابط شاشة مثل `http://127.0.0.1:8765/feed/1f0c…`. انسخه من لوحة التحكم، أو اعرضه بالأمر:",
          ),
        },
        { code: ['pnpm turjuman screens url "Main hall"'] },
        {
          p: L(
            "Treat it like a password: whoever has it, and can reach this server, can run captions on your Soniox credit. Then put it in OBS Studio or a browser: [Show on a screen](page:show-on-a-screen).",
            "Behandel hem als een wachtwoord: wie hem heeft en deze server kan bereiken, kan ondertiteling laten lopen op jouw Soniox-tegoed. Zet hem dan in OBS Studio of een browser: [Op een scherm tonen](page:show-on-a-screen).",
            "عامله ككلمة مرور: كل من لديه ويستطيع الوصول إلى هذا الخادم يمكنه تشغيل الترجمة على رصيدك في Soniox. ثم ضعه في OBS Studio أو في متصفح: [عرض على شاشة](page:show-on-a-screen).",
          ),
        },
      ],
    },
    {
      id: "update",
      n: 9,
      h2: L("Update", "Bijwerken", "التحديث"),
      blocks: [
        { code: ["git pull", "pnpm install && pnpm build"] },
        {
          p: L(
            "Do it outside a khutbah, then start Turjuman again. Your settings, key, accounts, screens and transcripts stay: git ignores them. `git clean -fdx` would delete them.",
            "Doe het buiten een khutbah, en start Turjuman daarna opnieuw. Je instellingen, sleutel, accounts, schermen en transcripten blijven: git negeert ze. `git clean -fdx` zou ze verwijderen.",
            "حدّثه في غير وقت الخطبة، ثم شغّل ترجمان من جديد. تبقى إعداداتك ومفتاحك وحساباتك وشاشاتك ونصوصك المكتوبة، فـ git يتجاهلها. أما `git clean -fdx` فيحذفها.",
          ),
        },
        {
          p: L(
            "To change `languages.yaml` or a glossary, edit a copy and point `languagesFile` or `glossariesDir` in `config.yaml` to it: an edited tracked file makes `git pull` stop on a conflict. `pnpm turjuman --version` shows the version.",
            "Wil je `languages.yaml` of een woordenlijst aanpassen, bewerk dan een kopie en laat `languagesFile` of `glossariesDir` in `config.yaml` ernaar wijzen: een aangepast bestand uit git laat `git pull` stoppen op een conflict. `pnpm turjuman --version` toont de versie.",
            "لتعديل `languages.yaml` أو قائمة المصطلحات، عدّل نسخة منها واجعل `languagesFile` أو `glossariesDir` في `config.yaml` يشير إليها، فتعديل ملف يتتبّعه git يوقف `git pull` عند تعارض. ويعرض `pnpm turjuman --version` رقم الإصدار.",
          ),
        },
        {
          note: L(
            "To run it always, also after a restart: [Docker](page:docker).",
            "Altijd laten draaien, ook na een herstart: [Docker](page:docker).",
            "لتشغيله دائمًا، حتى بعد إعادة التشغيل: [Docker](page:docker).",
          ),
        },
      ],
    },
    {
      id: "backup",
      n: 10,
      h2: L("Back up", "Back-up", "النسخ الاحتياطي"),
      blocks: [
        {
          p: L(
            "Copy what Turjuman keeps in this folder: `config.yaml`, `users.yaml`, `screens.yaml`, `presets.yaml`, `orgs.yaml`, `secret.key`, `tls/` and `transcripts/`. Keep `.env` (your Soniox key, in plain text) and `master.key` apart, in a safe place: with `orgs.yaml`, `master.key` unlocks the key stored in the app.",
            "Kopieer wat Turjuman in deze map bewaart: `config.yaml`, `users.yaml`, `screens.yaml`, `presets.yaml`, `orgs.yaml`, `secret.key`, `tls/` en `transcripts/`. Bewaar `.env` (je Soniox-sleutel, als platte tekst) en `master.key` apart, op een veilige plek: samen met `orgs.yaml` ontsluit `master.key` de sleutel die in de app is opgeslagen.",
            "انسخ ما يحفظه ترجمان في هذا المجلد: `config.yaml` و`users.yaml` و`screens.yaml` و`presets.yaml` و`orgs.yaml` و`secret.key` و`tls/` و`transcripts/`. واحفظ `.env` (مفتاح Soniox نصًّا غير مشفّر) و`master.key` منفصلَين في مكان آمن، فالملف `master.key` مع `orgs.yaml` يفتح المفتاح المحفوظ في التطبيق.",
          ),
        },
        {
          p: L(
            `\`tls/ca.key\` can sign certificates your devices trust: keep backups private. The command, and how to restore: “Back up” in [the README](${SELF_HOST_REPO}#readme). With Docker: \`make backup\` ([Docker](page:docker#backup)).`,
            `Met \`tls/ca.key\` kun je certificaten tekenen die je apparaten vertrouwen: houd back-ups privé. De opdracht, en hoe je terugzet: „Back up” in [de README (Engels)](${SELF_HOST_REPO}#readme). Met Docker: \`make backup\` ([Docker](page:docker#backup)).`,
            `يستطيع \`tls/ca.key\` توقيع شهادات تثق بها أجهزتك، فاحفظ النسخ الاحتياطية بعيدًا عن الآخرين. الأمر وطريقة الاسترجاع: قسم «Back up» في [ملف README (بالإنجليزية)](${SELF_HOST_REPO}#readme). ومع Docker: \`make backup\` ([Docker](page:docker#backup)).`,
          ),
        },
      ],
    },
    {
      id: "trouble",
      h2: L("When something does not work", "Als iets niet werkt", "إذا لم يعمل شيء"),
      blocks: [
        {
          table: {
            rows: [
              [
                L(
                  "“Microphone needs HTTPS”",
                  "„Microphone needs HTTPS”",
                  "رسالة «Microphone needs HTTPS»",
                ),
                L(
                  "Open the page on the computer that runs Turjuman (`127.0.0.1`), or set up HTTPS: [Phone & network](page:network#https).",
                  "Open de pagina op de computer waarop Turjuman draait (`127.0.0.1`), of stel HTTPS in: [Telefoon & netwerk](page:network#https).",
                  "افتح الصفحة على الحاسوب الذي يعمل عليه ترجمان (`127.0.0.1`)، أو فعّل HTTPS: [الهاتف والشبكة](page:network#https).",
                ),
              ],
              [
                L("“Port 8765 is in use”", "„Port 8765 is in use”", "رسالة «Port 8765 is in use»"),
                L(
                  "Turjuman may be running already: `pnpm turjuman status`. Or set another port (step 5).",
                  "Misschien draait Turjuman al: `pnpm turjuman status`. Of zet een andere poort (stap 5).",
                  "ربما يعمل ترجمان بالفعل: `pnpm turjuman status`. أو اضبط منفذًا آخر (الخطوة 5).",
                ),
              ],
              [
                L(
                  "The screen says it is off",
                  "Het scherm meldt dat het uit staat",
                  "تعرض الشاشة أنها متوقفة",
                ),
                L(
                  "Switch it on in the dashboard.",
                  "Zet het aan in het dashboard.",
                  "شغّلها من لوحة التحكم.",
                ),
              ],
              [
                L(
                  "“Not accepted” for a key",
                  "„Not accepted” bij een sleutel",
                  "رسالة «Not accepted» لمفتاح",
                ),
                L(
                  "Copy the key again from console.soniox.com, and run `pnpm turjuman setup`.",
                  "Kopieer de sleutel opnieuw van console.soniox.com, en voer `pnpm turjuman setup` uit.",
                  "انسخ المفتاح من جديد من console.soniox.com، ثم نفّذ `pnpm turjuman setup`.",
                ),
              ],
              [
                L(
                  "Captions stop; the log says `Soniox fatal error; not retrying`",
                  "De ondertiteling stopt; de log zegt `Soniox fatal error; not retrying`",
                  "تتوقف الترجمة، ويقول السجل `Soniox fatal error; not retrying`",
                ),
                L(
                  "The reason follows: 401, the key is refused; 402 or `balance_exhausted`, no credit. Fix it at console.soniox.com, then switch the screen off and on.",
                  "De reden staat erachter: 401, de sleutel wordt geweigerd; 402 of `balance_exhausted`, geen tegoed. Los het op bij console.soniox.com, en zet het scherm uit en weer aan.",
                  "يتبعها السبب: 401 يعني أن المفتاح مرفوض، و402 أو `balance_exhausted` يعني نفاد الرصيد. عالج ذلك في console.soniox.com، ثم أوقف الشاشة وشغّلها من جديد.",
                ),
              ],
              [
                L("`Host not allowed`", "`Host not allowed`", "رسالة `Host not allowed`"),
                L(
                  "With `exposure: local`, open Turjuman at `127.0.0.1` or `localhost`, or set `exposure: lan`: [Phone & network](page:network).",
                  "Met `exposure: local` open je Turjuman op `127.0.0.1` of `localhost`, of je zet `exposure: lan`: [Telefoon & netwerk](page:network).",
                  "مع `exposure: local` افتح ترجمان على `127.0.0.1` أو `localhost`، أو اضبط `exposure: lan`: [الهاتف والشبكة](page:network).",
                ),
              ],
              [
                L("Anything else", "Iets anders", "أي مشكلة أخرى"),
                L(
                  "`pnpm turjuman doctor` checks the setup and says what is wrong; the log is in the terminal.",
                  "`pnpm turjuman doctor` controleert de installatie en zegt wat er mis is; de log staat in de terminal.",
                  "يتحقّق `pnpm turjuman doctor` من الإعداد ويخبرك بما فيه من خلل، والسجل في النافذة الطرفية.",
                ),
              ],
            ],
          },
        },
        {
          p: L(
            `More in [the guide](${GUIDE_DOC}#troubleshooting).`,
            `Meer in [de handleiding (Engels)](${GUIDE_DOC}#troubleshooting).`,
            `المزيد في [الدليل (بالإنجليزية)](${GUIDE_DOC}#troubleshooting).`,
          ),
        },
      ],
    },
    {
      id: "uninstall",
      h2: L("Uninstall", "Verwijderen", "إزالة التثبيت"),
      blocks: [
        {
          p: L(
            `Stop Turjuman and delete this folder: everything Turjuman keeps is in it, so back up first what you want to keep. With Docker, first \`make down\` and \`docker image rm turjuman:local turjuman:build\` (“Uninstall” in [the README](${SELF_HOST_REPO}#readme)). On every device that installed the CA, remove “Turjuman local CA”.`,
            `Stop Turjuman en verwijder deze map: alles wat Turjuman bewaart staat erin, dus maak eerst een back-up van wat je wilt houden. Met Docker eerst \`make down\` en \`docker image rm turjuman:local turjuman:build\` („Uninstall” in [de README (Engels)](${SELF_HOST_REPO}#readme)). Verwijder op elk apparaat dat de CA heeft geïnstalleerd „Turjuman local CA”.`,
            `أوقف ترجمان واحذف هذا المجلد، ففيه كل ما يحفظه ترجمان، لذا انسخ أولًا ما تريد الاحتفاظ به. ومع Docker نفّذ أولًا \`make down\` و\`docker image rm turjuman:local turjuman:build\` (قسم «Uninstall» في [ملف README (بالإنجليزية)](${SELF_HOST_REPO}#readme)). واحذف «Turjuman local CA» من كل جهاز ثبّت شهادة الجهة.`,
          ),
        },
      ],
    },
  ],
};

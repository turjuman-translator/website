// Commands (/commands): every `turjuman` command, grouped, one line each with real examples, and
// docs/cli.md for every option; then the make helpers. Sources: docs/cli.md, docs/guide.md
// ("CLI"), docs/hosting.md ("Operating it"), selfhost/README.md ("Commands"), the Makefile.
import { type DocPage, L } from "../doc.js";
import { MAKE_HELPERS } from "./make.js";
import { CLI_DOC, HOSTING_DOC } from "./shared.js";

export const commands: DocPage = {
  title: L(
    "Turjuman commands and make helpers",
    "Opdrachten van Turjuman en make-helpers",
    "أوامر ترجمان وأوامر make المساعدة",
  ),
  desc: L(
    "The turjuman commands and the make helpers, one line each, with examples.",
    "De opdrachten van turjuman en de make-helpers, in één regel, met voorbeelden.",
    "أوامر turjuman وأوامر make المساعدة، في سطر واحد لكلٍّ منها، مع أمثلة.",
  ),
  h1: L("Commands", "Opdrachten", "الأوامر"),
  lead: L(
    "One command for your keys, the server and the screens.",
    "Eén opdracht voor je sleutels, de server en de schermen.",
    "أمر واحد لمفاتيحك والخادم والشاشات.",
  ),
  sections: [
    {
      id: "use",
      h2: L("How to run it", "Zo voer je het uit", "طريقة التنفيذ"),
      blocks: [
        {
          ul: [
            L(
              "In the `turjuman` folder: `pnpm turjuman <command>`.",
              "In de map `turjuman`: `pnpm turjuman <command>`.",
              "داخل المجلد `turjuman`: `pnpm turjuman <command>`.",
            ),
            L(
              'With Docker: the [make helpers](#make) below. `make cli ARGS="<command>"` runs any other command in the container.',
              'Met Docker: de [make-helpers](#make) hieronder. `make cli ARGS="<command>"` voert elke andere opdracht uit in de container.',
              'مع Docker: [أوامر make المساعدة](#make) أدناه. ويُنفّذ `make cli ARGS="<command>"` أي أمر آخر داخل الحاوية.',
            ),
            L(
              "Every command takes `--help`, and `pnpm turjuman help <command>` does the same. A wrong option stops the command with exit code 2.",
              "Elke opdracht kent `--help`, en `pnpm turjuman help <command>` doet hetzelfde. Een verkeerde optie stopt de opdracht met exitcode 2.",
              "كل أمر يقبل `--help`، ويفعل `pnpm turjuman help <command>` الشيء نفسه. والخيار الخاطئ يوقف الأمر برمز الخروج 2.",
            ),
            L(
              `Every option, the config folders and the exit codes: [docs/cli.md](${CLI_DOC}).`,
              `Elke optie, de configuratiemappen en de exitcodes: [docs/cli.md (Engels)](${CLI_DOC}).`,
              `كل الخيارات، ومجلدات الإعداد، ورموز الخروج: [docs/cli.md (بالإنجليزية)](${CLI_DOC}).`,
            ),
          ],
        },
      ],
    },
    {
      id: "start",
      h2: L("Get going", "Aan de slag", "البداية"),
      blocks: [
        {
          cmds: [
            {
              name: "setup",
              text: L(
                "Optional: saves your Soniox key after checking it, and creates the first admin account (both can also be done in the app). The key never goes on the command line: it is typed, or read from a file.",
                "Optioneel: slaat je Soniox-sleutel op na een controle, en maakt het eerste beheerdersaccount (beide kan ook in de app). De sleutel staat nooit in de opdrachtregel: je typt hem, of hij komt uit een bestand.",
                "اختياري: يحفظ مفتاح Soniox بعد التحقق منه، وينشئ أول حساب مشرف (ويمكن فعل الأمرين في التطبيق أيضًا). ولا يُكتب المفتاح في سطر الأوامر أبدًا: تُدخله كتابةً، أو يُقرأ من ملف.",
              ),
              examples: [
                "pnpm turjuman setup",
                "pnpm turjuman setup --check",
                "pnpm turjuman setup --yes --soniox-key-file ~/keys/soniox.txt",
              ],
              more: `${CLI_DOC}#setup`,
            },
            {
              name: "start",
              text: L(
                "Starts Turjuman and prints where to open the app, then a log line for each request. Ctrl-C stops it. The first start makes `config.yaml` and downloads the Quran data in the background. Another port: `server.port` in `config.yaml`.",
                "Start Turjuman en toont waar je de app opent, daarna een logregel per verzoek. Ctrl-C stopt het. De eerste start maakt `config.yaml` en haalt op de achtergrond de Korandata op. Een andere poort: `server.port` in `config.yaml`.",
                "يشغّل ترجمان ويعرض عناوين فتح التطبيق، ثم سطرًا في السجل لكل طلب، ويوقفه Ctrl-C. وينشئ التشغيل الأول `config.yaml` ويُنزّل بيانات القرآن في الخلفية. ولتغيير المنفذ: `server.port` في `config.yaml`.",
              ),
              examples: ["pnpm turjuman start"],
              more: `${CLI_DOC}#start`,
            },
            {
              name: "open",
              text: L(
                "Opens the dashboard, the screen builder or the look editor in your browser.",
                "Opent het dashboard, de schermbouwer of de stijleditor in je browser.",
                "يفتح لوحة التحكم أو منشئ الشاشات أو محرّر النمط في متصفحك.",
              ),
              examples: [
                "pnpm turjuman open",
                "pnpm turjuman open builder",
                "pnpm turjuman open look",
              ],
              more: `${CLI_DOC}#open-appbuilderlook`,
            },
            {
              name: "doctor",
              text: L(
                "Checks the setup: config, the Soniox key, HTTPS certificate, Quran data, ffmpeg, the port and the connection to Soniox. Without `--online` it only checks that a key is set; `--online` also asks Soniox whether it accepts your key. Nothing is billed. It exits with 1 when a line says `[FAIL]`.",
                "Controleert de installatie: configuratie, de Soniox-sleutel, HTTPS-certificaat, Korandata, ffmpeg, de poort en de verbinding met Soniox. Zonder `--online` kijkt het alleen of een sleutel is ingesteld; `--online` vraagt Soniox ook of het je sleutel accepteert. Er wordt niets in rekening gebracht. Staat er ergens `[FAIL]`, dan is de exitcode 1.",
                "يتحقّق من الإعداد: الإعدادات ومفتاح Soniox وشهادة HTTPS وبيانات القرآن وffmpeg والمنفذ والاتصال بـ Soniox. وبدون `--online` لا يتحقّق من المفتاح إلا أنه موجود، أما `--online` فيسأل Soniox أيضًا هل يقبل مفتاحك. ولا يُحتسب عليك شيء. ويكون رمز الخروج 1 إذا ظهر `[FAIL]` في أي سطر.",
              ),
              examples: ["pnpm turjuman doctor", "pnpm turjuman doctor --online"],
              more: `${CLI_DOC}#other-commands`,
            },
          ],
        },
      ],
    },
    {
      id: "screens",
      h2: L("Screens", "Schermen", "الشاشات"),
      blocks: [
        {
          cmds: [
            {
              name: "screens list",
              text: L(
                "Every screen: its id, name, languages, on or off, and screen link (the `SCREEN LINK` column). `--json` gives the same as JSON.",
                "Elk scherm: id, naam, talen, aan of uit, en de schermlink (de kolom `SCREEN LINK`). `--json` geeft hetzelfde als JSON.",
                "كل الشاشات: المعرّف والاسم واللغتان والحالة ورابط الشاشة (العمود `SCREEN LINK`). ويعطي `--json` المعلومات نفسها بصيغة JSON.",
              ),
              examples: ["pnpm turjuman screens list", "pnpm turjuman screens list --json"],
              more: `${CLI_DOC}#screens`,
            },
            {
              name: "screens add",
              text: L(
                "Makes a screen and prints its screen link (`Screen link for OBS: …`). It starts off unless you give `--enable`.",
                "Maakt een scherm en toont de schermlink (`Screen link for OBS: …`). Het staat uit, tenzij je `--enable` meegeeft.",
                "ينشئ شاشة ويعرض رابطها (`Screen link for OBS: …`). وتبدأ متوقفة ما لم تُضف `--enable`.",
              ),
              examples: [
                'pnpm turjuman screens add --name "Main hall" --from ar --to nl --enable',
                'pnpm turjuman screens add --name "Sisters" --from ar --to en --preset mosque-light --layout rollup',
              ],
              more: `${CLI_DOC}#screens`,
            },
            {
              name: "screens url",
              text: L(
                "Prints only the screen link. When the links use HTTPS, `--local` prints the `http://127.0.0.1` link instead, for OBS on the computer that runs Turjuman.",
                "Toont alleen de schermlink. Gebruiken de links HTTPS, dan toont `--local` de link met `http://127.0.0.1`, voor OBS op de computer waarop Turjuman draait.",
                "يعرض رابط الشاشة وحده. وإذا كانت الروابط تستخدم HTTPS، فإن `--local` يعرض بدلًا منه رابط `http://127.0.0.1`، لبرنامج OBS على الحاسوب الذي يعمل عليه ترجمان.",
              ),
              examples: [
                'pnpm turjuman screens url "Sisters"',
                'pnpm turjuman screens url "Sisters" --local',
              ],
              more: `${CLI_DOC}#screens`,
            },
            {
              name: "screens enable · disable",
              text: L(
                "Switches a screen on or off; open pages follow within a few seconds.",
                "Zet een scherm aan of uit; open pagina's volgen binnen een paar seconden.",
                "يشغّل الشاشة أو يوقفها، وتتبعه الصفحات المفتوحة خلال ثوانٍ.",
              ),
              examples: [
                "pnpm turjuman screens enable Sisters",
                "pnpm turjuman screens disable Sisters",
              ],
              more: `${CLI_DOC}#screens`,
            },
            {
              name: "screens rm",
              text: L(
                "Deletes a screen; its link stops working. It asks first, unless you give `--yes`.",
                "Verwijdert een scherm; de link werkt dan niet meer. Het vraagt eerst, tenzij je `--yes` meegeeft.",
                "يحذف الشاشة فيتوقف رابطها. ويسألك أولًا ما لم تُضف `--yes`.",
              ),
              examples: ["pnpm turjuman screens rm Sisters --yes"],
              more: `${CLI_DOC}#screens`,
            },
          ],
        },
        {
          p: L(
            "An `<id>` can also be the screen's exact name.",
            "Een `<id>` mag ook de precieze naam van het scherm zijn.",
            "يمكن أن يكون `<id>` أيضًا اسم الشاشة كما هو تمامًا.",
          ),
        },
      ],
    },
    {
      id: "accounts",
      h2: L("Accounts", "Accounts", "الحسابات"),
      blocks: [
        {
          cmds: [
            {
              name: "users",
              text: L(
                "Accounts for the app: `add`, `list`, `passwd` and `remove`. A password is read from piped input, or generated and shown once.",
                "Accounts voor de app: `add`, `list`, `passwd` en `remove`. Een wachtwoord wordt uit doorgesluisde invoer gelezen, of gemaakt en één keer getoond.",
                "حسابات التطبيق: `add` و`list` و`passwd` و`remove`. تُقرأ كلمة المرور من مدخلات ممرَّرة، أو تُولَّد وتُعرض مرة واحدة.",
              ),
              examples: [
                "pnpm turjuman users add imam --admin",
                "pnpm turjuman users list",
                "pnpm turjuman users passwd imam",
              ],
              more: `${CLI_DOC}#other-commands`,
            },
          ],
        },
      ],
    },
    {
      id: "remote",
      h2: L(
        "Caption pages without a screen link",
        "Ondertitelpagina's zonder schermlink",
        "صفحات الترجمة دون رابط شاشة",
      ),
      blocks: [
        {
          cmds: [
            {
              name: "keys · usage",
              text: L(
                "Access keys for caption pages without a screen link, needed only with `exposure: lan` or `public`, and the minutes each one used. These are not your Soniox key.",
                "Toegangssleutels voor ondertitelpagina's zonder schermlink, alleen nodig met `exposure: lan` of `public`, en de minuten die elk gebruikte. Dit is niet je Soniox-sleutel.",
                "مفاتيح وصول لصفحات الترجمة دون رابط شاشة، ولا حاجة إليها إلا مع `exposure: lan` أو `public`، والدقائق التي استخدمها كلٌّ منها. وهي غير مفتاح Soniox.",
              ),
              examples: [
                'pnpm turjuman keys add --label "Mosque OBS" --daily-minutes 120',
                "pnpm turjuman keys list",
                "pnpm turjuman usage",
                "pnpm turjuman keys revoke <id>",
              ],
              more: `${CLI_DOC}#other-commands`,
            },
          ],
        },
      ],
    },
    {
      id: "hosted",
      h2: L("For hosted servers", "Voor gehoste servers", "للخوادم المستضافة"),
      blocks: [
        {
          cmds: [
            {
              name: "orgs",
              text: L(
                "Only on a server that hosts many mosques: the mosques, and switching one off or on again.",
                "Alleen op een server die veel moskeeën host: de moskeeën, en er een uit- of weer aanzetten.",
                "على خادم يستضيف مساجد كثيرة فقط: قائمة المساجد، وإيقاف أحدها أو إعادة تشغيله.",
              ),
              examples: [
                "pnpm turjuman orgs list",
                "pnpm turjuman orgs disable <id>",
                "pnpm turjuman orgs enable <id>",
              ],
              more: `${HOSTING_DOC}#operating-it`,
            },
          ],
        },
      ],
    },
    {
      id: "more",
      h2: L("More commands", "Meer opdrachten", "أوامر أخرى"),
      blocks: [
        {
          p: L(
            `\`status\` shows whether the server runs; \`sessions\` the recent sessions; \`estimate start\` the cost per minute; \`run\` starts the server without the app addresses. For server-side capture and testing: \`devices\`, \`ctl\`, \`record\` and \`replay\`. \`status\` and \`ctl\` use the admin token Turjuman made itself (\`admin.token\`, with exposure \`lan\` or \`public\`); nothing to paste. See [docs/cli.md](${CLI_DOC}#other-commands); \`pnpm turjuman --version\` prints the version.`,
            `\`status\` toont of de server draait; \`sessions\` de recente sessies; \`estimate start\` de kosten per minuut; \`run\` start de server zonder de app-adressen. Voor opnemen op de server en testen: \`devices\`, \`ctl\`, \`record\` en \`replay\`. \`status\` en \`ctl\` gebruiken het beheertoken dat Turjuman zelf maakte (\`admin.token\`, met exposure \`lan\` of \`public\`); er valt niets te plakken. Zie [docs/cli.md (Engels)](${CLI_DOC}#other-commands); \`pnpm turjuman --version\` toont de versie.`,
            `يعرض \`status\` هل يعمل الخادم، و\`sessions\` الجلسات الأخيرة، و\`estimate start\` التكلفة في الدقيقة، ويشغّل \`run\` الخادم دون عناوين التطبيق. ولالتقاط الصوت على الخادم والتجربة: \`devices\` و\`ctl\` و\`record\` و\`replay\`. ويستخدم \`status\` و\`ctl\` رمز المشرف الذي أنشأه ترجمان بنفسه (\`admin.token\`، مع exposure \`lan\` أو \`public\`)، فلا حاجة إلى لصق شيء. انظر [docs/cli.md (بالإنجليزية)](${CLI_DOC}#other-commands)، ويعرض \`pnpm turjuman --version\` رقم الإصدار.`,
          ),
        },
      ],
    },
    {
      id: "make",
      h2: L("make helpers (Docker)", "make-helpers (Docker)", "أوامر make المساعدة (Docker)"),
      blocks: [
        {
          p: L(
            "With Docker, run these in the `turjuman` folder; on Windows, from Git Bash. The first `make up` sets everything up; [Docker](page:docker) explains the start.",
            "Met Docker voer je deze uit in de map `turjuman`; op Windows vanuit Git Bash. De eerste `make up` regelt alles; [Docker](page:docker) legt de start uit.",
            "مع Docker نفّذها داخل المجلد `turjuman`، وعلى Windows من Git Bash. ويُعدّ أول `make up` كل شيء، وتشرح صفحة [Docker](page:docker) طريقة البدء.",
          ),
        },
        { helpers: MAKE_HELPERS },
      ],
    },
  ],
};

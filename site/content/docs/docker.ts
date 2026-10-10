// Docker (/docker): keep it running. Sources: selfhost/README.md ("Docker: keep it running"),
// docs/docker.md ("Quick start" per system, "Updating", "Several instances on one computer",
// "Backups and cleanup"), the Makefile (`make help`, `make backup` leaves out master.key).
import { type DocPage, L, ltr } from "../doc.js";
import { SELF_HOST_REPO } from "../links.js";
import { helpers } from "./make.js";
import { DOCKER_DOC, INSTANCE_ENV } from "./shared.js";

export const docker: DocPage = {
  title: L(
    "Turjuman with Docker: always on, also after a restart",
    "Turjuman met Docker: altijd aan, ook na een herstart",
    "ترجمان مع Docker: يعمل دائمًا حتى بعد إعادة التشغيل",
  ),
  desc: L(
    "Keep Turjuman running with Docker, also after a restart: what you need, the start, everyday helpers, updates and backups.",
    "Laat Turjuman altijd draaien met Docker, ook na een herstart: wat je nodig hebt, de start, dagelijkse helpers, updates en back-ups.",
    "أبقِ ترجمان يعمل دائمًا مع Docker، حتى بعد إعادة التشغيل: المتطلبات، والتشغيل، والأوامر اليومية، والتحديثات، والنسخ الاحتياطية.",
  ),
  h1: L("Docker", "Docker", "Docker"),
  lead: L(
    "Keep Turjuman running: with Docker it restarts by itself, also after a reboot, and you drive it with `make` helpers.",
    "Laat Turjuman altijd draaien: met Docker start het vanzelf opnieuw, ook na een herstart van de computer, en bedien je het met `make`-helpers.",
    "أبقِ ترجمان يعمل دائمًا: مع Docker يعيد تشغيل نفسه، حتى بعد إعادة تشغيل الحاسوب، وتتحكّم فيه بأوامر `make` المساعدة.",
  ),
  sections: [
    {
      id: "need",
      h2: L("What you need", "Wat je nodig hebt", "ما تحتاج إليه"),
      blocks: [
        {
          dl: [
            [
              "Windows",
              L(
                "**Docker Desktop** with the WSL2 backend, and “Start Docker Desktop when you sign in” on. **Git for Windows** (`winget install Git.Git`) and **GNU make** (`winget install ezwinports.make`). Run every `make` command from **Git Bash**, not from PowerShell or cmd.",
                "**Docker Desktop** met de WSL2-backend, en „Start Docker Desktop when you sign in” aan. **Git for Windows** (`winget install Git.Git`) en **GNU make** (`winget install ezwinports.make`). Voer elke `make`-opdracht uit in **Git Bash**, niet in PowerShell of cmd.",
                "**Docker Desktop** مع واجهة WSL2، وتفعيل خيار «Start Docker Desktop when you sign in». و**Git for Windows** (`winget install Git.Git`) و**GNU make** (`winget install ezwinports.make`). ونفّذ كل أوامر `make` من **Git Bash**، لا من PowerShell أو cmd.",
              ),
            ],
            [
              "macOS",
              L(
                "**Docker Desktop**, or **OrbStack**.",
                "**Docker Desktop**, of **OrbStack**.",
                "**Docker Desktop** أو **OrbStack**.",
              ),
            ],
            [
              "Linux",
              L(
                "**Docker**. `make up` also writes your `UID`, `GID` and `PULSE_SOCKET` into `.env`.",
                "**Docker**. `make up` schrijft ook je `UID`, `GID` en `PULSE_SOCKET` in `.env`.",
                "**Docker**. ويكتب `make up` أيضًا قيم `UID` و`GID` و`PULSE_SOCKET` في `.env`.",
              ),
            ],
          ],
        },
        {
          p: L(
            "Docker with Compose 2.24 or newer. There is no published image: `make up` builds it on this computer, the first time in a few minutes. Docker Desktop on Windows and macOS runs only while a user is logged in: let the computer log in by itself.",
            "Docker met Compose 2.24 of nieuwer. Er is geen kant-en-klare image: `make up` bouwt hem op deze computer, de eerste keer in een paar minuten. Docker Desktop op Windows en macOS draait alleen als er iemand is ingelogd: laat de computer zelf inloggen.",
            "Docker مع Compose بالإصدار 2.24 أو أحدث. لا توجد صورة جاهزة: يبنيها `make up` على هذا الحاسوب، وتستغرق أول مرة بضع دقائق. ولا يعمل Docker Desktop على Windows وmacOS إلا ما دام مستخدم مسجّلًا الدخول، فاجعل الحاسوب يسجّل الدخول تلقائيًا.",
          ),
        },
        {
          p: L(
            "And the code, in a terminal:",
            "En de code, in een terminal:",
            "ثم الشيفرة، في نافذة طرفية:",
          ),
        },
        { code: [`git clone ${SELF_HOST_REPO}.git turjuman`, "cd turjuman"] },
      ],
    },
    {
      id: "start",
      h2: L("Start", "Starten", "التشغيل"),
      blocks: [
        { code: ["make up", "make admin"] },
        {
          ul: [
            L(
              "`make up`: the first time it also makes `config/`, `data/` and `.env` (it never overwrites), then it builds and starts. It returns once Turjuman is healthy, and prints the address, `http://127.0.0.1:8765/`.",
              "`make up`: de eerste keer maakt het ook `config/`, `data/` en `.env` (het overschrijft nooit iets), daarna bouwt en start het. Het is klaar zodra Turjuman gezond draait, en toont het adres, `http://127.0.0.1:8765/`.",
              "`make up`: ينشئ في المرة الأولى أيضًا `config/` و`data/` و`.env` (دون الكتابة فوق أي ملف)، ثم يبني ويشغّل. وينتهي حين يعمل ترجمان بسلامة، ويعرض العنوان `http://127.0.0.1:8765/`.",
            ),
            L(
              "On its first start Turjuman makes `config/config.yaml` itself, and downloads the Quran text and translations into `data/quran/` in the background, for verified verse references. Without internet it tries again later; `make logs` shows it.",
              "Bij de eerste start maakt Turjuman zelf `config/config.yaml`, en haalt het op de achtergrond de Korantekst en vertalingen op in `data/quran/`, voor gecontroleerde versverwijzingen. Zonder internet probeert het later opnieuw; `make logs` laat het zien.",
              "في التشغيل الأول ينشئ ترجمان بنفسه `config/config.yaml`، ويُنزّل في الخلفية نص القرآن وترجماته إلى `data/quran/` لمراجع الآيات الموثّقة. وإن لم يتوفّر الإنترنت أعاد المحاولة لاحقًا، ويعرض ذلك `make logs`.",
            ),
            L(
              "`make admin`: opens the app. Create your admin account, then add your Soniox key under **Keys**. Or run `make keys` to enter it in the terminal.",
              "`make admin`: opent de app. Maak je beheerdersaccount, en voeg dan je Soniox-sleutel toe onder **Sleutels**. Of voer `make keys` uit om hem in de terminal in te voeren.",
              "`make admin`: يفتح التطبيق. أنشئ حساب المشرف، ثم أضف مفتاح Soniox ضمن **المفاتيح**. أو نفّذ `make keys` لإدخاله في النافذة الطرفية.",
            ),
          ],
        },
        {
          p: L(
            "The container restarts by itself, and `make status` shows its health. Then make your first screen: [Install, step 7](page:install#first-screen); `make screens` prints the screen links.",
            "De container start vanzelf opnieuw, en `make status` toont of hij gezond is. Maak daarna je eerste scherm: [Installeren, stap 7](page:install#first-screen); `make screens` toont de schermlinks.",
            "تعيد الحاوية تشغيل نفسها، ويعرض `make status` حالتها. ثم أنشئ شاشتك الأولى: [التثبيت، الخطوة 7](page:install#first-screen)، ويعرض `make screens` روابط الشاشات.",
          ),
        },
        {
          p: L(
            "On the network ([Phone & network](page:network)): set `server.exposure: lan` in `config/config.yaml` and `CAPTIONS_BIND=0.0.0.0` in `.env`; Docker sets `server.host` itself. `make screens` then still prints the `http://127.0.0.1` links: copy the HTTPS link for another device in the app, opened at the computer's network address.",
            "Op het netwerk ([Telefoon & netwerk](page:network)): zet `server.exposure: lan` in `config/config.yaml` en `CAPTIONS_BIND=0.0.0.0` in `.env`; `server.host` regelt Docker zelf. `make screens` toont dan nog steeds de links met `http://127.0.0.1`: kopieer de HTTPS-link voor een ander apparaat in de app, geopend op het netwerkadres van de computer.",
            "على الشبكة ([الهاتف والشبكة](page:network)): اضبط `server.exposure: lan` في `config/config.yaml` و`CAPTIONS_BIND=0.0.0.0` في `.env`، أما `server.host` فيضبطه Docker بنفسه. ويبقى `make screens` يعرض روابط `http://127.0.0.1`، فانسخ رابط HTTPS لجهاز آخر من التطبيق مفتوحًا على عنوان الحاسوب في الشبكة.",
          ),
        },
        {
          note: L(
            `Coming from \`pnpm turjuman start\`? Stop it first: both use port 8765. Docker keeps its own settings and state in \`config/\` and \`data/\`. To take your accounts, screens and keys along: [Moving to Docker](${DOCKER_DOC}#moving-from-pnpm-turjuman-start-to-docker).`,
            `Draaide je eerst \`pnpm turjuman start\`? Stop dat eerst: allebei gebruiken poort 8765. Docker bewaart zijn eigen instellingen en gegevens in \`config/\` en \`data/\`. Je accounts, schermen en sleutels meenemen: [Moving to Docker (Engels)](${DOCKER_DOC}#moving-from-pnpm-turjuman-start-to-docker).`,
            `كنت تستخدم \`pnpm turjuman start\`؟ أوقفه أولًا، فكلاهما يستخدم المنفذ 8765. ويحفظ Docker إعداداته وبياناته في \`config/\` و\`data/\`. ولنقل حساباتك وشاشاتك ومفاتيحك: [Moving to Docker (بالإنجليزية)](${DOCKER_DOC}#moving-from-pnpm-turjuman-start-to-docker).`,
          ),
        },
      ],
    },
    {
      id: "helpers",
      h2: L("Everyday helpers", "Dagelijkse helpers", "أوامر يومية"),
      blocks: [
        {
          helpers: helpers([
            "make status",
            "make down",
            "make logs",
            "make screens",
            "make admin",
            "make keys",
            "make users",
            "make update",
            "make backup",
            "make doctor",
            "make help",
          ]),
        },
        {
          p: L(
            "Every helper: [Commands](page:commands#make).",
            "Alle helpers: [Opdrachten](page:commands#make).",
            "كل الأوامر المساعدة: [الأوامر](page:commands#make).",
          ),
        },
      ],
    },
    {
      id: "update",
      h2: L("Update", "Bijwerken", "التحديث"),
      blocks: [
        { code: ["make update"] },
        {
          p: L(
            "It runs `git pull --ff-only`, rebuilds, restarts, and waits until Turjuman is healthy.",
            "Het voert `git pull --ff-only` uit, bouwt opnieuw, herstart, en wacht tot Turjuman gezond draait.",
            "ينفّذ `git pull --ff-only`، ثم يعيد البناء والتشغيل، وينتظر حتى يعمل ترجمان بسلامة.",
          ),
        },
        {
          p: L(
            `Update outside a khutbah. Your settings and data stay: they are in \`config/\` and \`data/\`. An older install: [the Docker guide](${DOCKER_DOC}#upgrading-an-older-install).`,
            `Werk bij buiten een khutbah. Je instellingen en gegevens blijven: ze staan in \`config/\` en \`data/\`. Een oudere installatie: [de Docker-gids (Engels)](${DOCKER_DOC}#upgrading-an-older-install).`,
            `حدّث في غير وقت الخطبة. تبقى إعداداتك وبياناتك، فهي في \`config/\` و\`data/\`. ولتثبيت أقدم: [دليل Docker (بالإنجليزية)](${DOCKER_DOC}#upgrading-an-older-install).`,
          ),
        },
      ],
    },
    {
      id: "backup",
      h2: L("Back up", "Back-up", "النسخ الاحتياطي"),
      blocks: [
        { code: ["make backup"] },
        {
          p: L(
            "It writes `backups/<date>_<time>.tar.gz` with `config/` and the transcripts, readable only by you. It leaves out the `.env` files (your API keys), `config/keys.yaml` (the access keys) and `config/master.key`: keep those safe separately. `config/admin.token` stays out too: the next start makes a new one.",
            "Het schrijft `backups/<datum>_<tijd>.tar.gz` met `config/` en de transcripten, alleen voor jou leesbaar. De `.env`-bestanden (je API-sleutels), `config/keys.yaml` (de toegangssleutels) en `config/master.key` gaan er niet in mee: bewaar die apart en veilig. Ook `config/admin.token` blijft erbuiten: de volgende start maakt een nieuwe.",
            "يكتب الملف `backups/<date>_<time>.tar.gz` ويضم `config/` والنصوص المكتوبة، ولا يقرؤه أحد غيرك. ولا يضم ملفات `.env` (مفاتيح API) ولا `config/keys.yaml` (مفاتيح الوصول) ولا `config/master.key`، فاحفظها بأمان في مكان آخر. ولا يضم كذلك `config/admin.token`، فالتشغيل التالي ينشئ رمزًا جديدًا.",
          ),
        },
        {
          note: L(
            "Keep a copy of the master key somewhere else: together with `orgs.yaml` it unlocks the stored API keys.",
            "Bewaar een kopie van de hoofdsleutel ergens anders: samen met `orgs.yaml` ontsluit hij de opgeslagen API-sleutels.",
            "احتفظ بنسخة من المفتاح الرئيسي في مكان آخر، فهو مع `orgs.yaml` يفتح مفاتيح API المحفوظة.",
          ),
        },
      ],
    },
    {
      id: "env",
      h2: L("Settings in `.env`", "Instellingen in `.env`", "الإعدادات في `.env`"),
      blocks: [
        {
          p: L(
            "`make up` makes `.env` in the `turjuman` folder the first time. Docker reads these settings from it; without them, the defaults apply:",
            "`make up` maakt de eerste keer `.env` in de map `turjuman`. Docker leest deze instellingen eruit; zonder gelden de standaardwaarden:",
            "ينشئ `make up` في المرة الأولى الملف `.env` في المجلد `turjuman`. ويقرأ Docker منه هذه الإعدادات، ومن دونها تُستخدم القيم الافتراضية:",
          ),
        },
        {
          table: {
            head: [
              L("Setting", "Instelling", "الإعداد"),
              L("Default", "Standaard", "القيمة الافتراضية"),
              L("What it does", "Wat het doet", "وظيفته"),
            ],
            rows: [
              [
                "`HTTP_PORT`",
                "`8765`",
                L(
                  "The app's port on this computer",
                  "De poort van de app op deze computer",
                  "منفذ التطبيق على هذا الحاسوب",
                ),
              ],
              [
                "`HTTPS_PORT`",
                "`8443`",
                L(
                  "The HTTPS port, for `server.https.port: 8443`",
                  "De HTTPS-poort, voor `server.https.port: 8443`",
                  "منفذ HTTPS، مع `server.https.port: 8443`",
                ),
              ],
              [
                "`BRIDGE_PORT`",
                "`7000`",
                L(
                  "The audio bridge's port",
                  "De poort van de audio bridge",
                  "منفذ جسر الصوت (audio bridge)",
                ),
              ],
              [
                "`CAPTIONS_BIND`",
                "`127.0.0.1`",
                L(
                  "`0.0.0.0` puts the app on your network (with `server.exposure: lan`)",
                  "`0.0.0.0` zet de app op je netwerk (met `server.exposure: lan`)",
                  "القيمة `0.0.0.0` تتيح التطبيق على شبكتك (مع `server.exposure: lan`)",
                ),
              ],
              [
                "`TZ`",
                "`Europe/Amsterdam`",
                L(
                  "The time zone of session folders and log times",
                  "De tijdzone van sessiemappen en logtijden",
                  "المنطقة الزمنية لمجلدات الجلسات وأوقات السجل",
                ),
              ],
              [
                "`COMPOSE_PROJECT_NAME`",
                "`turjuman`",
                L("The name of this instance", "De naam van deze instantie", "اسم هذه النسخة"),
              ],
              [
                L(
                  "`CAPTIONS_IMAGE`, `CAPTIONS_BUILD_IMAGE`",
                  "`CAPTIONS_IMAGE`, `CAPTIONS_BUILD_IMAGE`",
                  "`CAPTIONS_IMAGE` و`CAPTIONS_BUILD_IMAGE`",
                ),
                L(
                  "`turjuman:local`, `turjuman:build`",
                  "`turjuman:local`, `turjuman:build`",
                  "`turjuman:local` و`turjuman:build`",
                ),
                L(
                  "The images of this instance",
                  "De images van deze instantie",
                  "صور Docker لهذه النسخة",
                ),
              ],
            ],
          },
        },
        {
          p: L(
            "`make keys` saves your Soniox key in `config/.env`. A `SONIOX_API_KEY` in this `.env` wins over it.",
            "`make keys` slaat je Soniox-sleutel op in `config/.env`. Een `SONIOX_API_KEY` in deze `.env` gaat daarvoor.",
            "يحفظ `make keys` مفتاح Soniox في `config/.env`. وإن وُجد `SONIOX_API_KEY` في ملف `.env` هذا فهو المعتمد.",
          ),
        },
      ],
    },
    {
      id: "instances",
      h2: L(
        "Several instances on one computer",
        "Meerdere instanties op één computer",
        "عدة نسخ على حاسوب واحد",
      ),
      blocks: [
        {
          p: L(
            "Each checkout is one instance with its own `config/` and `data/`. To run a second one next to the first, for example a test copy, give it its own name and ports in its `.env`:",
            "Elke checkout is één instantie met een eigen `config/` en `data/`. Wil je er een tweede naast draaien, bijvoorbeeld een testkopie, geef die dan een eigen naam en eigen poorten in de `.env`:",
            "كل نسخة مستنسخة من المستودع نسخةُ تشغيل مستقلة لها `config/` و`data/` خاصّان بها. ولتشغيل نسخة ثانية بجانب الأولى، كنسخة للتجربة مثلًا، أعطها اسمًا ومنافذ خاصة في ملف `.env` الخاص بها:",
          ),
        },
        { code: INSTANCE_ENV, kind: "yaml" },
        {
          p: L(
            "Every `make` helper then works on that instance: `make up` prints `http://127.0.0.1:8780/`. Links for this computer use these ports too. In a checkout without a `COMPOSE_PROJECT_NAME` in its `.env`, the helpers work on the default instance, `turjuman`.",
            "Elke `make`-helper werkt dan op die instantie: `make up` toont `http://127.0.0.1:8780/`. Ook links voor deze computer gebruiken die poorten. In een checkout zonder `COMPOSE_PROJECT_NAME` in de `.env` werken de helpers op de standaardinstantie, `turjuman`.",
            "تعمل عندها كل أوامر `make` على تلك النسخة: يعرض `make up` العنوان `http://127.0.0.1:8780/`. وتستخدم روابط هذا الحاسوب هذه المنافذ أيضًا. أما في نسخة ليس في ملف `.env` الخاص بها `COMPOSE_PROJECT_NAME`، فتعمل الأوامر على النسخة الافتراضية `turjuman`.",
          ),
        },
      ],
    },
    {
      id: "more",
      h2: L("More", "Meer", "المزيد"),
      blocks: [
        {
          ul: [
            L(
              `[Audio bridge](${DOCKER_DOC}#audio-bridge): server-side capture of the audio. On Windows, \`make bridge-install\` starts it at logon as the scheduled task “Turjuman audio bridge”.`,
              `[Audio bridge (Engels)](${DOCKER_DOC}#audio-bridge): het geluid opnemen op de server. Op Windows start \`make bridge-install\` hem bij het aanmelden, als de geplande taak „Turjuman audio bridge”.`,
              `[Audio bridge (بالإنجليزية)](${DOCKER_DOC}#audio-bridge): التقاط الصوت على الخادم. وعلى Windows يشغّله \`make bridge-install\` عند تسجيل الدخول، مهمةً مجدولة باسم «Turjuman audio bridge».`,
            ),
            L(
              "On a Mac, AirPlay Receiver also listens on port 7000. If the audio bridge cannot connect, turn AirPlay Receiver off (System Settings → General → AirDrop & Handoff), or set another `BRIDGE_PORT` in `.env` and run `make up`.",
              "Op een Mac luistert AirPlay Receiver ook op poort 7000. Kan de audio bridge geen verbinding maken, zet AirPlay Receiver dan uit (System Settings → General → AirDrop & Handoff, de Engelse menunamen), of zet een andere `BRIDGE_PORT` in `.env` en voer `make up` uit.",
              `على Mac يستمع AirPlay Receiver أيضًا على المنفذ 7000. فإن لم يتصل جسر الصوت فأوقف AirPlay Receiver من ${ltr("System Settings → General → AirDrop & Handoff")} (بأسماء القوائم الإنجليزية)، أو اضبط \`BRIDGE_PORT\` آخر في \`.env\` ثم نفّذ \`make up\`.`,
            ),
            L(
              `[HTTPS and your hostname](${DOCKER_DOC}#https-and-your-hostname): your own reverse proxy (nginx) in front of Turjuman.`,
              `[HTTPS and your hostname (Engels)](${DOCKER_DOC}#https-and-your-hostname): je eigen reverse proxy (nginx) vóór Turjuman.`,
              `[HTTPS and your hostname (بالإنجليزية)](${DOCKER_DOC}#https-and-your-hostname): وسيطك العكسي (reverse proxy) الخاص، مثل nginx، أمام ترجمان.`,
            ),
            L(
              `[The Docker guide](${DOCKER_DOC}): every helper, the raw \`docker compose\` commands, and troubleshooting.`,
              `[De Docker-gids (Engels)](${DOCKER_DOC}): elke helper, de \`docker compose\`-opdrachten zelf, en problemen oplossen.`,
              `[دليل Docker (بالإنجليزية)](${DOCKER_DOC}): كل الأوامر المساعدة، وأوامر \`docker compose\` الأصلية، وحلّ المشكلات.`,
            ),
          ],
        },
      ],
    },
  ],
};

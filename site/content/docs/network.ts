// Phone & network (/network). Sources: selfhost/README.md ("Your phone and other devices"),
// docs/guide.md ("HTTPS on the LAN", "Remote use"), docs/hosting.md ("nginx"), docs/docker.md
// ("HTTPS and your hostname"), the app's sos.https* words, docs/cli.md (keys, usage).
import { type DocPage, L, ltr } from "../doc.js";
import { DOCKER_DOC, HOSTING_DOC } from "./shared.js";

const MENU_NAMES_NOTE = L(
  "",
  "De menunamen zijn die van een Engelstalig apparaat.",
  "أسماء القوائم هنا كما تظهر على جهاز باللغة الإنجليزية.",
);

export const network: DocPage = {
  title: L(
    "Phone & network: HTTPS on the mosque's network · Turjuman",
    "Telefoon & netwerk: HTTPS op het moskeenetwerk · Turjuman",
    "الهاتف والشبكة: HTTPS على شبكة المسجد · ترجمان",
  ),
  desc: L(
    "Open the app on your phone, show captions on other computers and TVs over HTTPS, and reach Turjuman from outside the mosque.",
    "Open de app op je telefoon, toon ondertiteling op andere computers en tv's via HTTPS, en bereik Turjuman van buiten de moskee.",
    "افتح التطبيق على هاتفك، واعرض الترجمة على حواسيب وأجهزة تلفاز أخرى عبر HTTPS، وصِل إلى ترجمان من خارج المسجد.",
  ),
  h1: L("Phone & network", "Telefoon & netwerk", "الهاتف والشبكة"),
  lead: L(
    "Only needed for your phone, for captions on another computer, or for access from outside the mosque.",
    "Alleen nodig voor je telefoon, voor ondertiteling op een andere computer, of voor toegang van buiten de moskee.",
    "لا تحتاج إلى هذا إلا لهاتفك، أو لعرض الترجمة على حاسوب آخر، أو للوصول من خارج المسجد.",
  ),
  sections: [
    {
      id: "phone",
      h2: L(
        "Your phone on the mosque's Wi-Fi",
        "Je telefoon op de wifi van de moskee",
        "هاتفك على شبكة الواي فاي في المسجد",
      ),
      blocks: [
        {
          ol: [
            {
              text: L(
                "Copy `config.example.yaml` to `config.yaml`, and set:",
                "Kopieer `config.example.yaml` naar `config.yaml`, en zet:",
                "انسخ `config.example.yaml` إلى `config.yaml`، واضبط فيه:",
              ),
              blocks: [{ code: ["server:", "  host: 0.0.0.0", "  exposure: lan"], kind: "yaml" }],
            },
            L(
              "Restart: `pnpm turjuman start`. It now also prints **On the network:** `http://192.168.x.x:8765/app`.",
              "Start opnieuw: `pnpm turjuman start`. Nu toont het ook **On the network:** `http://192.168.x.x:8765/app`.",
              `أعد التشغيل: \`pnpm turjuman start\`. سيعرض الآن أيضًا **${ltr("On the network:")}** \`http://192.168.x.x:8765/app\`.`,
            ),
            L(
              "Open that address on your phone and log in. Add it to your home screen to open it like an app.",
              "Open dat adres op je telefoon en log in. Zet het op je beginscherm om het als app te openen.",
              "افتح هذا العنوان على هاتفك وسجّل الدخول. أضفه إلى الشاشة الرئيسية لتفتحه كأي تطبيق.",
            ),
          ],
        },
        {
          ul: [
            L(
              "The phone can't reach it? Allow incoming connections for Node.js (or Docker) in the computer's firewall.",
              "Komt de telefoon er niet bij? Sta in de firewall van de computer inkomende verbindingen toe voor Node.js (of Docker).",
              "لا يصل الهاتف إليه؟ اسمح في جدار الحماية على الحاسوب بالاتصالات الواردة لـ Node.js (أو Docker).",
            ),
            L(
              "Give the computer a fixed address (a DHCP reservation in the router): screen links and the certificate below contain it.",
              "Geef de computer een vast adres (een DHCP-reservering in de router): schermlinks en het certificaat hieronder bevatten het.",
              "أعطِ الحاسوب عنوانًا ثابتًا (حجز DHCP في الموجّه)، فروابط الشاشات والشهادة أدناه تتضمّنه.",
            ),
            L(
              "Over plain `http://` the password crosses the Wi-Fi unencrypted. Once HTTPS works, log in at the `https://` address.",
              "Via gewoon `http://` gaat het wachtwoord onversleuteld over de wifi. Werkt HTTPS eenmaal, log dan in op het `https://`-adres.",
              "عبر `http://` العادي تمرّ كلمة المرور على شبكة الواي فاي دون تشفير، فإذا عمل HTTPS فسجّل الدخول على عنوان `https://`.",
            ),
            L(
              "With `exposure: lan`, the first admin can only be created on the computer itself.",
              "Met `exposure: lan` kun je het eerste beheerdersaccount alleen op de computer zelf maken.",
              "مع `exposure: lan` لا يمكن إنشاء أول حساب مشرف إلا على الحاسوب نفسه.",
            ),
          ],
        },
        {
          note: L(
            "With Docker: set `server.exposure: lan` in `config/config.yaml` and `CAPTIONS_BIND=0.0.0.0` in `.env`, then `make restart`. On your phone, open `http://<IP>:8765/app` with this computer's IP address. No admin account yet? Create it with `make user-add USERNAME=<name> ADMIN=1`.",
            "Met Docker: zet `server.exposure: lan` in `config/config.yaml` en `CAPTIONS_BIND=0.0.0.0` in `.env`, en dan `make restart`. Open op je telefoon `http://<IP>:8765/app`, met het IP-adres van deze computer. Nog geen beheerdersaccount? Maak het met `make user-add USERNAME=<name> ADMIN=1`.",
            "مع Docker: اضبط `server.exposure: lan` في `config/config.yaml` و`CAPTIONS_BIND=0.0.0.0` في `.env`، ثم نفّذ `make restart`. وافتح على هاتفك `http://<IP>:8765/app` مع عنوان IP لهذا الحاسوب. ليس لديك حساب مشرف بعد؟ أنشئه بالأمر `make user-add USERNAME=<name> ADMIN=1`.",
          ),
        },
      ],
    },
    {
      id: "https",
      h2: L(
        "Captions on another computer or TV",
        "Ondertiteling op een andere computer of tv",
        "الترجمة على حاسوب آخر أو تلفاز",
      ),
      blocks: [
        {
          p: L(
            "Browsers open the microphone only on HTTPS, or on the computer that runs Turjuman itself. For a caption page on another device:",
            "Browsers openen de microfoon alleen via HTTPS, of op de computer waarop Turjuman zelf draait. Voor een ondertitelpagina op een ander apparaat:",
            "لا تفتح المتصفحات الميكروفون إلا عبر HTTPS، أو على الحاسوب الذي يعمل عليه ترجمان نفسه. ولعرض صفحة الترجمة على جهاز آخر:",
          ),
        },
        {
          ol: [
            {
              text: L(
                "On the Turjuman computer, make a certificate:",
                "Maak op de Turjuman-computer een certificaat:",
                "أنشئ شهادة على حاسوب ترجمان:",
              ),
              blocks: [
                { code: ["bash scripts/lan-cert.sh tls"] },
                {
                  p: L(
                    "With Docker: `make lan-cert`, which writes `config/tls`. It makes a small certificate authority (CA) for this installation, and a certificate for this computer's addresses, valid for 825 days. Run it again when the computer's IP address changes; the CA stays the same.",
                    "Met Docker: `make lan-cert`, dat in `config/tls` schrijft. Het maakt een kleine certificaatautoriteit (CA) voor deze installatie, en een certificaat voor de adressen van deze computer, 825 dagen geldig. Voer het opnieuw uit als het IP-adres van de computer verandert; de CA blijft dezelfde.",
                    "مع Docker: `make lan-cert`، ويكتب في `config/tls`. ينشئ ذلك جهة تصديق (CA) صغيرة لهذا التثبيت، وشهادةً لعناوين هذا الحاسوب صالحة 825 يومًا. أعد تنفيذه إذا تغيّر عنوان IP للحاسوب، وتبقى جهة التصديق كما هي.",
                  ),
                },
                {
                  p: L(
                    '**On Windows** the script can\'t find the address: give it, `LAN_NAMES="192.168.1.20" bash scripts/lan-cert.sh tls` (Docker: `make lan-cert LAN_NAMES="192.168.1.20"`).',
                    '**Op Windows** vindt het script het adres niet: geef het mee, `LAN_NAMES="192.168.1.20" bash scripts/lan-cert.sh tls` (Docker: `make lan-cert LAN_NAMES="192.168.1.20"`).',
                    '**على Windows** لا يجد السكربت العنوان، فأعطه إياه: `LAN_NAMES="192.168.1.20" bash scripts/lan-cert.sh tls` (مع Docker: `make lan-cert LAN_NAMES="192.168.1.20"`).',
                  ),
                },
              ],
            },
            {
              text: L(
                "In `config.yaml`, set both `server.exposure: lan` (as above) and `server.https.port: 8443`:",
                "Zet in `config.yaml` zowel `server.exposure: lan` (zoals hierboven) als `server.https.port: 8443`:",
                "اضبط في `config.yaml` القيمتين معًا: `server.exposure: lan` (كما في القسم السابق) و`server.https.port: 8443`:",
              ),
              blocks: [
                {
                  code: [
                    "server:",
                    "  host: 0.0.0.0",
                    "  exposure: lan",
                    "  https:",
                    "    port: 8443",
                  ],
                  kind: "yaml",
                },
                {
                  p: L(
                    "Then restart Turjuman: HTTP stays on 8765, and HTTPS is added on 8443. Both settings are needed: with `exposure: local`, HTTPS answers on this computer only.",
                    "Start Turjuman daarna opnieuw: HTTP blijft op 8765, en HTTPS komt erbij op 8443. Beide instellingen zijn nodig: met `exposure: local` antwoordt HTTPS alleen op deze computer.",
                    "ثم أعد تشغيل ترجمان: يبقى HTTP على المنفذ 8765، ويُضاف HTTPS على المنفذ 8443. والإعدادان ضروريان معًا: فمع `exposure: local` لا يستجيب HTTPS إلا على هذا الحاسوب.",
                  ),
                },
                {
                  p: L(
                    "With Docker: the same two settings in `config/config.yaml`, and `CAPTIONS_BIND=0.0.0.0` in `.env`; then `make restart`.",
                    "Met Docker: dezelfde twee instellingen in `config/config.yaml`, en `CAPTIONS_BIND=0.0.0.0` in `.env`; daarna `make restart`.",
                    "مع Docker: الإعدادان نفسهما في `config/config.yaml`، و`CAPTIONS_BIND=0.0.0.0` في `.env`، ثم `make restart`.",
                  ),
                },
              ],
            },
            {
              text: L(
                "On each device, once: download the CA from `http://<server>:8765/ca.crt` and install it as trusted. Without Docker, `start` prints this address.",
                "Op elk apparaat, één keer: download de CA van `http://<server>:8765/ca.crt` en installeer hem als vertrouwd. Zonder Docker toont `start` dit adres.",
                "على كل جهاز، مرة واحدة: نزّل شهادة الجهة من `http://<server>:8765/ca.crt` وثبّتها كشهادة موثوقة. وبدون Docker يعرض `start` هذا العنوان.",
              ),
              blocks: [
                {
                  dl: [
                    [
                      "iPhone, iPad",
                      L(
                        "Settings → **Profile Downloaded** → Install; then Settings → General → About → Certificate Trust Settings → turn on **Turjuman local CA**.",
                        "Settings → **Profile Downloaded** → Install; daarna Settings → General → About → Certificate Trust Settings → zet **Turjuman local CA** aan.",
                        "Settings ← **Profile Downloaded** ← Install، ثم Settings ← General ← About ← Certificate Trust Settings ← فعّل **Turjuman local CA**.",
                      ),
                    ],
                    [
                      "Android",
                      L(
                        "Settings → Security → Encryption & credentials → Install a certificate → **CA certificate**.",
                        "Settings → Security → Encryption & credentials → Install a certificate → **CA certificate**.",
                        "Settings ← Security ← Encryption & credentials ← Install a certificate ← **CA certificate**.",
                      ),
                    ],
                    [
                      L("Windows (the OBS PC)", "Windows (de OBS-pc)", "Windows (حاسوب OBS)"),
                      L(
                        "Open the file → Install Certificate → Local Machine → **Trusted Root Certification Authorities**; restart OBS.",
                        "Open het bestand → Install Certificate → Local Machine → **Trusted Root Certification Authorities**; start OBS opnieuw.",
                        "افتح الملف ← Install Certificate ← Local Machine ← **Trusted Root Certification Authorities**، ثم أعد تشغيل OBS.",
                      ),
                    ],
                    [
                      "Mac",
                      L(
                        "Open it in Keychain Access (System), and set **Always Trust**.",
                        "Open hem in Keychain Access (System), en kies **Always Trust**.",
                        "افتحها في Keychain Access (System)، واختر **Always Trust**.",
                      ),
                    ],
                  ],
                },
                { p: MENU_NAMES_NOTE },
              ],
            },
            L(
              "Open `https://<server-ip>:8443` and log in again: logins are per address. The screen links now start with `https://`.",
              "Open `https://<server-ip>:8443` en log opnieuw in: inloggen geldt per adres. De schermlinks beginnen nu met `https://`.",
              "افتح `https://<server-ip>:8443` وسجّل الدخول من جديد، فتسجيل الدخول خاص بكل عنوان. وتبدأ روابط الشاشات الآن بـ `https://`.",
            ),
          ],
        },
        {
          p: L(
            "`pnpm turjuman doctor` (Docker: `make doctor`) checks the certificate: that it is there, matches its key and has not expired, and, without Docker, that it names this computer's address. It says when to make it again.",
            "`pnpm turjuman doctor` (Docker: `make doctor`) controleert het certificaat: of het er is, bij zijn sleutel hoort en niet verlopen is, en, zonder Docker, of het het adres van deze computer noemt. Het zegt wanneer je het opnieuw moet maken.",
            "يتحقّق `pnpm turjuman doctor` (مع Docker: `make doctor`) من الشهادة: أنها موجودة، وتطابق مفتاحها، ولم تنتهِ صلاحيتها، وأنها، بدون Docker، تذكر عنوان هذا الحاسوب. ويخبرك متى تُنشئها من جديد.",
          ),
        },
        {
          p: L(
            "In Docker, `make screens` prints only the `http://127.0.0.1` links. For another device, copy the HTTPS link in the app opened at `http://<server-ip>:8765/app`: **Show on a screen** → **On another computer or TV**.",
            "In Docker toont `make screens` alleen de links met `http://127.0.0.1`. Kopieer voor een ander apparaat de HTTPS-link in de app, geopend op `http://<server-ip>:8765/app`: **Op een scherm tonen** → **Op een andere computer of tv**.",
            "في Docker لا يعرض `make screens` إلا روابط `http://127.0.0.1`. ولجهاز آخر انسخ رابط HTTPS من التطبيق مفتوحًا على `http://<server-ip>:8765/app`: **عرض على شاشة** ← **على حاسوب آخر أو تلفاز**.",
          ),
        },
        {
          p: L(
            "`tls/ca.key` can sign certificates that every device with the CA trusts: keep it private, and remove “Turjuman local CA” from devices that stop using Turjuman.",
            "Met `tls/ca.key` kun je certificaten tekenen die elk apparaat met de CA vertrouwt: houd het privé, en verwijder „Turjuman local CA” van apparaten die Turjuman niet meer gebruiken.",
            "يستطيع `tls/ca.key` توقيع شهادات يثق بها كل جهاز ثبّت شهادة الجهة، فاحفظه بعيدًا عن الآخرين، واحذف «Turjuman local CA» من الأجهزة التي تتوقف عن استخدام ترجمان.",
          ),
        },
        {
          note: L(
            "OBS cannot click through a certificate warning, so install the CA on the OBS computer. OBS on the computer that runs Turjuman can use the `http://127.0.0.1` link instead: **On this computer** in the app, or `pnpm turjuman screens url <id> --local`.",
            "OBS kan niet door een certificaatwaarschuwing heen klikken, dus installeer de CA op de OBS-computer. OBS op de computer waarop Turjuman draait, kan in plaats daarvan de link met `http://127.0.0.1` gebruiken: **Op deze computer** in de app, of `pnpm turjuman screens url <id> --local`.",
            "لا يستطيع OBS تجاوز تحذير الشهادة، لذا ثبّت شهادة الجهة على حاسوب OBS. أما OBS على الحاسوب الذي يعمل عليه ترجمان فيمكنه استخدام رابط `http://127.0.0.1` بدلًا من ذلك: **على هذا الحاسوب** في التطبيق، أو `pnpm turjuman screens url <id> --local`.",
          ),
        },
      ],
    },
    {
      id: "outside",
      h2: L("From outside the mosque", "Van buiten de moskee", "من خارج المسجد"),
      blocks: [
        {
          p: L(
            `Put your own HTTPS reverse proxy, for example nginx, in front of Turjuman: it has the certificate and the hostname, and forwards to \`127.0.0.1:8765\`. The complete nginx block: [the hosting guide](${HOSTING_DOC}#nginx).`,
            `Zet je eigen HTTPS-reverse-proxy, bijvoorbeeld nginx, vóór Turjuman: die heeft het certificaat en de hostnaam, en stuurt door naar \`127.0.0.1:8765\`. Het volledige nginx-blok: [de hostinggids (Engels)](${HOSTING_DOC}#nginx).`,
            `ضع أمام ترجمان وسيطك العكسي (reverse proxy) الخاص لـ HTTPS، مثل nginx: عنده الشهادة واسم المضيف، ويحوّل الطلبات إلى \`127.0.0.1:8765\`. وكتلة nginx كاملة في [دليل الاستضافة (بالإنجليزية)](${HOSTING_DOC}#nginx).`,
          ),
        },
        {
          p: L(
            "In `config/config.yaml` set (then `make restart`):",
            "Zet in `config/config.yaml` (en dan `make restart`):",
            "واضبط في `config/config.yaml` (ثم نفّذ `make restart`):",
          ),
        },
        {
          code: ["server:", "  exposure: public", "  trustProxy: true"],
          kind: "yaml",
        },
        {
          p: L(
            "There is no hostname to set: links follow the one your proxy forwards (`X-Forwarded-Host`, `X-Forwarded-Proto`), so it can change at any time. The admin token for `make` and the CLI is made by Turjuman itself, in `config/admin.token`. `make screens` prints `http://127.0.0.1` links: copy the public link in the app, or set the optional `hosted.publicUrl`.",
            "Er is geen hostnaam om in te stellen: links volgen de hostnaam die je proxy doorgeeft (`X-Forwarded-Host`, `X-Forwarded-Proto`), dus die mag altijd veranderen. Het beheertoken voor `make` en de CLI maakt Turjuman zelf, in `config/admin.token`. `make screens` toont links met `http://127.0.0.1`: kopieer de openbare link in de app, of zet de optionele `hosted.publicUrl`.",
            "لا يوجد اسم مضيف لتضبطه: تتبع الروابط الاسم الذي يمرّره وسيطك (`X-Forwarded-Host` و`X-Forwarded-Proto`)، فيمكن أن يتغيّر في أي وقت. وينشئ ترجمان بنفسه رمز المشرف لـ `make` والأوامر في `config/admin.token`. ويعرض `make screens` روابط `http://127.0.0.1`، فانسخ الرابط العام من التطبيق، أو اضبط الإعداد الاختياري `hosted.publicUrl`.",
          ),
        },
        {
          p: L(
            `Create the first admin with \`make user-add USERNAME=<name> ADMIN=1\` (the password is shown once), and log in at \`https://<your address>/app\`. More: [HTTPS and your hostname](${DOCKER_DOC}#https-and-your-hostname).`,
            `Maak de eerste beheerder met \`make user-add USERNAME=<name> ADMIN=1\` (het wachtwoord wordt één keer getoond), en log in op \`https://<jouw adres>/app\`. Meer: [HTTPS and your hostname (Engels)](${DOCKER_DOC}#https-and-your-hostname).`,
            `أنشئ أول مشرف بالأمر \`make user-add USERNAME=<name> ADMIN=1\` (تظهر كلمة المرور مرة واحدة)، ثم سجّل الدخول على \`https://<عنوانك>/app\`. والمزيد في [HTTPS and your hostname (بالإنجليزية)](${DOCKER_DOC}#https-and-your-hostname).`,
          ),
        },
      ],
    },
    {
      id: "access-keys",
      h2: L(
        "Caption pages without a screen link",
        "Ondertitelpagina's zonder schermlink",
        "صفحات الترجمة دون رابط شاشة",
      ),
      blocks: [
        {
          p: L(
            "Screen links need no access key. A plain caption page such as `/ar/nl` needs one with `exposure: lan` or `public`. Access keys are not your Soniox key:",
            "Schermlinks hebben geen toegangssleutel nodig. Een gewone ondertitelpagina zoals `/ar/nl` heeft er een nodig met `exposure: lan` of `public`. Toegangssleutels zijn niet je Soniox-sleutel:",
            "لا تحتاج روابط الشاشات إلى مفتاح وصول. أما صفحة الترجمة العادية مثل `/ar/nl` فتحتاج إليه مع `exposure: lan` أو `public`. ومفاتيح الوصول غير مفتاح Soniox:",
          ),
        },
        { code: ['pnpm turjuman keys add --label "Mosque OBS" --daily-minutes 120'] },
        {
          p: L(
            "The key is shown once. `pnpm turjuman usage` shows the minutes per key, and `pnpm turjuman keys revoke <id>` revokes one. More in [Commands](page:commands#remote).",
            "De sleutel wordt één keer getoond. `pnpm turjuman usage` toont de minuten per sleutel, en `pnpm turjuman keys revoke <id>` trekt er een in. Meer bij [Opdrachten](page:commands#remote).",
            "يظهر المفتاح مرة واحدة. يعرض `pnpm turjuman usage` الدقائق لكل مفتاح، ويلغي `pnpm turjuman keys revoke <id>` مفتاحًا. المزيد في [الأوامر](page:commands#remote).",
          ),
        },
      ],
    },
    {
      id: "trouble",
      h2: L("If it doesn't work", "Als het niet werkt", "إذا لم يعمل"),
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
                  "Use the HTTPS address (port 8443), or open the page on the computer that runs Turjuman.",
                  "Gebruik het HTTPS-adres (poort 8443), of open de pagina op de computer waarop Turjuman draait.",
                  "استخدم عنوان HTTPS (المنفذ 8443)، أو افتح الصفحة على الحاسوب الذي يعمل عليه ترجمان.",
                ),
              ],
              [
                L("A certificate warning", "Een certificaatwaarschuwing", "تحذير بشأن الشهادة"),
                L(
                  "Install the CA on that device (step 3). OBS cannot click through it.",
                  "Installeer de CA op dat apparaat (stap 3). OBS kan er niet doorheen klikken.",
                  "ثبّت شهادة الجهة على ذلك الجهاز (الخطوة 3)، فـ OBS لا يستطيع تجاوز التحذير.",
                ),
              ],
              [
                L(
                  "The phone can't open `http://<IP>:8765`",
                  "De telefoon opent `http://<IP>:8765` niet",
                  "لا يفتح الهاتف `http://<IP>:8765`",
                ),
                L(
                  "Check `host: 0.0.0.0` and `exposure: lan` (Docker: `CAPTIONS_BIND=0.0.0.0` in `.env`), and the computer's firewall.",
                  "Controleer `host: 0.0.0.0` en `exposure: lan` (Docker: `CAPTIONS_BIND=0.0.0.0` in `.env`), en de firewall van de computer.",
                  "تحقّق من `host: 0.0.0.0` و`exposure: lan` (مع Docker: `CAPTIONS_BIND=0.0.0.0` في `.env`)، ومن جدار الحماية على الحاسوب.",
                ),
              ],
              [
                L(
                  "The computer's IP address changed",
                  "Het IP-adres van de computer is veranderd",
                  "تغيّر عنوان IP للحاسوب",
                ),
                L(
                  "Make the certificate again: `bash scripts/lan-cert.sh tls`, or `make lan-cert` (on Windows with `LAN_NAMES`, step 1); then restart Turjuman. The CA stays the same, so devices keep it.",
                  "Maak het certificaat opnieuw: `bash scripts/lan-cert.sh tls`, of `make lan-cert` (op Windows met `LAN_NAMES`, stap 1); start Turjuman daarna opnieuw. De CA blijft dezelfde, dus apparaten houden hem.",
                  "أنشئ الشهادة من جديد: `bash scripts/lan-cert.sh tls` أو `make lan-cert` (على Windows مع `LAN_NAMES`، الخطوة 1)، ثم أعد تشغيل ترجمان. وتبقى جهة التصديق كما هي، فلا حاجة إلى تثبيتها مجددًا على الأجهزة.",
                ),
              ],
              [
                L(
                  "Logged out on the new address",
                  "Uitgelogd op het nieuwe adres",
                  "خرجت من حسابك على العنوان الجديد",
                ),
                L(
                  "Log in again: logins are per address.",
                  "Log opnieuw in: inloggen geldt per adres.",
                  "سجّل الدخول من جديد، فتسجيل الدخول خاص بكل عنوان.",
                ),
              ],
            ],
          },
        },
        {
          p: L(
            `Step by step, with more detail: [HTTPS on the LAN](https://github.com/turjuman-translator/cli/blob/main/docs/guide.md#https-on-the-lan-microphones-on-phones-and-other-pcs), and [the Docker guide](${DOCKER_DOC}).`,
            `Stap voor stap, met meer details: [HTTPS on the LAN (Engels)](https://github.com/turjuman-translator/cli/blob/main/docs/guide.md#https-on-the-lan-microphones-on-phones-and-other-pcs), en [de Docker-gids (Engels)](${DOCKER_DOC}).`,
            `خطوة بخطوة وبتفصيل أكثر: [HTTPS on the LAN (بالإنجليزية)](https://github.com/turjuman-translator/cli/blob/main/docs/guide.md#https-on-the-lan-microphones-on-phones-and-other-pcs)، و[دليل Docker (بالإنجليزية)](${DOCKER_DOC}).`,
          ),
        },
      ],
    },
  ],
};

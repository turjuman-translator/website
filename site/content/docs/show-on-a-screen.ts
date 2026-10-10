// Show on a screen (/show-on-a-screen), for hosted and self-hosted mosques alike. Sources:
// selfhost/README.md ("Make your first screen", "Show it on a screen", "When something does not
// work"), docs/guide.md ("OBS setup", "Friday checklist", "Troubleshooting", "Screens, accounts
// and the app"), the app's own panel (sos.* in web/shared/app-i18n.ts: the same words) and the
// dashboard's status (status.listening).
// Not on the self-host path: hosted and self-hosted mosques share this page.
import { type DocPage, L, ltr } from "../doc.js";

export const showOnAScreen: DocPage = {
  title: L(
    "Show captions on a TV, projector or in OBS · Turjuman",
    "Ondertiteling op een tv, beamer of in OBS · Turjuman",
    "عرض الترجمة على تلفاز أو جهاز عرض أو في OBS · ترجمان",
  ),
  desc: L(
    "Put a screen's link in OBS Studio or a browser, bring the mosque's audio to that computer, and get ready for Friday.",
    "Zet de link van een scherm in OBS Studio of een browser, breng het geluid van de moskee naar die computer, en maak je klaar voor vrijdag.",
    "ضع رابط الشاشة في OBS Studio أو في متصفح، وأوصل صوت المسجد إلى ذلك الحاسوب، واستعدّ ليوم الجمعة.",
  ),
  h1: L("Show on a screen", "Op een scherm tonen", "عرض على شاشة"),
  lead: L(
    "From a screen's link to captions on the TV.",
    "Van de link van een scherm naar ondertiteling op de tv.",
    "من رابط الشاشة إلى الترجمة على التلفاز.",
  ),
  sections: [
    {
      id: "link",
      h2: L("A screen is one link", "Een scherm is één link", "الشاشة رابط واحد"),
      blocks: [
        {
          ul: [
            L(
              "Every screen has its own screen link, `…/feed/…`. Copy it in the app: the screen's **Show on a screen**.",
              "Elk scherm heeft een eigen schermlink, `…/feed/…`. Kopieer hem in de app: **Op een scherm tonen** bij het scherm.",
              "لكل شاشة رابط شاشة خاص بها `…/feed/…`. انسخه من التطبيق: **عرض على شاشة** في بطاقة الشاشة.",
            ),
            L(
              "Self-hosted, the app asks where OBS or the browser runs: **On this computer** (the one that runs Turjuman) gives the `http://127.0.0.1` link, **On another computer or TV** the HTTPS link.",
              "Zelf gehost vraagt de app waar OBS of de browser draait: **Op deze computer** (die waarop Turjuman draait) geeft de link met `http://127.0.0.1`, **Op een andere computer of tv** de HTTPS-link.",
              "في الاستضافة الذاتية يسألك التطبيق أين يعمل OBS أو المتصفح: **على هذا الحاسوب** (الذي يعمل عليه ترجمان) يعطيك رابط `http://127.0.0.1`، و**على حاسوب آخر أو تلفاز** يعطيك رابط HTTPS.",
            ),
            L(
              "Show it in OBS Studio as a Browser source, or full screen in any browser.",
              "Toon hem in OBS Studio als browserbron, of op volledig scherm in een browser.",
              "اعرضه في OBS Studio مصدرًا من نوع المتصفح، أو بملء الشاشة في أي متصفح.",
            ),
            L(
              "The page listens through the microphone of the computer that shows it.",
              "De pagina luistert via de microfoon van de computer die haar toont.",
              "تستمع الصفحة عبر ميكروفون الحاسوب الذي يعرضها.",
            ),
            L(
              "Keep it private: anyone with this link can show this screen, on your Soniox credit. **New link** replaces it, and the old link stops working at once.",
              "Houd hem privé: iedereen met deze link kan dit scherm tonen, op jouw Soniox-tegoed. **Nieuwe link** vervangt hem, en de oude link werkt meteen niet meer.",
              "احتفظ به لنفسك: كل من لديه هذا الرابط يستطيع عرض هذه الشاشة على حساب رصيدك في Soniox. يستبدله **رابط جديد**، فيتوقف الرابط القديم فورًا.",
            ),
          ],
        },
      ],
    },
    {
      id: "audio",
      h2: L(
        "Bring the mosque's audio to that computer",
        "Breng het geluid van de moskee naar die computer",
        "أوصل صوت المسجد إلى ذلك الحاسوب",
      ),
      blocks: [
        {
          p: L(
            "Connect the sound system, for example a USB audio interface on the mixer's aux output. Make it the computer's default input, or pick it in the builder's **Microphone** step.",
            "Sluit de geluidsinstallatie aan, bijvoorbeeld een USB-audio-interface op de aux-uitgang van het mengpaneel. Maak die de standaardingang van de computer, of kies hem in de stap **Microfoon** van de bouwer.",
            "صِل نظام الصوت بالحاسوب، مثلًا عبر واجهة صوت USB موصولة بمخرج aux في مازج الصوت. اجعلها مدخل الصوت الافتراضي للحاسوب، أو اخترها في خطوة **الميكروفون** عند إنشاء الشاشة.",
          ),
        },
        {
          ul: [
            L(
              "Every computer that shows captions needs this audio. A smart TV's own browser can't be used: it has no audio input.",
              "Elke computer die ondertiteling toont, heeft dit geluid nodig. De eigen browser van een smart-tv werkt niet: die heeft geen geluidsingang.",
              "كل حاسوب يعرض الترجمة يحتاج إلى هذا الصوت. ولا يصلح متصفح التلفاز الذكي نفسه، فليس له مدخل صوت.",
            ),
            L(
              "Every computer that shows captions is its own Soniox stream: two computers cost twice.",
              "Elke computer die ondertiteling toont, is een eigen Soniox-stream: twee computers kosten het dubbele.",
              "كل حاسوب يعرض الترجمة بثٌّ مستقل لدى Soniox: حاسوبان يكلّفان الضعف.",
            ),
            L(
              "Switch off sleep on that computer (self-hosted: also on the computer that runs Turjuman).",
              "Zet de slaapstand uit op die computer (zelf gehost: ook op de computer waarop Turjuman draait).",
              "أوقف وضع السكون على ذلك الحاسوب (وفي الاستضافة الذاتية: على الحاسوب الذي يعمل عليه ترجمان أيضًا).",
            ),
          ],
        },
      ],
    },
    {
      id: "obs",
      h2: L("OBS Studio", "OBS Studio", "OBS Studio"),
      blocks: [
        {
          ol: [
            {
              text: L(
                "Start OBS with access to the microphone:",
                "Start OBS met toegang tot de microfoon:",
                "شغّل OBS مع السماح له باستخدام الميكروفون:",
              ),
              blocks: [
                {
                  dl: [
                    [
                      "Windows",
                      L(
                        "add `--enable-media-stream` to the **Target** of the OBS shortcut",
                        "zet `--enable-media-stream` achter het **Doel** van de OBS-snelkoppeling",
                        "أضف `--enable-media-stream` في خانة **الهدف (Target)** لاختصار OBS",
                      ),
                    ],
                    ["macOS", "`/Applications/OBS.app/Contents/MacOS/OBS --enable-media-stream`"],
                    ["Linux", "`obs --enable-media-stream`"],
                  ],
                },
              ],
            },
            L(
              "**Sources → + → Browser**, and paste the link. Width 1920, height 1080.",
              "**Bronnen → + → Browser**, en plak de link. Breedte 1920, hoogte 1080.",
              "**المصادر ← + ← متصفح**، ثم الصق الرابط. العرض 1920، والارتفاع 1080.",
            ),
            {
              text: L(
                "Turn off these two options:",
                "Zet deze twee opties uit:",
                "أوقف هذين الخيارين:",
              ),
              blocks: [
                {
                  ul: [
                    L(
                      "**Shutdown source when not visible**",
                      "**Shutdown source when not visible**",
                      `**${ltr("Shutdown source when not visible")}**`,
                    ),
                    L(
                      "**Refresh browser when scene becomes active**",
                      "**Refresh browser when scene becomes active**",
                      `**${ltr("Refresh browser when scene becomes active")}**`,
                    ),
                  ],
                },
              ],
            },
            L(
              "On a TV: right-click the scene → **Open Scene Projector** → **Display: …** for the TV.",
              "Op een tv: klik met rechts op de scène → **Open Scene Projector** → **Display: …** van de tv.",
              `على تلفاز: انقر بالزر الأيمن على المشهد ← **${ltr("Open Scene Projector")}** ← **${ltr("Display: …")}** الخاص بالتلفاز.`,
            ),
          ],
        },
        {
          note: L(
            "Self-hosted, with OBS on another computer than the one that runs Turjuman? That needs HTTPS on your network: [Phone & network](page:network#https). With HTTPS on, OBS on the Turjuman computer itself can keep the `http://127.0.0.1` link: **On this computer** in the app, or `pnpm turjuman screens url <id> --local`.",
            "Zelf gehost, en OBS op een andere computer dan die waarop Turjuman draait? Daarvoor is HTTPS op je netwerk nodig: [Telefoon & netwerk](page:network#https). Staat HTTPS aan, dan kan OBS op de Turjuman-computer zelf de link met `http://127.0.0.1` houden: **Op deze computer** in de app, of `pnpm turjuman screens url <id> --local`.",
            "تستضيفه بنفسك، ويعمل OBS على حاسوب غير الذي يعمل عليه ترجمان؟ يتطلب ذلك HTTPS على شبكتك: [الهاتف والشبكة](page:network#https). وبعد تفعيل HTTPS يمكن لبرنامج OBS على حاسوب ترجمان نفسه أن يبقى على رابط `http://127.0.0.1`: **على هذا الحاسوب** في التطبيق، أو `pnpm turjuman screens url <id> --local`.",
          ),
        },
      ],
    },
    {
      id: "browser",
      h2: L("Without OBS", "Zonder OBS", "بدون OBS"),
      blocks: [
        {
          p: L(
            "Open the link in a browser on the computer connected to the TV, allow the microphone, and press F11 for full screen.",
            "Open de link in een browser op de computer die aan de tv hangt, sta de microfoon toe, en druk op F11 voor volledig scherm.",
            "افتح الرابط في متصفح على الحاسوب الموصول بالتلفاز، واسمح باستخدام الميكروفون، ثم اضغط F11 لملء الشاشة.",
          ),
        },
      ],
    },
    {
      id: "more",
      h2: L("More halls, more languages", "Meer zalen, meer talen", "قاعات أكثر ولغات أكثر"),
      blocks: [
        {
          ul: [
            L(
              "The same screen on several displays: add the source once; in the other scenes, **Sources → + → Browser → Add Existing**, so it stays one session.",
              "Hetzelfde scherm op meerdere beeldschermen: voeg de bron één keer toe; in de andere scènes **Bronnen → + → Browser → Add Existing**, zodat het één sessie blijft.",
              "الشاشة نفسها على أكثر من جهاز عرض: أضف المصدر مرة واحدة، ثم في المشاهد الأخرى **المصادر ← + ← متصفح ← Add Existing**، لتبقى جلسة واحدة.",
            ),
            L(
              "Another language: make another screen, with its own link.",
              "Een andere taal: maak nog een scherm, met een eigen link.",
              "لغة أخرى: أنشئ شاشة أخرى برابطها الخاص.",
            ),
          ],
        },
      ],
    },
    {
      id: "friday",
      h2: L("On Friday, from your phone", "Op vrijdag, vanaf je telefoon", "يوم الجمعة، من هاتفك"),
      blocks: [
        {
          ul: [
            L(
              "A new screen starts off: switch it on in the app before the khutbah.",
              "Een nieuw scherm staat uit: zet het vóór de khutbah aan in de app.",
              "تبدأ الشاشة الجديدة متوقفة: شغّلها من التطبيق قبل الخطبة.",
            ),
            L(
              "**Athan**, **Iqama**, **Salah** and **Stop** show or end a prayer card by hand. Turjuman also recognises them by itself.",
              "**Athan**, **Iqama**, **Salah** en **Stop** tonen of beëindigen een gebedskaart met de hand. Turjuman herkent ze ook vanzelf.",
              "تعرض أزرار **الأذان** و**الإقامة** و**الصلاة** بطاقة الصلاة يدويًا، وينهيها زر **إيقاف**. ويتعرّف عليها ترجمان تلقائيًا أيضًا.",
            ),
            L(
              "**Clear** wipes the captions on the screen; the transcript keeps everything.",
              "**Wissen** maakt de ondertiteling op het scherm leeg; het transcript bewaart alles.",
              "يمسح زر **مسح** الترجمة من الشاشة، ويبقى كل شيء محفوظًا في النص المكتوب.",
            ),
            L(
              "Add the app to your phone's home screen to open it like an app.",
              "Zet de app op het beginscherm van je telefoon om haar als app te openen.",
              "أضف التطبيق إلى الشاشة الرئيسية لهاتفك لتفتحه كأي تطبيق.",
            ),
          ],
        },
      ],
    },
    {
      id: "checklist",
      h2: L("Friday checklist", "Checklist voor vrijdag", "قائمة التحقق ليوم الجمعة"),
      blocks: [
        {
          ol: [
            L(
              "Turjuman is running. Self-hosted: `pnpm turjuman doctor` (Docker: `make doctor`) shows no `[FAIL]`; a `[warn]` can be fine.",
              "Turjuman draait. Zelf gehost: `pnpm turjuman doctor` (Docker: `make doctor`) toont geen `[FAIL]`; een `[warn]` kan prima zijn.",
              "ترجمان يعمل. وإن كنت تستضيفه بنفسك، فلا يظهر `[FAIL]` في نتيجة `pnpm turjuman doctor` (مع Docker: `make doctor`)، أما `[warn]` فقد لا يضر.",
            ),
            L(
              "OBS is open and the screen is on: in the app it shows “Connected · listening”. In OBS the screen stays empty until someone speaks.",
              "OBS is open en het scherm staat aan: in de app staat erbij „Verbonden · luistert”. In OBS blijft het scherm leeg tot er iemand spreekt.",
              "OBS مفتوح والشاشة تعمل، ويظهر عندها في التطبيق «متصلة · تستمع». وفي OBS تبقى الشاشة فارغة حتى يتكلم أحد.",
            ),
            L(
              "Speak a test sentence: the translation appears.",
              "Spreek een testzin uit: de vertaling verschijnt.",
              "انطق جملة للتجربة: تظهر الترجمة.",
            ),
          ],
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
                  "OBS shows the page, but no captions",
                  "OBS toont de pagina, maar geen ondertiteling",
                  "يعرض OBS الصفحة دون ترجمة",
                ),
                L(
                  "Start OBS with `--enable-media-stream`, and turn both options of step 3 off.",
                  "Start OBS met `--enable-media-stream`, en zet beide opties van stap 3 uit.",
                  "شغّل OBS مع `--enable-media-stream`، وأوقف الخيارين في الخطوة 3.",
                ),
              ],
              [
                L(
                  "“Microphone needs HTTPS”",
                  "„Microphone needs HTTPS”",
                  "رسالة «Microphone needs HTTPS»",
                ),
                L(
                  "Open the page on the computer that runs Turjuman, or set up HTTPS: [Phone & network](page:network#https).",
                  "Open de pagina op de computer waarop Turjuman draait, of stel HTTPS in: [Telefoon & netwerk](page:network#https).",
                  "افتح الصفحة على الحاسوب الذي يعمل عليه ترجمان، أو فعّل HTTPS: [الهاتف والشبكة](page:network#https).",
                ),
              ],
              [
                L(
                  "The screen says “Live translation is off”",
                  "Het scherm meldt „Live vertaling staat uit”",
                  "تعرض الشاشة أن الترجمة الفورية متوقفة",
                ),
                L(
                  "Switch the screen on in the app.",
                  "Zet het scherm aan in de app.",
                  "شغّل الشاشة من التطبيق.",
                ),
              ],
              [
                L(
                  "No captions, and no sound reaches the page",
                  "Geen ondertiteling, en er komt geen geluid binnen",
                  "لا ترجمة، ولا يصل صوت إلى الصفحة",
                ),
                L(
                  "Check the mixer's output and the computer's input. A microphone on one channel of the interface: pick **Left** or **Right** under **Advanced** in the builder's **Microphone** step. Add `?debug=1` to the screen link to see the microphone and its level.",
                  "Controleer de uitgang van het mengpaneel en de ingang van de computer. Zit de microfoon op één kanaal van de interface? Kies **Links** of **Rechts** onder **Geavanceerd** in de stap **Microfoon** van de bouwer. Zet `?debug=1` achter de schermlink om de microfoon en het niveau te zien.",
                  "تحقّق من مخرج مازج الصوت ومدخل الحاسوب. وإن كان الميكروفون على قناة واحدة من الواجهة، فاختر **اليسرى** أو **اليمنى** ضمن **خيارات متقدمة** في خطوة **الميكروفون**. وأضف `?debug=1` إلى آخر رابط الشاشة لترى الميكروفون ومستوى صوته.",
                ),
              ],
            ],
          },
        },
        {
          p: L(
            "More in [the guide](https://github.com/turjuman-translator/cli/blob/main/docs/guide.md#troubleshooting).",
            "Meer in [de handleiding (Engels)](https://github.com/turjuman-translator/cli/blob/main/docs/guide.md#troubleshooting).",
            "المزيد في [الدليل (بالإنجليزية)](https://github.com/turjuman-translator/cli/blob/main/docs/guide.md#troubleshooting).",
          ),
        },
      ],
    },
  ],
};

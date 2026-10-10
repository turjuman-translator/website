// Security (/security). Sources: SECURITY.md, README ("Your keys and your data"), docs/guide.md
// ("Privacy (GDPR)"), NOTICE (not affiliated), docs/hosting.md, site/client/storage-keys.ts.
import { type DocPage, L } from "../doc.js";
import { SECURITY_DOC, SECURITY_REPORT } from "./shared.js";

export const security: DocPage = {
  title: L(
    "Security: your keys, audio and data · Turjuman",
    "Beveiliging: je sleutels, geluid en gegevens · Turjuman",
    "الأمان: مفاتيحك والصوت وبياناتك · ترجمان",
  ),
  desc: L(
    "How Turjuman protects API keys, audio, caption history and accounts, and how to report a problem.",
    "Hoe Turjuman API-sleutels, geluid, ondertitelgeschiedenis en accounts beschermt, en hoe je een probleem meldt.",
    "كيف يحمي ترجمان مفاتيح API والصوت وسجلّ الترجمة والحسابات، وكيف تُبلغ عن مشكلة.",
  ),
  h1: L("Security", "Beveiliging", "الأمان"),
  lead: L("Your keys and your data.", "Je sleutels en je gegevens.", "مفاتيحك وبياناتك."),
  sections: [
    {
      id: "keys",
      h2: L("API keys", "API-sleutels", "مفاتيح API"),
      blocks: [
        {
          dl: [
            [
              L("Hosted", "Gehost", "على خادم مستضاف"),
              L(
                "Each mosque's Soniox key is encrypted with AES-256-GCM and bound to that mosque. It is checked with Soniox before it is stored, and never shown again: the app shows only the last four characters and when the key was last checked.",
                "De Soniox-sleutel van elke moskee wordt versleuteld met AES-256-GCM en is gebonden aan die moskee. Hij wordt bij Soniox gecontroleerd voordat hij wordt opgeslagen, en nooit meer getoond: de app toont alleen de laatste vier tekens en wanneer de sleutel voor het laatst is gecontroleerd.",
                "يُشفَّر مفتاح Soniox لكل مسجد بخوارزمية AES-256-GCM، ويُربط بذلك المسجد. ويُتحقَّق منه لدى Soniox قبل حفظه، ثم لا يُعرض مرة أخرى: لا يُظهر التطبيق إلا آخر أربعة أحرف منه، وآخر موعد تحقّق.",
              ),
            ],
            [
              L("Self-hosted", "Zelf gehost", "باستضافة ذاتية"),
              L(
                "The key stays in `.env` on your own computer, readable only by you. Never in git, never in the Docker image. A key added in the app is encrypted the same way as on a hosted server.",
                "De sleutel blijft in `.env` op je eigen computer, alleen voor jou leesbaar. Nooit in git, nooit in de Docker-image. Een sleutel die je in de app toevoegt, wordt op dezelfde manier versleuteld als op een gehoste server.",
                "يبقى المفتاح في الملف `.env` على حاسوبك، ولا يقرؤه أحد غيرك. لا يدخل git أبدًا، ولا صورة Docker. أما المفتاح الذي تضيفه في التطبيق فيُشفَّر كما على الخادم المستضاف.",
              ),
            ],
            [
              L("Both", "Allebei", "في الحالتين"),
              L(
                "Keys are removed from every log line.",
                "Sleutels worden uit elke logregel verwijderd.",
                "تُحذف المفاتيح من كل سطر في السجلات.",
              ),
            ],
          ],
        },
      ],
    },
    {
      id: "audio",
      h2: L("Audio", "Geluid", "الصوت"),
      blocks: [
        {
          p: L(
            "The audio goes from the computer at the screen to the server, only while someone speaks, and from there to Soniox, which hears and translates it. Turjuman stores no audio. Turjuman is not affiliated with Soniox. On your own server you can use a Soniox project in the EU region.",
            "Het geluid gaat van de computer bij het scherm naar de server, alleen terwijl er iemand spreekt, en van daar naar Soniox, dat het hoort en vertaalt. Turjuman bewaart geen geluid. Turjuman is niet verbonden aan Soniox. Op je eigen server kun je een Soniox-project in de EU-regio gebruiken.",
            "ينتقل الصوت من الحاسوب المتصل بالشاشة إلى الخادم أثناء الكلام فقط، ومنه إلى Soniox الذي يسمعه ويترجمه. ولا يحفظ ترجمان أي صوت. ولا يرتبط ترجمان بـ Soniox. وعلى خادمك الخاص يمكنك استخدام مشروع في Soniox ضمن منطقة الاتحاد الأوروبي.",
          ),
        },
      ],
    },
    {
      id: "history",
      h2: L("Caption history", "Ondertitelgeschiedenis", "سجلّ الترجمة"),
      blocks: [
        {
          p: L(
            "The captions of each session are kept on the server as a transcript. The server's operator can switch this off. Tell your community that the khutbah is transcribed.",
            "De ondertiteling van elke sessie wordt als transcript op de server bewaard. De beheerder van de server kan dat uitzetten. Vertel je gemeenschap dat de khutbah wordt uitgeschreven.",
            "تُحفظ ترجمة كل جلسة على الخادم نصًّا مكتوبًا، ويستطيع القائم على الخادم إيقاف ذلك. أخبر جماعة المسجد بأن الخطبة تُدوَّن.",
          ),
        },
      ],
    },
    {
      id: "accounts",
      h2: L("Accounts", "Accounts", "الحسابات"),
      blocks: [
        {
          ul: [
            L(
              "Roles: the owner and admins manage their mosque; users manage only their own screens.",
              "Rollen: de eigenaar en de beheerders beheren hun moskee; gebruikers beheren alleen hun eigen schermen.",
              "الأدوار: يدير المالك والمشرفون مسجدهم، ولا يدير المستخدمون إلا شاشاتهم.",
            ),
            L(
              "Mosques never see each other's screens, accounts, looks, keys or caption history.",
              "Moskeeën zien nooit elkaars schermen, accounts, stijlen, sleutels of ondertitelgeschiedenis.",
              "لا يرى أي مسجد شاشات غيره ولا حساباته ولا أنماطه ولا مفاتيحه ولا سجلّ ترجمته.",
            ),
            L(
              "Passwords are stored as scrypt hashes, and never logged.",
              "Wachtwoorden worden als scrypt-hash opgeslagen, en nooit gelogd.",
              "تُحفظ كلمات المرور بصيغة تجزئة scrypt (hash)، ولا تُسجَّل أبدًا.",
            ),
            L(
              "Failed logins are limited: 10 failures in 10 minutes block the address for 10 minutes.",
              "Mislukte inlogpogingen zijn beperkt: 10 mislukkingen in 10 minuten blokkeren het adres 10 minuten.",
              "محاولات الدخول الفاشلة محدودة: 10 محاولات فاشلة خلال 10 دقائق تحظر العنوان لمدة 10 دقائق.",
            ),
          ],
        },
      ],
    },
    {
      id: "screen-links",
      h2: L("Screen links", "Schermlinks", "روابط الشاشات"),
      blocks: [
        {
          p: L(
            "A screen's link holds a random ID, which is its only secret. **New link** replaces it, and the old link stops working at once.",
            "De link van een scherm bevat een willekeurige ID, het enige geheim ervan. **Nieuwe link** vervangt hem, en de oude link werkt meteen niet meer.",
            "يحتوي رابط الشاشة على معرّف عشوائي هو سرّه الوحيد. يستبدله **رابط جديد**، فيتوقف الرابط القديم فورًا.",
          ),
        },
      ],
    },
    {
      id: "lan-ca",
      h2: L("HTTPS on your own network", "HTTPS op je eigen netwerk", "HTTPS على شبكتك"),
      blocks: [
        {
          p: L(
            "Self-hosted, HTTPS on the mosque's network uses a small certificate authority of your own (`make lan-cert`), installed on each device. Its key, `tls/ca.key`, can sign certificates those devices trust: keep it, and backups that hold it, private. Remove “Turjuman local CA” from devices that stop using Turjuman.",
            "Zelf gehost gebruikt HTTPS op het moskeenetwerk een eigen kleine certificaatautoriteit (`make lan-cert`), die je op elk apparaat installeert. Met de sleutel ervan, `tls/ca.key`, kun je certificaten tekenen die die apparaten vertrouwen: houd hem, en back-ups waar hij in staat, privé. Verwijder „Turjuman local CA” van apparaten die Turjuman niet meer gebruiken.",
            "في الاستضافة الذاتية يعتمد HTTPS على شبكة المسجد على جهة تصديق صغيرة خاصة بك (`make lan-cert`) تثبّتها على كل جهاز. ويستطيع مفتاحها `tls/ca.key` توقيع شهادات تثق بها تلك الأجهزة، فاحفظه هو والنسخ الاحتياطية التي تضمّه بعيدًا عن الآخرين. واحذف «Turjuman local CA» من الأجهزة التي تتوقف عن استخدام ترجمان.",
          ),
        },
      ],
    },
    {
      id: "website",
      h2: L("This website", "Deze website", "هذا الموقع"),
      blocks: [
        {
          ul: [
            L(
              "No analytics, and no requests to other sites: the fonts come from this server.",
              "Geen analytics, en geen verzoeken aan andere sites: de lettertypen komen van deze server.",
              "لا أدوات تحليل، ولا طلبات إلى مواقع أخرى: تأتي الخطوط من هذا الخادم نفسه.",
            ),
            L(
              "A strict Content-Security-Policy: no inline code, no third-party origins.",
              "Een strikte Content-Security-Policy: geen inline code, geen bronnen van derden.",
              "سياسة أمان محتوى (Content-Security-Policy) صارمة: لا شيفرة مضمّنة، ولا مصادر خارجية.",
            ),
            L(
              "Your language and animation choices stay in your own browser.",
              "Je keuze voor taal en animaties blijft in je eigen browser.",
              "يبقى اختيارك للغة والحركة في متصفحك أنت.",
            ),
          ],
        },
      ],
    },
    {
      id: "report",
      h2: L("Report a problem", "Een probleem melden", "الإبلاغ عن مشكلة"),
      blocks: [
        {
          p: L(
            `Report security problems privately: **Report a vulnerability** on [the Security tab of the Turjuman repository](${SECURITY_REPORT}) on GitHub. Please do not open a public issue.`,
            `Meld beveiligingsproblemen privé: **Report a vulnerability** op [het tabblad Security van de Turjuman-repository](${SECURITY_REPORT}) op GitHub. Open liever geen openbare issue.`,
            `أبلغ عن المشكلات الأمنية بشكل خاص: **Report a vulnerability** في [تبويب Security في مستودع ترجمان](${SECURITY_REPORT}) على GitHub. ونرجو ألا تفتح بلاغًا علنيًا.`,
          ),
        },
        {
          p: L(
            `All the details: [SECURITY.md](${SECURITY_DOC}).`,
            `Alle details: [SECURITY.md (Engels)](${SECURITY_DOC}).`,
            `كل التفاصيل: [SECURITY.md (بالإنجليزية)](${SECURITY_DOC}).`,
          ),
        },
      ],
    },
  ],
};

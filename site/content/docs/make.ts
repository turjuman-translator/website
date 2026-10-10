// The make helpers of the Docker path, one line each (the Makefile's own `make help` texts, made
// short; `make site` is left out: the self-hosted edition has no website). The Commands page lists
// them all; the Docker page the everyday ones.
import { L, type Tri } from "../doc.js";

export interface MakeHelper {
  cmd: string;
  text: Tri;
}

export const MAKE_HELPERS: readonly MakeHelper[] = [
  {
    cmd: "make up",
    text: L(
      "Build and start, the first time too: it makes `config/`, `data/` and `.env` when they are missing. It returns once Turjuman is healthy.",
      "Bouwen en starten, ook de eerste keer: het maakt `config/`, `data/` en `.env` als ze ontbreken. Klaar zodra Turjuman gezond draait.",
      "البناء والتشغيل، حتى في المرة الأولى: ينشئ `config/` و`data/` و`.env` إن لم تكن موجودة. وينتهي حين يعمل ترجمان بسلامة.",
    ),
  },
  {
    cmd: "make down",
    text: L(
      "Stop Turjuman; a running session is finished first.",
      "Stop Turjuman; een lopende sessie wordt eerst afgerond.",
      "أوقف ترجمان، وتُختم الجلسة الجارية أولًا.",
    ),
  },
  {
    cmd: "make restart",
    text: L(
      "Restart, for example after a change in `config/config.yaml`.",
      "Herstart, bijvoorbeeld na een wijziging in `config/config.yaml`.",
      "أعد التشغيل، مثلًا بعد تعديل `config/config.yaml`.",
    ),
  },
  {
    cmd: "make admin",
    text: L(
      "Open the app. With exposure local, the first visit creates the admin account; on the network, use `make user-add`. `make app` does the same.",
      "Open de app. Met exposure local maakt het eerste bezoek het beheerdersaccount; op het netwerk gebruik je `make user-add`. `make app` doet hetzelfde.",
      "افتح التطبيق. مع exposure local تنشئ الزيارة الأولى حساب المشرف، وعلى الشبكة استخدم `make user-add`. ويفعل `make app` الشيء نفسه.",
    ),
  },
  {
    cmd: "make keys",
    text: L(
      "Enter your Soniox key (checked with Soniox, saved in `config/.env`); Turjuman then restarts.",
      "Voer je Soniox-sleutel in (gecontroleerd bij Soniox, opgeslagen in `config/.env`); daarna start Turjuman opnieuw.",
      "أدخل مفتاح Soniox (يُتحقَّق منه لدى Soniox، ويُحفظ في `config/.env`)، ثم يُعاد تشغيل ترجمان.",
    ),
  },
  {
    cmd: "make status",
    text: L(
      "The container's state and health: sessions, audio.",
      "De staat en gezondheid van de container: sessies, geluid.",
      "حالة الحاوية وسلامتها: الجلسات والصوت.",
    ),
  },
  {
    cmd: "make logs",
    text: L("Follow the logs.", "Volg de logs.", "تابع السجلات."),
  },
  {
    cmd: "make screens",
    text: L(
      "The screens, with their screen links.",
      "De schermen, met hun schermlinks.",
      "الشاشات مع روابطها.",
    ),
  },
  {
    cmd: "make users",
    text: L("The accounts of the app.", "De accounts van de app.", "حسابات التطبيق."),
  },
  {
    cmd: "make quran-data",
    text: L(
      "Download the Quran text and translations again. Not needed: Turjuman downloads what is missing by itself when it starts.",
      "De Korantekst en vertalingen opnieuw ophalen. Niet nodig: Turjuman haalt wat ontbreekt zelf op als het start.",
      "تنزيل نص القرآن وترجماته من جديد. ولا حاجة إليه، فترجمان يُنزّل الناقص بنفسه عند تشغيله.",
    ),
  },
  {
    cmd: "make update",
    text: L(
      "`git pull`, rebuild, restart, and wait until healthy.",
      "`git pull`, opnieuw bouwen, herstarten, en wachten tot alles gezond draait.",
      "`git pull`، ثم إعادة البناء والتشغيل، وانتظار السلامة.",
    ),
  },
  {
    cmd: "make backup",
    text: L(
      "Archive `config/` and the transcripts to `backups/`, without `.env`, `keys.yaml`, `master.key` and `admin.token`.",
      "Archiveer `config/` en de transcripten in `backups/`, zonder `.env`, `keys.yaml`, `master.key` en `admin.token`.",
      "أرشفة `config/` والنصوص المكتوبة في `backups/`، دون `.env` و`keys.yaml` و`master.key` و`admin.token`.",
    ),
  },
  {
    cmd: "make doctor",
    text: L(
      "Check the setup: config, key, HTTPS certificate, Quran data, the connection to Soniox. Of the key it only checks that it is set.",
      "Controleer de installatie: configuratie, sleutel, HTTPS-certificaat, Korandata, de verbinding met Soniox. Van de sleutel kijkt het alleen of hij is ingesteld.",
      "تحقّق من الإعداد: الإعدادات والمفتاح وشهادة HTTPS وبيانات القرآن والاتصال بـ Soniox. ولا يتحقّق من المفتاح إلا أنه موجود.",
    ),
  },
  {
    cmd: "make doctor ONLINE=1",
    text: L(
      "The same, and it also asks Soniox whether it accepts your key. Nothing is billed.",
      "Hetzelfde, en het vraagt Soniox ook of het je sleutel accepteert. Er wordt niets in rekening gebracht.",
      "الأمر نفسه، ويسأل Soniox أيضًا هل يقبل مفتاحك، دون أن يُحتسب عليك شيء.",
    ),
  },
  {
    cmd: 'make cli ARGS="screens enable <id>"',
    text: L(
      "Any `turjuman` command, run in the container. `make cli ARGS=--help` lists them.",
      "Elke opdracht van `turjuman`, uitgevoerd in de container. `make cli ARGS=--help` toont ze allemaal.",
      "أي أمر من أوامر `turjuman`، يُنفَّذ داخل الحاوية. ويعرضها كلها `make cli ARGS=--help`.",
    ),
  },
  {
    cmd: "make lan-cert",
    text: L(
      'HTTPS on the LAN: a local CA and a certificate in `config/tls`. On Windows, add `LAN_NAMES="<IP>"` with this computer\'s address.',
      'HTTPS op het lokale netwerk: een lokale CA en een certificaat in `config/tls`. Op Windows voeg je `LAN_NAMES="<IP>"` toe, met het adres van deze computer.',
      'HTTPS على الشبكة المحلية: جهة تصديق محلية وشهادة في `config/tls`. وعلى Windows أضف `LAN_NAMES="<IP>"` بعنوان هذا الحاسوب.',
    ),
  },
  {
    cmd: "make help",
    text: L(
      "Every helper and variable.",
      "Alle helpers en variabelen.",
      "كل الأوامر المساعدة ومتغيّراتها.",
    ),
  },
];

export function helpers(cmds: readonly string[]): MakeHelper[] {
  return cmds.map((c) => {
    const h = MAKE_HELPERS.find((x) => x.cmd === c || x.cmd.startsWith(`${c} `));
    if (h === undefined) throw new Error(`no make helper "${c}"`);
    return h;
  });
}

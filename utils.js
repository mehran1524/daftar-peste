/* ================================
   Number Utilities - Pistachio App
   Safe UI Formatting Layer
   ================================ */

/* تبدیل ارقام انگلیسی به فارسی */
export function toPersianDigits(value) {
    return String(value).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

/* تبدیل ارقام فارسی/عربی به انگلیسی */
export function toEnglishDigits(value) {
    if (!value) return "";

    const persian = "۰۱۲۳۴۵۶۷۸۹";
    const arabic = "٠١٢٣٤٥٦٧٨٩";

    return String(value)
        .replace(/[۰-۹]/g, d => persian.indexOf(d))
        .replace(/[٠-٩]/g, d => arabic.indexOf(d));
}

/* فرمت هزارگان با کامای انگلیسی + تبدیل به فارسی */
export function formatDisplayNumber(value) {
    if (value === null || value === undefined || value === "") return "۰";

    const cleaned = toEnglishDigits(value)
        .replace(/,/g, "")
        .replace(/[^\d.]/g, "");

    if (cleaned === "") return "۰";

    const number = Number(cleaned);

    if (Number.isNaN(number)) return toPersianDigits(value);

    const formatted = number.toLocaleString("en-US");

    return toPersianDigits(formatted);
}

/* گرفتن مقدار خام عددی از input بدون دستکاری منطق */
export function parseInputNumber(value) {
    if (!value) return 0;

    const cleaned = toEnglishDigits(value)
        .replace(/,/g, "")
        .replace(/[^\d.]/g, "");

    const number = Number(cleaned);

    return Number.isNaN(number) ? 0 : number;
}

/* اعمال فارسی‌سازی روی همه خروجی‌های عددی صفحه */
export function applyPersianFormatting() {
    const targets = document.querySelectorAll(
        "#buyToday, #sellToday, #balance, #amount, #paidAmount, " +
        "#totalBuyRange, #totalSellRange, #finalBalanceRange, #financialBalanceRange"
    );

    targets.forEach(el => {
        if (el.tagName === "INPUT") {
            if (!el.dataset.rawValue) {
                el.dataset.rawValue = el.value;
            }
            el.value = formatDisplayNumber(el.dataset.rawValue);
        } else {
            el.textContent = formatDisplayNumber(el.textContent);
        }
    });
}

/* ================================
   Number Utilities - Pistachio App
   Safe UI Formatting Layer
   ================================ */

/* تبدیل ارقام انگلیسی به فارسی */
export function toPersianDigits(value) {
    if (value === null || value === undefined) return "۰";
    return String(value).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

/* تبدیل ارقام فارسی/عربی به انگلیسی - اصلاح شده جهت دقت بالاتر */
export function toEnglishDigits(value) {
    if (value === null || value === undefined) return "";
    
    const valStr = String(value);
    // نقشه تبدیل ارقام فارسی و عربی به انگلیسی
    const map = {
        '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    
    return valStr.replace(/[۰-۹٠-٩]/g, (match) => map[match]);
}

/* فرمت هزارگان با کامای انگلیسی + تبدیل به فارسی */
export function formatDisplayNumber(value) {
    if (value === null || value === undefined || value === "") return "۰";

    // ابتدا تبدیل به انگلیسی، سپس حذف کاراکترهای غیرعددی (به جز نقطه اعشار)
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
    if (value === null || value === undefined || value === "") return 0;

    // تبدیل به انگلیسی و حذف جداکننده‌های هزارگان (کاما)
    const cleaned = toEnglishDigits(String(value))
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
